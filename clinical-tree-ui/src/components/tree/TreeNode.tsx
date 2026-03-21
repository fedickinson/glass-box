/** TreeNode — individual node card rendered as SVG <g>. Left-border accent pattern. */
import React, { useState, useEffect } from 'react'
import { PositionedNode, DoctorAnnotation, ViewMode } from '../../types/tree'
import { NODE_H, NODE_H_DECISION, NODE_W } from '../../data/transformer'

export type FocusRole = 'none' | 'on_focused_branch' | 'selected' | 'dimmed'

interface Props {
  node: PositionedNode
  focusRole: FocusRole
  isPruned: boolean
  pruneSource?: 'shield' | 'doctor'
  isVisible: boolean
  isDecisionAutoPaused: boolean  // true when this is the node that triggered auto-pause
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

// Source type labels for architecture view
function sourceTypeLabel(node: PositionedNode): string | null {
  if (node.type === 'tool') return `${node.tool_name ?? 'tool'} · ${node.latency_ms ?? '?'}ms`
  if (node.type === 'citation') return node.source ?? null
  return null
}

// ── Component ────────────────────────────────────────────────────────
export default function TreeNode({
  node,
  focusRole,
  isPruned,
  isVisible,
  isDecisionAutoPaused,
  isHovered,
  annotations,
  viewMode,
  onClick,
}: Props) {
  // Entrance animation: mount hidden, flip to visible on next frame
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true))
    })
    return () => cancelAnimationFrame(raf)
  }, [])

  if (!isVisible) return null

  const isDec = node.is_decision_point
  const h = isDec ? NODE_H_DECISION : NODE_H
  const w = NODE_W
  const colors = getNodeColors(node.type, isDec, isPruned)

  // Focus-driven visual treatment
  const targetOpacity = focusRole === 'dimmed' ? 0.22 : 1
  const focusScale = focusRole === 'selected' ? 1.03 : 1
  const selectedRing = focusRole === 'selected'
  const hoverRing = isHovered && focusRole !== 'selected'

  // Annotation badge colors
  const annotationColors: Record<string, string> = {
    flag: '#C53D2F',
    context: '#3B7DD8',
    challenge: '#D4950A',
    pin: '#2D8A56',
  }

  // Node center for scale-from-center transform
  const cx = w / 2
  const cy = h / 2

  return (
    // Outer <g>: absolute position in SVG canvas
    <g transform={`translate(${node.x}, ${node.y})`}>
      {/* Inner <g>: entrance animation + focus scale, both centered on node */}
      <g
        style={{
          opacity: entered ? targetOpacity : 0,
          transform: `translate(${cx}px, ${cy}px) scale(${entered ? focusScale : 0.88}) translate(${-cx}px, ${-cy}px)`,
          transition: entered
            ? 'opacity 200ms ease-out, transform 200ms ease-out'
            : 'none',
          cursor: 'pointer',
        }}
        onClick={e => {
          e.stopPropagation()
          onClick()
        }}
      >
        {/* Decision point auto-pause pulse rings */}
        {isDec && isDecisionAutoPaused && (
          <>
            <circle
              cx={cx}
              cy={cy}
              r={0}
              fill="none"
              stroke="var(--node-decision-border)"
              strokeWidth={2}
              style={{ animation: 'decision-pulse 2s ease-out infinite' }}
            />
            <circle
              cx={cx}
              cy={cy}
              r={0}
              fill="none"
              stroke="var(--node-decision-border)"
              strokeWidth={1.5}
              style={{ animation: 'decision-pulse 2s ease-out 0.4s infinite' }}
            />
            <circle
              cx={cx}
              cy={cy}
              r={0}
              fill="none"
              stroke="var(--node-decision-border)"
              strokeWidth={1}
              style={{ animation: 'decision-pulse 2s ease-out 0.8s infinite' }}
            />
          </>
        )}

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

        {/* Card background */}
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
          {viewMode === 'architecture' && node.step_index !== undefined && (
            ` · ${node.step_index + 1}`
          )}
        </text>

        {/* Headline */}
        <text
          x={13}
          y={isDec ? 40 : 37}
          style={{
            fontSize: 12.5,
            fontWeight: isDec ? 600 : 400,
            fill: isPruned ? colors.text : '#111',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            textDecoration: isPruned ? 'line-through' : 'none',
          }}
        >
          {truncate(node.headline, 26)}
        </text>

        {/* Second line for decision points */}
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

        {/* Architecture view: source/tool metadata */}
        {viewMode === 'architecture' && (
          <text
            x={13}
            y={h - 10}
            style={{
              fontSize: 8.5,
              fill: 'rgba(0,0,0,0.38)',
              letterSpacing: '0.02em',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {sourceTypeLabel(node) ?? `step ${(node.step_index ?? 0) + 1}`}
          </text>
        )}

        {/* Clinical view: step number */}
        {viewMode === 'clinical' && (
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
            {`step ${(node.step_index ?? 0) + 1}`}
          </text>
        )}

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
    </g>
  )
}
