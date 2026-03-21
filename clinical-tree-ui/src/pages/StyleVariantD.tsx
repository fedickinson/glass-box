/** Style Variant D — Apple Glass: visionOS-inspired glassmorphism on a deep canvas, based on C's structure */
import React from 'react'
import { mockTreeNodes, MOCK_PATIENT_CONTEXT, MOCK_SYNTHESIS } from '../data/mockTree'
import { TreeNode } from '../types/tree'

const DISPLAY_IDS = ['n001', 'n002', 'n003', 'n004', 'n005', 'n020', 'n025']
const nodes = DISPLAY_IDS.map(id => mockTreeNodes.find(n => n.id === id)!)

// ─── layout constants (same geometry as C) ────────────────────────────
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

// ─── Glass fills: dark-tinted by node type ───────────────────────────
function fillD(type: string, dec: boolean): string {
  if (dec)                 return 'rgba(212,149,10,0.16)'
  if (type === 'thought')  return 'rgba(59,125,216,0.14)'
  if (type === 'tool')     return 'rgba(45,138,86,0.14)'
  if (type === 'citation') return 'rgba(123,94,167,0.14)'
  return 'rgba(255,255,255,0.07)'
}

function accentD(type: string, dec: boolean): string {
  if (dec)                 return '#F0A800'
  if (type === 'thought')  return '#4D8FE0'
  if (type === 'tool')     return '#3A9E68'
  if (type === 'citation') return '#8B6CC4'
  return 'rgba(255,255,255,0.3)'
}

function typeLabel(type: string, dec: boolean): string {
  if (dec)                 return 'DECISION POINT'
  if (type === 'thought')  return 'REASONING'
  if (type === 'tool')     return 'TOOL CALL'
  if (type === 'citation') return 'CITATION'
  return type.toUpperCase()
}

// ─── Node card ──────────────────────────────────────────────────────
function NodeCardD({ node }: { node: TreeNode }) {
  const dec = node.is_decision_point
  const h = nodeHeight(node.id)
  const ac = accentD(node.type, dec)

  const cardStyle: React.CSSProperties = {
    position: 'absolute',
    left: POSITIONS[node.id][0],
    top: POSITIONS[node.id][1],
    width: NODE_W,
    height: h,
    background: fillD(node.type, dec),
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: 14,
    padding: '9px 13px',
    boxSizing: 'border-box',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    // Specular top edge + glass side borders
    borderTop: '1px solid rgba(255,255,255,0.18)',
    borderRight: '1px solid rgba(255,255,255,0.07)',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    borderLeft: `3px solid ${ac}`,
    boxShadow: dec
      ? `0 0 0 1px ${ac}44, 0 0 28px ${ac}33, 0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12)`
      : '0 4px 20px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.09)',
  }

  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: ac, lineHeight: 1, marginBottom: 5, flexShrink: 0 }}>
        {typeLabel(node.type, dec)}
      </div>
      <div style={{ fontSize: 12, lineHeight: 1.4, color: 'rgba(255,255,255,0.9)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', fontWeight: dec ? 600 : 400, flex: 1 } as React.CSSProperties}>
        {node.headline}
      </div>
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.32)', marginTop: 5, lineHeight: 1, flexShrink: 0 }}>
        Step {(node.step_index ?? 0) + 1}
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────
export default function StyleVariantD() {
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 45px)' }}>

      {/* ── Tree panel — 65% — deep space canvas ── */}
      <div style={{ width: '65%', background: 'linear-gradient(155deg, #0c1022 0%, #080b16 55%, #0b0e1e 100%)', borderRight: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column' }}>

        {/* Patient bar — frosted glass strip */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0, flexWrap: 'wrap' }}>
          {/* Demo + Chief Complaint */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, paddingRight: 20, borderRight: '1px solid rgba(255,255,255,0.1)', marginRight: 20 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em' }}>
              {MOCK_PATIENT_CONTEXT.age}{MOCK_PATIENT_CONTEXT.sex[0]}
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 400 }}>
              {MOCK_PATIENT_CONTEXT.chiefComplaint}
            </span>
          </div>
          {/* Vitals as glass chips */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingRight: 20, borderRight: '1px solid rgba(255,255,255,0.1)', marginRight: 20 }}>
            {[
              { label: 'HR',   value: `${MOCK_PATIENT_CONTEXT.vitals.hr}`,   unit: 'bpm', flag: MOCK_PATIENT_CONTEXT.vitals.hr > 100 },
              { label: 'BP',   value: MOCK_PATIENT_CONTEXT.vitals.bp,         unit: '',    flag: true },
              { label: 'SpO₂', value: `${MOCK_PATIENT_CONTEXT.vitals.spo2}`,  unit: '%',   flag: MOCK_PATIENT_CONTEXT.vitals.spo2 < 95 },
              { label: 'RR',   value: `${MOCK_PATIENT_CONTEXT.vitals.rr}`,   unit: '/min', flag: false },
            ].map((v, i) => (
              <div key={v.label} style={{
                display: 'flex', alignItems: 'baseline', gap: 4,
                padding: '3px 9px',
                background: v.flag ? 'rgba(220,70,55,0.18)' : 'rgba(255,255,255,0.07)',
                border: v.flag ? '1px solid rgba(220,70,55,0.35)' : '1px solid rgba(255,255,255,0.12)',
                borderRadius: 20,
                marginLeft: i === 0 ? 0 : 3,
              }}>
                <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: v.flag ? '#ff8576' : 'rgba(255,255,255,0.4)' }}>{v.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: v.flag ? '#ff8576' : 'rgba(255,255,255,0.88)' }}>{v.value}</span>
                {v.unit && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{v.unit}</span>}
              </div>
            ))}
          </div>
          {/* PMH */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', lineHeight: 1 }}>PMH</span>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1 }}>{MOCK_PATIENT_CONTEXT.relevantHistory}</span>
          </div>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, overflow: 'auto', padding: '28px 20px' }}>
          <div style={{ position: 'relative', width: CANVAS_W, height: CANVAS_H }}>
            <svg style={{ position: 'absolute', inset: 0, width: CANVAS_W, height: CANVAS_H, pointerEvents: 'none' }}>
              {/* Branch connections — layered glow, secondary weight */}
              {CONNECTIONS.filter(c => !c.isPrimary).map(c => (
                <g key={`${c.from}-${c.to}`}>
                  {/* Outer glow */}
                  <path d={bezierPath(c.from, c.to)} fill="none"
                    stroke="rgba(255,255,255,0.08)"
                    strokeWidth={8}
                    strokeDasharray="5,4"
                  />
                  {/* Mid glow */}
                  <path d={bezierPath(c.from, c.to)} fill="none"
                    stroke="rgba(255,255,255,0.18)"
                    strokeWidth={3}
                    strokeDasharray="5,4"
                  />
                  {/* Crisp line */}
                  <path d={bezierPath(c.from, c.to)} fill="none"
                    stroke="rgba(255,255,255,0.55)"
                    strokeWidth={1.25}
                    strokeDasharray="5,4"
                  />
                </g>
              ))}
              {/* Primary connections — wide glow layer + bright crisp line on top */}
              {CONNECTIONS.filter(c => c.isPrimary).map(c => (
                <g key={`${c.from}-${c.to}`}>
                  {/* Outer glow */}
                  <path d={bezierPath(c.from, c.to)} fill="none"
                    stroke="#5AAEFF"
                    strokeWidth={10}
                    strokeOpacity={0.15}
                  />
                  {/* Mid glow */}
                  <path d={bezierPath(c.from, c.to)} fill="none"
                    stroke="#7BBFFF"
                    strokeWidth={4}
                    strokeOpacity={0.35}
                  />
                  {/* Crisp line */}
                  <path d={bezierPath(c.from, c.to)} fill="none"
                    stroke="#A8D4FF"
                    strokeWidth={2}
                    strokeOpacity={1}
                  />
                </g>
              ))}
              <text x={POSITIONS.n020[0]} y={POSITIONS.n020[1] + NODE_H + 12}
                style={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.06em' }}>
                BRANCH A — GERD
              </text>
              <text x={POSITIONS.n025[0]} y={POSITIONS.n025[1] + NODE_H + 12}
                style={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.06em' }}>
                BRANCH B — BAYESIAN ↗ CONVERGES
              </text>
            </svg>
            {nodes.map(node => <NodeCardD key={node.id} node={node} />)}
          </div>
        </div>
      </div>

      {/* ── Synthesis panel — 35% — glass sidebar ── */}
      <div style={{ width: '35%', background: 'linear-gradient(155deg, #0e1228 0%, #0a0d1e 100%)', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderLeft: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px' }}>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.3)', marginBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 8 }}>
              Recommendation
            </div>
            <div style={{ fontSize: 21, fontWeight: 700, lineHeight: 1.25, color: '#ffffff', fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 10 }}>
              {MOCK_SYNTHESIS.recommendation.diagnosis}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.65, color: 'rgba(255,255,255,0.6)' }}>
              {MOCK_SYNTHESIS.recommendation.summary}
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginBottom: 20 }} />

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.3)', marginBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 8 }}>
              Confidence
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.88)', marginBottom: 8 }}>
              High — {MOCK_SYNTHESIS.confidence.convergingBranches} of {MOCK_SYNTHESIS.confidence.totalBranches} branches converge
            </div>
            {/* Luminous progress bar */}
            <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, marginBottom: 10, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${(MOCK_SYNTHESIS.confidence.convergingBranches / MOCK_SYNTHESIS.confidence.totalBranches) * 100}%`,
                background: 'linear-gradient(90deg, #3B7DD8, #6AB0FF)',
                borderRadius: 2,
                boxShadow: '0 0 10px rgba(106,176,255,0.7)',
              }} />
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.6, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' }}>
              {MOCK_SYNTHESIS.confidence.explanation}
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginBottom: 20 }} />

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.3)', marginBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 8 }}>
              What Would Change This
            </div>
            {MOCK_SYNTHESIS.caveats.map((c, i) => (
              <div key={i} style={{
                marginBottom: 8,
                padding: '10px 13px',
                background: 'rgba(255,255,255,0.04)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.09)',
                borderLeft: '2px solid rgba(255,255,255,0.22)',
              }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.8)', marginBottom: 3 }}>If {c.condition.toLowerCase()}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', fontStyle: 'italic', lineHeight: 1.55 }}>→ {c.implication}</div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginBottom: 20 }} />

          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.3)', marginBottom: 10, borderBottom: '1px solid rgba(255,255,255,0.07)', paddingBottom: 8 }}>
              Rejected Paths
            </div>
            {MOCK_SYNTHESIS.rejectedPaths.map(rp => (
              <div key={rp.branchId} style={{
                background: 'rgba(197,61,47,0.12)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                borderRadius: 12,
                padding: '12px 14px',
                border: '1px solid rgba(197,61,47,0.25)',
                borderLeft: '3px solid rgba(220,80,65,0.8)',
                boxShadow: '0 0 20px rgba(197,61,47,0.1)',
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: '#ff7b6b', marginBottom: 5 }}>Shield — Safety Violation</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: 4 }}>{rp.diagnosis}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.48)', lineHeight: 1.55 }}>{rp.pruneReason}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
