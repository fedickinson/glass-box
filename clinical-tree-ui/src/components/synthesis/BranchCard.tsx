/** BranchCard — clickable card for one branch in the synthesis panel */
import React, { useRef, useEffect } from 'react'
import { BranchSummary, DoctorAnnotation, FocusState, DoctorAnnotationType } from '../../types/tree'
import NodeSummaryLine from './NodeSummaryLine'
import { StarFilledIcon } from '../shared/Icons'

const BRANCH_LABEL_COLORS: Record<string, string> = {
  primary: '#1A52A8',
  branch_a: '#7B5EA7',
  branch_b: '#2D8A56',
  branch_c: '#D4950A',
  branch_d: '#C53D2F',
}

function branchLabel(branchId: string, isPrimary: boolean): string {
  if (isPrimary) return 'Primary path'
  // Convert kebab-case branch IDs to readable labels: "branch-ulnar-a" → "Ulnar A path"
  return branchId
    .replace(/^branch[-_]?/, '')
    .split(/[-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ') + ' path'
}

interface Props {
  branch: BranchSummary
  annotations: DoctorAnnotation[]
  focusState: FocusState
  isPinned: boolean
  onBranchClick: () => void
  onNodeClick: (nodeId: string) => void
  onNodeHoverEnter: (nodeId: string) => void
  onNodeHoverLeave: () => void
  onPin: () => void
  onUnpin: () => void
  onPrune: () => void
  onAnnotate: (nodeId: string, type: DoctorAnnotationType, content: string) => void
  onRemoveAnnotation: (annotationId: string) => void
}

export default function BranchCard({
  branch,
  annotations,
  focusState,
  isPinned,
  onBranchClick,
  onNodeClick,
  onNodeHoverEnter,
  onNodeHoverLeave,
  onPin,
  onUnpin,
  onPrune,
  onAnnotate,
  onRemoveAnnotation,
}: Props) {
  const isFocused =
    focusState.mode === 'branch_focused' && focusState.branchId === branch.branchId
  const selectedNodeId =
    focusState.mode === 'branch_focused' ? focusState.selectedNodeId : null

  const accentColor = BRANCH_LABEL_COLORS[branch.branchId] ?? '#888'
  const cardRef = useRef<HTMLDivElement>(null)

  // Scroll into view when this branch becomes focused
  useEffect(() => {
    if (isFocused && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [isFocused])

  // Build annotation map
  const annotationsByNode = new Map<string, DoctorAnnotation[]>()
  annotations.forEach(a => {
    const list = annotationsByNode.get(a.nodeId) ?? []
    list.push(a)
    annotationsByNode.set(a.nodeId, list)
  })

  return (
    <div
      ref={cardRef}
      style={{
        borderRadius: 12,
        border: isFocused
          ? `1.5px solid ${accentColor}50`
          : '1px solid rgba(0,0,0,0.07)',
        borderLeft: `3px solid ${isFocused ? accentColor : accentColor + '50'}`,
        background: isFocused
          ? `linear-gradient(148deg, ${accentColor}18 0%, rgba(255,255,255,0.88) 100%)`
          : 'linear-gradient(148deg, rgba(255,255,255,0.94) 0%, rgba(245,247,255,0.90) 100%)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(255,255,255,1)',
        boxShadow: isFocused
          ? `0 0 0 2px ${accentColor}22, 0 1px 2px rgba(0,0,0,0.07), 0 4px 14px rgba(0,0,0,0.1), 0 12px 28px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1)`
          : '0 1px 2px rgba(0,0,0,0.07), 0 4px 14px rgba(0,0,0,0.09), 0 12px 28px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,1)',
        marginBottom: 10,
        transition: 'all 200ms ease-out',
        overflow: 'hidden',
      }}
    >
      {/* Card header — clickable to focus branch */}
      <div
        onClick={onBranchClick}
        style={{
          padding: '10px 12px 8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Branch label row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 4,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: 8.5,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: accentColor,
              }}
            >
              {branchLabel(branch.branchId, branch.isPrimary)}
            </span>

            {branch.convergsWith && (
              <span
                style={{
                  fontSize: 8,
                  padding: '1px 5px',
                  borderRadius: 4,
                  background: 'rgba(45,138,86,0.1)',
                  color: '#2D8A56',
                  border: '1px solid rgba(45,138,86,0.22)',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                }}
              >
                ↗ CONVERGES
              </span>
            )}

            {isPinned && (
              <span
                style={{
                  fontSize: 8,
                  padding: '1px 5px',
                  borderRadius: 4,
                  background: 'rgba(26,82,168,0.1)',
                  color: '#1A52A8',
                  border: '1px solid rgba(26,82,168,0.2)',
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><StarFilledIcon size={8} color="#1A52A8" /> PINNED</span>
              </span>
            )}
          </div>

          {/* Terminal diagnosis */}
          {branch.diagnosis && (
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#111',
                lineHeight: 1.3,
                marginBottom: 5,
              }}
            >
              {branch.diagnosis}
            </div>
          )}

          {/* Narrative */}
          <div
            style={{
              fontSize: 11.5,
              color: 'rgba(0,0,0,0.55)',
              lineHeight: 1.55,
            }}
          >
            {branch.narrativeSummary}
          </div>

          {/* Key decision */}
          {branch.keyDecision && (
            <div
              style={{
                marginTop: 5,
                fontSize: 10.5,
                color: 'rgba(0,0,0,0.42)',
                fontStyle: 'italic',
              }}
            >
              Forked at: {branch.keyDecision}
            </div>
          )}
        </div>

        {/* Pin/prune actions */}
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={isPinned ? onUnpin : onPin}
            title={isPinned ? 'Unpin branch' : 'Pin as preferred diagnosis'}
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              border: isPinned ? '1px solid rgba(26,82,168,0.3)' : '1px solid rgba(0,0,0,0.1)',
              background: isPinned ? 'rgba(26,82,168,0.1)' : 'rgba(0,0,0,0.03)',
              cursor: 'pointer',
              color: isPinned ? '#1A52A8' : 'rgba(0,0,0,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <StarFilledIcon size={10} color={isPinned ? '#1A52A8' : 'rgba(0,0,0,0.35)'} />
          </button>
          {!branch.isPrimary && (
            <button
              onClick={onPrune}
              title="Prune this branch"
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                border: '1px solid rgba(0,0,0,0.1)',
                background: 'rgba(0,0,0,0.03)',
                cursor: 'pointer',
                fontSize: 10,
                color: 'rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Node summaries */}
      {branch.nodeSummaries.length > 0 && (
        <div
          style={{
            padding: '0 8px 8px 8px',
            borderTop: '1px solid rgba(0,0,0,0.05)',
            paddingTop: 6,
          }}
        >
          {branch.nodeSummaries.map(ns => (
            <NodeSummaryLine
              key={ns.nodeId}
              nodeSummary={ns}
              annotations={annotationsByNode.get(ns.nodeId) ?? []}
              isSelected={ns.nodeId === selectedNodeId}
              onClick={() => onNodeClick(ns.nodeId)}
              onMouseEnter={() => onNodeHoverEnter(ns.nodeId)}
              onMouseLeave={onNodeHoverLeave}
              onAnnotate={(type, content) => onAnnotate(ns.nodeId, type, content)}
              onRemoveAnnotation={onRemoveAnnotation}
            />
          ))}
        </div>
      )}

      {/* Caveat */}
      {branch.caveat && (
        <div
          style={{
            margin: '0 10px 10px',
            padding: '7px 10px',
            background: 'rgba(212,149,10,0.06)',
            borderRadius: 8,
            border: '1px solid rgba(212,149,10,0.18)',
            borderLeft: '2.5px solid rgba(212,149,10,0.5)',
          }}
        >
          <div
            style={{
              fontSize: 8.5,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: '#a07000',
              marginBottom: 3,
            }}
          >
            Caveat
          </div>
          <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.6)', lineHeight: 1.4 }}>
            {branch.caveat.condition} → {branch.caveat.implication}
          </div>
        </div>
      )}
    </div>
  )
}
