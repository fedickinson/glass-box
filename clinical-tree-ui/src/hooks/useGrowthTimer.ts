/** useGrowthTimer — dispatches GROWTH_TICK at growth.speed intervals while playing */
import { useEffect } from 'react'
import { GrowthPlaybackState, TreeAction } from '../types/tree'

export function useGrowthTimer(
  growth: GrowthPlaybackState,
  dispatch: React.Dispatch<TreeAction>
): void {
  const isPlaying = growth.mode === 'playing'
  const speed = isPlaying ? (growth as { speed: number }).speed : 200

  useEffect(() => {
    if (!isPlaying) return
    const id = setInterval(() => dispatch({ type: 'GROWTH_TICK' }), speed)
    return () => clearInterval(id)
  }, [isPlaying, speed, dispatch])
}
