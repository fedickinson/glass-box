/** useGrowthTimer — growth animation timer stub. No-op in Stage 1; wired in Stage 5. */
import React from 'react'
import { GrowthPlaybackState, TreeAction } from '../types/tree'

export function useGrowthTimer(
  _growth: GrowthPlaybackState,
  _dispatch: React.Dispatch<TreeAction>
): void {
  // Stage 5: sets up a setInterval that dispatches GROWTH_TICK at growth.speed ms intervals.
  // Auto-pauses when cursor reaches a decision point node (GROWTH_AUTO_PAUSE).
  // Clears interval on pause/stop/unmount.
}
