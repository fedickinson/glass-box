/** useGrowthTimer — fires GROWTH_TICK after each beat's pauseMs delay.
 *  Uses setTimeout (not setInterval) so each beat can have its own duration.
 *  Auto-pause beats are handled by the reducer — the timer just doesn't run
 *  when mode is not 'playing'.
 *
 *  Speed is read from the growth state and applied as a multiplier to pauseMs:
 *    slow   × 2.5  — deliberate pacing for narration
 *    medium × 1.0  — default
 *    fast   × 0.35 — brisk demo run
 */
import { useEffect } from 'react'
import { GrowthPlaybackState, AnimationBeat, TreeAction, GrowthSpeedSetting } from '../types/tree'

const SPEED_MULTIPLIER: Record<GrowthSpeedSetting, number> = {
  slow: 2.5,
  medium: 1.0,
  fast: 0.35,
}

export function useGrowthTimer(
  growth: GrowthPlaybackState,
  dispatch: React.Dispatch<TreeAction>,
): void {
  const isPlaying = growth.mode === 'playing'
  const isPausedAtDecision = growth.mode === 'paused_at_decision'

  const beatIndex = (isPlaying || isPausedAtDecision)
    ? (growth as { beatIndex: number }).beatIndex
    : -1

  const currentBeat: AnimationBeat | undefined = (isPlaying || isPausedAtDecision)
    ? (growth as { sequence: AnimationBeat[] }).sequence[beatIndex]
    : undefined

  const speed = (isPlaying || isPausedAtDecision)
    ? (growth as { speed: GrowthSpeedSetting }).speed
    : 'medium'

  const scaledMs = Math.round((currentBeat?.pauseMs ?? 1000) * SPEED_MULTIPLIER[speed])
  const pauseMs = currentBeat?.holdMs != null
    ? Math.max(currentBeat.holdMs, scaledMs)
    : scaledMs

  // Normal play: advance to next beat after pauseMs
  useEffect(() => {
    if (!isPlaying) return
    const id = setTimeout(() => dispatch({ type: 'GROWTH_TICK' }), pauseMs)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, beatIndex, dispatch])

  // Auto-advance through decision pauses — resumes after the beat's pauseMs
  // so the decision-point pulse animation plays before continuing
  useEffect(() => {
    if (!isPausedAtDecision) return
    const id = setTimeout(() => dispatch({ type: 'RESUME_GROWTH' }), pauseMs)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPausedAtDecision, beatIndex, dispatch])
}
