/** SynthesisPanel — interactive review interface: recommendation, hypothesis cards, safety compliance */
import React, { useState, useEffect } from 'react'
import { SynthesisData, FocusState, DoctorAnnotation, DoctorAnnotationType, SafetyViolation } from '../../types/tree'
import RecommendationHeader from './RecommendationHeader'
import HypothesisCard from './HypothesisCard'
import SafetyComplianceSection from './SafetyComplianceSection'
import { WarningIcon, CheckIcon, ChevronDownIcon } from '../shared/Icons'

interface Props {
  synthesis: SynthesisData
  synthesisPhase?: 'pre' | 'generating' | 'revealed'
  focusState: FocusState
  annotations: DoctorAnnotation[]
  pinnedBranchId: string | null
  onBranchClick: (branchId: string) => void
  onHypothesisClick: (diagnosis: string, branchIds: string[]) => void
  onEvidenceNodeClick: (nodeId: string) => void
  onNodeClick: (nodeId: string) => void
  onNodeHoverEnter: (nodeId: string) => void
  onNodeHoverLeave: () => void
  onRestoreBranch: (branchId: string) => void
  onPinBranch: (branchId: string) => void
  onUnpinBranch: () => void
  onAnnotate: (nodeId: string, type: DoctorAnnotationType, content: string) => void
  onRemoveAnnotation: (annotationId: string) => void
  onAddReview: (diagnosis: string, rating: 'up' | 'down' | null, text: string) => void
}

function TerminatedCard({ violation, onViewInTree }: { violation: SafetyViolation; onViewInTree: (branchId: string) => void }) {
  const [isExpanded, setIsExpanded] = useState(false)
  return (
    <div style={{
      borderRadius: 9,
      border: '1px solid rgba(185,50,38,0.20)',
      borderLeft: '3px solid rgba(185,50,38,0.55)',
      borderTop: '1px solid rgba(255,255,255,1)',
      background: 'linear-gradient(148deg, rgba(185,50,38,0.04) 0%, rgba(255,255,255,0.96) 100%)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1)',
      marginBottom: 5,
      overflow: 'hidden',
    }}>
      {/* Header row */}
      <div
        onClick={() => setIsExpanded(e => !e)}
        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 9px', cursor: 'pointer' }}
      >
        {/* TERMINATED tag */}
        <span style={{
          fontSize: 7, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
          padding: '1.5px 4px', borderRadius: 3, flexShrink: 0,
          color: '#8B2A20', background: 'rgba(185,50,38,0.09)', border: '1px solid rgba(185,50,38,0.24)',
        }}>
          Terminated
        </span>

        {/* Diagnosis */}
        <span style={{
          fontSize: 12.5, fontWeight: 500, color: '#111', lineHeight: 1.2,
          flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {violation.diagnosis ?? 'Unknown'}
        </span>

        {/* Guideline ref pill */}
        {violation.guidelineRef && (
          <span style={{
            fontSize: 9, fontWeight: 600,
            color: '#8B2A20', background: 'rgba(185,50,38,0.09)',
            border: '1px solid rgba(185,50,38,0.24)',
            borderRadius: 4, padding: '2px 6px', flexShrink: 0, whiteSpace: 'nowrap',
          }}>
            {violation.guidelineRef}
          </span>
        )}

        {/* View in tree */}
        <button
          onClick={e => { e.stopPropagation(); onViewInTree(violation.branchId) }}
          style={{
            fontSize: 8.5, fontWeight: 600, color: '#8B2A20',
            background: 'rgba(185,50,38,0.07)', border: '1px solid rgba(185,50,38,0.22)',
            borderRadius: 4, padding: '2px 7px', cursor: 'pointer', flexShrink: 0,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.75' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
        >
          View in tree →
        </button>

        {/* Chevron */}
        <span style={{
          color: 'rgba(0,0,0,0.25)',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 180ms ease-out',
          display: 'inline-flex', flexShrink: 0,
        }}><ChevronDownIcon size={12} color="rgba(0,0,0,0.25)" /></span>
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div style={{ borderTop: '1px solid rgba(185,50,38,0.10)', padding: '8px 11px 10px' }}>
          <div style={{
            borderRadius: 7,
            background: 'rgba(185,50,38,0.06)',
            border: '1px solid rgba(185,50,38,0.16)',
            borderLeft: '3px solid rgba(185,50,38,0.35)',
            padding: '8px 10px',
          }}>
            <div style={{
              fontSize: 7.5, fontWeight: 700, letterSpacing: '0.11em', textTransform: 'uppercase',
              color: '#8B2A20', marginBottom: 4,
            }}>
              Shield termination reason
            </div>
            <div style={{ fontSize: 11.5, lineHeight: 1.58, color: 'rgba(0,0,0,0.65)' }}>
              {violation.violation}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.38)', marginTop: 6, fontStyle: 'italic' }}>
              This is a safety termination, not a clinical exclusion. The diagnosis remains a differential until explicitly ruled out.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Divider() {
  return (
    <div
      style={{
        height: 1,
        background:
          'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.07) 20%, rgba(0,0,0,0.07) 80%, transparent 100%)',
        margin: '6px 0',
      }}
    />
  )
}

export default function SynthesisPanel({
  synthesis,
  synthesisPhase = 'pre',
  focusState,
  annotations,
  pinnedBranchId,
  onBranchClick,
  onHypothesisClick,
  onEvidenceNodeClick,
  onNodeClick,
  onNodeHoverEnter,
  onNodeHoverLeave,
  onRestoreBranch,
  onPinBranch,
  onUnpinBranch,
  onAnnotate,
  onRemoveAnnotation,
  onAddReview,
}: Props) {
  const { hypothesisGroups } = synthesis
  const primaryGroup = hypothesisGroups.find(g => g.tag === 'PRIMARY') ?? null
  const [primaryExpanded, setPrimaryExpanded] = useState(false)
  const [expandedDiagnosis, setExpandedDiagnosis] = useState<string | null>(null)
  const [clinicalAssessment, setClinicalAssessment] = useState('')
  const [assessmentFocused, setAssessmentFocused] = useState(false)
  const [safetyAcknowledged, setSafetyAcknowledged] = useState(false)
  const [signOffState, setSignOffState] = useState<'idle' | 'confirming' | 'signed'>('idle')

  // Simple reveal flag — flips to true when growth completes.
  // Sections declare their own transitionDelay for per-section staggering.
  const [isRevealed, setIsRevealed] = useState(false)

  useEffect(() => {
    if (synthesisPhase === 'revealed') {
      // One rAF so the browser paints opacity:0 before we flip to visible
      const id = requestAnimationFrame(() => setIsRevealed(true))
      return () => cancelAnimationFrame(id)
    }
    if (synthesisPhase === 'generating') setIsRevealed(false)
  }, [synthesisPhase])

  // Returns spread-able props for a reveal section wrapper.
  // In 'pre' mode nothing animates — content is always visible immediately.
  function reveal(delayMs: number): { className?: string; style?: React.CSSProperties } {
    if (synthesisPhase === 'pre') return {}
    return {
      className: isRevealed ? 'synthesis-reveal-section visible' : 'synthesis-reveal-section',
      style: { transitionDelay: `${delayMs}ms` },
    }
  }

  // Precompute group lists so we can assign sequential card delays before JSX.
  const activeGroupsList  = hypothesisGroups.filter(g => g.tag !== 'PRIMARY' && g.tag !== 'CONTRADICTED' && !g.safetyFlags?.length)
  const flaggedGroupsList = hypothesisGroups.filter(g => !!g.safetyFlags?.length && g.tag !== 'CONTRADICTED')
  const contradictedList  = hypothesisGroups.filter(g => g.tag === 'CONTRADICTED')
  const violationsList    = synthesis.safetySummary.violations
  const CARDS_BASE = 900
  const CARDS_STEP = 420
  let cardDelayIdx = 0
  function nextCardDelay(): number { return CARDS_BASE + (cardDelayIdx++) * CARDS_STEP }
  const footerDelay = CARDS_BASE + (activeGroupsList.length + flaggedGroupsList.length + contradictedList.length + violationsList.length) * CARDS_STEP + 300

  function handleToggleHypothesis(diagnosis: string, branchIds: string[]) {
    const isOpening = expandedDiagnosis !== diagnosis
    setExpandedDiagnosis(prev => prev === diagnosis ? null : diagnosis)
    if (isOpening) {
      onHypothesisClick(diagnosis, branchIds)
    }
  }

  // Loading state shown during growth playback
  if (synthesisPhase === 'generating') {
    return (
      <div
        className="flex flex-col items-center justify-center overflow-hidden"
        style={{
          width: '35%',
          background: 'rgba(250,251,255,0.94)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.9)',
          gap: 28,
        }}
      >
        {/* Pulsing icon */}
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'linear-gradient(148deg, rgba(59,125,216,0.12) 0%, rgba(59,125,216,0.06) 100%)',
          border: '1px solid rgba(59,125,216,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'synthesis-pulse 2s ease-in-out infinite',
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 10h2M15 10h2M10 3v2M10 15v2" stroke="#3B7DD8" strokeWidth="1.8" strokeLinecap="round"/>
            <circle cx="10" cy="10" r="3.5" stroke="#3B7DD8" strokeWidth="1.5" fill="rgba(59,125,216,0.10)"/>
            <path d="M5.5 5.5l1.4 1.4M13.1 13.1l1.4 1.4M14.5 5.5l-1.4 1.4M6.9 13.1l-1.4 1.4" stroke="#3B7DD8" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Label + dots */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{
            fontSize: 11.5, fontWeight: 600, letterSpacing: '0.04em',
            color: 'rgba(0,0,0,0.45)',
            animation: 'synthesis-pulse 2s ease-in-out infinite',
          }}>
            Synthesizing clinical assessment
          </div>
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            {[1, 2, 3].map(i => (
              <span key={i} style={{
                width: 5, height: 5, borderRadius: '50%',
                background: '#3B7DD8',
                display: 'inline-block',
                animation: `synthesis-dot-${i} 1.2s ease-in-out infinite`,
              }} />
            ))}
          </div>
        </div>

        {/* Skeleton lines */}
        <div style={{ width: '72%', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="synthesis-skeleton" style={{ height: 10, width: '90%' }} />
          <div className="synthesis-skeleton" style={{ height: 10, width: '70%' }} />
          <div className="synthesis-skeleton" style={{ height: 10, width: '80%' }} />
          <div style={{ height: 4 }} />
          <div className="synthesis-skeleton" style={{ height: 10, width: '65%' }} />
          <div className="synthesis-skeleton" style={{ height: 10, width: '85%' }} />
        </div>
      </div>
    )
  }

  return (
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
      <div
        className="flex-1 overflow-y-auto"
        style={{ padding: '14px 20px' }}
      >
        {/* Most Likely Path label */}
        <div {...reveal(0)}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.10em',
            textTransform: 'uppercase', color: 'rgba(0,0,0,0.60)',
            marginBottom: 8,
          }}>
            Possible Diagnoses
          </div>
        </div>

        {/* Recommendation box — clickable to expand primary reasoning detail */}
        <div {...reveal(220)}>
          <RecommendationHeader
            synthesis={synthesis}
            isPinned={!!pinnedBranchId}
            pinnedBranchId={pinnedBranchId}
            focusState={focusState}
            onDiagnosisGroupClick={onBranchClick}
            primaryExpanded={primaryExpanded}
            onTogglePrimary={() => {
              const isOpening = !primaryExpanded
              setPrimaryExpanded(p => !p)
              if (isOpening && primaryGroup) {
                onHypothesisClick(primaryGroup.diagnosis, primaryGroup.branchIds)
              }
            }}
          />

          {/* Primary reasoning accordion — visually attached to recommendation box */}
          {primaryExpanded && primaryGroup && (
            <HypothesisCard
              group={primaryGroup}
              isExpanded={true}
              attachedToHeader={true}
              onToggleExpand={() => setPrimaryExpanded(false)}
              focusState={focusState}
              annotations={annotations.filter(a =>
                primaryGroup.branches.some(b => b.nodeSummaries.some(ns => ns.nodeId === a.nodeId))
              )}
              pinnedBranchId={pinnedBranchId}
              onHypothesisClick={onHypothesisClick}
              onBranchClick={onBranchClick}
              onNodeClick={onNodeClick}
              onEvidenceNodeClick={onEvidenceNodeClick}
              onNodeHoverEnter={onNodeHoverEnter}
              onNodeHoverLeave={onNodeHoverLeave}
              onAnnotate={onAnnotate}
              onRemoveAnnotation={onRemoveAnnotation}
              onAddReview={onAddReview}
            />
          )}
        </div>

        <div {...reveal(580)}><Divider /></div>

        {/* Active hypothesis cards — each card slides in individually */}
        <div>
          {activeGroupsList.length > 0 && (
            <div {...reveal(720)}>
              <div style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.10em',
                textTransform: 'uppercase', color: 'rgba(0,0,0,0.60)',
                marginBottom: 8,
              }}>
                Additional Hypotheses Under Investigation
              </div>
            </div>
          )}
          {activeGroupsList.map(group => (
            <div key={group.diagnosis} {...reveal(nextCardDelay())}>
              <HypothesisCard
                group={group}
                isExpanded={expandedDiagnosis === group.diagnosis}
                onToggleExpand={() => handleToggleHypothesis(group.diagnosis, group.branchIds)}
                focusState={focusState}
                annotations={annotations.filter(a =>
                  group.branches.some(b => b.nodeSummaries.some(ns => ns.nodeId === a.nodeId))
                )}
                pinnedBranchId={pinnedBranchId}
                onHypothesisClick={onHypothesisClick}
                onBranchClick={onBranchClick}
                onNodeClick={onNodeClick}
                onEvidenceNodeClick={onEvidenceNodeClick}
                onNodeHoverEnter={onNodeHoverEnter}
                onNodeHoverLeave={onNodeHoverLeave}
                onAnnotate={onAnnotate}
                onRemoveAnnotation={onRemoveAnnotation}
                onAddReview={onAddReview}
              />
            </div>
          ))}

          {/* Safety-flagged hypothesis cards */}
          {flaggedGroupsList.length > 0 && (
            <div {...reveal(nextCardDelay())}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#9A5200', marginBottom: 8, marginTop: 14 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><WarningIcon size={10} color="#9A5200" /> Requires Specialist Review</span>
              </div>
            </div>
          )}
          {flaggedGroupsList.map(group => (
            <div key={group.diagnosis} {...reveal(nextCardDelay())}>
              <HypothesisCard
                group={group}
                isExpanded={expandedDiagnosis === group.diagnosis}
                onToggleExpand={() => handleToggleHypothesis(group.diagnosis, group.branchIds)}
                focusState={focusState}
                annotations={annotations.filter(a =>
                  group.branches.some(b => b.nodeSummaries.some(ns => ns.nodeId === a.nodeId))
                )}
                pinnedBranchId={pinnedBranchId}
                onHypothesisClick={onHypothesisClick}
                onBranchClick={onBranchClick}
                onNodeClick={onNodeClick}
                onEvidenceNodeClick={onEvidenceNodeClick}
                onNodeHoverEnter={onNodeHoverEnter}
                onNodeHoverLeave={onNodeHoverLeave}
                onAnnotate={onAnnotate}
                onRemoveAnnotation={onRemoveAnnotation}
                onAddReview={onAddReview}
              />
            </div>
          ))}

          {/* Contradicted hypothesis cards */}
          {contradictedList.length > 0 && (
            <div {...reveal(nextCardDelay())}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.55)', marginBottom: 8, marginTop: 14 }}>
                Not Supported by Evidence
              </div>
            </div>
          )}
          {contradictedList.map(group => (
            <div key={group.diagnosis} {...reveal(nextCardDelay())}>
              <HypothesisCard
                group={group}
                isExpanded={expandedDiagnosis === group.diagnosis}
                onToggleExpand={() => handleToggleHypothesis(group.diagnosis, group.branchIds)}
                focusState={focusState}
                annotations={annotations.filter(a =>
                  group.branches.some(b => b.nodeSummaries.some(ns => ns.nodeId === a.nodeId))
                )}
                pinnedBranchId={pinnedBranchId}
                onHypothesisClick={onHypothesisClick}
                onBranchClick={onBranchClick}
                onNodeClick={onNodeClick}
                onEvidenceNodeClick={onEvidenceNodeClick}
                onNodeHoverEnter={onNodeHoverEnter}
                onNodeHoverLeave={onNodeHoverLeave}
                onAnnotate={onAnnotate}
                onRemoveAnnotation={onRemoveAnnotation}
                onAddReview={onAddReview}
              />
            </div>
          ))}

          {/* TERMINATED cards */}
          {violationsList.map(v => (
            <div key={v.branchId} {...reveal(nextCardDelay())}>
              <TerminatedCard violation={v} onViewInTree={onBranchClick} />
            </div>
          ))}
        </div>

        {/* Safety & Compliance + Clinical Assessment + Sign Off — visually separated footer */}
        <div
          {...reveal(footerDelay)}
          style={{
            margin: '10px -20px -14px',
            padding: '14px 20px 16px',
            background: 'linear-gradient(180deg, rgba(241,244,250,0.85) 0%, rgba(236,240,248,0.92) 100%)',
            borderTop: '1px solid rgba(0,0,0,0.07)',
            ...reveal(footerDelay).style,
          }}
        >

        <SafetyComplianceSection
          safetySummary={synthesis.safetySummary}
          onViewInTree={branchId => onBranchClick(branchId)}
          onRestoreBranch={onRestoreBranch}
        />

        {/* Clinical Assessment */}
        <div style={{ marginTop: 16 }}>
          <div style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.10em',
            textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)', marginBottom: 8,
          }}>
            Clinical Assessment
          </div>
          <textarea
            value={clinicalAssessment}
            onChange={e => setClinicalAssessment(e.target.value)}
            placeholder="Enter your clinical assessment based on examination findings and review of the reasoning tree..."
            rows={assessmentFocused || clinicalAssessment ? 3 : 1}
            style={{
              width: '100%',
              resize: 'vertical',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid rgba(0,0,0,0.10)',
              borderTop: '1px solid rgba(255,255,255,0.9)',
              background: 'linear-gradient(148deg, rgba(250,252,255,0.98) 0%, rgba(255,255,255,0.96) 100%)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,1)',
              fontSize: 12,
              lineHeight: 1.6,
              color: '#18192a',
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 150ms, box-shadow 150ms',
            }}
            onFocus={e => {
              setAssessmentFocused(true)
              e.currentTarget.style.borderColor = 'rgba(26,82,168,0.30)'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,82,168,0.07), 0 1px 3px rgba(0,0,0,0.05)'
            }}
            onBlur={e => {
              setAssessmentFocused(false)
              e.currentTarget.style.borderColor = 'rgba(0,0,0,0.10)'
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,1)'
            }}
          />
        </div>

        {/* Sign Off */}
        <div style={{ marginTop: 10, paddingBottom: 0 }}>
          {signOffState === 'idle' && (
            <label style={{
              display: 'flex', alignItems: 'center', gap: 7,
              marginBottom: 8, cursor: 'pointer', userSelect: 'none',
            }}>
              <input
                type="checkbox"
                checked={safetyAcknowledged}
                onChange={e => setSafetyAcknowledged(e.target.checked)}
                style={{ accentColor: '#1A7042', width: 13, height: 13, cursor: 'pointer', flexShrink: 0 }}
              />
              <span style={{
                fontSize: 10.5, lineHeight: 1.3,
                color: safetyAcknowledged ? '#1A7042' : 'rgba(0,0,0,0.45)',
                fontWeight: safetyAcknowledged ? 600 : 400,
                transition: 'color 150ms, font-weight 150ms',
              }}>
                I've reviewed safety &amp; compliance findings
              </span>
            </label>
          )}
          {signOffState === 'signed' ? (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '11px 14px',
              borderRadius: 10,
              background: 'linear-gradient(148deg, rgba(26,110,60,0.08) 0%, rgba(240,252,245,0.96) 100%)',
              border: '1px solid rgba(26,110,60,0.20)',
              borderTop: '1px solid rgba(255,255,255,0.95)',
              boxShadow: '0 1px 3px rgba(26,110,60,0.07), inset 0 1px 0 rgba(255,255,255,1)',
            }}>
              <span style={{ display: 'flex', alignItems: 'center' }}><CheckIcon size={14} color="#1A7042" /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1A7042', lineHeight: 1.25 }}>
                  Signed off
                </div>
                <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.45)', marginTop: 1 }}>
                  {new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <button
                onClick={() => setSignOffState('idle')}
                style={{
                  fontSize: 10, fontWeight: 600, color: 'rgba(0,0,0,0.35)',
                  background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 4px',
                }}
              >
                Revoke
              </button>
            </div>
          ) : signOffState === 'confirming' ? (
            <div style={{
              padding: '12px 14px',
              borderRadius: 10,
              background: 'linear-gradient(148deg, rgba(26,82,168,0.06) 0%, rgba(242,248,255,0.96) 100%)',
              border: '1px solid rgba(26,82,168,0.18)',
              borderTop: '1px solid rgba(255,255,255,0.95)',
              boxShadow: '0 1px 3px rgba(26,82,168,0.08), inset 0 1px 0 rgba(255,255,255,1)',
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#111', marginBottom: 3 }}>
                Confirm sign-off?
              </div>
              <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.50)', marginBottom: 10, lineHeight: 1.45 }}>
                This formally records your clinical review of the AI-generated recommendation and reasoning tree.
              </div>
              <div style={{ display: 'flex', gap: 7 }}>
                <button
                  onClick={() => setSignOffState('signed')}
                  style={{
                    flex: 1, padding: '8px 0',
                    borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 11.5, fontWeight: 700, letterSpacing: '0.02em',
                    color: '#fff',
                    background: 'linear-gradient(135deg, #1A52A8 0%, #1a3d8a 100%)',
                    boxShadow: '0 2px 6px rgba(26,82,168,0.30)',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.90' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
                >
                  Confirm Sign Off
                </button>
                <button
                  onClick={() => setSignOffState('idle')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 8, cursor: 'pointer',
                    fontSize: 11.5, fontWeight: 600,
                    color: 'rgba(0,0,0,0.50)',
                    background: 'rgba(0,0,0,0.04)',
                    border: '1px solid rgba(0,0,0,0.09)',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.07)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.04)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => safetyAcknowledged && setSignOffState('confirming')}
              disabled={!safetyAcknowledged}
              style={{
                width: '100%', padding: '9px 0',
                borderRadius: 9, border: 'none',
                cursor: safetyAcknowledged ? 'pointer' : 'not-allowed',
                fontSize: 12, fontWeight: 700, letterSpacing: '0.02em',
                color: '#fff',
                background: safetyAcknowledged
                  ? 'linear-gradient(135deg, #1A52A8 0%, #1a3d8a 100%)'
                  : 'rgba(0,0,0,0.15)',
                boxShadow: safetyAcknowledged
                  ? '0 2px 8px rgba(26,82,168,0.28), inset 0 1px 0 rgba(255,255,255,0.15)'
                  : 'none',
                transition: 'background 200ms, box-shadow 200ms, opacity 120ms',
              }}
              onMouseEnter={e => {
                if (!safetyAcknowledged) return
                (e.currentTarget as HTMLButtonElement).style.opacity = '0.90'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(26,82,168,0.35), inset 0 1px 0 rgba(255,255,255,0.15)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.opacity = '1'
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = safetyAcknowledged
                  ? '0 2px 8px rgba(26,82,168,0.28), inset 0 1px 0 rgba(255,255,255,0.15)'
                  : 'none'
              }}
            >
              Sign Off
            </button>
          )}
        </div>

        </div>{/* end footer section */}
      </div>
    </div>
  )
}
