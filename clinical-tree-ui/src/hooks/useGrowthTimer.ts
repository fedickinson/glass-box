/** useGrowthTimer — fires GROWTH_TICK after each beat's pauseMs delay.
 *  Uses setTimeout (not setInterval) so each beat can have its own duration.
 *  Auto-pause beats are handled by the reducer — the timer just doesn't run
 *  when mode is not 'playing'.
 */
import { useEffect } from 'react'
import { GrowthPlaybackState, AnimationBeat, TreeAction } from '../types/tree'

export function useGrowthTimer(
  growth: GrowthPlaybackState,
  dispatch: React.Dispatch<TreeAction>
): void {
  const isPlaying = growth.mode === 'playing'
  const beatIndex = isPlaying ? growth.beatIndex : -1
  const currentBeat: AnimationBeat | undefined = isPlaying
    ? growth.sequence[growth.beatIndex]
    : undefined
  const pauseMs = currentBeat?.pauseMs ?? 1000

  useEffect(() => {
    if (!isPlaying) return
    const id = setTimeout(() => dispatch({ type: 'GROWTH_TICK' }), pauseMs)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, beatIndex, dispatch])
}
