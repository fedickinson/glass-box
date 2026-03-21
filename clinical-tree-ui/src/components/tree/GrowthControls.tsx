/** GrowthControls — play/pause/step/speed/skip bar shown during growth playback */
import React from 'react'
import { GrowthPlaybackState, GrowthSpeed } from '../../types/tree'

interface Props {
  growth: GrowthPlaybackState
  totalNodes: number
  onPlay: () => void
  onPause: () => void
  onStepForward: () => void
  onStepBackward: () => void
  onSetSpeed: (speed: GrowthSpeed) => void
  onSkipToEnd: () => void
}

const SPEEDS: GrowthSpeed[] = [400, 200, 100]
const SPEED_LABELS: Record<GrowthSpeed, string> = { 400: 'Slow', 200: 'Normal', 100: 'Fast' }

function getCursor(growth: GrowthPlaybackState): number {
  if (growth.mode === 'idle') return 0
  return (growth as { cursor: number }).cursor
}

function getCurrentSpeed(growth: GrowthPlaybackState): GrowthSpeed {
  if (growth.mode === 'playing') return growth.speed
  return 200
}

export default function GrowthControls({
  growth,
  totalNodes,
  onPlay,
  onPause,
  onStepForward,
  onStepBackward,
  onSetSpeed,
  onSkipToEnd,
}: Props) {
  const cursor = getCursor(growth)
  const isPlaying = growth.mode === 'playing'
  const isPausedAtDecision = growth.mode === 'paused_at_decision'
  const isPausedExploring = growth.mode === 'paused_exploring'
  const currentSpeed = getCurrentSpeed(growth)
  const progress = totalNodes > 1 ? cursor / (totalNodes - 1) : 0

  const btnBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    cursor: 'pointer',
    border: '1px solid rgba(0,0,0,0.1)',
    background: 'rgba(255,255,255,0.85)',
    color: 'rgba(0,0,0,0.6)',
    fontSize: 12,
    fontWeight: 600,
    transition: 'all 100ms ease-out',
  }

  return (
    <div
      style={{
        padding: '8px 16px',
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(0,0,0,0.07)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
      }}
    >
      {/* Auto-pause label */}
      {isPausedAtDecision && (
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#B8800A',
            background: 'rgba(212,149,10,0.1)',
            border: '1px solid rgba(212,149,10,0.25)',
            borderRadius: 20,
            padding: '3px 9px',
            flexShrink: 0,
          }}
        >
          ⚡ Decision point
        </div>
      )}

      {/* Exploring label */}
      {isPausedExploring && (
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#1A52A8',
            background: 'rgba(59,125,216,0.1)',
            border: '1px solid rgba(59,125,216,0.22)',
            borderRadius: 20,
            padding: '3px 9px',
            flexShrink: 0,
          }}
        >
          Exploring — press Space to resume
        </div>
      )}

      {/* Step back */}
      <button
        onClick={onStepBackward}
        title="Step back ([)"
        style={{ ...btnBase, width: 28, height: 28 }}
      >
        ‹
      </button>

      {/* Play / Pause */}
      <button
        onClick={isPlaying ? onPause : onPlay}
        title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        style={{
          ...btnBase,
          width: 32,
          height: 32,
          background: isPlaying ? 'rgba(59,125,216,0.12)' : 'rgba(59,125,216,0.08)',
          border: '1px solid rgba(59,125,216,0.2)',
          color: '#1A52A8',
          fontSize: 14,
        }}
      >
        {isPlaying ? '⏸' : '▶'}
      </button>

      {/* Step forward */}
      <button
        onClick={onStepForward}
        title="Step forward (])"
        style={{ ...btnBase, width: 28, height: 28 }}
      >
        ›
      </button>

      {/* Progress bar + counter */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            height: 3,
            background: 'rgba(0,0,0,0.08)',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${progress * 100}%`,
              background: 'var(--conn-primary-color)',
              borderRadius: 2,
              transition: 'width 200ms ease-out',
            }}
          />
        </div>
        <div
          style={{
            fontSize: 9,
            color: 'rgba(0,0,0,0.35)',
            marginTop: 3,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {cursor + 1} / {totalNodes} nodes
        </div>
      </div>

      {/* Speed buttons */}
      <div style={{ display: 'flex', gap: 3 }}>
        {SPEEDS.map(s => (
          <button
            key={s}
            onClick={() => onSetSpeed(s)}
            style={{
              ...btnBase,
              height: 24,
              padding: '0 8px',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.04em',
              background: currentSpeed === s ? 'rgba(59,125,216,0.12)' : 'rgba(0,0,0,0.04)',
              border: currentSpeed === s ? '1px solid rgba(59,125,216,0.3)' : '1px solid rgba(0,0,0,0.08)',
              color: currentSpeed === s ? '#1A52A8' : 'rgba(0,0,0,0.45)',
            }}
          >
            {SPEED_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Skip to end */}
      <button
        onClick={onSkipToEnd}
        title="Skip to end"
        style={{ ...btnBase, height: 24, padding: '0 10px', fontSize: 9, fontWeight: 700, letterSpacing: '0.04em' }}
      >
        Skip ⏭
      </button>
    </div>
  )
}
