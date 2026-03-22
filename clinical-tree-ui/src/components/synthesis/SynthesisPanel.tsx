/** SynthesisPanel — interactive review interface: recommendation, hypothesis cards, safety compliance */
import React, { useState } from 'react'
import { SynthesisData, FocusState, DoctorAnnotation, DoctorAnnotationType, SafetyViolation } from '../../types/tree'
import RecommendationHeader from './RecommendationHeader'
import HypothesisCard from './HypothesisCard'
import SafetyComplianceSection from './SafetyComplianceSection'

interface Props {
  synthesis: SynthesisData
  focusState: FocusState
  annotations: DoctorAnnotation[]
  pinnedBranchId: string | null
  onBranchClick: (branchId: string) => void
  onHypothesisClick: (diagnosis: string, branchIds: string[]) => void
  onEvidenceNodeClick: (nodeId: string) => void
  onNodeClick: (nodeId: string) => void
  onNodeHoverEnter: (nodeId: string) => void
  onNodeHoverLeave: () => void
  onPruneBranch: (branchId: string) => void
  onRestoreBranch: (branchId: string) => void
  onPinBranch: (branchId: string) => void
  onUnpinBranch: () => void
  onAnnotate: (nodeId: string, type: DoctorAnnotationType, content: string) => void
  onRemoveAnnotation: (annotationId: string) => void
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
          fontSize: 8, color: 'rgba(0,0,0,0.25)',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 180ms ease-out',
          display: 'inline-block', flexShrink: 0,
        }}>▾</span>
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
        margin: '10px 0',
      }}
    />
  )
}

export default function SynthesisPanel({
  synthesis,
  focusState,
  annotations,
  pinnedBranchId,
  onBranchClick,
  onHypothesisClick,
  onEvidenceNodeClick,
  onNodeClick,
  onNodeHoverEnter,
  onNodeHoverLeave,
  onPruneBranch,
  onRestoreBranch,
  onPinBranch,
  onUnpinBranch,
  onAnnotate,
  onRemoveAnnotation,
}: Props) {
  const { hypothesisGroups } = synthesis
  const primaryGroup = hypothesisGroups.find(g => g.tag === 'PRIMARY') ?? null
  const [primaryExpanded, setPrimaryExpanded] = useState(false)
  const [expandedDiagnosis, setExpandedDiagnosis] = useState<string | null>(null)
  const [clinicalAssessment, setClinicalAssessment] = useState('')
  const [signOffState, setSignOffState] = useState<'idle' | 'confirming' | 'signed'>('idle')

  function handleToggleHypothesis(diagnosis: string, branchIds: string[]) {
    const isOpening = expandedDiagnosis !== diagnosis
    setExpandedDiagnosis(prev => prev === diagnosis ? null : diagnosis)
    if (isOpening) {
      onHypothesisClick(diagnosis, branchIds)
    }
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
        style={{ padding: '22px 20px' }}
      >
        {/* Most Likely Path label */}
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.10em',
          textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)',
          marginBottom: 8,
        }}>
          Most Supported Diagnosis
        </div>

        {/* Recommendation box — clickable to expand primary reasoning detail */}
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
            onPruneBranch={onPruneBranch}
            onAnnotate={onAnnotate}
            onRemoveAnnotation={onRemoveAnnotation}
          />
        )}

        <Divider />

        {/* Hypothesis cards — one compact card per unique terminal diagnosis (PRIMARY handled above) */}
        <div>
          {hypothesisGroups.filter(g => g.tag !== 'PRIMARY').length > 0 && (
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.10em',
              textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)',
              marginBottom: 8,
            }}>
              Additional Valid Diagnoses
            </div>
          )}
          {hypothesisGroups.filter(g => g.tag !== 'PRIMARY').map(group => (
            <HypothesisCard
              key={group.diagnosis}
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
              onPruneBranch={onPruneBranch}
              onAnnotate={onAnnotate}
              onRemoveAnnotation={onRemoveAnnotation}
            />
          ))}

          {/* TERMINATED cards — shield-terminated paths that are not clinical exclusions */}
          {synthesis.safetySummary.violations.map(v => (
            <TerminatedCard
              key={v.branchId}
              violation={v}
              onViewInTree={onBranchClick}
            />
          ))}
        </div>

        {/* Safety & Compliance */}
        <Divider />
        <SafetyComplianceSection
          safetySummary={synthesis.safetySummary}
          onViewInTree={branchId => onBranchClick(branchId)}
          onRestoreBranch={onRestoreBranch}
        />

        {/* Clinical Assessment */}
        <Divider />
        <div>
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
            rows={5}
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
              e.currentTarget.style.borderColor = 'rgba(26,82,168,0.30)'
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(26,82,168,0.07), 0 1px 3px rgba(0,0,0,0.05)'
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'rgba(0,0,0,0.10)'
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,1)'
            }}
          />
        </div>

        {/* Sign Off + Audit Trail */}
        <div style={{ marginTop: 14, paddingBottom: 6 }}>
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
              <span style={{ fontSize: 14, color: '#1A7042' }}>✓</span>
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
            <div style={{ display: 'flex', gap: 8 }}>
              {/* Sign Off — primary */}
              <button
                onClick={() => setSignOffState('confirming')}
                style={{
                  flex: 1, padding: '9px 0',
                  borderRadius: 9, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 700, letterSpacing: '0.02em',
                  color: '#fff',
                  background: 'linear-gradient(135deg, #1A52A8 0%, #1a3d8a 100%)',
                  boxShadow: '0 2px 8px rgba(26,82,168,0.28), inset 0 1px 0 rgba(255,255,255,0.15)',
                  transition: 'opacity 120ms, box-shadow 120ms',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.opacity = '0.90'
                  ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 12px rgba(26,82,168,0.35), inset 0 1px 0 rgba(255,255,255,0.15)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.opacity = '1'
                  ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(26,82,168,0.28), inset 0 1px 0 rgba(255,255,255,0.15)'
                }}
              >
                Sign Off
              </button>

              {/* View Audit Trail — secondary */}
              <button
                style={{
                  flex: 1, padding: '9px 0',
                  borderRadius: 9, cursor: 'pointer',
                  fontSize: 12, fontWeight: 600,
                  color: 'rgba(0,0,0,0.55)',
                  background: 'rgba(255,255,255,0.80)',
                  border: '1px solid rgba(0,0,0,0.12)',
                  borderTop: '1px solid rgba(255,255,255,0.95)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1)',
                  transition: 'background 120ms, color 120ms',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.97)'
                  ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,0,0,0.75)'
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.80)'
                  ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,0,0,0.55)'
                }}
              >
                View Audit Trail
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
