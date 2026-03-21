/** Style Variant C — High-Contrast Editorial: saturated fills, 4px borders, bold serif, projector-ready */
import React from 'react'
import { mockTreeNodes, MOCK_PATIENT_CONTEXT, MOCK_SYNTHESIS } from '../data/mockTree'
import { TreeNode } from '../types/tree'

const DISPLAY_IDS = ['n001', 'n002', 'n003', 'n004', 'n005', 'n020', 'n025']
const nodes = DISPLAY_IDS.map(id => mockTreeNodes.find(n => n.id === id)!)

// ─── layout constants ─────────────────────────────────────────────────
// C uses 13px body + 10px label/step — slightly more height than A (11px)
// label: 10px + 5px margin = 15px; headline: 13*1.35*2 = ~35px; step: 5+10 = 15px
// content = 65px + 8+8 padding = 81 → round to 84; dec gets +8
const NODE_W = 210
const NODE_H = 84
const NODE_H_DEC = 92

// Primary center_y = 134; branch A center = 52 (10+42), branch B center = 216 (172+44)
// midpoint(52, 216) = 134 ✓; primary center = 84 + 84/2 = 126... let me recalc
// n001-n004 top = 88, center = 88 + 42 = 130
// n005 top = 84, center = 84 + 42 = 126 ← close enough (decision node slightly taller feel)
// Branch A: center at 52 → top = 52 - 42 = 10
// Branch B: center at 210 → top = 210 - 42 = 168; midpoint(52, 210) = 131 ≈ 130 ✓
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

// ─── Variant C: strongly saturated fills — pop on a projector ────────
function fillC(type: string, dec: boolean): string {
  if (dec)                 return '#FFE494'  // deep amber
  if (type === 'thought')  return '#C8DFF8'  // saturated blue
  if (type === 'tool')     return '#BFDFCC'  // saturated green
  if (type === 'citation') return '#D8CEEF'  // saturated purple
  return '#e8e8e8'
}
function accent(type: string, dec: boolean): string {
  if (dec)                 return 'var(--node-decision-border)'
  if (type === 'thought')  return 'var(--node-thought-border)'
  if (type === 'tool')     return 'var(--node-tool-border)'
  if (type === 'citation') return 'var(--node-citation-border)'
  return 'var(--border-default)'
}
// In C, label uses the full border color (fully saturated, high contrast)
function lColor(type: string, dec: boolean): string {
  if (dec)                 return 'var(--node-decision-border)'
  if (type === 'thought')  return 'var(--node-thought-border)'
  if (type === 'tool')     return 'var(--node-tool-border)'
  if (type === 'citation') return 'var(--node-citation-border)'
  return 'var(--text-secondary)'
}
function tColor(type: string, dec: boolean): string {
  if (dec)                 return 'var(--node-decision-text)'
  if (type === 'thought')  return 'var(--node-thought-text)'
  if (type === 'tool')     return 'var(--node-tool-text)'
  if (type === 'citation') return 'var(--node-citation-text)'
  return 'var(--text-primary)'
}
function typeLabel(type: string, dec: boolean): string {
  if (dec)                 return 'DECISION POINT'
  if (type === 'thought')  return 'REASONING'
  if (type === 'tool')     return 'TOOL CALL'
  if (type === 'citation') return 'CITATION'
  return type.toUpperCase()
}

// ─── Node card ──────────────────────────────────────────────────────
function NodeCardC({ node }: { node: TreeNode }) {
  const dec = node.is_decision_point
  const h = nodeHeight(node.id)
  const ac = accent(node.type, dec)

  const cardStyle: React.CSSProperties = {
    position: 'absolute',
    left: POSITIONS[node.id][0],
    top: POSITIONS[node.id][1],
    width: NODE_W,
    height: h,
    background: fillC(node.type, dec),
    borderRadius: 10,
    padding: dec ? '9px 12px' : '8px 12px',
    boxSizing: 'border-box',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    // Key Variant C: 4px left border, drop shadow, stronger borders
    borderTop: dec ? `2px solid ${ac}` : '1px solid rgba(0,0,0,0.12)',
    borderRight: dec ? `2px solid ${ac}` : '1px solid rgba(0,0,0,0.12)',
    borderBottom: dec ? `2px solid ${ac}` : '1px solid rgba(0,0,0,0.12)',
    borderLeft: `4px solid ${ac}`,
    boxShadow: dec
      ? `0 0 0 5px rgba(212,149,10,0.22), 0 0 14px rgba(212,149,10,0.12), 0 2px 8px rgba(0,0,0,0.12)`
      : '0 2px 6px rgba(0,0,0,0.1)',
  }

  return (
    <div style={cardStyle}>
      {/* Type label — heavier weight, fully saturated color */}
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: lColor(node.type, dec), lineHeight: 1, marginBottom: 5, flexShrink: 0 }}>
        {typeLabel(node.type, dec)}
      </div>
      {/* Headline — +1px larger than A, 2-line clamp, bold on decision */}
      <div style={{ fontSize: 13, lineHeight: 1.35, color: tColor(node.type, dec), overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', fontWeight: dec ? 600 : 400, flex: 1 } as React.CSSProperties}>
        {node.headline}
      </div>
      {/* Step — slightly more visible in C, pinned to bottom */}
      <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 5, lineHeight: 1, fontWeight: 500, flexShrink: 0 }}>
        Step {(node.step_index ?? 0) + 1}
      </div>
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────
export default function StyleVariantC() {
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 45px)' }}>

      {/* ── Tree panel — 65% ── */}
      <div style={{ width: '65%', background: '#f0f2f6', borderRight: '1px solid rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column' }}>
        {/* Patient bar — high contrast, structured */}
        <div style={{ padding: '10px 20px', borderBottom: '2px solid rgba(0,0,0,0.1)', background: '#ffffff', display: 'flex', alignItems: 'center', gap: 0, flexShrink: 0, flexWrap: 'wrap' }}>
          {/* Demo + Chief Complaint */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingRight: 20, borderRight: '1.5px solid rgba(0,0,0,0.12)', marginRight: 20 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.01em', fontFamily: 'Georgia, "Times New Roman", serif' }}>
              {MOCK_PATIENT_CONTEXT.age}{MOCK_PATIENT_CONTEXT.sex[0]}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
              {MOCK_PATIENT_CONTEXT.chiefComplaint}
            </span>
          </div>
          {/* Vitals — bolder chips for C */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingRight: 20, borderRight: '1.5px solid rgba(0,0,0,0.12)', marginRight: 20 }}>
            {[
              { label: 'HR', value: `${MOCK_PATIENT_CONTEXT.vitals.hr}`, unit: 'bpm', flag: MOCK_PATIENT_CONTEXT.vitals.hr > 100 },
              { label: 'BP', value: MOCK_PATIENT_CONTEXT.vitals.bp, unit: '', flag: true },
              { label: 'SpO₂', value: `${MOCK_PATIENT_CONTEXT.vitals.spo2}`, unit: '%', flag: MOCK_PATIENT_CONTEXT.vitals.spo2 < 95 },
              { label: 'RR', value: `${MOCK_PATIENT_CONTEXT.vitals.rr}`, unit: '/min', flag: false },
            ].map((v, i) => (
              <div key={v.label} style={{
                display: 'flex', alignItems: 'baseline', gap: 4,
                padding: '3px 8px',
                background: v.flag ? 'rgba(184,74,58,0.07)' : 'rgba(0,0,0,0.04)',
                borderRadius: 4,
                marginLeft: i === 0 ? 0 : 2,
              }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: v.flag ? '#a83228' : 'var(--text-tertiary)' }}>{v.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: v.flag ? '#a83228' : 'var(--text-primary)' }}>
                  {v.value}
                </span>
                {v.unit && <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>{v.unit}</span>}
              </div>
            ))}
          </div>
          {/* PMH */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)', lineHeight: 1 }}>PMH</span>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500, lineHeight: 1 }}>{MOCK_PATIENT_CONTEXT.relevantHistory}</span>
          </div>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 20px' }}>
          <div style={{ position: 'relative', width: CANVAS_W, height: CANVAS_H }}>
            <svg style={{ position: 'absolute', inset: 0, width: CANVAS_W, height: CANVAS_H, pointerEvents: 'none' }}>
              {CONNECTIONS.map(c => (
                <path key={`${c.from}-${c.to}`} d={bezierPath(c.from, c.to)} fill="none"
                  stroke={c.isPrimary ? '#3B7DD8' : 'rgba(0,0,0,0.35)'}
                  strokeWidth={c.isPrimary ? 2.5 : 1.25}
                  strokeOpacity={c.isPrimary ? 0.7 : 1}
                  strokeDasharray={c.isPrimary ? undefined : '5,3'}
                />
              ))}
              {/* Branch labels — uppercase, high contrast */}
              <text x={POSITIONS.n020[0]} y={POSITIONS.n020[1] + NODE_H + 11}
                style={{ fontSize: 10, fill: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.05em' }}>
                BRANCH A — GERD
              </text>
              <text x={POSITIONS.n025[0]} y={POSITIONS.n025[1] + NODE_H + 11}
                style={{ fontSize: 10, fill: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.05em' }}>
                BRANCH B — BAYESIAN ↗ CONVERGES
              </text>
            </svg>
            {nodes.map(node => <NodeCardC key={node.id} node={node} />)}
          </div>
        </div>
      </div>

      {/* ── Synthesis panel — 35% — crisp white with strong border ── */}
      <div style={{ width: '35%', background: '#ffffff', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderLeft: '2px solid rgba(0,0,0,0.12)' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 26px' }}>

          {/* Section headers in C get a colored underline bar */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--text-primary)', marginBottom: 10, borderBottom: '2px solid var(--node-thought-border)', paddingBottom: 6 }}>
              Recommendation
            </div>
            {/* Bold serif, largest of all three variants */}
            <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.25, color: 'var(--text-primary)', fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 10 }}>
              {MOCK_SYNTHESIS.recommendation.diagnosis}
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.55, color: 'var(--text-secondary)', fontWeight: 400 }}>
              {MOCK_SYNTHESIS.recommendation.summary}
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(0,0,0,0.12)', marginBottom: 18 }} />

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--text-primary)', marginBottom: 10, borderBottom: '2px solid var(--node-tool-border)', paddingBottom: 6 }}>
              Confidence
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4, color: 'var(--text-primary)', marginBottom: 6 }}>
              High — {MOCK_SYNTHESIS.confidence.convergingBranches} of {MOCK_SYNTHESIS.confidence.totalBranches} branches converge
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              {MOCK_SYNTHESIS.confidence.explanation}
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(0,0,0,0.12)', marginBottom: 18 }} />

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--text-primary)', marginBottom: 10, borderBottom: '2px solid var(--node-decision-border)', paddingBottom: 6 }}>
              What Would Change This
            </div>
            {MOCK_SYNTHESIS.caveats.map((c, i) => (
              <div key={i} style={{ marginBottom: 10, paddingLeft: 12, borderLeft: '3px solid rgba(0,0,0,0.15)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>If {c.condition.toLowerCase()}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: 1.5 }}>→ {c.implication}</div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid rgba(0,0,0,0.12)', marginBottom: 18 }} />

          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: 'var(--text-primary)', marginBottom: 10, borderBottom: '2px solid var(--node-flagged-border)', paddingBottom: 6 }}>
              Rejected Paths
            </div>
            {MOCK_SYNTHESIS.rejectedPaths.map(rp => (
              <div key={rp.branchId} style={{ background: 'var(--shield-safety-bg)', borderRadius: 8, padding: '12px 14px', borderTop: '1.5px solid rgba(197,61,47,0.25)', borderRight: '1.5px solid rgba(197,61,47,0.25)', borderBottom: '1.5px solid rgba(197,61,47,0.25)', borderLeft: '4px solid var(--node-flagged-border)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--shield-safety-text)', marginBottom: 5 }}>Shield — Safety violation</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{rp.diagnosis}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{rp.pruneReason}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
