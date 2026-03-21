/** Style Variant B — Warm & Grounded: cream tones, soft shadows, serif headline, 12px radius */
import React from 'react'
import { mockTreeNodes, MOCK_PATIENT_CONTEXT, MOCK_SYNTHESIS } from '../data/mockTree'
import { TreeNode } from '../types/tree'

const DISPLAY_IDS = ['n001', 'n002', 'n003', 'n004', 'n005', 'n020', 'n025']
const nodes = DISPLAY_IDS.map(id => mockTreeNodes.find(n => n.id === id)!)

// ─── layout constants (same geometry as A and C) ─────────────────────
const NODE_W = 210
const NODE_H = 80
const NODE_H_DEC = 88

const POSITIONS: Record<string, [number, number]> = {
  n001: [20,   88],
  n002: [270,  88],
  n003: [520,  88],
  n004: [770,  88],
  n005: [1020, 84],
  n020: [1360, 6],
  n025: [1360, 170],
}
const CANVAS_W = 1600
const CANVAS_H = 310

type Conn = { from: string; to: string; isPrimary: boolean }
const CONNECTIONS: Conn[] = [
  { from: 'n001', to: 'n002', isPrimary: true },
  { from: 'n002', to: 'n003', isPrimary: true },
  { from: 'n003', to: 'n004', isPrimary: true },
  { from: 'n004', to: 'n005', isPrimary: true },
  { from: 'n005', to: 'n020', isPrimary: false },
  { from: 'n005', to: 'n025', isPrimary: false },
]

function nodeHeight(id: string) { return id === 'n005' ? NODE_H_DEC : NODE_H }

// Organic bezier: 65% handle length for more flowing curves
function bezierPath(from: string, to: string): string {
  const [fx, fy] = POSITIONS[from]
  const [tx, ty] = POSITIONS[to]
  const sx = fx + NODE_W
  const sy = fy + nodeHeight(from) / 2
  const ex = tx
  const ey = ty + nodeHeight(to) / 2
  const gap = ex - sx
  const h = gap * 0.65
  return `M ${sx},${sy} C ${sx + h},${sy} ${ex - h},${ey} ${ex},${ey}`
}

// ─── Variant B colors: CSS-var fills (light tints already warm) ──────
function fillB(type: string, dec: boolean): string {
  if (dec)                 return 'var(--node-decision-fill)'
  if (type === 'thought')  return 'var(--node-thought-fill)'
  if (type === 'tool')     return 'var(--node-tool-fill)'
  if (type === 'citation') return 'var(--node-citation-fill)'
  return 'rgba(250,249,246,0.9)'
}
function accent(type: string, dec: boolean): string {
  if (dec)                 return 'var(--node-decision-border)'
  if (type === 'thought')  return 'var(--node-thought-border)'
  if (type === 'tool')     return 'var(--node-tool-border)'
  if (type === 'citation') return 'var(--node-citation-border)'
  return 'var(--border-default)'
}
function lColor(type: string, dec: boolean): string {
  if (dec)                 return 'var(--node-decision-label)'
  if (type === 'thought')  return 'var(--node-thought-label)'
  if (type === 'tool')     return 'var(--node-tool-label)'
  if (type === 'citation') return 'var(--node-citation-label)'
  return 'var(--text-tertiary)'
}
function tColor(type: string, dec: boolean): string {
  if (dec)                 return 'var(--node-decision-text)'
  if (type === 'thought')  return 'var(--node-thought-text)'
  if (type === 'tool')     return 'var(--node-tool-text)'
  if (type === 'citation') return 'var(--node-citation-text)'
  return 'var(--text-primary)'
}
function typeLabel(type: string, dec: boolean): string {
  if (dec)                 return 'DECISION'
  if (type === 'thought')  return 'REASONING'
  if (type === 'tool')     return 'TOOL CALL'
  if (type === 'citation') return 'CITATION'
  return type.toUpperCase()
}

// ─── Node card ──────────────────────────────────────────────────────
function NodeCardB({ node }: { node: TreeNode }) {
  const dec = node.is_decision_point
  const h = nodeHeight(node.id)
  const ac = accent(node.type, dec)

  const cardStyle: React.CSSProperties = {
    position: 'absolute',
    left: POSITIONS[node.id][0],
    top: POSITIONS[node.id][1],
    width: NODE_W,
    height: h,
    background: fillB(node.type, dec),
    // Key Variant B: 12px radius, visible shadow, 3px border
    borderRadius: 12,
    padding: dec ? '9px 13px' : '8px 13px',
    boxSizing: 'border-box',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    borderTop: dec ? `1.5px solid ${ac}` : '1px solid rgba(0,0,0,0.08)',
    borderRight: dec ? `1.5px solid ${ac}` : '1px solid rgba(0,0,0,0.08)',
    borderBottom: dec ? `1.5px solid ${ac}` : '1px solid rgba(0,0,0,0.08)',
    borderLeft: `3px solid ${ac}`,
    boxShadow: dec
      ? `0 0 0 3px var(--node-decision-glow), 0 2px 8px rgba(0,0,0,0.07)`
      : '0 1px 4px rgba(0,0,0,0.07)',
  }

  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: lColor(node.type, dec), lineHeight: 1, marginBottom: 5, flexShrink: 0 }}>
        {typeLabel(node.type, dec)}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.35, color: tColor(node.type, dec), overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', fontWeight: dec ? 500 : 400, flex: 1 } as React.CSSProperties}>
        {node.headline}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginTop: 5, lineHeight: 1, flexShrink: 0 }}>
        Step {(node.step_index ?? 0) + 1}
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────
export default function StyleVariantB() {
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 45px)' }}>

      {/* ── Tree panel — 65% ── */}
      <div style={{ width: '65%', background: '#f5f3ef', borderRight: '1px solid rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column' }}>
        {/* Patient bar — darker cream, structured */}
        <div style={{ padding: '11px 20px', borderBottom: '1px solid rgba(0,0,0,0.08)', background: '#ede9e3', display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0, flexWrap: 'wrap' }}>
          {/* Demo + Chief Complaint */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, paddingRight: 20, borderRight: '1px solid rgba(0,0,0,0.1)', marginRight: 20 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Georgia, "Times New Roman", serif' }}>
              {MOCK_PATIENT_CONTEXT.age}{MOCK_PATIENT_CONTEXT.sex[0]}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 400 }}>
              {MOCK_PATIENT_CONTEXT.chiefComplaint}
            </span>
          </div>
          {/* Vitals */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, paddingRight: 20, borderRight: '1px solid rgba(0,0,0,0.1)', marginRight: 20 }}>
            {[
              { label: 'HR', value: `${MOCK_PATIENT_CONTEXT.vitals.hr}`, unit: 'bpm', flag: MOCK_PATIENT_CONTEXT.vitals.hr > 100 },
              { label: 'BP', value: MOCK_PATIENT_CONTEXT.vitals.bp, unit: '', flag: true },
              { label: 'SpO₂', value: `${MOCK_PATIENT_CONTEXT.vitals.spo2}`, unit: '%', flag: MOCK_PATIENT_CONTEXT.vitals.spo2 < 95 },
              { label: 'RR', value: `${MOCK_PATIENT_CONTEXT.vitals.rr}`, unit: '/min', flag: false },
            ].map(v => (
              <div key={v.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#9e8f7e', lineHeight: 1 }}>{v.label}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: v.flag ? '#a83228' : 'var(--text-primary)', lineHeight: 1 }}>
                  {v.value}<span style={{ fontSize: 9, fontWeight: 400, color: '#9e8f7e', marginLeft: 1 }}>{v.unit}</span>
                </span>
              </div>
            ))}
          </div>
          {/* PMH */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: '#9e8f7e', lineHeight: 1 }}>PMH</span>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1 }}>{MOCK_PATIENT_CONTEXT.relevantHistory}</span>
          </div>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 20px' }}>
          <div style={{ position: 'relative', width: CANVAS_W, height: CANVAS_H }}>
            <svg style={{ position: 'absolute', inset: 0, width: CANVAS_W, height: CANVAS_H, pointerEvents: 'none' }}>
              {CONNECTIONS.map(c => (
                <path key={`${c.from}-${c.to}`} d={bezierPath(c.from, c.to)} fill="none"
                  stroke={c.isPrimary ? '#3B7DD8' : 'rgba(0,0,0,0.2)'}
                  strokeWidth={c.isPrimary ? 2 : 1}
                  strokeOpacity={c.isPrimary ? 0.5 : 1}
                />
              ))}
              <text x={POSITIONS.n020[0]} y={POSITIONS.n020[1] + NODE_H + 12}
                style={{ fontSize: 10, fill: 'var(--text-tertiary)' }}>
                Branch A — GERD hypothesis
              </text>
              <text x={POSITIONS.n025[0]} y={POSITIONS.n025[1] + NODE_H + 12}
                style={{ fontSize: 10, fill: 'var(--text-tertiary)' }}>
                Branch B — Bayesian (converges)
              </text>
            </svg>
            {nodes.map(node => <NodeCardB key={node.id} node={node} />)}
          </div>
        </div>
      </div>

      {/* ── Synthesis panel — 35% — warm off-white ── */}
      <div style={{ width: '35%', background: '#faf9f6', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderLeft: '1px solid rgba(0,0,0,0.07)' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 26px' }}>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase' as const, color: 'var(--text-tertiary)', marginBottom: 10 }}>
              Recommendation
            </div>
            {/* Georgia serif — signature Variant B touch */}
            <div style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.3, color: 'var(--text-primary)', fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 10 }}>
              {MOCK_SYNTHESIS.recommendation.diagnosis}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--text-secondary)' }}>
              {MOCK_SYNTHESIS.recommendation.summary}
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', marginBottom: 20 }} />

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase' as const, color: 'var(--text-tertiary)', marginBottom: 10 }}>
              Confidence
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.4, color: 'var(--text-secondary)', marginBottom: 6 }}>
              High — {MOCK_SYNTHESIS.confidence.convergingBranches} of {MOCK_SYNTHESIS.confidence.totalBranches} branches converge
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.65, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
              {MOCK_SYNTHESIS.confidence.explanation}
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', marginBottom: 20 }} />

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase' as const, color: 'var(--text-tertiary)', marginBottom: 10 }}>
              What Would Change This
            </div>
            {MOCK_SYNTHESIS.caveats.map((c, i) => (
              // Warm white inset card — physical card feel
              <div key={i} style={{ marginBottom: 10, padding: '8px 12px 8px 12px', background: 'rgba(255,255,255,0.65)', borderRadius: '0 8px 8px 0', borderLeft: '2px solid rgba(0,0,0,0.1)', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 3 }}>If {c.condition.toLowerCase()}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontStyle: 'italic', lineHeight: 1.55 }}>→ {c.implication}</div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', marginBottom: 20 }} />

          <div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase' as const, color: 'var(--text-tertiary)', marginBottom: 10 }}>
              Rejected Paths
            </div>
            {MOCK_SYNTHESIS.rejectedPaths.map(rp => (
              <div key={rp.branchId} style={{ background: 'var(--shield-safety-bg)', borderRadius: 10, padding: '12px 14px', border: '1px solid rgba(197,61,47,0.12)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase' as const, color: 'var(--shield-safety-text)', marginBottom: 5 }}>Shield — Safety violation</div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>{rp.diagnosis}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{rp.pruneReason}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
