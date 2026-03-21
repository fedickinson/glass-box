/** TreeNode — individual node card rendered as SVG <g>. Left-border accent pattern. */
import React from 'react'
import { PositionedNode, DoctorAnnotation, ViewMode } from '../../types/tree'
import { NODE_H, NODE_H_DECISION } from '../../data/transformer'

export type FocusRole = 'none' | 'on_focused_branch' | 'selected' | 'dimmed'

interface Props {
  node: PositionedNode
  focusRole: FocusRole
  isPruned: boolean
  pruneSource?: 'shield' | 'doctor'
  isVisible: boolean
  isGrowthPaused: boolean
  isHovered?: boolean
  annotations: DoctorAnnotation[]
  viewMode: ViewMode
  onClick: () => void
}

// ── Color helpers ────────────────────────────────────────────────────
function getNodeColors(
  type: PositionedNode['type'],
  isDecision: boolean,
  isPruned: boolean
) {
  if (isPruned) {
    return {
      fill: 'var(--node-flagged-fill)',
      accent: 'var(--node-flagged-border)',
      label: 'var(--node-flagged-label)',
      text: 'var(--node-flagged-text)',
      glow: 'rgba(197,61,47,0.12)',
    }
  }
  if (isDecision) {
    return {
      fill: 'var(--node-decision-fill)',
      accent: 'var(--node-decision-border)',
      label: 'var(--node-decision-label)',
      text: 'var(--node-decision-text)',
      glow: 'var(--node-decision-glow)',
    }
  }
  switch (type) {
    case 'tool':
      return {
        fill: 'var(--node-tool-fill)',
        accent: 'var(--node-tool-border)',
        label: 'var(--node-tool-label)',
        text: 'var(--node-tool-text)',
        glow: 'none',
      }
    case 'citation':
      return {
        fill: 'var(--node-citation-fill)',
        accent: 'var(--node-citation-border)',
        label: 'var(--node-citation-label)',
        text: 'var(--node-citation-text)',
        glow: 'none',
      }
    default: // thought
      return {
        fill: 'var(--node-thought-fill)',
        accent: 'var(--node-thought-border)',
        label: 'var(--node-thought-label)',
        text: 'var(--node-thought-text)',
        glow: 'none',
      }
  }
}

function typeLabel(type: PositionedNode['type'], isDecision: boolean): string {
  if (isDecision) return 'DECISION POINT'
  if (type === 'tool') return 'TOOL CALL'
  if (type === 'citation') return 'CITATION'
  return 'REASONING'
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

// ── Component ────────────────────────────────────────────────────────
export default function TreeNode({
  node,
  focusRole,
  isPruned,
  pruneSource,
  isVisible,
  isGrowthPaused,
  isHovered,
  annotations,
  viewMode,
  onClick,
}: Props) {
  if (!isVisible) return null

  const isDec = node.is_decision_point
  const h = isDec ? NODE_H_DECISION : NODE_H
  const w = node.width
  const colors = getNodeColors(node.type, isDec, isPruned)

  // Focus-driven visual treatment
  const opacity = focusRole === 'dimmed' ? 0.22 : 1
  const scale = focusRole === 'selected' ? 1.03 : focusRole === 'dimmed' ? 0.97 : 1
  const selectedRing = focusRole === 'selected'
  const hoverRing = isHovered && focusRole !== 'selected'

  // Annotation badge colors
  const annotationColors: Record<string, string> = {
    flag: '#C53D2F',
    context: '#3B7DD8',
    challenge: '#D4950A',
    pin: '#2D8A56',
  }

  return (
    <g
      transform={`translate(${node.x + w / 2}, ${node.y + h / 2}) scale(${scale}) translate(${-(w / 2)}, ${-(h / 2)})`}
      style={{
        cursor: 'pointer',
        opacity,
        transition: 'opacity 200ms ease-out',
      }}
      onClick={e => {
        e.stopPropagation()
        onClick()
      }}
    >
      {/* Decision point glow ring */}
      {isDec && (
        <rect
          x={-5}
          y={-5}
          width={w + 10}
          height={h + 10}
          rx={16}
          fill={colors.glow}
          stroke={colors.accent}
          strokeWidth={1.5}
          strokeOpacity={0.4}
        />
      )}

      {/* Selection ring */}
      {selectedRing && (
        <rect
          x={-3}
          y={-3}
          width={w + 6}
          height={h + 6}
          rx={14}
          fill="none"
          stroke={colors.accent}
          strokeWidth={2}
          strokeOpacity={0.7}
        />
      )}

      {/* Hover ring (synthesis panel hover) */}
      {hoverRing && (
        <rect
          x={-3}
          y={-3}
          width={w + 6}
          height={h + 6}
          rx={14}
          fill="none"
          stroke={colors.accent}
          strokeWidth={1.5}
          strokeOpacity={0.45}
          strokeDasharray="4,3"
        />
      )}

      {/* Card background — clipped to accent border shape via defs in TreeCanvas */}
      <rect
        x={0}
        y={0}
        width={w}
        height={h}
        rx={12}
        fill={colors.fill}
        stroke="rgba(255,255,255,0.85)"
        strokeWidth={1}
        filter="url(#node-drop-shadow)"
      />

      {/* Left accent border — clipped to card shape */}
      <rect
        x={0}
        y={0}
        width={4}
        height={h}
        fill={colors.accent}
        clipPath={`url(#clip-${node.id})`}
      />

      {/* Type label */}
      <text
        x={13}
        y={19}
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.1em',
          fill: colors.accent,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {typeLabel(node.type, isDec)}
      </text>

      {/* Headline */}
      <text
        x={13}
        y={isDec ? 40 : 37}
        style={{
          fontSize: 12.5,
          fontWeight: isDec ? 600 : 400,
          fill: '#111',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {truncate(node.headline, 26)}
      </text>

      {/* Second line for decision points (more room) */}
      {isDec && node.headline.length > 26 && (
        <text
          x={13}
          y={56}
          style={{
            fontSize: 12.5,
            fontWeight: 600,
            fill: '#111',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {truncate(node.headline.slice(25), 26)}
        </text>
      )}

      {/* Step / tool metadata */}
      <text
        x={13}
        y={h - 10}
        style={{
          fontSize: 9,
          fill: 'rgba(0,0,0,0.32)',
          letterSpacing: '0.02em',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {viewMode === 'architecture' && node.tool_name
          ? `${node.tool_name} · ${node.latency_ms}ms · step ${(node.step_index ?? 0) + 1}`
          : `step ${(node.step_index ?? 0) + 1}`}
      </text>

      {/* Annotation badges — top-right corner */}
      {annotations.length > 0 && (
        <g>
          {annotations.slice(0, 3).map((ann, i) => (
            <circle
              key={ann.id}
              cx={w - 9 - i * 11}
              cy={9}
              r={4.5}
              fill={annotationColors[ann.type] ?? '#888'}
              stroke="rgba(255,255,255,0.9)"
              strokeWidth={1.5}
            />
          ))}
        </g>
      )}

      {/* Shield flag indicator — small red dot bottom-right */}
      {node.shield_severity && (
        <circle
          cx={w - 9}
          cy={h - 9}
          r={4}
          fill="var(--node-flagged-border)"
          stroke="rgba(255,255,255,0.8)"
          strokeWidth={1}
        />
      )}
    </g>
  )
}
