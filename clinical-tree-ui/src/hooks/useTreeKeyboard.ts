/** useTreeKeyboard — keyboard navigation: arrows, escape, space, enter, brackets */
import React, { useEffect } from 'react'
import { FocusState, GrowthPlaybackState, TreeAction } from '../types/tree'

export function useTreeKeyboard(
  focusState: FocusState,
  growth: GrowthPlaybackState,
  dispatch: React.Dispatch<TreeAction>
): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't fire when typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) return

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault()
          if (focusState.mode === 'branch_focused') {
            dispatch({ type: 'NAVIGATE_PREV' })
          }
          break

        case 'ArrowRight':
          e.preventDefault()
          if (focusState.mode === 'branch_focused') {
            dispatch({ type: 'NAVIGATE_NEXT' })
          }
          break

        case 'ArrowUp':
          e.preventDefault()
          if (focusState.mode === 'branch_focused') {
            dispatch({ type: 'NAVIGATE_SIBLING_BRANCH', direction: 'up' })
          }
          break

        case 'ArrowDown':
          e.preventDefault()
          if (focusState.mode === 'branch_focused') {
            dispatch({ type: 'NAVIGATE_SIBLING_BRANCH', direction: 'down' })
          }
          break

        case 'Escape':
          if (focusState.mode === 'branch_focused') {
            dispatch({ type: 'CLEAR_FOCUS' })
          } else if (growth.mode === 'paused_exploring') {
            dispatch({ type: 'CLEAR_FOCUS' })
          }
          break

        case ' ':
          e.preventDefault()
          if (growth.mode === 'playing') {
            dispatch({ type: 'PAUSE_GROWTH' })
          } else if (
            growth.mode === 'paused_manual' ||
            growth.mode === 'paused_at_decision' ||
            growth.mode === 'paused_exploring'
          ) {
            dispatch({ type: 'RESUME_GROWTH' })
          }
          break

        case 'Enter':
          // No-op for now — detail panel opens via click; Enter re-selects current node
          break

        case '[':
          e.preventDefault()
          dispatch({ type: 'STEP_BACKWARD' })
          break

        case ']':
          e.preventDefault()
          dispatch({ type: 'STEP_FORWARD' })
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusState, growth, dispatch])
}
