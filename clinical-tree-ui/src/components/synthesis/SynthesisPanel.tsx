/** SynthesisPanel — interactive review interface: recommendation, branch cards, rejected paths */
import React from 'react'
import { SynthesisData, FocusState, DoctorAnnotation, DoctorAnnotationType } from '../../types/tree'
import RecommendationHeader from './RecommendationHeader'
import BranchCard from './BranchCard'

interface Props {
  synthesis: SynthesisData
  focusState: FocusState
  annotations: DoctorAnnotation[]
  pinnedBranchId: string | null
  onBranchClick: (branchId: string) => void
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

function Divider() {
  return (
    <div
      style={{
        height: 1,
        background:
          'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.07) 20%, rgba(0,0,0,0.07) 80%, transparent 100%)',
        margin: '14px 0',
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
  const { branches, rejectedPaths } = synthesis

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
        {/* Recommendation + confidence + hypothesis breakdown */}
        <RecommendationHeader
          synthesis={synthesis}
          isPinned={!!pinnedBranchId}
          pinnedBranchId={pinnedBranchId}
          focusState={focusState}
          onDiagnosisGroupClick={onBranchClick}
        />

        <Divider />

        {/* Branch cards */}
        <div>
          <div
            style={{
              fontSize: 8.5,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'rgba(0,0,0,0.35)',
              marginBottom: 8,
            }}
          >
            Reasoning branches
          </div>

          {branches.map(branch => (
            <BranchCard
              key={branch.branchId}
              branch={branch}
              annotations={annotations.filter(a =>
                branch.nodeSummaries.some(ns => ns.nodeId === a.nodeId)
              )}
              focusState={focusState}
              isPinned={branch.branchId === pinnedBranchId}
              onBranchClick={() => onBranchClick(branch.branchId)}
              onNodeClick={onNodeClick}
              onNodeHoverEnter={onNodeHoverEnter}
              onNodeHoverLeave={onNodeHoverLeave}
              onPin={() => onPinBranch(branch.branchId)}
              onUnpin={onUnpinBranch}
              onPrune={() => onPruneBranch(branch.branchId)}
              onAnnotate={onAnnotate}
              onRemoveAnnotation={onRemoveAnnotation}
            />
          ))}
        </div>

        {/* Rejected paths */}
        {rejectedPaths.length > 0 && (
          <>
            <Divider />
            <div>
              <div
                style={{
                  fontSize: 8.5,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'rgba(0,0,0,0.35)',
                  marginBottom: 8,
                }}
              >
                Rejected paths
              </div>
              {rejectedPaths.map(rp => (
                <div
                  key={rp.branchId}
                  style={{
                    background:
                      'linear-gradient(148deg, rgba(255,245,244,0.95) 0%, rgba(255,237,235,0.85) 100%)',
                    borderRadius: 12,
                    padding: '11px 12px',
                    border: '1px solid rgba(185,50,38,0.14)',
                    borderTop: '1px solid rgba(255,255,255,0.9)',
                    borderLeft: '3px solid rgba(185,50,38,0.55)',
                    boxShadow:
                      '0 1px 4px rgba(185,50,38,0.06), inset 0 1px 0 rgba(255,255,255,1)',
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 8.5,
                      fontWeight: 700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      color: '#a02a20',
                      marginBottom: 4,
                    }}
                  >
                    {rp.pruneSource === 'shield' ? 'Shield' : 'Doctor'} —{' '}
                    {rp.shieldSeverity ?? 'pruned'}
                  </div>
                  <div
                    style={{ fontSize: 13, fontWeight: 600, color: '#18192a', marginBottom: 3 }}
                  >
                    {rp.diagnosis ?? 'Unknown diagnosis'}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      lineHeight: 1.45,
                      color: 'rgba(0,0,0,0.52)',
                      marginBottom: 8,
                    }}
                  >
                    {rp.pruneReason}
                  </div>
                  <button
                    onClick={() => onRestoreBranch(rp.branchId)}
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#a02a20',
                      background: 'rgba(185,50,38,0.08)',
                      border: '1px solid rgba(185,50,38,0.2)',
                      borderRadius: 6,
                      padding: '4px 10px',
                      cursor: 'pointer',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Restore branch
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
