/** GrowthControls — play/pause/step/skip bar shown during growth playback */
import React from 'react'
import { GrowthPlaybackState } from '../../types/tree'
import { GrowthCameraMode } from '../../hooks/useGrowthCamera'
import { PlayIcon, PauseIcon, LightningIcon } from '../shared/Icons'

interface Props {
  growth: GrowthPlaybackState
  totalNodes: number
  cameraMode: GrowthCameraMode
  onCameraMode: (mode: GrowthCameraMode) => void
  onPlay: () => void
  onPause: () => void
  onStepForward: () => void
  onStepBackward: () => void
  onSkipToEnd: () => void
  cinematicAutoPlay?: boolean
}

function getBeatIndex(growth: GrowthPlaybackState): number {
  if (growth.mode === 'idle') return 0
  return (growth as { beatIndex: number }).beatIndex
}

function getTotalBeats(growth: GrowthPlaybackState): number {
  if (growth.mode === 'idle') return 0
  const seq = (growth as { sequence: unknown[] }).sequence
  return seq?.length ?? 0
}

export default function GrowthControls({
  growth,
  totalNodes,
  cameraMode,
  onCameraMode,
  onPlay,
  onPause,
  onStepForward,
  onStepBackward,
  onSkipToEnd,
  cinematicAutoPlay = false,
}: Props) {
  const beatIndex = getBeatIndex(growth)
  const totalBeats = getTotalBeats(growth)
  const isPlaying = growth.mode === 'playing'
  const isPausedAtDecision = growth.mode === 'paused_at_decision'
  const isPausedExploring = growth.mode === 'paused_exploring'
  const progress = totalBeats > 1 ? beatIndex / (totalBeats - 1) : 0

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
      {/* Auto-pause label — hidden in cinematic mode since we auto-advance */}
      {isPausedAtDecision && !cinematicAutoPlay && (
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
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><LightningIcon size={10} color="#B8800A" /> Decision point</span>
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

      {/* Step back — hidden in cinematic mode */}
      {!cinematicAutoPlay && (
      <button
        onClick={onStepBackward}
        title="Step back ([)"
        style={{ ...btnBase, width: 28, height: 28 }}
      >
        ‹
      </button>
      )}

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
        {isPlaying ? <PauseIcon size={12} color="currentColor" /> : <PlayIcon size={12} color="currentColor" />}
      </button>

      {/* Step forward — hidden in cinematic mode */}
      {!cinematicAutoPlay && (
      <button
        onClick={onStepForward}
        title="Step forward (])"
        style={{ ...btnBase, width: 28, height: 28 }}
      >
        ›
      </button>
      )}

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
          Beat {beatIndex + 1} / {totalBeats} · {totalNodes} nodes
        </div>
      </div>

      {/* Camera mode toggle */}
      <div
        style={{
          display: 'flex',
          borderRadius: 8,
          overflow: 'hidden',
          border: '1px solid rgba(0,0,0,0.1)',
          flexShrink: 0,
        }}
      >
        {(['follow', 'overview', 'parallel'] as GrowthCameraMode[]).map(mode => (
          <button
            key={mode}
            onClick={() => onCameraMode(mode)}
            title={
              mode === 'follow'   ? 'Follow primary path' :
              mode === 'overview' ? 'Zoom out to show all branches' :
                                    'All branches grow simultaneously'
            }
            style={{
              height: 24,
              padding: '0 8px',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.04em',
              cursor: 'pointer',
              border: 'none',
              borderRight: mode !== 'parallel' ? '1px solid rgba(0,0,0,0.1)' : 'none',
              background: cameraMode === mode ? 'rgba(59,125,216,0.12)' : 'rgba(0,0,0,0.03)',
              color: cameraMode === mode ? '#1A52A8' : 'rgba(0,0,0,0.4)',
              transition: 'all 100ms ease-out',
            }}
          >
            {mode === 'follow' ? '⊙ Follow' : mode === 'overview' ? '⊕ Overview' : '⑃ Parallel'}
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
