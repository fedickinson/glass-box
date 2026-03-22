/** TerminalCard — compact verdict label at each branch endpoint.
 *  200×80px. Clicking opens BranchConclusionPanel (not NodeDetail).
 */
import React, { useState, useEffect } from 'react'
import { PositionedNode, Convergence } from '../../types/tree'
import { FocusRole } from './TreeNode'

export type TerminalVariant = 'converging' | 'divergent' | 'shield_killed' | 'doctor_pruned'

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

/** Build the one-line verdict for the compact card. */
function buildVerdict(node: PositionedNode, variant: TerminalVariant): string {
  if (variant === 'shield_killed') return 'Terminated — safety violation'
  if (variant === 'doctor_pruned') return 'Pruned — clinician decision'
  const summary = node.terminal_summary ?? node.content
  return truncate(summary, 58)
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

        {/* Card background */}
        <rect x={0} y={0} width={w} height={h} rx={10}
          fill={cfg.fill}
          stroke={cfg.border}
          strokeWidth={1.25}
          filter="url(#node-drop-shadow)"
        />

        {/* Clip path for rounded top bar */}
        <clipPath id={`term-clip-${node.id}`}>
          <rect x={0} y={0} width={w} height={10} rx={10} />
          <rect x={0} y={5} width={w} height={5} />
        </clipPath>

        {/* Colored top stripe — thicker for shield_killed */}
        <rect x={0} y={0} width={w} height={variant === 'shield_killed' ? 13 : 7} fill={cfg.stripe}
          clipPath={`url(#clip-${node.id})`}
        />

        {/* Shield-killed: diagonal X overlay across card */}
        {variant === 'shield_killed' && (
          <g opacity={0.18}>
            <line x1={8} y1={13} x2={w - 8} y2={h - 8}
              stroke="#C53D2F" strokeWidth={2} strokeLinecap="round" />
            <line x1={w - 8} y1={13} x2={8} y2={h - 8}
              stroke="#C53D2F" strokeWidth={2} strokeLinecap="round" />
          </g>
        )}

        {/* Specular highlight */}
        <rect x={6} y={variant === 'shield_killed' ? 14 : 8} width={w - 12} height={0.75}
          fill="rgba(255,255,255,0.85)" rx={1} />

        {/* Variant label — top-left */}
        <text x={10} y={variant === 'shield_killed' ? 27 : 22}
          style={{
            fontSize: variant === 'shield_killed' ? 8.5 : 7.5,
            fontWeight: 800, letterSpacing: '0.11em',
            fill: cfg.labelColor, fontFamily: 'system-ui, -apple-system, sans-serif',
          }}>
          {cfg.label}
        </text>

        {/* Convergence badge — top-right */}
        {otherConverging > 0 && (
          <g>
            <rect x={w - 74} y={13} width={66} height={12} rx={3}
              fill="rgba(45,138,86,0.10)" stroke="rgba(45,138,86,0.22)" strokeWidth={0.6} />
            <text x={w - 41} y={21.5} textAnchor="middle"
              style={{
                fontSize: 7, fontWeight: 700,
                fill: '#2D8A56', fontFamily: 'system-ui, -apple-system, sans-serif',
              }}>
              ✦ {otherConverging + 1} paths
            </text>
          </g>
        )}

        {/* Diagnosis name — bold, strikethrough if pruned */}
        <text x={10} y={variant === 'shield_killed' ? 49 : 43}
          style={{
            fontSize: 13.5, fontWeight: 700,
            fill: isPruned ? 'rgba(0,0,0,0.38)' : cfg.textColor,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            textDecoration: isPruned ? 'line-through' : 'none',
          }}>
          {diagName}
        </text>

        {/* One-line verdict */}
        <text x={10} y={variant === 'shield_killed' ? 66 : 60}
          style={{
            fontSize: 8.5,
            fill: cfg.verdictColor,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}>
          {truncate(verdict, 32)}
        </text>

        {/* "Click for details" hint — subtle, appears on selected/on_branch */}
        {(focusRole === 'on_focused_branch' || focusRole === 'selected') && (
          <text x={w / 2} y={h - 6} textAnchor="middle"
            style={{
              fontSize: 7, fill: 'rgba(0,0,0,0.25)',
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}>
            tap for details →
          </text>
        )}
      </g>
    </g>
  )
}
