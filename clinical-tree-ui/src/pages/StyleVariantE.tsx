/** Style Variant E — Apple Glass Light: visionOS glassmorphism on a bright, airy canvas */
import React from 'react'
import { mockTreeNodes, MOCK_PATIENT_CONTEXT, MOCK_SYNTHESIS } from '../data/mockTree'
import { TreeNode } from '../types/tree'

const DISPLAY_IDS = ['n001', 'n002', 'n003', 'n004', 'n005', 'n020', 'n025']
const nodes = DISPLAY_IDS.map(id => mockTreeNodes.find(n => n.id === id)!)

// ─── layout constants (same geometry as C/D) ──────────────────────────
const NODE_W = 210
const NODE_H = 84
const NODE_H_DEC = 92

const POSITIONS: Record<string, [number, number]> = {
  n001: [20,   88],
  n002: [270,  88],
  n003: [520,  88],
  n004: [770,  88],
  n005: [1020, 84],
  n020: [1360, 10],
  n025: [1360, 168],
}
const CANVAS_W = 1600
const CANVAS_H = 320

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

function bezierPath(from: string, to: string): string {
  const [fx, fy] = POSITIONS[from]
  const [tx, ty] = POSITIONS[to]
  const sx = fx + NODE_W
  const sy = fy + nodeHeight(from) / 2
  const ex = tx
  const ey = ty + nodeHeight(to) / 2
  const midX = (sx + ex) / 2
  return `M ${sx},${sy} C ${midX},${sy} ${midX},${ey} ${ex},${ey}`
}

// ─── Light glass fills: milky white tinted by node type ──────────────
function fillE(type: string, dec: boolean): string {
  if (dec)                 return 'rgba(255,248,230,0.82)'
  if (type === 'thought')  return 'rgba(235,244,255,0.82)'
  if (type === 'tool')     return 'rgba(234,248,240,0.82)'
  if (type === 'citation') return 'rgba(243,239,254,0.82)'
  return 'rgba(255,255,255,0.78)'
}

function accentE(type: string, dec: boolean): string {
  if (dec)                 return '#C98A00'
  if (type === 'thought')  return '#2E72CC'
  if (type === 'tool')     return '#238A52'
  if (type === 'citation') return '#7251B5'
  return 'rgba(0,0,0,0.2)'
}

function lColorE(type: string, dec: boolean): string {
  if (dec)                 return '#9E6C00'
  if (type === 'thought')  return '#2260B0'
  if (type === 'tool')     return '#1C7845'
  if (type === 'citation') return '#6040A0'
  return '#888'
}

function typeLabel(type: string, dec: boolean): string {
  if (dec)                 return 'DECISION POINT'
  if (type === 'thought')  return 'REASONING'
  if (type === 'tool')     return 'TOOL CALL'
  if (type === 'citation') return 'CITATION'
  return type.toUpperCase()
}

// ─── Node card ──────────────────────────────────────────────────────
function NodeCardE({ node }: { node: TreeNode }) {
  const dec = node.is_decision_point
  const h = nodeHeight(node.id)
  const ac = accentE(node.type, dec)
  const lc = lColorE(node.type, dec)

  const cardStyle: React.CSSProperties = {
    position: 'absolute',
    left: POSITIONS[node.id][0],
    top: POSITIONS[node.id][1],
    width: NODE_W,
    height: h,
    background: fillE(node.type, dec),
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: 14,
    padding: '9px 13px',
    boxSizing: 'border-box',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    // Top specular highlight (bright on light = very subtle)
    borderTop: '1px solid rgba(255,255,255,0.95)',
    borderRight: '1px solid rgba(0,0,0,0.05)',
    borderBottom: '1px solid rgba(0,0,0,0.06)',
    borderLeft: `3px solid ${ac}`,
    boxShadow: dec
      ? `0 0 0 3px ${ac}22, 0 8px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,1)`
      : '0 4px 16px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,1)',
  }

  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: lc, lineHeight: 1, marginBottom: 5, flexShrink: 0 }}>
        {typeLabel(node.type, dec)}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.4, color: '#1a1c2e', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', fontWeight: dec ? 600 : 400, flex: 1 } as React.CSSProperties}>
        {node.headline}
      </div>
      <div style={{ fontSize: 9, color: 'rgba(0,0,0,0.35)', marginTop: 5, lineHeight: 1, flexShrink: 0 }}>
        Step {(node.step_index ?? 0) + 1}
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────
export default function StyleVariantE() {
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 45px)' }}>

      {/* ── Tree panel — 65% — bright airy canvas ── */}
      <div style={{ width: '65%', background: 'linear-gradient(155deg, #eef2f8 0%, #f2f5fb 50%, #edf1f7 100%)', borderRight: '1px solid rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column' }}>

        {/* Patient bar — white frosted glass */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(0,0,0,0.07)', background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0, flexWrap: 'wrap' }}>
          {/* Demo + Chief Complaint */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, paddingRight: 20, borderRight: '1px solid rgba(0,0,0,0.09)', marginRight: 20 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111', letterSpacing: '-0.01em' }}>
              {MOCK_PATIENT_CONTEXT.age}{MOCK_PATIENT_CONTEXT.sex[0]}
            </span>
            <span style={{ fontSize: 12, color: '#333', fontWeight: 400 }}>
              {MOCK_PATIENT_CONTEXT.chiefComplaint}
            </span>
          </div>
          {/* Vitals as light glass pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingRight: 20, borderRight: '1px solid rgba(0,0,0,0.09)', marginRight: 20 }}>
            {[
              { label: 'HR',   value: `${MOCK_PATIENT_CONTEXT.vitals.hr}`,   unit: 'bpm', flag: MOCK_PATIENT_CONTEXT.vitals.hr > 100 },
              { label: 'BP',   value: MOCK_PATIENT_CONTEXT.vitals.bp,         unit: '',    flag: true },
              { label: 'SpO₂', value: `${MOCK_PATIENT_CONTEXT.vitals.spo2}`,  unit: '%',   flag: MOCK_PATIENT_CONTEXT.vitals.spo2 < 95 },
              { label: 'RR',   value: `${MOCK_PATIENT_CONTEXT.vitals.rr}`,   unit: '/min', flag: false },
            ].map((v, i) => (
              <div key={v.label} style={{
                display: 'flex', alignItems: 'baseline', gap: 4,
                padding: '3px 9px',
                background: v.flag ? 'rgba(185,50,38,0.07)' : 'rgba(255,255,255,0.75)',
                border: v.flag ? '1px solid rgba(185,50,38,0.2)' : '1px solid rgba(0,0,0,0.09)',
                borderRadius: 20,
                marginLeft: i === 0 ? 0 : 3,
              }}>
                <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: v.flag ? '#b83226' : 'rgba(0,0,0,0.4)' }}>{v.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: v.flag ? '#b83226' : '#111' }}>{v.value}</span>
                {v.unit && <span style={{ fontSize: 9, color: 'rgba(0,0,0,0.3)' }}>{v.unit}</span>}
              </div>
            ))}
          </div>
          {/* PMH */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)', lineHeight: 1 }}>PMH</span>
            <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.55)', lineHeight: 1 }}>{MOCK_PATIENT_CONTEXT.relevantHistory}</span>
          </div>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, overflow: 'auto', padding: '28px 20px' }}>
          <div style={{ position: 'relative', width: CANVAS_W, height: CANVAS_H }}>
            <svg style={{ position: 'absolute', inset: 0, width: CANVAS_W, height: CANVAS_H, pointerEvents: 'none' }}>
              {/* Branch connections — layered soft shadow, secondary weight */}
              {CONNECTIONS.filter(c => !c.isPrimary).map(c => (
                <g key={`${c.from}-${c.to}`}>
                  <path d={bezierPath(c.from, c.to)} fill="none"
                    stroke="rgba(0,0,0,0.05)"
                    strokeWidth={8}
                    strokeDasharray="5,4"
                  />
                  <path d={bezierPath(c.from, c.to)} fill="none"
                    stroke="rgba(0,0,0,0.1)"
                    strokeWidth={3}
                    strokeDasharray="5,4"
                  />
                  <path d={bezierPath(c.from, c.to)} fill="none"
                    stroke="rgba(0,0,0,0.32)"
                    strokeWidth={1.25}
                    strokeDasharray="5,4"
                  />
                </g>
              ))}
              {/* Primary connections — blue bloom on light canvas */}
              {CONNECTIONS.filter(c => c.isPrimary).map(c => (
                <g key={`${c.from}-${c.to}`}>
                  <path d={bezierPath(c.from, c.to)} fill="none"
                    stroke="rgba(59,125,216,0.12)"
                    strokeWidth={10}
                  />
                  <path d={bezierPath(c.from, c.to)} fill="none"
                    stroke="rgba(59,125,216,0.28)"
                    strokeWidth={4}
                  />
                  <path d={bezierPath(c.from, c.to)} fill="none"
                    stroke="#3B7DD8"
                    strokeWidth={2}
                    strokeOpacity={0.85}
                  />
                </g>
              ))}
              <text x={POSITIONS.n020[0]} y={POSITIONS.n020[1] + NODE_H + 12}
                style={{ fontSize: 10, fill: 'rgba(0,0,0,0.35)', fontWeight: 600, letterSpacing: '0.06em' }}>
                BRANCH A — GERD
              </text>
              <text x={POSITIONS.n025[0]} y={POSITIONS.n025[1] + NODE_H + 12}
                style={{ fontSize: 10, fill: 'rgba(0,0,0,0.35)', fontWeight: 600, letterSpacing: '0.06em' }}>
                BRANCH B — BAYESIAN ↗ CONVERGES
              </text>
            </svg>
            {nodes.map(node => <NodeCardE key={node.id} node={node} />)}
          </div>
        </div>
      </div>

      {/* ── Synthesis panel — 35% — bright glass sidebar ── */}
      <div style={{ width: '35%', background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderLeft: '1px solid rgba(0,0,0,0.07)' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px' }}>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: 'rgba(0,0,0,0.35)', marginBottom: 10, borderBottom: '1px solid rgba(0,0,0,0.07)', paddingBottom: 8 }}>
              Recommendation
            </div>
            <div style={{ fontSize: 21, fontWeight: 700, lineHeight: 1.25, color: '#111', fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 10 }}>
              {MOCK_SYNTHESIS.recommendation.diagnosis}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.65, color: 'rgba(0,0,0,0.58)' }}>
              {MOCK_SYNTHESIS.recommendation.summary}
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(0,0,0,0.07)', marginBottom: 20 }} />

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: 'rgba(0,0,0,0.35)', marginBottom: 10, borderBottom: '1px solid rgba(0,0,0,0.07)', paddingBottom: 8 }}>
              Confidence
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111', marginBottom: 8 }}>
              High — {MOCK_SYNTHESIS.confidence.convergingBranches} of {MOCK_SYNTHESIS.confidence.totalBranches} branches converge
            </div>
            {/* Soft progress bar */}
            <div style={{ height: 3, background: 'rgba(0,0,0,0.08)', borderRadius: 2, marginBottom: 10, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${(MOCK_SYNTHESIS.confidence.convergingBranches / MOCK_SYNTHESIS.confidence.totalBranches) * 100}%`,
                background: 'linear-gradient(90deg, #3B7DD8, #6BAEF5)',
                borderRadius: 2,
              }} />
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.6, color: 'rgba(0,0,0,0.42)', fontStyle: 'italic' }}>
              {MOCK_SYNTHESIS.confidence.explanation}
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(0,0,0,0.07)', marginBottom: 20 }} />

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: 'rgba(0,0,0,0.35)', marginBottom: 10, borderBottom: '1px solid rgba(0,0,0,0.07)', paddingBottom: 8 }}>
              What Would Change This
            </div>
            {MOCK_SYNTHESIS.caveats.map((c, i) => (
              <div key={i} style={{
                marginBottom: 8,
                padding: '10px 13px',
                background: 'rgba(255,255,255,0.72)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.08)',
                borderLeft: '2px solid rgba(0,0,0,0.18)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#222', marginBottom: 3 }}>If {c.condition.toLowerCase()}</div>
                <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.42)', fontStyle: 'italic', lineHeight: 1.55 }}>→ {c.implication}</div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid rgba(0,0,0,0.07)', marginBottom: 20 }} />

          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: 'rgba(0,0,0,0.35)', marginBottom: 10, borderBottom: '1px solid rgba(0,0,0,0.07)', paddingBottom: 8 }}>
              Rejected Paths
            </div>
            {MOCK_SYNTHESIS.rejectedPaths.map(rp => (
              <div key={rp.branchId} style={{
                background: 'rgba(197,61,47,0.06)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                borderRadius: 12,
                padding: '12px 14px',
                border: '1px solid rgba(197,61,47,0.18)',
                borderLeft: '3px solid rgba(185,50,38,0.65)',
                boxShadow: '0 2px 8px rgba(197,61,47,0.06)',
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#b83226', marginBottom: 5 }}>Shield — Safety Violation</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 4 }}>{rp.diagnosis}</div>
                <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.5)', lineHeight: 1.55 }}>{rp.pruneReason}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
