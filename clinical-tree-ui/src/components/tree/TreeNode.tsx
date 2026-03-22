/** TreeNode — individual node card rendered as SVG <g>. Left-border accent pattern. */
import React, { useState, useEffect } from 'react'
import { PositionedNode, DoctorAnnotation, ViewMode } from '../../types/tree'
import { NODE_H, NODE_H_ASSESSMENT, NODE_H_COMPLIANCE, NODE_H_DECISION, NODE_W } from '../../data/transformer'

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
function getNodeColors(node: PositionedNode, isPruned: boolean) {
  if (isPruned) {
    return {
      fill: 'url(#fill-flagged)',
      accent: 'var(--node-flagged-border)',
      label: 'var(--node-flagged-label)',
      text: 'var(--node-flagged-text)',
      glow: 'rgba(197,61,47,0.12)',
    }
  }

  // Reasoning start node — richer, more saturated blue than standard thought nodes
  if (node.is_reasoning_start) {
    return {
      fill: 'url(#fill-assessment)',
      accent: '#1A5FB4',
      label: '#1A5FB4',
      text: '#111',
      glow: 'rgba(26,95,180,0.10)',
    }
  }

  // Compliance check nodes: neutral slate card — result lives in a badge, not the card color
  if (node.is_compliance_check) {
    return {
      fill: 'url(#fill-compliance)',
      accent: '#64748B', // slate — distinct from all clinical node types
      label: '#64748B',
      text: '#334155',
      glow: 'none',
    }
  }

  if (node.is_decision_point) {
    return {
      fill: 'url(#fill-decision)',
      accent: 'var(--node-decision-border)',
      label: 'var(--node-decision-label)',
      text: 'var(--node-decision-text)',
      glow: 'var(--node-decision-glow)',
    }
  }
  switch (node.type) {
    case 'tool':
      return {
        fill: 'url(#fill-tool)',
        accent: 'var(--node-tool-border)',
        label: 'var(--node-tool-label)',
        text: 'var(--node-tool-text)',
        glow: 'none',
      }
    case 'citation':
      return {
        fill: 'url(#fill-citation)',
        accent: 'var(--node-citation-border)',
        label: 'var(--node-citation-label)',
        text: 'var(--node-citation-text)',
        glow: 'none',
      }
    default: // thought
      return {
        fill: 'url(#fill-thought)',
        accent: 'var(--node-thought-border)',
        label: 'var(--node-thought-label)',
        text: 'var(--node-thought-text)',
        glow: 'none',
      }
  }
}

function typeLabel(node: PositionedNode): string {
  if (node.is_compliance_check) return 'SAFETY CHECK'
  if (node.is_reasoning_start) return 'INITIAL ASSESSMENT'
  if (node.is_decision_point) return 'DECISION POINT'
  if (node.type === 'tool') return 'TOOL CALL'
  if (node.type === 'citation') return 'CITATION'
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
  pruneSource,
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
  const isCompliance = node.is_compliance_check ?? false
  const isAssessment = node.is_reasoning_start ?? false
  const h = isDec ? NODE_H_DECISION
           : isCompliance ? NODE_H_COMPLIANCE
           : isAssessment ? NODE_H_ASSESSMENT
           : NODE_H
  const w = node.width  // may differ from NODE_W (e.g. assessment nodes are wider)
  const colors = getNodeColors(node, isPruned)

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

        {/* Assessment start glow ring — subtler than decision, signals "reasoning begins" */}
        {isAssessment && (
          <rect
            x={-4}
            y={-4}
            width={w + 8}
            height={h + 8}
            rx={15}
            fill={colors.glow}
            stroke="#1A5FB4"
            strokeWidth={1}
            strokeOpacity={0.3}
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
          stroke="rgba(0,0,0,0.06)"
          strokeWidth={1}
          filter="url(#node-drop-shadow)"
        />

        {/* Specular top-edge highlight (Apple Glass effect) */}
        <rect
          x={5}
          y={0.5}
          width={w - 7}
          height={1}
          fill="rgba(255,255,255,1)"
          rx={1}
        />

        {/* Left accent border — 4px, clipped to card shape */}
        <rect
          x={0}
          y={0}
          width={4}
          height={h}
          fill={colors.accent}
          clipPath={`url(#clip-${node.id})`}
        />

        {/* ── Assessment start node: three-section layout ── */}
        {isAssessment ? (
          <>
            {/* Label row */}
            <text
              x={13}
              y={17}
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.1em',
                fill: colors.accent,
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              {typeLabel(node)}
            </text>

            {/* Patient context: demographics + chief complaint */}
            <text
              x={13}
              y={32}
              style={{
                fontSize: 9.5,
                fontWeight: 500,
                fill: 'rgba(0,0,0,0.55)',
                letterSpacing: '0.01em',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              {node.patient_context_summary ?? ''}
            </text>

            {/* Vitals row */}
            {node.patient_vitals_summary && (
              <text
                x={13}
                y={46}
                style={{
                  fontSize: 9,
                  fill: 'rgba(0,0,0,0.38)',
                  letterSpacing: '0.01em',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
              >
                {node.patient_vitals_summary}
              </text>
            )}

            {/* Hairline divider */}
            <line
              x1={13}
              y1={56}
              x2={w - 13}
              y2={56}
              stroke="rgba(26,95,180,0.15)"
              strokeWidth={1}
            />

            {/* Reasoning direction label */}
            <text
              x={13}
              y={70}
              style={{
                fontSize: 8.5,
                fontWeight: 700,
                letterSpacing: '0.09em',
                fill: 'rgba(26,95,180,0.50)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              PRIORITY DIRECTION
            </text>

            {/* Headline — the actual reasoning call */}
            <text
              x={13}
              y={89}
              style={{
                fontSize: 13.5,
                fontWeight: 600,
                fill: '#0f1a2e',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                textDecoration: isPruned ? 'line-through' : 'none',
              }}
            >
              {truncate(node.headline, 28)}
            </text>
          </>
        ) : isCompliance ? (
          <>
            {/* ── Compliance check node: label + badge + check name + detail ── */}

            {/* "SAFETY CHECK" label — slate, left */}
            <text
              x={13}
              y={15}
              style={{
                fontSize: 8.5,
                fontWeight: 700,
                letterSpacing: '0.1em',
                fill: colors.accent,
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              SAFETY CHECK
            </text>

            {/* Result badge — right-aligned pill */}
            {(() => {
              const result = node.compliance_result
              const badgeText  = result === 'pass' ? 'PASS' : result === 'warning' ? 'WARN' : result === 'fail' ? 'FAIL' : '?'
              const badgeW     = badgeText === 'PASS' || badgeText === 'WARN' ? 32 : 28
              const badgeFill  = result === 'pass' ? 'rgba(45,138,86,0.12)'  : result === 'warning' ? 'rgba(179,122,10,0.12)'  : 'rgba(197,61,47,0.12)'
              const badgeBorder= result === 'pass' ? 'rgba(45,138,86,0.28)'  : result === 'warning' ? 'rgba(179,122,10,0.28)'  : 'rgba(197,61,47,0.28)'
              const badgeColor = result === 'pass' ? '#2D8A56' : result === 'warning' ? '#B37A0A' : '#C53D2F'
              return (
                <g>
                  <rect x={w - badgeW - 8} y={5} width={badgeW} height={14} rx={3} fill={badgeFill} stroke={badgeBorder} strokeWidth={0.75} />
                  <text x={w - badgeW / 2 - 8} y={14.5} textAnchor="middle" style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: '0.06em', fill: badgeColor, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                    {badgeText}
                  </text>
                </g>
              )
            })()}

            {/* Check name — bold, prominent (part of headline before " — ") */}
            <text
              x={13}
              y={31}
              style={{
                fontSize: 12,
                fontWeight: 700,
                fill: '#1e293b',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                textDecoration: isPruned ? 'line-through' : 'none',
              }}
            >
              {truncate(node.headline.split(' — ')[0], 22)}
            </text>

            {/* Detail text — what was found / result summary */}
            <text
              x={13}
              y={47}
              style={{
                fontSize: 9,
                fill: 'rgba(0,0,0,0.42)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              {truncate(node.headline.split(' — ')[1] ?? '', 28)}
            </text>
          </>
        ) : (
          <>
            {/* ── Standard node: type label + headline ── */}
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
              {typeLabel(node)}
              {viewMode === 'architecture' && node.step_index !== undefined && (
                ` · ${node.step_index + 1}`
              )}
            </text>

            {/* Headline — standard (non-decision) nodes only */}
            {!isDec && (
              <text
                x={13}
                y={37}
                style={{
                  fontSize: 12.5,
                  fontWeight: 400,
                  fill: isPruned ? colors.text : '#111',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  textDecoration: isPruned ? 'line-through' : 'none',
                }}
              >
                {truncate(node.headline, 26)}
              </text>
            )}

            {/* Decision point enhancements */}
            {isDec && (() => {
              // Word-aware two-line split
              const words = node.headline.split(' ')
              let l1 = '', l2 = ''
              for (const word of words) {
                if ((l1 + ' ' + word).trim().length <= 22) l1 = (l1 + ' ' + word).trim()
                else { l2 = (l2 + ' ' + word).trim() }
              }

              // Branch count badge (top-right)
              const branchCount = node.children?.length ?? 0
              const badgeLabel = `${branchCount} paths`
              const badgeW = badgeLabel.length * 5.8 + 10

              return (
                <>
                  {/* Headline line 1 (word-aware) */}
                  <text x={13} y={38} style={{ fontSize: 12.5, fontWeight: 600, fill: '#111', fontFamily: 'system-ui, -apple-system, sans-serif', textDecoration: isPruned ? 'line-through' : 'none' }}>
                    {l1}
                  </text>
                  {/* Headline line 2 */}
                  {l2 && (
                    <text x={13} y={54} style={{ fontSize: 12.5, fontWeight: 600, fill: '#111', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                      {truncate(l2, 24)}
                    </text>
                  )}

                  {/* Branch count badge — top-right */}
                  <rect x={w - badgeW - 8} y={6} width={badgeW} height={14} rx={4} fill="rgba(212,149,10,0.12)" stroke="rgba(212,149,10,0.35)" strokeWidth={0.75} />
                  <text x={w - badgeW / 2 - 8} y={15.5} textAnchor="middle" style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: '0.05em', fill: '#9A6800', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                    {badgeLabel}
                  </text>

                </>
              )
            })()}
          </>
        )}

        {/* Architecture view: source/tool metadata — hidden on compliance nodes */}
        {viewMode === 'architecture' && !isCompliance && (
          <text
            x={13}
            y={h - 10}
            style={{
              fontSize: 8.5,
              fill: isAssessment ? 'rgba(26,95,180,0.45)' : 'rgba(0,0,0,0.38)',
              letterSpacing: '0.02em',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {sourceTypeLabel(node) ?? `step ${(node.step_index ?? 0) + 1}`}
          </text>
        )}

        {/* Clinical view: step number — hidden on compliance nodes */}
        {viewMode === 'clinical' && !isCompliance && (
          <text
            x={13}
            y={h - 10}
            style={{
              fontSize: 9,
              fill: isAssessment ? 'rgba(26,95,180,0.45)' : 'rgba(0,0,0,0.32)',
              letterSpacing: '0.02em',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {isAssessment ? 'Reasoning begins' : `step ${(node.step_index ?? 0) + 1}`}
          </text>
        )}

        {/* Citation source pill — bottom-right corner, citation nodes only */}
        {node.type === 'citation' && node.source && (() => {
          // Abridge: take text before colon or comma, strip edition suffixes
          const raw = node.source.replace(/,?\s*\d+(st|nd|rd|th)\s+ed\.?/i, '').trim()
          const label = raw.includes(':') ? raw.split(':')[0].trim() : raw.split(',')[0].trim()
          const pillW = Math.min(label.length * 5.2 + 14, 120)
          const pillX = w - pillW - 8
          const pillY = h - 22
          return (
            <g>
              <rect
                x={pillX} y={pillY}
                width={pillW} height={13}
                rx={3}
                fill="rgba(123,94,167,0.10)"
                stroke="rgba(123,94,167,0.28)"
                strokeWidth={0.75}
              />
              <text
                x={pillX + pillW / 2} y={pillY + 9}
                textAnchor="middle"
                style={{
                  fontSize: 7.5, fontWeight: 700, letterSpacing: '0.05em',
                  fill: '#7B5EA7',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
              >
                {label.length > 20 ? label.slice(0, 19) + '…' : label}
              </text>
            </g>
          )
        })()}

        {/* Tool name pill — bottom-right corner, tool nodes only */}
        {node.type === 'tool' && !isCompliance && node.tool_name && (() => {
          const label = node.tool_name.replace(/_/g, ' ')
          const pillW = Math.min(label.length * 5.2 + 14, 110)
          const pillX = w - pillW - 8
          const pillY = h - 22
          return (
            <g>
              <rect
                x={pillX} y={pillY}
                width={pillW} height={13}
                rx={3}
                fill="rgba(45,138,86,0.10)"
                stroke="rgba(45,138,86,0.28)"
                strokeWidth={0.75}
              />
              <text
                x={pillX + pillW / 2} y={pillY + 9}
                textAnchor="middle"
                style={{
                  fontSize: 7.5, fontWeight: 700, letterSpacing: '0.05em',
                  fill: '#2D8A56',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
              >
                {label.length > 18 ? label.slice(0, 17) + '…' : label}
              </text>
            </g>
          )
        })()}

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

        {/* Shield check indicator — vector shield with checkmark for passed checks */}
        {node.shield_checked && !node.shield_severity && (
          <g transform={`translate(${w - 17}, 2)`}>
            <g style={{
              animation: entered ? 'shield-check-in 350ms ease-out forwards' : 'none',
              opacity: entered ? 1 : 0,
              transformOrigin: '7.5px 8px',
            }}>
              <path
                d="M1.5,1.5 L13.5,1.5 L13.5,9 Q13.5,14 7.5,14.5 Q1.5,14 1.5,9 Z"
                fill={colors.accent}
                fillOpacity={0.18}
                stroke={colors.accent}
                strokeOpacity={0.5}
                strokeWidth={0.9}
                strokeLinejoin="round"
              />
              <polyline
                points="4,7.5 6.5,10.5 11,4.5"
                fill="none"
                stroke={colors.accent}
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          </g>
        )}

        {/* Shield violation indicator — red full-border glow ring */}
        {node.shield_severity && isPruned && pruneSource === 'shield' && (
          <>
            <rect
              x={-2} y={-2}
              width={w + 4} height={h + 4}
              rx={13}
              fill="none"
              stroke="#C53D2F"
              strokeWidth={2}
              strokeOpacity={0.7}
            />
            <g transform={`translate(${w - 17}, 2)`}>
              <g style={{
                animation: entered ? 'shield-violation-in 500ms ease-out forwards' : 'none',
                opacity: entered ? 1 : 0,
                transformOrigin: '7.5px 8px',
              }}>
                <path
                  d="M1.5,1.5 L13.5,1.5 L13.5,9 Q13.5,14 7.5,14.5 Q1.5,14 1.5,9 Z"
                  fill="rgba(197,61,47,0.18)"
                  stroke="rgba(197,61,47,0.55)"
                  strokeWidth={0.9}
                  strokeLinejoin="round"
                />
                <line x1={7.5} y1={4} x2={7.5} y2={9.5}
                  stroke="#C53D2F" strokeWidth={1.5} strokeLinecap="round" />
                <circle cx={7.5} cy={12} r={0.9} fill="#C53D2F" />
              </g>
            </g>
          </>
        )}
      </g>

      {/* Shield violation callout — rendered OUTSIDE the inner <g> so it's not clipped/scaled.
          Mirrors the same opacity/transition as the inner <g> so it fades with the node on focus. */}
      {node.shield_severity && isPruned && pruneSource === 'shield' && entered && (
        <g
          transform={`translate(${-10}, ${h + 10})`}
          style={{ opacity: targetOpacity, transition: 'opacity 200ms ease-out' }}
        >
          {/* Connector dashes */}
          <line
            x1={w / 2 + 10} y1={0}
            x2={w / 2 + 10} y2={10}
            stroke="#C53D2F" strokeWidth={1.5} strokeDasharray="3,2"
          />
          {/* Callout box */}
          <rect
            x={0} y={10} width={200} height={76}
            rx={7}
            fill="rgba(255,242,240,0.97)"
            stroke="#C53D2F"
            strokeWidth={1.5}
            filter="url(#node-drop-shadow)"
          />
          {/* Left red accent */}
          <rect x={0} y={10} width={4} height={76} rx={3}
            fill="#C53D2F" fillOpacity={0.8}
          />
          {/* Warning icon + label */}
          <text x={14} y={28}
            style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.08em', fill: '#C53D2F', fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >⚠ SHIELD: Safety violation</text>
          {/* Violation text — 2 lines extracted from prune_reason */}
          <text x={14} y={43}
            style={{ fontSize: 8.5, fill: '#7a2018', fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >Anticoagulation before confirmed</text>
          <text x={14} y={56}
            style={{ fontSize: 8.5, fill: '#7a2018', fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >troponin result — bleeding risk</text>
          {/* Guideline ref */}
          <text x={14} y={73}
            style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.04em', fill: '#C53D2F', fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >ACC/AHA §6.1</text>
        </g>
      )}
    </g>
  )
}
