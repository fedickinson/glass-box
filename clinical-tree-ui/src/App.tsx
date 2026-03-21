/** App — Stage 1 layout shell: patient bar + two-panel split (tree 65% / synthesis 35%) */
import React from 'react'
import { TreeProvider, useTreeContext } from './context/TreeContext'
import { useTreeKeyboard } from './hooks/useTreeKeyboard'
import { useGrowthTimer } from './hooks/useGrowthTimer'
import { useViewportControl } from './hooks/useViewportControl'
import { MOCK_PATIENT_CONTEXT, MOCK_SYNTHESIS } from './data/mockTree'

// ─── Inner layout — has access to TreeContext ──────────────────────
function AppLayout() {
  const { state, dispatch } = useTreeContext()

  useTreeKeyboard(state.focusState, state.growth, dispatch)
  useGrowthTimer(state.growth, dispatch)
  useViewportControl(state.focusState)

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* ── Patient context bar — full width ── */}
      <header
        className="flex items-center gap-0 shrink-0 border-b"
        style={{
          padding: '10px 24px',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderColor: 'rgba(0,0,0,0.07)',
        }}
      >
        {/* Patient identity + chief complaint */}
        <div
          className="flex items-baseline gap-2.5 pr-5 mr-5"
          style={{ borderRight: '1px solid rgba(0,0,0,0.09)' }}
        >
          <span className="text-[13px] font-bold tracking-tight text-[#111]">
            {MOCK_PATIENT_CONTEXT.age}{MOCK_PATIENT_CONTEXT.sex[0]}
          </span>
          <span className="text-[12px] font-normal text-[#333]">
            {MOCK_PATIENT_CONTEXT.chiefComplaint}
          </span>
        </div>

        {/* Vitals pills */}
        <div
          className="flex items-center gap-1 pr-5 mr-5"
          style={{ borderRight: '1px solid rgba(0,0,0,0.09)' }}
        >
          {[
            { label: 'HR',   value: `${MOCK_PATIENT_CONTEXT.vitals.hr}`,  unit: 'bpm',  flag: MOCK_PATIENT_CONTEXT.vitals.hr > 100 },
            { label: 'BP',   value: MOCK_PATIENT_CONTEXT.vitals.bp,        unit: '',     flag: true },
            { label: 'SpO₂', value: `${MOCK_PATIENT_CONTEXT.vitals.spo2}`, unit: '%',    flag: MOCK_PATIENT_CONTEXT.vitals.spo2 < 95 },
            { label: 'RR',   value: `${MOCK_PATIENT_CONTEXT.vitals.rr}`,  unit: '/min', flag: false },
          ].map((v, i) => (
            <div
              key={v.label}
              className="flex items-baseline gap-1"
              style={{
                padding: '3px 9px',
                background: v.flag ? 'rgba(185,50,38,0.07)' : 'rgba(255,255,255,0.75)',
                border: v.flag ? '1px solid rgba(185,50,38,0.2)' : '1px solid rgba(0,0,0,0.09)',
                borderRadius: 20,
                marginLeft: i === 0 ? 0 : 3,
              }}
            >
              <span
                className="text-[8px] font-bold uppercase tracking-[0.08em]"
                style={{ color: v.flag ? '#b83226' : 'rgba(0,0,0,0.4)' }}
              >
                {v.label}
              </span>
              <span
                className="text-[12px] font-bold"
                style={{ color: v.flag ? '#b83226' : '#111' }}
              >
                {v.value}
              </span>
              {v.unit && (
                <span className="text-[9px]" style={{ color: 'rgba(0,0,0,0.3)' }}>
                  {v.unit}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* PMH */}
        <div className="flex flex-col gap-0.5">
          <span
            className="text-[8px] font-bold uppercase tracking-[0.1em] leading-none"
            style={{ color: 'rgba(0,0,0,0.35)' }}
          >
            PMH
          </span>
          <span className="text-[11px] leading-none" style={{ color: 'rgba(0,0,0,0.55)' }}>
            {MOCK_PATIENT_CONTEXT.relevantHistory}
          </span>
        </div>

        {/* Spacer + view mode badge */}
        <div className="ml-auto flex items-center gap-3">
          <span
            className="text-[9px] font-semibold uppercase tracking-[0.1em] px-2.5 py-1 rounded-full"
            style={{
              background: 'rgba(59,125,216,0.08)',
              color: '#1A52A8',
              border: '1px solid rgba(59,125,216,0.15)',
            }}
          >
            Clinical View
          </span>
        </div>
      </header>

      {/* ── Two-panel content area ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Tree panel — 65% ── */}
        <div
          className="flex flex-col overflow-hidden"
          style={{
            width: '65%',
            background: 'radial-gradient(ellipse at 38% 38%, #e8eef8 0%, #dde6f4 55%, #d8e2f0 100%)',
            borderRight: '1px solid rgba(0,0,0,0.07)',
          }}
        >
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div
                className="text-[10px] font-bold uppercase tracking-[0.12em]"
                style={{ color: 'rgba(0,0,0,0.22)' }}
              >
                Stage 2
              </div>
              <div className="text-[15px] font-medium" style={{ color: 'rgba(0,0,0,0.32)' }}>
                Tree renders here
              </div>
              <div className="text-[11px]" style={{ color: 'rgba(0,0,0,0.2)' }}>
                Context wired · {state.tree.nodes.length} nodes · focus: {state.focusState.mode}
              </div>
            </div>
          </div>
        </div>

        {/* ── Synthesis panel — 35% ── */}
        <div
          className="flex flex-col overflow-hidden"
          style={{
            width: '35%',
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.9)',
          }}
        >
          <div className="flex-1 overflow-y-auto" style={{ padding: '26px 26px' }}>

            {/* RECOMMENDATION */}
            <div
              className="mb-6"
              style={{
                padding: '16px 18px',
                background: 'linear-gradient(148deg, rgba(242,248,255,0.7) 0%, rgba(232,242,255,0.5) 100%)',
                borderRadius: 14,
                border: '1px solid rgba(26,82,168,0.12)',
                borderTop: '1px solid rgba(255,255,255,0.9)',
                boxShadow: '0 2px 12px rgba(26,82,168,0.07), inset 0 1px 0 rgba(255,255,255,1)',
              }}
            >
              <div
                className="text-[9px] font-bold uppercase tracking-[0.14em] mb-2.5"
                style={{ color: '#1A52A8' }}
              >
                Recommendation
              </div>
              <div
                className="text-[21px] font-bold leading-tight mb-2.5"
                style={{ color: '#111', fontFamily: 'Georgia, "Times New Roman", serif' }}
              >
                {MOCK_SYNTHESIS.recommendation.diagnosis}
              </div>
              <div className="text-[13px] leading-relaxed" style={{ color: 'rgba(0,0,0,0.58)' }}>
                {MOCK_SYNTHESIS.recommendation.summary}
              </div>
            </div>

            <Divider />

            {/* CONFIDENCE */}
            <div className="mb-6">
              <div
                className="text-[9px] font-bold uppercase tracking-[0.14em] mb-2.5"
                style={{ color: 'rgba(0,0,0,0.38)' }}
              >
                Confidence
              </div>
              <div className="text-[15px] font-semibold mb-2" style={{ color: '#111' }}>
                High — {MOCK_SYNTHESIS.confidence.convergingBranches} of{' '}
                {MOCK_SYNTHESIS.confidence.totalBranches} branches converge
              </div>
              <div
                className="h-1 rounded-full mb-2.5 overflow-hidden"
                style={{ background: 'rgba(0,0,0,0.07)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(MOCK_SYNTHESIS.confidence.convergingBranches / MOCK_SYNTHESIS.confidence.totalBranches) * 100}%`,
                    background: 'linear-gradient(90deg, #1A52A8, #4A8AE8)',
                    boxShadow: '0 0 6px rgba(26,82,168,0.35)',
                  }}
                />
              </div>
              <div
                className="text-[12px] leading-relaxed italic"
                style={{ color: 'rgba(0,0,0,0.42)' }}
              >
                {MOCK_SYNTHESIS.confidence.explanation}
              </div>
            </div>

            <Divider />

            {/* WHAT WOULD CHANGE THIS */}
            <div className="mb-6">
              <div
                className="text-[9px] font-bold uppercase tracking-[0.14em] mb-2.5"
                style={{ color: 'rgba(0,0,0,0.38)' }}
              >
                What Would Change This
              </div>
              {MOCK_SYNTHESIS.caveats.map((c, i) => (
                <div
                  key={i}
                  className="mb-2"
                  style={{
                    padding: '10px 13px',
                    background: 'rgba(255,255,255,0.85)',
                    borderRadius: 12,
                    border: '1px solid rgba(0,0,0,0.07)',
                    borderTop: '1px solid rgba(255,255,255,1)',
                    borderLeft: '2.5px solid rgba(0,0,0,0.14)',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04), 0 4px 10px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,1)',
                  }}
                >
                  <div className="text-[12px] font-medium mb-0.5" style={{ color: '#1a1c2e' }}>
                    If {c.condition.replace(/^If /i, '').toLowerCase()}
                  </div>
                  <div
                    className="text-[11px] leading-snug italic"
                    style={{ color: 'rgba(0,0,0,0.42)' }}
                  >
                    → {c.implication}
                  </div>
                </div>
              ))}
            </div>

            <Divider />

            {/* REJECTED PATHS */}
            <div>
              <div
                className="text-[9px] font-bold uppercase tracking-[0.14em] mb-2.5"
                style={{ color: 'rgba(0,0,0,0.38)' }}
              >
                Rejected Paths
              </div>
              {MOCK_SYNTHESIS.rejectedPaths.map(rp => (
                <div
                  key={rp.branchId}
                  style={{
                    background: 'linear-gradient(148deg, rgba(255,245,244,0.95) 0%, rgba(255,237,235,0.85) 100%)',
                    borderRadius: 14,
                    padding: '12px 14px',
                    border: '1px solid rgba(185,50,38,0.14)',
                    borderTop: '1px solid rgba(255,255,255,0.9)',
                    borderLeft: '3px solid rgba(185,50,38,0.6)',
                    boxShadow: '0 1px 2px rgba(185,50,38,0.06), 0 4px 16px rgba(185,50,38,0.08), inset 0 1px 0 rgba(255,255,255,1)',
                  }}
                >
                  <div
                    className="text-[9px] font-bold uppercase tracking-[0.1em] mb-1.5"
                    style={{ color: '#a02a20' }}
                  >
                    Shield — Safety Violation
                  </div>
                  <div className="text-[13px] font-semibold mb-1" style={{ color: '#18192a' }}>
                    {rp.diagnosis}
                  </div>
                  <div
                    className="text-[11px] leading-snug"
                    style={{ color: 'rgba(0,0,0,0.52)' }}
                  >
                    {rp.pruneReason}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Divider ───────────────────────────────────────────────────────
function Divider() {
  return (
    <div
      className="mb-5"
      style={{
        height: 1,
        background: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.08) 20%, rgba(0,0,0,0.08) 80%, transparent 100%)',
      }}
    />
  )
}

// ─── Root — wraps layout in TreeProvider ──────────────────────────
export default function App() {
  return (
    <TreeProvider>
      <AppLayout />
    </TreeProvider>
  )
}
