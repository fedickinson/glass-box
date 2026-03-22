/** useGrowthTimer — fires GROWTH_TICK after each beat's pauseMs delay.
 *  Uses setTimeout (not setInterval) so each beat can have its own duration.
 *  Auto-pause beats are handled by the reducer — the timer just doesn't run
 *  when mode is not 'playing'.
 *
 *  When cinematicAutoPlay is true, also auto-advances through paused_at_decision
 *  beats by dispatching RESUME_GROWTH after the beat's pauseMs delay.
 */
import { useEffect } from 'react'
import { GrowthPlaybackState, AnimationBeat, TreeAction } from '../types/tree'

export function useGrowthTimer(
  growth: GrowthPlaybackState,
  dispatch: React.Dispatch<TreeAction>,
  cinematicAutoPlay = false
): void {
  const isPlaying = growth.mode === 'playing'
  const isPausedAtDecision = growth.mode === 'paused_at_decision'
  const beatIndex = (isPlaying || isPausedAtDecision) ? growth.beatIndex : -1
  const currentBeat: AnimationBeat | undefined = (isPlaying || isPausedAtDecision)
    ? growth.sequence[growth.beatIndex]
    : undefined
  const pauseMs = currentBeat?.pauseMs ?? 1000

  // Normal play timer
  useEffect(() => {
    if (!isPlaying) return
    const id = setTimeout(() => dispatch({ type: 'GROWTH_TICK' }), pauseMs)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, beatIndex, dispatch])

  // Cinematic auto-advance through decision pauses
  useEffect(() => {
    if (!cinematicAutoPlay || !isPausedAtDecision) return
    const id = setTimeout(() => dispatch({ type: 'RESUME_GROWTH' }), pauseMs)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cinematicAutoPlay, isPausedAtDecision, beatIndex, dispatch])
}
