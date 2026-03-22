/**
 * buildParallelAnimationSequence — BFS (breadth-first) animation beat sequence.
 *
 * Unlike the DFS sequence, all branches grow simultaneously level-by-level
 * after the shared trunk. Each beat reveals one depth-level across ALL active
 * branches at once, so the full tree fills in much faster.
 *
 * Trunk phase is identical to DFS (single linear path, so order is unchanged).
 * After dp0 the tree fans out and every subsequent beat adds one "row" of nodes
 * across all branches in parallel.
 *
 * activeBranchIds is always null — all branches stay at full opacity since
 * every branch is progressing simultaneously.
 */
import { AnimationBeat } from '../types/tree'

export function buildParallelAnimationSequence(): AnimationBeat[] {
  const beats: AnimationBeat[] = []
  let visible: string[] = []

  function beat(
    newIds: string[],
    pauseMs: number,
    opts?: { autoPause?: boolean; isDecisionReveal?: boolean; phase?: string }
  ): void {
    visible = [...visible, ...newIds]
    beats.push({
      visibleIds: [...visible],
      activeBranchIds: null,   // always null — all branches active in parallel mode
      pauseMs,
      ...opts,
    })
  }

  // ── Intro: camera snaps to root area ─────────────────────────────────────
  beat([], 1800, { phase: 'intro' })

  // ── Shared trunk (identical to DFS — single linear path) ─────────────────
  beat(['root'],  800, { phase: 'trunk' })
  beat(['t0'],    800, { phase: 'trunk' })
  beat(['tool0'], 800, { phase: 'trunk' })
  beat(['ref0'],  800, { phase: 'trunk' })
  beat(['t1'],    800, { phase: 'trunk' })
  beat(['t2'],    800, { phase: 'trunk' })

  // ── dp0 auto-pause ────────────────────────────────────────────────────────
  beat(['dp0'], 400, {
    autoPause: true,
    isDecisionReveal: true,
    phase: 'dp0-reveal',
  })

  // ── BFS: all three branches grow simultaneously from here ─────────────────
  // L0: first node in each branch off dp0
  beat(['t3', 't5', 't7'], 500, { phase: 'bfs-l0' })

  // L1: second node in each branch
  beat(['t4', 't6', 't8'], 450, { phase: 'bfs-l1' })

  // L2: third level — tool1 (valgus), term-nerve (nerve terminates), dp2 (instability decision)
  beat(['tool1', 'term-nerve', 'dp2'], 400, {
    autoPause: true,
    isDecisionReveal: true,
    phase: 'dp2-reveal',
  })

  // L3: dp2 children + valgus continues (ref1)
  beat(['ref1', 't9', 't10'], 400, { phase: 'bfs-l3' })

  // L4: dp1 (valgus decision) + term-instability (instability sub-path terminates)
  beat(['dp1', 'term-instability'], 400, {
    autoPause: true,
    isDecisionReveal: true,
    phase: 'dp1-reveal',
  })

  // L5: dp1 children + ulnar evidence
  beat(['r-valgus', 'r-pain', 'tool2'], 400, { phase: 'bfs-l5' })

  // L6: valgus terminals + ulnar evidence continues
  beat(['term-valgus', 'term-pain', 'ref2'], 500, { phase: 'bfs-l6' })

  // L7: dp3 (deepest decision point)
  beat(['dp3'], 400, {
    autoPause: true,
    isDecisionReveal: true,
    phase: 'dp3-reveal',
  })

  // L8: dp3 children — four sub-branches fan out simultaneously
  beat(['t11', 't12', 't13', 't14'], 400, { phase: 'bfs-l8' })

  // L9: all four ulnar terminals — convergence moment
  beat(['term-ulnar-a', 'term-radial', 'term-ulnar-b', 'term-ulnar-c'], 600, {
    autoPause: true,
    phase: 'convergence-moment',
  })

  // ── Full tree reveal ──────────────────────────────────────────────────────
  beats.push({
    visibleIds: [...visible],
    activeBranchIds: null,
    pauseMs: 3000,
    phase: 'full-tree',
  })

  return beats
}
