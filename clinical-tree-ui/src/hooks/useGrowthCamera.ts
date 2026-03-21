/**
 * useGrowthCamera — drives camera during growth playback.
 *
 * Follow mode: camera pans to each primary-path node as it appears,
 *   staying zoomed in tight (1.3x). On a split, pans to the decision point.
 *   After resume, continues following the primary path down.
 *
 * Overview mode: after each tick, camera zooms to fit ALL currently visible
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
import { GrowthPlaybackState, PositionedTree } from '../types/tree'
import { TreeViewportHandle } from '../components/tree/TreeViewportHandle'

export type GrowthCameraMode = 'follow' | 'overview'

// Zoom level used in follow mode (1.3× feels tight but not claustrophobic)
const FOLLOW_SCALE = 1.3
// Zoom level at decision point in follow mode (pull back slightly to show fork context)
const DECISION_SCALE = 0.95

export function useGrowthCamera(
  growth: GrowthPlaybackState,
  tree: PositionedTree,
  cameraMode: GrowthCameraMode,
  viewportRef: React.RefObject<TreeViewportHandle>
): void {
  // Track previous mode so we can detect transitions to idle
  const prevModeRef = useRef(growth.mode)

  useEffect(() => {
    const vp = viewportRef.current
    if (!vp) return

    const prevMode = prevModeRef.current
    prevModeRef.current = growth.mode

    // Growth completed or skipped → fit full tree
    if (growth.mode === 'idle' && prevMode !== 'idle') {
      vp.fitToView()
      return
    }

    // Only drive camera during active playback
    if (growth.mode !== 'playing' && growth.mode !== 'paused_at_decision') return

    const orderedNodes = [...tree.nodes].sort(
      (a, b) => (a.step_index ?? 0) - (b.step_index ?? 0)
    )

    // Build index map (same logic as TreeCanvas) so camera queries match visibility
    const nodeRevealIndex = new Map(orderedNodes.map((n, i) => [n.id, i]))
    const visibleAtCursor = (cursor: number) =>
      orderedNodes.filter((_, i) => i <= cursor).map(n => n.id)

    // ── paused_at_decision ────────────────────────────────────────────
    if (growth.mode === 'paused_at_decision') {
      const decisionNode = tree.nodes.find(n => n.id === growth.decisionNodeId)
      if (!decisionNode) return

      if (cameraMode === 'follow') {
        // Pull back slightly so the branching fork area is visible
        vp.panToNode(decisionNode, DECISION_SCALE)
      } else {
        // Overview: fit all nodes visible at this cursor
        vp.fitBranch(visibleAtCursor(growth.cursor), tree.nodes, 400)
      }
      return
    }

    // ── playing ───────────────────────────────────────────────────────
    const cursor = growth.cursor
    const currentNode = orderedNodes[cursor]
    if (!currentNode) return

    if (cameraMode === 'follow') {
      // If the user chose a branch after a decision, follow that branch.
      // Otherwise follow the primary path.
      const chosenBranch = (growth as { chosenBranchId?: string }).chosenBranchId
      const isFollowed = chosenBranch
        ? currentNode.branch_id === chosenBranch
        : currentNode.isOnPrimaryPath || currentNode.is_decision_point
      if (isFollowed) {
        const scale = cursor === 0 ? FOLLOW_SCALE : undefined
        vp.panToNode(currentNode, scale)
      }
    } else {
      // Overview: keep fitting all visible nodes, faster animation so it feels live
      vp.fitBranch(visibleAtCursor(cursor), tree.nodes, 180)
    }
    // suppress unused var warning
    void nodeRevealIndex
  }, [growth, cameraMode, tree, viewportRef])
}
