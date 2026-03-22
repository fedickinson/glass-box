/** TerminalCard — compact verdict label at each branch endpoint.
 *  210×120px. Clicking opens BranchConclusionPanel (not NodeDetail).
 */
import React, { useState, useEffect } from 'react'
import { PositionedNode, Convergence, PruneSource } from '../../types/tree'
import { FocusRole } from './TreeNode'

export type TerminalVariant = 'converging' | 'divergent' | 'supported' | 'flagged' | 'not_supported' | 'shield_killed' | 'doctor_pruned'

/** Derive the terminal variant from node data — single source of truth. */
export function deriveTerminalVariant(
  node: Pick<PositionedNode, 'id' | 'terminal_contradiction' | 'terminal_safety_checks'>,
  isPruned: boolean,
  pruneSource: PruneSource | null | undefined,
  convergences: Convergence[]
): TerminalVariant {
  if (isPruned && pruneSource === 'shield') return 'shield_killed'
  if (isPruned) return 'doctor_pruned'
  if (convergences.some(c => c.terminalNodeIds.includes(node.id) && c.terminalNodeIds.length > 1)) return 'converging'
  if (node.terminal_contradiction) return 'not_supported'
  if (node.terminal_safety_checks?.some(c => c.status === 'flag')) return 'flagged'
  if (node.terminal_safety_checks?.length && node.terminal_safety_checks.every(c => c.status === 'warn')) return 'not_supported'
  return 'supported'
}

interface Props {
  node: PositionedNode
  variant: TerminalVariant
  convergences: Convergence[]
  focusRole: FocusRole
  isVisible: boolean
  onClick: () => void
}

const VARIANT_CONFIG = {
  converging: {
    stripe: '#2D8A56',
    border: 'rgba(45,138,86,0.30)',
    labelColor: '#2D8A56',
    label: 'CONVERGING',
    fill: 'rgba(245,252,248,0.97)',
    textColor: '#0f4023',
    verdictColor: 'rgba(45,138,86,0.75)',
  },
  divergent: {
    stripe: '#64748B',
    border: 'rgba(100,116,139,0.25)',
    labelColor: '#64748B',
    label: 'DIVERGENT',
    fill: 'rgba(248,249,252,0.97)',
    textColor: '#1e293b',
    verdictColor: 'rgba(100,116,139,0.70)',
  },
  supported: {
    stripe: '#3B7DD8',
    border: 'rgba(59,125,216,0.25)',
    labelColor: '#3B7DD8',
    label: 'SUPPORTED',
    fill: 'rgba(241,246,255,0.97)',
    textColor: '#1a3a6b',
    verdictColor: 'rgba(59,125,216,0.70)',
  },
  flagged: {
    stripe: '#C45A10',
    border: 'rgba(196,90,16,0.30)',
    labelColor: '#C45A10',
    label: 'FLAGGED',
    fill: 'rgba(255,246,237,0.97)',
    textColor: '#7a3000',
    verdictColor: 'rgba(196,90,16,0.72)',
  },
  not_supported: {
    stripe: '#94A3B8',
    border: 'rgba(148,163,184,0.22)',
    labelColor: '#94A3B8',
    label: 'NOT SUPPORTED',
    fill: 'rgba(248,249,252,0.97)',
    textColor: '#64748B',
    verdictColor: 'rgba(148,163,184,0.65)',
  },
  shield_killed: {
    stripe: '#C53D2F',
    border: 'rgba(197,61,47,0.32)',
    labelColor: '#C53D2F',
    label: 'TERMINATED',
    fill: 'rgba(255,247,246,0.97)',
    textColor: '#7a1a12',
    verdictColor: 'rgba(197,61,47,0.75)',
  },
  doctor_pruned: {
    stripe: '#64748B',
    border: 'rgba(100,116,139,0.22)',
    labelColor: '#64748B',
    label: 'PRUNED',
    fill: 'rgba(248,249,252,0.97)',
    textColor: '#475569',
    verdictColor: 'rgba(100,116,139,0.55)',
  },
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

/** Returns the verdict text for the card — untruncated; callers split for two-line rendering. */
function buildVerdict(node: PositionedNode, variant: TerminalVariant): string {
  if (variant === 'shield_killed') return 'Terminated — safety violation'
  if (variant === 'doctor_pruned') return 'Pruned — clinician decision'
  const summary = node.terminal_summary ?? node.content
  return truncate(summary, 72)
}

export default function TerminalCard({
  node, variant, convergences, focusRole, isVisible, onClick,
}: Props) {
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setEntered(true)))
    return () => cancelAnimationFrame(raf)
  }, [])

  if (!isVisible) return null

  const cfg = VARIANT_CONFIG[variant]
  const w = node.width   // 200
  const h = node.height  // 80

  const isPruned = variant === 'shield_killed' || variant === 'doctor_pruned'

  const targetOpacity = focusRole === 'dimmed' ? 0.18
    : isPruned && focusRole === 'none' ? 0.55
    : 1
  const focusScale = focusRole === 'selected' ? 1.03 : 1
  const cx = w / 2
  const cy = h / 2

  // Convergence badge: other branches reaching the same diagnosis
  const sameGroup = convergences.find(c => c.terminalNodeIds.includes(node.id))
  const otherConverging = sameGroup
    ? sameGroup.terminalNodeIds.filter(id => id !== node.id).length
    : 0

  const diagName = truncate(node.diagnosis ?? 'Unknown', 24)
  const verdict = buildVerdict(node, variant)

  return (
    <g transform={`translate(${node.x}, ${node.y})`}>
      <g
        style={{
          opacity: entered ? targetOpacity : 0,
          transform: `translate(${cx}px,${cy}px) scale(${entered ? focusScale : 0.88}) translate(${-cx}px,${-cy}px)`,
          transition: entered ? 'opacity 220ms ease-out, transform 220ms ease-out' : 'none',
          cursor: 'pointer',
        }}
        onClick={e => { e.stopPropagation(); onClick() }}
      >
        {/* Focus ring */}
        {focusRole === 'selected' && (
          <rect x={-3} y={-3} width={w + 6} height={h + 6} rx={13}
            fill="none" stroke={cfg.stripe} strokeWidth={2} strokeOpacity={0.50} />
        )}

        {/* Card background — thick accent border for visual finality */}
        <rect x={0} y={0} width={w} height={h} rx={10}
          fill={cfg.fill}
          stroke={cfg.stripe}
          strokeWidth={3}
          strokeOpacity={isPruned ? 0.28 : 0.60}
          filter="url(#node-drop-shadow)"
        />

        {/* Clip path for rounded top bar */}
        <clipPath id={`term-clip-${node.id}`}>
          <rect x={0} y={0} width={w} height={12} rx={10} />
          <rect x={0} y={6} width={w} height={6} />
        </clipPath>

        {/* Colored top stripe — thicker for shield_killed */}
        <rect x={0} y={0} width={w} height={variant === 'shield_killed' ? 16 : 10} fill={cfg.stripe}
          clipPath={`url(#clip-${node.id})`}
        />

        {/* Shield-killed: diagonal X overlay across card */}
        {variant === 'shield_killed' && (
          <g opacity={0.18}>
            <line x1={8} y1={16} x2={w - 8} y2={h - 8}
              stroke="#C53D2F" strokeWidth={2} strokeLinecap="round" />
            <line x1={w - 8} y1={16} x2={8} y2={h - 8}
              stroke="#C53D2F" strokeWidth={2} strokeLinecap="round" />
          </g>
        )}

        {/* Specular highlight */}
        <rect x={6} y={variant === 'shield_killed' ? 17 : 11} width={w - 12} height={0.75}
          fill="rgba(255,255,255,0.85)" rx={1} />

        {/* Variant label — top-left */}
        {isPruned ? (
          <text x={12} y={32}
            style={{
              fontSize: variant === 'shield_killed' ? 8.5 : 8,
              fontWeight: 800, letterSpacing: '0.11em',
              fill: cfg.labelColor, fontFamily: 'system-ui, -apple-system, sans-serif',
            }}>
            {cfg.label}
          </text>
        ) : (
          <text x={12} y={27}
            style={{
              fontSize: variant === 'not_supported' ? 6.5 : 7,
              fontWeight: 800,
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}>
            <tspan fill={cfg.labelColor} letterSpacing="0.08em">HYPOTHESIS</tspan>
            <tspan fill={cfg.labelColor} opacity={0.45}> · </tspan>
            <tspan fill={cfg.labelColor} letterSpacing={variant === 'not_supported' ? '0.07em' : '0.10em'}>{cfg.label}</tspan>
          </text>
        )}

        {/* Convergence badge — top-right */}
        {otherConverging > 0 && (
          <g>
            <rect x={w - 74} y={15} width={66} height={13} rx={3}
              fill="rgba(45,138,86,0.10)" stroke="rgba(45,138,86,0.22)" strokeWidth={0.6} />
            <text x={w - 41} y={24} textAnchor="middle"
              style={{
                fontSize: 7, fontWeight: 700,
                fill: '#2D8A56', fontFamily: 'system-ui, -apple-system, sans-serif',
              }}>
              ✦ {otherConverging + 1} paths
            </text>
          </g>
        )}

        {/* Diagnosis name — bold, strikethrough if pruned */}
        <text x={12} y={variant === 'shield_killed' ? 54 : 50}
          style={{
            fontSize: 14, fontWeight: 700,
            fill: isPruned ? 'rgba(0,0,0,0.38)' : cfg.textColor,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            textDecoration: isPruned ? 'line-through' : 'none',
          }}>
          {diagName}
        </text>

        {/* Verdict — two lines, splitting the raw string cleanly */}
        {[verdict.slice(0, 36), verdict.length > 36 ? truncate(verdict.slice(36), 36) : ''].map((line, i) => line && (
          <text key={i} x={12} y={(variant === 'shield_killed' ? 72 : 68) + i * 13}
            style={{
              fontSize: 9,
              fill: cfg.verdictColor,
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}>
            {line}
          </text>
        ))}

        {/* Flask icon — bottom-right, hypothesis indicator */}
        {!isPruned && (
          <g transform={`translate(${w - 22}, ${h - 22})`} opacity={0.22}>
            {/* Erlenmeyer flask shape, 14×16px */}
            <path
              d="M 4.5 0 L 4.5 5.5 L 0.5 11 Q -0.5 13.5 0.5 15 Q 1.5 16 7 16 Q 12.5 16 13.5 15 Q 14.5 13.5 13.5 11 L 9.5 5.5 L 9.5 0 Z"
              fill={cfg.stripe}
              stroke="none"
            />
            {/* Neck opening */}
            <line x1={4} y1={0} x2={10} y2={0} stroke={cfg.stripe} strokeWidth={1.5} strokeLinecap="round" />
          </g>
        )}

        {/* "Click for details" hint — subtle, bottom of card */}
        {(focusRole === 'on_focused_branch' || focusRole === 'selected') && (
          <text x={w / 2} y={h - 8} textAnchor="middle"
            style={{
              fontSize: 7.5, fill: 'rgba(0,0,0,0.28)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}>
            tap for details →
          </text>
        )}
      </g>
    </g>
  )
}
