/** Style Variant A — Quiet Clinical: maximum restraint, near-white, medical journal figure */
import React from 'react'
import { mockTreeNodes, MOCK_PATIENT_CONTEXT, MOCK_SYNTHESIS } from '../data/mockTree'
import { TreeNode } from '../types/tree'

const DISPLAY_IDS = ['n001', 'n002', 'n003', 'n004', 'n005', 'n020', 'n025']
const nodes = DISPLAY_IDS.map(id => mockTreeNodes.find(n => n.id === id)!)

// ─── layout constants ────────────────────────────────────────────────
// Cards: flex column so step is always pinned to bottom regardless of headline lines
const NODE_W = 210
const NODE_H = 80         // label + up to 2-line headline + step, no clipping
const NODE_H_DEC = 88     // decision point gets a touch more

// Primary center_y = 128; branch centers at 46 and 210 → midpoint = 128 ✓
// n001–n004 top = 128 - 40 = 88; n005 top = 128 - 44 = 84
const POSITIONS: Record<string, [number, number]> = {
  n001: [20,   88],
  n002: [270,  88],
  n003: [520,  88],
  n004: [770,  88],
  n005: [1020, 84],   // decision — center at 128
  n020: [1360, 6],    // Branch A — center at 46
  n025: [1360, 170],  // Branch B — center at 210; midpoint(46,210) = 128 ✓
}
const CANVAS_W = 1600
const CANVAS_H = 310    // 170 + 80 + 60 for label below + buffer

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

// Right-edge center of source node → left-edge center of target node
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

// ─── Variant A colors: barely-tinted white (5% type-color alpha) ────
function fillA(type: string, dec: boolean): string {
  if (dec)                 return 'rgba(212,149,10,0.04)'
  if (type === 'thought')  return 'rgba(59,125,216,0.05)'
  if (type === 'tool')     return 'rgba(45,138,86,0.05)'
  if (type === 'citation') return 'rgba(123,94,167,0.05)'
  return '#fafafa'
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

// ─── Node card: collapsed — label + headline + step ─────────────────
function NodeCardA({ node }: { node: TreeNode }) {
  const dec = node.is_decision_point
  const h = nodeHeight(node.id)
  const ac = accent(node.type, dec)

  const cardStyle: React.CSSProperties = {
    position: 'absolute',
    left: POSITIONS[node.id][0],
    top: POSITIONS[node.id][1],
    width: NODE_W,
    height: h,
    background: fillA(node.type, dec),
    borderRadius: 7,
    padding: '9px 12px',
    boxSizing: 'border-box',
    overflow: 'hidden',
    // Flex column: step is always pinned to bottom
    display: 'flex',
    flexDirection: 'column',
    borderTop: dec ? `1px solid ${ac}` : '1px solid rgba(0,0,0,0.07)',
    borderRight: dec ? `1px solid ${ac}` : '1px solid rgba(0,0,0,0.07)',
    borderBottom: dec ? `1px solid ${ac}` : '1px solid rgba(0,0,0,0.07)',
    borderLeft: `2px solid ${ac}`,
    boxShadow: dec ? '0 0 0 2px rgba(212,149,10,0.08)' : 'none',
  }

  return (
    <div style={cardStyle}>
      {/* Type label — fixed at top */}
      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: lColor(node.type, dec), lineHeight: 1, marginBottom: 5, opacity: 0.8, flexShrink: 0 }}>
        {typeLabel(node.type, dec)}
      </div>
      {/* Headline — grows to fill middle, clamps at 2 lines */}
      <div style={{ fontSize: 11, lineHeight: 1.35, color: tColor(node.type, dec), overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', fontWeight: dec ? 500 : 400, flex: 1 } as React.CSSProperties}>
        {node.headline}
      </div>
      {/* Step — always at bottom */}
      <div style={{ fontSize: 9, color: 'var(--text-tertiary)', marginTop: 5, lineHeight: 1, opacity: 0.65, flexShrink: 0 }}>
        Step {(node.step_index ?? 0) + 1}
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────
export default function StyleVariantA() {
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 45px)' }}>

      {/* ── Tree panel — 65% ── */}
      <div style={{ width: '65%', background: '#fafafa', borderRight: '1px solid rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column' }}>
        {/* Patient bar */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(0,0,0,0.07)', background: '#ffffff', display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0, flexWrap: 'wrap' }}>
          {/* Demo + Chief Complaint */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, paddingRight: 20, borderRight: '1px solid rgba(0,0,0,0.08)', marginRight: 20 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>
              {MOCK_PATIENT_CONTEXT.age}{MOCK_PATIENT_CONTEXT.sex[0]}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 400 }}>
              {MOCK_PATIENT_CONTEXT.chiefComplaint}
            </span>
          </div>
          {/* Vitals */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingRight: 20, borderRight: '1px solid rgba(0,0,0,0.08)', marginRight: 20 }}>
            {[
              { label: 'HR', value: `${MOCK_PATIENT_CONTEXT.vitals.hr}`, unit: 'bpm', flag: MOCK_PATIENT_CONTEXT.vitals.hr > 100 },
              { label: 'BP', value: MOCK_PATIENT_CONTEXT.vitals.bp, unit: '', flag: true },
              { label: 'SpO₂', value: `${MOCK_PATIENT_CONTEXT.vitals.spo2}`, unit: '%', flag: MOCK_PATIENT_CONTEXT.vitals.spo2 < 95 },
              { label: 'RR', value: `${MOCK_PATIENT_CONTEXT.vitals.rr}`, unit: '/min', flag: false },
            ].map(v => (
              <div key={v.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
                <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', lineHeight: 1 }}>{v.label}</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: v.flag ? '#b84a3a' : 'var(--text-primary)', lineHeight: 1 }}>
                  {v.value}<span style={{ fontSize: 9, fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: 1 }}>{v.unit}</span>
                </span>
              </div>
            ))}
          </div>
          {/* PMH */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', lineHeight: 1 }}>PMH</span>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1 }}>{MOCK_PATIENT_CONTEXT.relevantHistory}</span>
          </div>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 20px' }}>
          <div style={{ position: 'relative', width: CANVAS_W, height: CANVAS_H }}>
            <svg style={{ position: 'absolute', inset: 0, width: CANVAS_W, height: CANVAS_H, pointerEvents: 'none' }}>
              {CONNECTIONS.map(c => (
                <path key={`${c.from}-${c.to}`} d={bezierPath(c.from, c.to)} fill="none"
                  stroke={c.isPrimary ? '#3B7DD8' : 'rgba(0,0,0,0.18)'}
                  strokeWidth={c.isPrimary ? 1.5 : 0.75}
                  strokeOpacity={c.isPrimary ? 0.45 : 1}
                />
              ))}
              {/* Branch labels below each branch node */}
              <text x={POSITIONS.n020[0]} y={POSITIONS.n020[1] + NODE_H + 12}
                style={{ fontSize: 9, fill: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                Branch A — GERD hypothesis
              </text>
              <text x={POSITIONS.n025[0]} y={POSITIONS.n025[1] + NODE_H + 12}
                style={{ fontSize: 9, fill: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                Branch B — Bayesian (converges on same Dx)
              </text>
            </svg>
            {nodes.map(node => <NodeCardA key={node.id} node={node} />)}
          </div>
        </div>
      </div>

      {/* ── Synthesis panel — 35% — light gray separates from near-white tree ── */}
      <div style={{ width: '35%', background: '#f4f4f2', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 26px' }}>

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase' as const, color: 'var(--text-tertiary)', marginBottom: 10 }}>
              Recommendation
            </div>
            <div style={{ fontSize: 19, fontWeight: 600, lineHeight: 1.3, color: 'var(--text-primary)', marginBottom: 8 }}>
              {MOCK_SYNTHESIS.recommendation.diagnosis}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              {MOCK_SYNTHESIS.recommendation.summary}
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(0,0,0,0.07)', marginBottom: 20 }} />

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase' as const, color: 'var(--text-tertiary)', marginBottom: 10 }}>
              Confidence
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4, color: 'var(--text-secondary)', marginBottom: 6 }}>
              High — {MOCK_SYNTHESIS.confidence.convergingBranches} of {MOCK_SYNTHESIS.confidence.totalBranches} branches converge
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
              {MOCK_SYNTHESIS.confidence.explanation}
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(0,0,0,0.07)', marginBottom: 20 }} />

          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase' as const, color: 'var(--text-tertiary)', marginBottom: 10 }}>
              What Would Change This
            </div>
            {MOCK_SYNTHESIS.caveats.map((c, i) => (
              <div key={i} style={{ marginBottom: 10, paddingLeft: 10, borderLeft: '1px solid rgba(0,0,0,0.12)' }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 2 }}>If {c.condition.toLowerCase()}</div>
                <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontStyle: 'italic', lineHeight: 1.5 }}>→ {c.implication}</div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid rgba(0,0,0,0.07)', marginBottom: 20 }} />

          <div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase' as const, color: 'var(--text-tertiary)', marginBottom: 10 }}>
              Rejected Paths
            </div>
            {MOCK_SYNTHESIS.rejectedPaths.map(rp => (
              <div key={rp.branchId} style={{ background: 'rgba(197,61,47,0.04)', borderRadius: 6, padding: '10px 12px', borderTop: '1px solid rgba(197,61,47,0.1)', borderRight: '1px solid rgba(197,61,47,0.1)', borderBottom: '1px solid rgba(197,61,47,0.1)', borderLeft: '2px solid rgba(197,61,47,0.4)' }}>
                <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--shield-safety-text)', marginBottom: 4 }}>Shield — Safety violation</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 3 }}>{rp.diagnosis}</div>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{rp.pruneReason}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
