/**
 * buildAnimationSequence — pre-builds the DFS beam-search animation beat sequence.
 *
 * Traversal order (from spec):
 *   Trunk → dp0 (auto-pause) → [t3,t5,t7 simultaneous] →
 *   Follow valgus (primary + branch-pain) → dp1 (auto-pause) →
 *     [r-valgus, r-pain simultaneous] → term-valgus → term-pain →
 *   Follow nerve (branch-nerve) → t6 → term-nerve →
 *   Follow instability (branch-instability + ulnar tree) → t8 → dp2 (auto-pause) →
 *     [t9, t10 simultaneous] → term-instability →
 *     tool2 → ref2 → dp3 (auto-pause) →
 *     [t11,t12,t13,t14 simultaneous] → term-ulnar-a → term-radial → term-ulnar-b →
 *     term-ulnar-c (auto-pause: convergence moment) →
 *   Full tree reveal → done
 */
import { AnimationBeat } from '../types/tree'

export function buildAnimationSequence(): AnimationBeat[] {
  const beats: AnimationBeat[] = []
  let visible: string[] = []

  function beat(
    newIds: string[],
    activeBranchIds: string[] | null,
    pauseMs: number,
    opts?: { autoPause?: boolean; isDecisionReveal?: boolean; phase?: string; holdMs?: number }
  ): void {
    visible = [...visible, ...newIds]
    beats.push({
      visibleIds: [...visible],
      activeBranchIds,
      pauseMs,
      ...opts,
    })
  }

  // ── Intro: camera zooms to root area, loading skeleton shows ────────────────
  beat([], null, 1800, { phase: 'intro' })

  // ── Phase 1: Shared trunk (fast, ~800ms per node) ──────────────────────────
  // holdMs ensures a visible pause at the initial assessment even in fast mode
  beat(['root'],  null, 800,  { phase: 'trunk', holdMs: 1500 })
  beat(['t0'],    null, 800,  { phase: 'trunk' })
  beat(['tool0'], null, 800,  { phase: 'trunk' })
  beat(['ref0'],  null, 800,  { phase: 'trunk' })
  beat(['t1'],    null, 800,  { phase: 'trunk' })
  beat(['t2'],    null, 800,  { phase: 'trunk' })

  // ── Phase 2: dp0 — auto-pause for presenter narration ────────────────────
  beat(['dp0'], null, 400, {
    autoPause: true,
    isDecisionReveal: true,
    phase: 'dp0-reveal',
  })

  // ── Phase 3: dp0 children branch off one by one ──────────────────────────
  beat(['t3'], null, 550, { phase: 'dp0-branch-reveal', isBranchReveal: true })
  beat(['t5'], null, 550, { phase: 'dp0-branch-reveal', isBranchReveal: true })
  beat(['t7'], null, 550, { phase: 'dp0-branch-reveal', isBranchReveal: true })

  // ── Phase 4: Follow valgus path ───────────────────────────────────────────
  const valgusActive = ['primary', 'branch-pain']
  beat(['t4'],   valgusActive, 900, { phase: 'valgus', isFirstAfterFork: true })
  beat(['tool1'],valgusActive, 900, { phase: 'valgus' })
  beat(['ref1'], valgusActive, 900, { phase: 'valgus' })

  // dp1 — nested decision point in valgus path
  beat(['dp1'], valgusActive, 400, {
    autoPause: true,
    isDecisionReveal: true,
    phase: 'dp1-reveal',
  })

  // dp1 children branch off one by one
  beat(['r-valgus'], valgusActive, 500, { phase: 'dp1-branch-reveal', isBranchReveal: true })
  beat(['r-pain'],   valgusActive, 500, { phase: 'dp1-branch-reveal', isBranchReveal: true })

  // Follow r-valgus → term-valgus (PRIMARY terminal)
  beat(['term-valgus'], valgusActive, 1200, { phase: 'valgus-terminal', isFirstAfterFork: true, autoPause: true })

  // Return to dp1, follow r-pain → term-pain (CONTRADICTED)
  beat(['term-pain'], valgusActive, 1000, { phase: 'pain-terminal', autoPause: true })

  // ── Phase 5: Follow nerve path ────────────────────────────────────────────
  const nerveActive = ['branch-nerve']
  beat(['t6'],       nerveActive, 800, { phase: 'nerve', isFirstAfterFork: true })
  beat(['term-nerve'], nerveActive, 1200, { phase: 'nerve-terminal', autoPause: true })

  // ── Phase 6a: Instability path — t7 → t8 → dp2 ───────────────────────────
  const ulnarActive = ['branch-instability', 'branch-ulnar', 'branch-radial', 'branch-ulnar-b', 'branch-ulnar-c']
  beat(['t8'], ulnarActive, 900, { phase: 'instability', isFirstAfterFork: true })

  // dp2 — nested decision point
  beat(['dp2'], ulnarActive, 400, {
    autoPause: true,
    isDecisionReveal: true,
    phase: 'dp2-reveal',
  })

  // dp2 children branch off one by one
  beat(['t9'],  ulnarActive, 500, { phase: 'dp2-branch-reveal', isBranchReveal: true })
  beat(['t10'], ulnarActive, 500, { phase: 'dp2-branch-reveal', isBranchReveal: true })

  // Follow instability sub-path first → term-instability (FLAGGED)
  beat(['term-instability'], ulnarActive, 1500, { phase: 'instability-terminal', isFirstAfterFork: true, autoPause: true })

  // ── Phase 6b: Ulnar sub-tree ──────────────────────────────────────────────
  beat(['tool2'], ulnarActive, 800, { phase: 'ulnar-evidence', isFirstAfterFork: true })
  beat(['ref2'],  ulnarActive, 800, { phase: 'ulnar-evidence' })

  // dp3 — deepest decision point
  beat(['dp3'], ulnarActive, 400, {
    autoPause: true,
    isDecisionReveal: true,
    phase: 'dp3-reveal',
  })

  // dp3 children branch off one by one
  beat(['t11'], ulnarActive, 400, { phase: 'dp3-branch-reveal', isBranchReveal: true })
  beat(['t12'], ulnarActive, 400, { phase: 'dp3-branch-reveal', isBranchReveal: true })
  beat(['t13'], ulnarActive, 400, { phase: 'dp3-branch-reveal', isBranchReveal: true })
  beat(['t14'], ulnarActive, 400, { phase: 'dp3-branch-reveal', isBranchReveal: true })

  // Follow each child to its terminal
  beat(['term-ulnar-a'], ulnarActive, 1000, { phase: 'ulnar-a-terminal', isFirstAfterFork: true, autoPause: true })
  beat(['term-radial'],  ulnarActive, 800,  { phase: 'radial-terminal', autoPause: true })
  beat(['term-ulnar-b'], ulnarActive, 800,  { phase: 'ulnar-b-terminal', autoPause: true })

  // Final convergence terminal — auto-pause for presenter highlight moment
  beat(['term-ulnar-c'], ulnarActive, 600, {
    autoPause: true,
    phase: 'convergence-moment',
  })

  // ── Phase 7: Full tree reveal ─────────────────────────────────────────────
  // All nodes already visible; bring all branches back to full opacity
  // The last beat just updates activeBranchIds to null (no new nodes)
  beats.push({
    visibleIds: [...visible],
    activeBranchIds: null,
    pauseMs: 3000,
    phase: 'full-tree',
  })

  return beats
}
