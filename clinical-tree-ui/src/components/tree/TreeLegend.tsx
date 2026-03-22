/** TreeLegend — collapsible overlay in the bottom-left of the tree panel.
 *  Maps node card types and terminal outcome labels to their color coding.
 *  Expands to the right as a wide, shallow panel with two side-by-side columns.
 */
import React, { useState } from 'react'

// ── Data ────────────────────────────────────────────────────────────────────

const NODE_TYPES = [
  { label: 'Reasoning step', color: '#3B7DD8', fill: 'rgba(59,125,216,0.07)',   desc: 'Chain-of-thought inference' },
  { label: 'Tool call',      color: '#2D8A56', fill: 'rgba(45,138,86,0.07)',    desc: 'Evidence search or lookup' },
  { label: 'Citation',       color: '#7B5EA7', fill: 'rgba(123,94,167,0.07)',   desc: 'Guideline or literature ref' },
  { label: 'Decision point', color: '#D4950A', fill: 'rgba(212,149,10,0.07)',   desc: 'Branch fork — paths explored' },
  { label: 'Safety check',   color: '#C53D2F', fill: 'rgba(197,61,47,0.06)',    desc: 'Preflight compliance gate' },
]

const OUTCOMES = [
  { label: 'CONVERGING',    color: '#2D8A56', fill: 'rgba(45,138,86,0.09)',    desc: 'Multiple paths, same diagnosis' },
  { label: 'SUPPORTED',     color: '#3B7DD8', fill: 'rgba(59,125,216,0.08)',   desc: 'Single path, evidence supports' },
  { label: 'FLAGGED',       color: '#C45A10', fill: 'rgba(196,90,16,0.08)',    desc: 'Patient-safety concern raised' },
  { label: 'NOT SUPPORTED', color: '#94A3B8', fill: 'rgba(148,163,184,0.08)', desc: 'Evidence contradicts this path' },
  { label: 'TERMINATED',    color: '#C53D2F', fill: 'rgba(197,61,47,0.07)',   desc: 'Shield blocked — violation' },
]

// ── Row ──────────────────────────────────────────────────────────────────────

function Row({ item }: { item: typeof NODE_TYPES[0] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '3px 0' }}>
      <div style={{
        flexShrink: 0,
        width: 18, height: 14, borderRadius: 3,
        background: item.fill,
        border: `1px solid ${item.color}30`,
        borderLeft: `3px solid ${item.color}`,
      }} />
      <span style={{
        fontSize: 9.5, fontWeight: 700, letterSpacing: '0.05em',
        color: item.color, whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        {item.label}
      </span>
      <span style={{
        fontSize: 9, color: 'rgba(0,0,0,0.38)', lineHeight: 1.3,
        borderLeft: '1px solid rgba(0,0,0,0.10)', paddingLeft: 7,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>
        {item.desc}
      </span>
    </div>
  )
}

// ── Column ───────────────────────────────────────────────────────────────────

function Col({ title, items }: { title: string; items: typeof NODE_TYPES }) {
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontSize: 7.5, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
        color: 'rgba(0,0,0,0.30)', marginBottom: 6,
      }}>
        {title}
      </div>
      {items.map(item => <Row key={item.label} item={item} />)}
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

interface Props {
  /** Extra bottom offset in px — use when a bottom bar (e.g. GrowthControls) is visible */
  bottomOffset?: number
}

export default function TreeLegend({ bottomOffset = 16 }: Props) {
  const [open, setOpen] = useState(false)

  const glass: React.CSSProperties = {
    background: 'rgba(255,255,255,0.88)',
    backdropFilter: 'blur(18px)',
    WebkitBackdropFilter: 'blur(18px)',
    border: '1px solid rgba(0,0,0,0.10)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
  }

  return (
    <div style={{
      position: 'absolute', bottom: bottomOffset, left: 16,
      transition: 'bottom 200ms ease-out',
      zIndex: 10,
      display: 'flex', flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    }}>

      {/* Toggle pill */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          ...glass,
          borderRadius: 20, flexShrink: 0,
          padding: '5px 12px 5px 9px',
          display: 'flex', alignItems: 'center', gap: 6,
          cursor: 'pointer', userSelect: 'none',
          fontSize: 10, fontWeight: 600, color: 'rgba(0,0,0,0.55)',
          letterSpacing: '0.02em',
          transition: 'background 140ms ease-out',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.96)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.88)')}
      >
        <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
          {['#3B7DD8', '#2D8A56', '#D4950A', '#C53D2F'].map(c => (
            <div key={c} style={{ width: 6, height: 6, borderRadius: 2, background: c, opacity: 0.75 }} />
          ))}
        </div>
        Legend
        <span style={{
          fontSize: 9, color: 'rgba(0,0,0,0.35)',
          transform: open ? 'rotate(90deg)' : 'rotate(-90deg)',
          transition: 'transform 200ms ease-out',
          display: 'inline-block',
        }}>▲</span>
      </button>

      {/* Expanded panel — wide and shallow, two columns */}
      {open && (
        <div style={{
          ...glass,
          borderRadius: 12,
          padding: '12px 16px 11px',
          width: 520,
          animation: 'legend-in 150ms ease-out both',
        }}>
          <style>{`
            @keyframes legend-in {
              from { opacity: 0; transform: translateX(-8px) scale(0.98); }
              to   { opacity: 1; transform: translateX(0) scale(1); }
            }
          `}</style>
          <div style={{ display: 'flex', gap: 20 }}>
            <Col title="Node types" items={NODE_TYPES} />
            <div style={{ width: 1, background: 'rgba(0,0,0,0.07)', flexShrink: 0, alignSelf: 'stretch' }} />
            <Col title="Diagnostic outcomes" items={OUTCOMES} />
          </div>
        </div>
      )}
    </div>
  )
}
