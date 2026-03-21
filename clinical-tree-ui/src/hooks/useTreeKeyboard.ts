/** useTreeKeyboard — keyboard navigation handler stub. Logs key events; wired in Stage 3. */
import React, { useEffect } from 'react'
import { FocusState, GrowthPlaybackState, TreeAction } from '../types/tree'

export function useTreeKeyboard(
  focusState: FocusState,
  growth: GrowthPlaybackState,
  dispatch: React.Dispatch<TreeAction>
): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case 'ArrowLeft':
          console.log('[keyboard] ArrowLeft — navigate prev')
          break
        case 'ArrowRight':
          console.log('[keyboard] ArrowRight — navigate next')
          break
        case 'ArrowUp':
          console.log('[keyboard] ArrowUp — sibling branch up')
          break
        case 'ArrowDown':
          console.log('[keyboard] ArrowDown — sibling branch down')
          break
        case 'Escape':
          console.log('[keyboard] Escape — clear focus')
          break
        case ' ':
          console.log('[keyboard] Space — toggle growth play/pause')
          e.preventDefault()
          break
        case 'Enter':
          console.log('[keyboard] Enter — select / confirm')
          break
        case '[':
          console.log('[keyboard] [ — step backward')
          break
        case ']':
          console.log('[keyboard] ] — step forward')
          break
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusState, growth, dispatch])
}
