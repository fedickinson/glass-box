/** Style Variant G — Apple Glass Translucent: near-ethereal glass, vivid borders anchor the floating cards */
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

// ─── Very low alpha fills — the canvas bleeds through strongly ──
function fillG(type: string, dec: boolean): string {
  if (dec)                 return 'linear-gradient(148deg, rgba(255,250,228,0.42) 0%, rgba(255,240,190,0.28) 100%)'
  if (type === 'thought')  return 'linear-gradient(148deg, rgba(230,244,255,0.42) 0%, rgba(210,234,255,0.28) 100%)'
  if (type === 'tool')     return 'linear-gradient(148deg, rgba(228,250,238,0.42) 0%, rgba(205,242,220,0.28) 100%)'
  if (type === 'citation') return 'linear-gradient(148deg, rgba(244,238,255,0.42) 0%, rgba(228,215,255,0.28) 100%)'
  return 'linear-gradient(148deg, rgba(255,255,255,0.42) 0%, rgba(240,244,255,0.28) 100%)'
}

// ─── Vivid electric colors — the primary anchor for nearly-invisible cards ──
function accentG(type: string, dec: boolean): string {
  if (dec)                 return '#CC8800'
  if (type === 'thought')  return '#1C6AE0'
  if (type === 'tool')     return '#0E7840'
  if (type === 'citation') return '#6830C8'
  return 'rgba(0,0,0,0.22)'
}

function typeLabel(type: string, dec: boolean): string {
  if (dec)                 return 'DECISION POINT'
  if (type === 'thought')  return 'REASONING'
  if (type === 'tool')     return 'TOOL CALL'
  if (type === 'citation') return 'CITATION'
  return type.toUpperCase()
}

// ─── Node card ──────────────────────────────────────────────────────
function NodeCardG({ node }: { node: TreeNode }) {
  const dec = node.is_decision_point
  const h = nodeHeight(node.id)
  const ac = accentG(node.type, dec)

  const cardStyle: React.CSSProperties = {
    position: 'absolute',
    left: POSITIONS[node.id][0],
    top: POSITIONS[node.id][1],
    width: NODE_W,
    height: h,
    background: fillG(node.type, dec),
    backdropFilter: 'blur(36px)',
    WebkitBackdropFilter: 'blur(36px)',
    borderRadius: 18,
    padding: '9px 13px',
    boxSizing: 'border-box',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    // Specular top edge — slightly less than E since card is more translucent
    borderTop: '1px solid rgba(255,255,255,0.85)',
    borderRight: '1px solid rgba(255,255,255,0.25)',
    borderBottom: '1px solid rgba(0,0,0,0.05)',
    // Vivid left border is the primary anchor for the almost-invisible card
    borderLeft: `4px solid ${ac}`,
    // Lighter shadow — transparent cards don't need heavy shadow
    boxShadow: dec
      ? `0 0 0 4px ${ac}18, 0 1px 1px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.07), 0 24px 48px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.9)`
      : '0 1px 1px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.05), 0 20px 40px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
  }

  return (
    <div style={cardStyle}>
      {/* Type label — vivid color crucial to anchor a translucent card */}
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: ac, lineHeight: 1, marginBottom: 5, flexShrink: 0 }}>
        {typeLabel(node.type, dec)}
      </div>
      {/* Decision nodes: no clamp — the card is taller so let overflow:hidden clip cleanly */}
      <div style={{ fontSize: 12, lineHeight: 1.4, color: '#18192a', overflow: 'hidden', fontWeight: dec ? 700 : 500, flex: 1, ...(!dec && { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }) } as React.CSSProperties}>
        {node.headline}
      </div>
      <div style={{ fontSize: 9, color: 'rgba(0,0,0,0.32)', marginTop: 5, lineHeight: 1, flexShrink: 0, letterSpacing: '0.02em' }}>
        Step {(node.step_index ?? 0) + 1}
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────
export default function StyleVariantG() {
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 45px)' }}>

      {/* ── Tree panel — 65% — more vivid canvas so bleed-through looks rich ── */}
      <div style={{ width: '65%', background: 'radial-gradient(ellipse at 35% 35%, #deeaff 0%, #cfddf8 45%, #c8d6f2 100%)', borderRight: '1px solid rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column' }}>

        {/* Patient bar — very glassy */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(32px)', WebkitBackdropFilter: 'blur(32px)', display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0, flexWrap: 'wrap' }}>
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
              {/* Branch connections — amber layered glow from decision node */}
              {CONNECTIONS.filter(c => !c.isPrimary).map(c => {
                const isFork = c.from === 'n005'
                const outerColor  = isFork ? 'rgba(204,136,0,0.1)'  : 'rgba(0,0,0,0.05)'
                const midColor    = isFork ? 'rgba(204,136,0,0.22)' : 'rgba(0,0,0,0.1)'
                const crispColor  = isFork ? 'rgba(204,136,0,0.6)'  : 'rgba(0,0,0,0.32)'
                const crispWidth  = isFork ? 2 : 1.25
                return (
                  <g key={`${c.from}-${c.to}`}>
                    <path d={bezierPath(c.from, c.to)} fill="none"
                      stroke={outerColor} strokeWidth={8} strokeDasharray="5,4" />
                    <path d={bezierPath(c.from, c.to)} fill="none"
                      stroke={midColor} strokeWidth={3} strokeDasharray="5,4" />
                    <path d={bezierPath(c.from, c.to)} fill="none"
                      stroke={crispColor} strokeWidth={crispWidth} strokeDasharray="5,4" />
                  </g>
                )
              })}
              {/* Primary connections — blue bloom on vivid canvas */}
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
            {nodes.map(node => <NodeCardG key={node.id} node={node} />)}
          </div>
        </div>
      </div>

      {/* ── Synthesis panel — 35% — very glassy ── */}
      <div style={{ width: '35%', background: 'rgba(255,255,255,0.38)', backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderLeft: '1px solid rgba(255,255,255,0.4)', boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.6)' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '26px 26px' }}>

          {/* Recommendation */}
          <div style={{ marginBottom: 24, padding: '16px 18px', background: 'linear-gradient(148deg, rgba(242,248,255,0.7) 0%, rgba(232,242,255,0.5) 100%)', borderRadius: 14, border: '1px solid rgba(28,106,224,0.12)', borderTop: '1px solid rgba(255,255,255,0.85)', boxShadow: '0 2px 12px rgba(28,106,224,0.06), inset 0 1px 0 rgba(255,255,255,0.9)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: '#1C6AE0', marginBottom: 10 }}>
              Recommendation
            </div>
            <div style={{ fontSize: 21, fontWeight: 700, lineHeight: 1.25, color: '#111', fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 10 }}>
              {MOCK_SYNTHESIS.recommendation.diagnosis}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.65, color: 'rgba(0,0,0,0.58)' }}>
              {MOCK_SYNTHESIS.recommendation.summary}
            </div>
          </div>

          {/* Gradient rule */}
          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.08) 20%, rgba(0,0,0,0.08) 80%, transparent 100%)', marginBottom: 20 }} />

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: 'rgba(0,0,0,0.38)', marginBottom: 10 }}>
              Confidence
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111', marginBottom: 8 }}>
              High — {MOCK_SYNTHESIS.confidence.convergingBranches} of {MOCK_SYNTHESIS.confidence.totalBranches} branches converge
            </div>
            <div style={{ height: 4, background: 'rgba(0,0,0,0.07)', borderRadius: 99, marginBottom: 10, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${(MOCK_SYNTHESIS.confidence.convergingBranches / MOCK_SYNTHESIS.confidence.totalBranches) * 100}%`,
                background: 'linear-gradient(90deg, #1C6AE0, #5AABF5)',
                borderRadius: 99,
                boxShadow: '0 0 6px rgba(28,106,224,0.35)',
              }} />
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.6, color: 'rgba(0,0,0,0.42)', fontStyle: 'italic' }}>
              {MOCK_SYNTHESIS.confidence.explanation}
            </div>
          </div>

          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.08) 20%, rgba(0,0,0,0.08) 80%, transparent 100%)', marginBottom: 20 }} />

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: 'rgba(0,0,0,0.38)', marginBottom: 10 }}>
              What Would Change This
            </div>
            {MOCK_SYNTHESIS.caveats.map((c, i) => (
              <div key={i} style={{
                marginBottom: 8,
                padding: '10px 13px',
                background: 'rgba(255,255,255,0.5)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.6)',
                borderTop: '1px solid rgba(255,255,255,0.85)',
                borderLeft: '2.5px solid rgba(0,0,0,0.14)',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 10px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#1a1c2e', marginBottom: 3 }}>If {c.condition.toLowerCase()}</div>
                <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.42)', fontStyle: 'italic', lineHeight: 1.55 }}>→ {c.implication}</div>
              </div>
            ))}
          </div>

          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.08) 20%, rgba(0,0,0,0.08) 80%, transparent 100%)', marginBottom: 20 }} />

          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: 'rgba(0,0,0,0.38)', marginBottom: 10 }}>
              Rejected Paths
            </div>
            {MOCK_SYNTHESIS.rejectedPaths.map(rp => (
              <div key={rp.branchId} style={{
                background: 'linear-gradient(148deg, rgba(255,244,242,0.6) 0%, rgba(255,232,229,0.45) 100%)',
                borderRadius: 14,
                padding: '12px 14px',
                border: '1px solid rgba(185,50,38,0.14)',
                borderTop: '1px solid rgba(255,255,255,0.7)',
                borderLeft: '3px solid rgba(185,50,38,0.6)',
                boxShadow: '0 1px 2px rgba(185,50,38,0.05), 0 4px 16px rgba(185,50,38,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#a02a20', marginBottom: 5 }}>Shield — Safety Violation</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#18192a', marginBottom: 4 }}>{rp.diagnosis}</div>
                <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.52)', lineHeight: 1.55 }}>{rp.pruneReason}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
