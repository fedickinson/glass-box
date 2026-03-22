/** RecommendationHeader — diagnosis headline and confidence badge */
import React from 'react'

function firstSentence(text: string): string {
  const match = text.match(/^.+?[.!?](?:\s|$)/)
  return match ? match[0].trim() : text.slice(0, 120)
}
import { SynthesisData, FocusState } from '../../types/tree'
import { WarningIcon, StarFilledIcon, ChevronDownIcon } from '../shared/Icons'

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
            Leading Diagnosis
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
          3 independent reasoning paths converged on this diagnosis through anatomical, biomechanical, and literature analysis.
        </div>

        {/* Potential next step — only show when collapsed; HypothesisCard handles it when expanded */}
        {!primaryExpanded && (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 3,
            marginBottom: synthesis.safetySummary.violations.length > 0 ? 10 : 0,
          }}>
            <span style={{
              fontSize: 8, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
              color: '#1A52A8',
            }}>
              Investigate
            </span>
            <span style={{ fontSize: 11.5, color: 'rgba(0,0,0,0.62)', lineHeight: 1.5 }}>
              Nerve conduction studies at the cubital tunnel
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
            <span style={{ fontSize: 10.5, color: '#7A5500', lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: 4 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', marginTop: 1, flexShrink: 0 }}><WarningIcon size={11} color="#7A5500" /></span>
              <span><strong>Remaining uncertainty:</strong> {synthesis.safetySummary.violations.length} path</span>
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
            <StarFilledIcon size={10} color="#1A52A8" /> Doctor concurs
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
              display: 'inline-flex',
              transform: primaryExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 180ms ease-out',
            }}><ChevronDownIcon size={12} color="rgba(26,82,168,0.55)" /></span>
          </div>
        )}
      </div>

    </div>
  )
}
