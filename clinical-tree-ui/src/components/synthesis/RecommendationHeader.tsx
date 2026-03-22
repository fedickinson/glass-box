/** RecommendationHeader — diagnosis headline and confidence badge */
import React from 'react'
import { SynthesisData, FocusState } from '../../types/tree'

const CONFIDENCE_COLORS = {
  high: { text: '#1A6E3C', bg: 'rgba(26,110,60,0.08)', border: 'rgba(26,110,60,0.2)' },
  moderate: { text: '#7A5500', bg: 'rgba(212,149,10,0.08)', border: 'rgba(212,149,10,0.22)' },
  low: { text: '#8B2A20', bg: 'rgba(185,50,38,0.08)', border: 'rgba(185,50,38,0.2)' },
}

interface Props {
  synthesis: SynthesisData
  isPinned: boolean
  pinnedBranchId: string | null
  focusState: FocusState
  onDiagnosisGroupClick: (branchId: string) => void
}

export default function RecommendationHeader({
  synthesis,
  isPinned,
}: Props) {
  const { recommendation, confidence } = synthesis
  const colorsConf = CONFIDENCE_COLORS[confidence.level]

  return (
    <div>
      {/* Recommendation section */}
      <div
        style={{
          padding: '16px 18px',
          background:
            'linear-gradient(148deg, rgba(242,248,255,0.7) 0%, rgba(232,242,255,0.5) 100%)',
          borderRadius: 14,
          border: '1px solid rgba(26,82,168,0.12)',
          borderTop: '1px solid rgba(255,255,255,0.9)',
          boxShadow:
            '0 2px 12px rgba(26,82,168,0.07), inset 0 1px 0 rgba(255,255,255,1)',
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#1A52A8',
            marginBottom: 6,
          }}
        >
          Recommendation
        </div>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            lineHeight: 1.2,
            color: '#111',
            fontFamily: 'Georgia, "Times New Roman", serif',
            marginBottom: 6,
          }}
        >
          {recommendation.diagnosis}
        </div>
        <div
          style={{ fontSize: 12.5, lineHeight: 1.55, color: 'rgba(0,0,0,0.58)', marginBottom: 10 }}
        >
          {recommendation.summary.slice(0, 200)}
          {recommendation.summary.length > 200 ? '…' : ''}
        </div>

        {/* Confidence pill + action line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <span style={{
            fontSize: 9.5, fontWeight: 700, letterSpacing: '0.04em',
            color: '#1A6E3C', background: 'rgba(26,110,60,0.1)',
            border: '1px solid rgba(26,110,60,0.22)', borderRadius: 4,
            padding: '2px 7px', flexShrink: 0,
          }}>
            High confidence
          </span>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#111' }}>
            Recommend cardiology consult
          </span>
        </div>

        {/* Residual uncertainty callout */}
        <div style={{
          padding: '7px 10px',
          borderRadius: 7,
          background: 'rgba(212,149,10,0.09)',
          border: '1px solid rgba(212,149,10,0.25)',
          marginBottom: isPinned ? 10 : 0,
        }}>
          <span style={{ fontSize: 10.5, color: '#7A5500', lineHeight: 1.5 }}>
            <span style={{ marginRight: 4 }}>⚠</span>
            <strong>Remaining uncertainty:</strong> NSTEMI was not clinically ruled out — the Shield
            terminated this path for safety reasons (premature anticoagulation violates ACC/AHA §6.1),
            not because the diagnosis was excluded. Serial troponin at 3h recommended.
          </span>
        </div>

        {isPinned && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: '#1A52A8',
              background: 'rgba(26,82,168,0.08)',
              border: '1px solid rgba(26,82,168,0.2)',
              borderRadius: 6,
              padding: '3px 8px',
            }}
          >
            ★ Doctor concurs
          </div>
        )}
      </div>

    </div>
  )
}
