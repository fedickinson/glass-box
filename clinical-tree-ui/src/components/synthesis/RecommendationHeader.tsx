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
  primaryExpanded?: boolean
  onTogglePrimary?: () => void
}

export default function RecommendationHeader({
  synthesis,
  isPinned,
  primaryExpanded,
  onTogglePrimary,
}: Props) {
  const { recommendation, confidence } = synthesis
  const colorsConf = CONFIDENCE_COLORS[confidence.level]

  return (
    <div>
      {/* Recommendation section */}
      <div
        onClick={onTogglePrimary}
        style={{
          padding: '16px 18px',
          background:
            'linear-gradient(148deg, rgba(242,248,255,0.7) 0%, rgba(232,242,255,0.5) 100%)',
          borderRadius: primaryExpanded ? '14px 14px 0 0' : 14,
          border: '1px solid rgba(26,82,168,0.12)',
          borderTop: '1px solid rgba(255,255,255,0.9)',
          borderBottom: primaryExpanded ? 'none' : '1px solid rgba(26,82,168,0.12)',
          boxShadow:
            '0 2px 12px rgba(26,82,168,0.07), inset 0 1px 0 rgba(255,255,255,1)',
          marginBottom: primaryExpanded ? 0 : 10,
          cursor: onTogglePrimary ? 'pointer' : 'default',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#1A52A8',
            }}
          >
            Recommendation
          </div>
          {confidence.convergingBranches > 1 && (
            <span style={{
              fontSize: 9, fontWeight: 600,
              color: '#1A52A8',
              background: 'rgba(26,82,168,0.10)',
              border: '1px solid rgba(26,82,168,0.22)',
              borderRadius: 4, padding: '2px 6px',
              whiteSpace: 'nowrap',
            }}>
              {confidence.convergingBranches} of {confidence.totalBranches} paths
            </span>
          )}
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

        {/* Potential next step */}
        {recommendation.nextStep && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 7,
            marginBottom: synthesis.safetySummary.violations.length > 0 ? 10 : 0,
          }}>
            <span style={{
              fontSize: 8, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
              color: '#1A52A8', flexShrink: 0, marginTop: 2,
            }}>
              Next step for this diagnosis
            </span>
            <span style={{ fontSize: 11.5, color: 'rgba(0,0,0,0.62)', lineHeight: 1.5 }}>
              {recommendation.nextStep}
            </span>
          </div>
        )}

        {/* Residual uncertainty callout — only shown when shield violations exist */}
        {synthesis.safetySummary.violations.length > 0 && (
          <div style={{
            padding: '7px 10px',
            borderRadius: 7,
            background: 'rgba(212,149,10,0.09)',
            border: '1px solid rgba(212,149,10,0.25)',
            marginBottom: isPinned ? 10 : 0,
          }}>
            <span style={{ fontSize: 10.5, color: '#7A5500', lineHeight: 1.5 }}>
              <span style={{ marginRight: 4 }}>⚠</span>
              <strong>Remaining uncertainty:</strong> {synthesis.safetySummary.violations.length} path
              {synthesis.safetySummary.violations.length > 1 ? 's were' : ' was'} terminated by the
              Shield model for safety reasons — not because those diagnoses were clinically excluded.
              Review terminated paths before committing.
            </span>
          </div>
        )}

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

        {/* Expand / collapse affordance */}
        {onTogglePrimary && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            marginTop: 10, color: 'rgba(26,82,168,0.55)',
          }}>
            <span style={{
              fontSize: 9, fontWeight: 600, letterSpacing: '0.04em',
            }}>
              {primaryExpanded ? 'Hide reasoning' : 'View reasoning'}
            </span>
            <span style={{
              fontSize: 8,
              display: 'inline-block',
              transform: primaryExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 180ms ease-out',
            }}>▾</span>
          </div>
        )}
      </div>

    </div>
  )
}
