/** RecommendationHeader — diagnosis headline, confidence, hypothesis breakdown */
import React from 'react'
import { SynthesisData, FocusState } from '../../types/tree'

const CONFIDENCE_COLORS = {
  high: { text: '#1A6E3C', bg: 'rgba(26,110,60,0.08)', border: 'rgba(26,110,60,0.2)' },
  moderate: { text: '#7A5500', bg: 'rgba(212,149,10,0.08)', border: 'rgba(212,149,10,0.22)' },
  low: { text: '#8B2A20', bg: 'rgba(185,50,38,0.08)', border: 'rgba(185,50,38,0.2)' },
}

interface HypothesisGroup {
  diagnosis: string
  count: number
  branchIds: string[]
  isPrimary: boolean
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
  pinnedBranchId,
  focusState,
  onDiagnosisGroupClick,
}: Props) {
  const { recommendation, confidence } = synthesis
  const colorsConf = CONFIDENCE_COLORS[confidence.level]

  // Build hypothesis breakdown from branches
  const diagnosisMap = new Map<string, HypothesisGroup>()
  synthesis.branches.forEach(b => {
    const diag = b.diagnosis ?? 'Undetermined'
    const existing = diagnosisMap.get(diag)
    if (existing) {
      existing.count++
      existing.branchIds.push(b.branchId)
    } else {
      diagnosisMap.set(diag, {
        diagnosis: diag,
        count: 1,
        branchIds: [b.branchId],
        isPrimary: diag === recommendation.diagnosis,
      })
    }
  })

  const hypotheses = [...diagnosisMap.values()].sort((a, b) => {
    if (a.isPrimary) return -1
    if (b.isPrimary) return 1
    return b.count - a.count
  })

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
          style={{ fontSize: 12.5, lineHeight: 1.55, color: 'rgba(0,0,0,0.58)' }}
        >
          {recommendation.summary.slice(0, 200)}
          {recommendation.summary.length > 200 ? '…' : ''}
        </div>

        {isPinned && (
          <div
            style={{
              marginTop: 8,
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

      {/* Confidence */}
      <div
        style={{
          padding: '11px 14px',
          borderRadius: 10,
          background: colorsConf.bg,
          border: `1px solid ${colorsConf.border}`,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 5,
          }}
        >
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: colorsConf.text,
            }}
          >
            {confidence.level} confidence
          </span>
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              color: colorsConf.text,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {confidence.convergingBranches} / {confidence.totalBranches} converge
          </span>
        </div>
        <div
          style={{
            height: 4,
            borderRadius: 2,
            background: 'rgba(0,0,0,0.08)',
            overflow: 'hidden',
            marginBottom: 5,
          }}
        >
          <div
            style={{
              height: '100%',
              borderRadius: 2,
              background: colorsConf.text,
              width: `${confidence.convergenceRatio * 100}%`,
              transition: 'width 300ms ease-out',
            }}
          />
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'rgba(0,0,0,0.5)',
            lineHeight: 1.45,
            fontStyle: 'italic',
          }}
        >
          {confidence.explanation}
        </div>
      </div>

      {/* Hypothesis breakdown */}
      {hypotheses.length > 1 && (
        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              fontSize: 8.5,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(0,0,0,0.35)',
              marginBottom: 6,
            }}
          >
            Hypothesis breakdown
          </div>
          {hypotheses.map(h => {
            const ratio = confidence.totalBranches > 0 ? h.count / confidence.totalBranches : 0
            return (
              <div
                key={h.diagnosis}
                onClick={() => onDiagnosisGroupClick(h.branchIds[0])}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '5px 8px',
                  borderRadius: 7,
                  cursor: 'pointer',
                  background: h.isPrimary ? 'rgba(26,82,168,0.04)' : 'transparent',
                  marginBottom: 3,
                  transition: 'background 120ms',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 11.5,
                      fontWeight: h.isPrimary ? 600 : 400,
                      color: h.isPrimary ? '#111' : 'rgba(0,0,0,0.58)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h.diagnosis}
                  </div>
                  <div
                    style={{
                      height: 3,
                      borderRadius: 1.5,
                      background: 'rgba(0,0,0,0.07)',
                      marginTop: 3,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        borderRadius: 1.5,
                        background: h.isPrimary ? '#1A52A8' : 'rgba(0,0,0,0.25)',
                        width: `${ratio * 100}%`,
                        transition: 'width 300ms ease-out',
                      }}
                    />
                  </div>
                </div>
                <span
                  style={{
                    fontSize: 9.5,
                    fontWeight: 600,
                    color: h.isPrimary ? '#1A52A8' : 'rgba(0,0,0,0.38)',
                    whiteSpace: 'nowrap',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {h.count} of {confidence.totalBranches}
                </span>
                {h.isPrimary && (
                  <span
                    style={{
                      fontSize: 8,
                      padding: '1px 5px',
                      borderRadius: 4,
                      background: 'rgba(26,82,168,0.1)',
                      color: '#1A52A8',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      flexShrink: 0,
                    }}
                  >
                    PRIMARY
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
