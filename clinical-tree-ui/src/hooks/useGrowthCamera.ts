/**
 * useGrowthCamera — drives camera during growth playback.
 *
 * Follow mode: camera pans to the last newly-revealed node on each beat,
 *   staying zoomed in tight (1.3x). On a split/decision auto-pause, pans
 *   to the decision point node.
 *
 * Overview mode: after each beat, camera zooms to fit ALL currently visible
 *   nodes. Creates a continuously-widening shot as the tree expands.
 *   On a split the camera pulls back far enough to show all branches.
 *
 * The hook is intentionally a sibling of useViewportControl, not a replacement.
 * useViewportControl handles focus-state camera (node selection, branch focus).
 * useGrowthCamera handles growth-state camera. They don't fire simultaneously:
 *   - during playing/paused_at_decision → this hook controls the camera
 *   - during idle/paused_manual/paused_exploring → useViewportControl controls it
 */
import { useEffect, useRef } from 'react'
import { GrowthPlaybackState, PositionedTree, AnimationBeat } from '../types/tree'
import { TreeViewportHandle } from '../components/tree/TreeViewportHandle'

export type GrowthCameraMode = 'follow' | 'overview'

// Zoom level used in follow mode — tight on each node so content is readable
const FOLLOW_SCALE = 2.2
// Zoom level at decision point in follow mode (pull back to show the full fork)
const DECISION_SCALE = 1.1

export function useGrowthCamera(
  growth: GrowthPlaybackState,
  tree: PositionedTree,
  cameraMode: GrowthCameraMode,
  viewportRef: React.RefObject<TreeViewportHandle>
): void {
  // Track previous mode so we can detect transitions to idle
  const prevModeRef = useRef(growth.mode)
  // Track pending fork-transition timeout so we can clean it up
  const forkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cancel any in-flight fork animation on unmount
  useEffect(() => {
    return () => {
      if (forkTimerRef.current !== null) clearTimeout(forkTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return

    const prevMode = prevModeRef.current
    prevModeRef.current = growth.mode

    // Cancel any pending fork-transition zoom when a new beat fires
    if (forkTimerRef.current !== null) {
      clearTimeout(forkTimerRef.current)
      forkTimerRef.current = null
    }

    // Growth completed or skipped → fit full tree
    if (growth.mode === 'idle' && prevMode !== 'idle') {
      vp.fitToView()
      return
    }

    // Only drive camera during active playback
    if (growth.mode !== 'playing' && growth.mode !== 'paused_at_decision') return

    const g = growth as { beatIndex: number; sequence: AnimationBeat[] }
    const currentBeat = g.sequence[g.beatIndex]
    if (!currentBeat) return

    const visibleIds = currentBeat.visibleIds
    const nodeMap = new Map(tree.nodes.map(n => [n.id, n]))

    // ── paused_at_decision ────────────────────────────────────────────
    if (growth.mode === 'paused_at_decision') {
      if (growth.decisionNodeId) {
        // True decision point: pull back so the fork is visible
        const decisionNode = tree.nodes.find(n => n.id === growth.decisionNodeId)
        if (!decisionNode) return
        if (cameraMode === 'follow') {
          vp.panToNode(decisionNode, DECISION_SCALE)
        } else {
          vp.fitBranch(visibleIds, tree.nodes, 400)
        }
      } else {
        // Terminal / convergence auto-pause: pan tight to the arrived node
        const lastId = visibleIds[visibleIds.length - 1]
        const lastNode = lastId ? nodeMap.get(lastId) : undefined
        if (!lastNode) return
        if (cameraMode === 'follow') {
          vp.panToNode(lastNode, FOLLOW_SCALE)
        } else {
          vp.fitBranch(visibleIds, tree.nodes, 400)
        }
      }
      return
    }

    // ── playing ───────────────────────────────────────────────────────

    // Auto-pause beats: camera was already handled during paused_at_decision.
    // RESUME_GROWTH puts mode back to 'playing' at the same beatIndex briefly
    // before the timer advances — skip re-processing to avoid snapping tight.
    if (currentBeat.autoPause) return

    // Branch-reveal beats: pan to each newly-branched node at decision scale
    // so the audience sees each option before the system commits to a path.
    if (currentBeat.isBranchReveal) {
      const lastId = visibleIds[visibleIds.length - 1]
      const lastNode = lastId ? nodeMap.get(lastId) : undefined
      if (lastNode) {
        if (cameraMode === 'follow') {
          vp.panToNode(lastNode, DECISION_SCALE)
        } else {
          vp.fitBranch(visibleIds, tree.nodes, 250)
        }
      }
      return
    }

    // Full-tree reveal beat — slow zoom-out to show the complete picture
    if (currentBeat.phase === 'full-tree') {
      vp.fitBranch(visibleIds, tree.nodes, 1200)
      return
    }

    if (cameraMode === 'follow') {
      // Find the last visible node — the most recently revealed
      const lastId = visibleIds[visibleIds.length - 1]
      const lastNode = lastId ? nodeMap.get(lastId) : undefined
      if (lastNode) {
        // Only follow nodes on the primary path or decision points in follow mode
        const shouldFollow =
          lastNode.isOnPrimaryPath ||
          lastNode.is_decision_point ||
          (currentBeat.activeBranchIds !== null && currentBeat.activeBranchIds.includes(lastNode.branch_id))
        if (shouldFollow) {
          if (currentBeat.isFirstAfterFork) {
            // Two-step: zoom out briefly to show fork context, then zoom in on the chosen node
            // Step 1 — use the previous beat's visible IDs (fork + siblings) to establish context
            const prevBeat = g.beatIndex > 0 ? g.sequence[g.beatIndex - 1] : null
            const contextIds = prevBeat ? prevBeat.visibleIds : visibleIds
            vp.fitBranch(contextIds, tree.nodes, 350)
            // Step 2 — zoom in tight on the chosen node after the pull-back settles
            forkTimerRef.current = setTimeout(() => {
              forkTimerRef.current = null
              viewportRef.current?.panToNode(lastNode, FOLLOW_SCALE)
            }, 520)
          } else {
            vp.panToNode(lastNode, FOLLOW_SCALE)
          }
        }
      }
    } else {
      // Overview: keep fitting all visible nodes, faster animation so it feels live
      vp.fitBranch(visibleIds, tree.nodes, 180)
    }
  }, [growth, cameraMode, tree, viewportRef])
}
