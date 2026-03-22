/** HypothesisCard — ultra-compact header + three-zone progressive disclosure when expanded */
import React, { useState, useRef, useEffect } from 'react'
import { HypothesisGroup, EvidenceEntry, FocusState, DoctorAnnotation, DoctorAnnotationType, NodeSummary } from '../../types/tree'
import AnnotationInput from './AnnotationInput'

const TAG_STYLES = {
  PRIMARY:   { text: '#1A52A8', bg: 'rgba(26,82,168,0.10)',   border: 'rgba(26,82,168,0.22)',   accent: '#1A52A8', barColor: '#1A52A8' },
  DIVERGENT: { text: '#4A5568', bg: 'rgba(74,85,104,0.08)',   border: 'rgba(74,85,104,0.18)',   accent: '#6B7280', barColor: '#6B7280' },
  UNLIKELY:  { text: '#7A5500', bg: 'rgba(212,149,10,0.08)',  border: 'rgba(212,149,10,0.20)',  accent: '#D4950A', barColor: '#D4950A' },
}

// Exclusion strength metadata for UNLIKELY cards — keyed by partial diagnosis match
const EXCLUSION_STRENGTH: Record<string, { label: string; detail: string; color: string; bg: string; border: string }> = {
  'pulmonary embolism': { label: 'Strong', detail: 'Wells Score 0/9',               color: '#1A6E3C', bg: 'rgba(26,110,60,0.10)',   border: 'rgba(26,110,60,0.22)' },
  'gerd':              { label: 'Moderate', detail: 'symptom mismatch + literature', color: '#7A5500', bg: 'rgba(212,149,10,0.10)', border: 'rgba(212,149,10,0.28)' },
}

// ── Inline proportion bar (CSS cells, not unicode) ──────────────
function InlineBar({ pathCount, totalPaths, color }: { pathCount: number; totalPaths: number; color: string }) {
  const CELLS = 8
  const filled = Math.round((pathCount / Math.max(totalPaths, 1)) * CELLS)
  return (
    <div style={{ display: 'flex', gap: 1.5, alignItems: 'center', flexShrink: 0 }}>
      {Array.from({ length: CELLS }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 5, height: 5, borderRadius: 1,
            background: i < filled ? color : 'rgba(0,0,0,0.09)',
            transition: 'background 200ms',
          }}
        />
      ))}
    </div>
  )
}

// ── Path timeline sub-components ────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  thought:  '#3B7DD8',
  tool:     '#2D8A56',
  citation: '#7B5EA7',
}

const ANNOTATION_COLORS: Record<string, string> = {
  flag: '#C53D2F', context: '#3B7DD8', challenge: '#D4950A',
}

function AnnButtons({ onOpen }: { onOpen: (t: DoctorAnnotationType) => void }) {
  const ICONS: Record<string, string>  = { flag: '⚑', context: '📎', challenge: '⚡' }
  const COLORS: Record<string, string> = { flag: '#C53D2F', context: '#3B7DD8', challenge: '#D4950A' }
  return (
    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
      {(['flag', 'context', 'challenge'] as DoctorAnnotationType[]).map(t => (
        <button
          key={t}
          onClick={() => onOpen(t)}
          title={t}
          style={{
            width: 16, height: 16, borderRadius: 3,
            border: `1px solid ${COLORS[t]}25`,
            background: `${COLORS[t]}08`,
            color: COLORS[t],
            cursor: 'pointer', fontSize: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
          }}
        >
          {ICONS[t]}
        </button>
      ))}
    </div>
  )
}

function PathStepRow({
  step, stepNumber, annotations, isSelected,
  onClick, onMouseEnter, onMouseLeave, onAnnotate, onRemoveAnnotation,
}: {
  step: NodeSummary
  stepNumber: number
  annotations: DoctorAnnotation[]
  isSelected: boolean
  onClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
  onAnnotate: (type: DoctorAnnotationType, content: string) => void
  onRemoveAnnotation: (annotationId: string) => void
}) {
  const [isHovered, setIsHovered] = useState(false)
  const [openInput, setOpenInput] = useState<DoctorAnnotationType | null>(null)
  const typeColor = TYPE_COLORS[step.type] ?? '#888'
  const isCard = step.type === 'tool' || step.type === 'citation'

  return (
    <div
      onMouseEnter={() => { setIsHovered(true); onMouseEnter() }}
      onMouseLeave={() => { setIsHovered(false); onMouseLeave() }}
      style={{ position: 'relative', paddingLeft: 28, marginBottom: isCard ? 5 : 3 }}
    >
      {/* Step number badge — sits on top of the connecting line */}
      <div style={{
        position: 'absolute', left: 0,
        top: isCard ? 7 : 1,
        width: 20, height: 20, borderRadius: '50%',
        background: isHovered ? `${typeColor}22` : `${typeColor}12`,
        border: `1.5px solid ${isHovered ? typeColor + '55' : typeColor + '30'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 8, fontWeight: 700, color: typeColor,
        zIndex: 1, transition: 'background 120ms, border-color 120ms',
      }}>
        {stepNumber}
      </div>

      {/* Tool / citation card */}
      {isCard ? (
        <div
          onClick={onClick}
          style={{
            padding: '6px 8px',
            borderRadius: 6,
            background: step.type === 'tool'
              ? (isHovered ? 'rgba(45,138,86,0.10)' : 'rgba(45,138,86,0.06)')
              : (isHovered ? 'rgba(123,94,167,0.10)' : 'rgba(123,94,167,0.06)'),
            border: `1px solid ${step.type === 'tool' ? 'rgba(45,138,86,0.15)' : 'rgba(123,94,167,0.15)'}`,
            borderLeft: `3px solid ${step.type === 'tool' ? 'rgba(45,138,86,0.50)' : 'rgba(123,94,167,0.50)'}`,
            cursor: 'pointer', transition: 'background 120ms',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#111', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {step.headline}
              </div>
              {step.source && (
                <div style={{
                  fontSize: 9.5, marginTop: 1,
                  color: step.type === 'tool' ? 'rgba(45,138,86,0.75)' : 'rgba(123,94,167,0.72)',
                }}>
                  {step.source}
                </div>
              )}
            </div>
            {isHovered && !openInput && <AnnButtons onOpen={setOpenInput} />}
          </div>
        </div>
      ) : (
        /* Reasoning step — plain text */
        <div
          onClick={onClick}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 4,
            padding: '2px 4px', borderRadius: 5, cursor: 'pointer',
            background: isSelected ? `${typeColor}0E` : isHovered ? 'rgba(0,0,0,0.025)' : 'transparent',
            transition: 'background 120ms', minHeight: 22,
          }}
        >
          <div style={{
            fontSize: 11, lineHeight: 1.35, flex: 1, minWidth: 0,
            color: isSelected ? '#111' : 'rgba(0,0,0,0.70)',
            fontWeight: step.isKeyStep ? 500 : 400,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {step.headline}
          </div>
          {isHovered && !openInput && <AnnButtons onOpen={setOpenInput} />}
        </div>
      )}

      {/* Inline annotations */}
      {annotations.length > 0 && (
        <div style={{ marginTop: 2 }}>
          {annotations.map(ann => (
            <div key={ann.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 5,
              padding: '2px 6px', borderRadius: 4, marginBottom: 2,
              background: `${ANNOTATION_COLORS[ann.type] ?? '#888'}08`,
              borderLeft: `2px solid ${ANNOTATION_COLORS[ann.type] ?? '#888'}45`,
            }}>
              <span style={{ fontSize: 8.5, color: ANNOTATION_COLORS[ann.type] ?? '#888', flexShrink: 0, marginTop: 1 }}>
                {ann.type === 'flag' ? '⚑' : ann.type === 'context' ? '📎' : '⚡'}
              </span>
              <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.62)', flex: 1, lineHeight: 1.35 }}>{ann.content}</span>
              <button
                onClick={() => onRemoveAnnotation(ann.id)}
                style={{ fontSize: 10, color: 'rgba(0,0,0,0.28)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >×</button>
            </div>
          ))}
        </div>
      )}

      {openInput && (
        <AnnotationInput
          annotationType={openInput}
          onSubmit={content => { onAnnotate(openInput, content); setOpenInput(null) }}
          onCancel={() => setOpenInput(null)}
        />
      )}
    </div>
  )
}

function TerminalStepCard({
  step, accentColor, accentBg, accentBorder,
}: {
  step: NodeSummary; accentColor: string; accentBg: string; accentBorder: string
}) {
  return (
    <div style={{
      marginTop: 8,
      borderRadius: 7,
      background: accentBg,
      border: `1px solid ${accentBorder}`,
      borderLeft: `3px solid ${accentColor}`,
      borderTop: '1px solid rgba(255,255,255,0.95)',
      padding: '8px 10px',
      boxShadow: `0 1px 5px ${accentColor}12, inset 0 1px 0 rgba(255,255,255,1)`,
    }}>
      <div style={{
        fontSize: 7.5, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
        color: accentColor, marginBottom: 3,
      }}>
        Conclusion
      </div>
      <div style={{
        fontSize: 13, fontWeight: 700, color: '#111', lineHeight: 1.25,
        fontFamily: 'Georgia, "Times New Roman", serif',
      }}>
        {step.headline}
      </div>
      {step.source && (
        <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.42)', marginTop: 2 }}>{step.source}</div>
      )}
    </div>
  )
}

// ── Evidence bullet (Zone 2 detail view) ────────────────────────
function EvidenceBullet({ entry, variant, onClick }: { entry: EvidenceEntry; variant: 'for' | 'against'; onClick: () => void }) {
  const isFor = variant === 'for'
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 7,
        padding: '5px 6px', borderRadius: 6, cursor: 'pointer',
        transition: 'background 120ms',
        borderLeft: `2px solid ${isFor ? 'rgba(26,110,60,0.25)' : 'rgba(180,100,10,0.25)'}`,
        marginBottom: 3,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = isFor ? 'rgba(26,110,60,0.04)' : 'rgba(180,100,10,0.04)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11,
          lineHeight: 1.4,
          color: isFor ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.62)',
          fontWeight: isFor ? 500 : 400,
          fontStyle: isFor ? 'normal' : 'italic',
        }}>
          {entry.headline}
        </div>
        {entry.source && (
          <div style={{
            fontSize: 9,
            color: isFor ? 'rgba(26,110,60,0.70)' : 'rgba(0,0,0,0.35)',
            marginTop: 1,
          }}>
            {entry.source}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Narrative helpers ────────────────────────────────────────────
// Uses evidence HEADLINES (what was found) — never source document names.
function buildSupportingNarrative(group: HypothesisGroup): string {
  const base = group.rationale.replace(/\.$/, '')

  // Pull tool/calculation findings — these describe clinical results, not guideline refs
  const findings = group.evidenceFor
    .map(e => e.headline.replace(/\.$/, ''))
    .filter(h => h.length > 0)
    .slice(0, 2)

  if (findings.length === 0) return base + '.'
  if (findings.length === 1) return `${base}. ${findings[0]}.`
  return `${base}. ${findings[0]}. ${findings[1]}.`
}

function buildChallengesNarrative(group: HypothesisGroup): string {
  if (group.evidenceAgainst.length === 0) return ''
  // Frame each item as a conditional challenge
  const items = group.evidenceAgainst.map(e => e.headline.replace(/\.$/, ''))
  if (items.length === 1) return `${items[0]}.`
  return `${items[0]}. ${items.slice(1).join('. ')}.`
}

// ── Next step zone (driven by group.nextStep from data) ─────────
function NextStepZone({ nextStep, accentColor }: { nextStep: string; accentColor: string }) {
  return (
    <div style={{
      margin: '6px 11px 10px',
      display: 'flex', alignItems: 'flex-start', gap: 8,
      padding: '8px 10px',
      borderRadius: 7,
      background: `${accentColor}08`,
      border: `1px solid ${accentColor}22`,
      borderLeft: `3px solid ${accentColor}55`,
    }}>
      <span style={{
        fontSize: 8, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
        color: accentColor, flexShrink: 0, marginTop: 2,
      }}>
        Next step for this diagnosis
      </span>
      <span style={{ fontSize: 11.5, color: 'rgba(0,0,0,0.65)', lineHeight: 1.5 }}>
        {nextStep}
      </span>
    </div>
  )
}

// ── Toggle button ────────────────────────────────────────────────
function ToggleBtn({ open, label, closedLabel, onClick }: { open: boolean; label: string; closedLabel?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        background: 'transparent', border: 'none', cursor: 'pointer',
        fontSize: 10, fontWeight: 600, color: 'rgba(0,0,0,0.36)',
        padding: '2px 0', letterSpacing: '0.02em',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,0,0,0.55)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,0,0,0.36)' }}
    >
      <span style={{
        display: 'inline-block', fontSize: 7.5,
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 160ms ease-out',
      }}>▾</span>
      {open ? (closedLabel ?? label) : label}
    </button>
  )
}

interface Props {
  group: HypothesisGroup
  isExpanded: boolean
  onToggleExpand: () => void
  attachedToHeader?: boolean // when true: no top radius/border, header row hidden
  focusState: FocusState
  annotations: DoctorAnnotation[]
  pinnedBranchId: string | null
  onHypothesisClick: (diagnosis: string, branchIds: string[]) => void
  onBranchClick: (branchId: string) => void
  onNodeClick: (nodeId: string) => void
  onNodeHoverEnter: (nodeId: string) => void
  onNodeHoverLeave: () => void
  onEvidenceNodeClick: (nodeId: string) => void
  onPruneBranch: (branchId: string) => void
  onAnnotate: (nodeId: string, type: DoctorAnnotationType, content: string) => void
  onRemoveAnnotation: (annotationId: string) => void
}

export default function HypothesisCard({
  group,
  isExpanded,
  onToggleExpand,
  attachedToHeader = false,
  focusState,
  annotations,
  pinnedBranchId,
  onHypothesisClick,
  onBranchClick,
  onNodeClick,
  onNodeHoverEnter,
  onNodeHoverLeave,
  onEvidenceNodeClick,
  onPruneBranch,
  onAnnotate,
  onRemoveAnnotation,
}: Props) {
  const [showEvidenceDetail, setShowEvidenceDetail] = useState(false)
  const [showPaths, setShowPaths] = useState(false)
  const [expandedPathIds, setExpandedPathIds] = useState<Set<string>>(new Set())
  const cardRef = useRef<HTMLDivElement>(null)

  const isFocused =
    focusState.mode === 'hypothesis_focused' &&
    focusState.diagnosis === group.diagnosis

  const colors = TAG_STYLES[group.tag]
  const isPinned = group.branchIds.some(id => id === pinnedBranchId)

  const exclusionKey = group.tag === 'UNLIKELY'
    ? Object.keys(EXCLUSION_STRENGTH).find(k => group.diagnosis.toLowerCase().includes(k))
    : undefined
  const exclusionInfo = exclusionKey ? EXCLUSION_STRENGTH[exclusionKey] : null

  const supportingNarrative = buildSupportingNarrative(group)
  const challengesNarrative = buildChallengesNarrative(group)

  const hasEvidenceFor = group.evidenceFor.length > 0
  const hasEvidenceAgainst = group.evidenceAgainst.length > 0
  const hasBranchDetail = group.branches.some(b => b.nodeSummaries.length > 0)
  const pathCount = group.branches.filter(b => b.nodeSummaries.length > 0).length

  useEffect(() => {
    if (isFocused && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [isFocused])

  function togglePath(branchId: string) {
    setExpandedPathIds(prev => {
      const next = new Set(prev)
      if (next.has(branchId)) next.delete(branchId)
      else next.add(branchId)
      return next
    })
  }

  // Annotation map
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
        borderRadius: attachedToHeader ? '0 0 14px 14px' : 9,
        border: attachedToHeader
          ? '1px solid rgba(26,82,168,0.12)'
          : isFocused ? `1.5px solid ${colors.accent}50` : '1px solid rgba(0,0,0,0.07)',
        borderLeft: attachedToHeader
          ? '1px solid rgba(26,82,168,0.12)'
          : `3px solid ${isFocused ? colors.accent : colors.accent + '55'}`,
        borderTop: attachedToHeader ? 'none' : '1px solid rgba(255,255,255,1)',
        background: attachedToHeader
          ? 'linear-gradient(148deg, rgba(232,242,255,0.5) 0%, rgba(242,248,255,0.7) 100%)'
          : isFocused
          ? `linear-gradient(148deg, ${colors.accent}10 0%, rgba(255,255,255,0.92) 100%)`
          : 'linear-gradient(148deg, rgba(255,255,255,0.96) 0%, rgba(246,248,255,0.92) 100%)',
        boxShadow: attachedToHeader
          ? '0 2px 12px rgba(26,82,168,0.07)'
          : isFocused
          ? `0 0 0 2px ${colors.accent}14, 0 1px 3px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,1)`
          : '0 1px 3px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1)',
        marginBottom: 10,
        transition: 'all 200ms ease-out',
        overflow: 'hidden',
      }}
    >
      {/* ── ONE-LINE HEADER — hidden when attached to recommendation box ── */}
      {!attachedToHeader && <div
        onClick={onToggleExpand}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '7px 9px', cursor: 'pointer', minWidth: 0,
        }}
      >
        {/* Tag — only shown for PRIMARY (others are under "Less likely but valid" header) */}
        {group.tag === 'PRIMARY' && (
          <span style={{
            fontSize: 7, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
            padding: '1.5px 4px', borderRadius: 3,
            background: colors.bg, color: colors.text, border: `1px solid ${colors.border}`,
            flexShrink: 0,
          }}>
            {group.tag}
          </span>
        )}

        {/* Diagnosis name */}
        <span style={{
          fontSize: 12.5, fontWeight: 500,
          color: '#111', lineHeight: 1.2,
          flex: 1, minWidth: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {group.diagnosis}
          {isPinned && <span style={{ fontSize: 9, color: '#1A52A8', marginLeft: 5 }}>★</span>}
        </span>

        {/* Path count pill */}
        <span style={{
          fontSize: 9, fontWeight: 600, color: colors.text,
          background: colors.bg, border: `1px solid ${colors.border}`,
          borderRadius: 4, padding: '2px 6px',
          flexShrink: 0, whiteSpace: 'nowrap',
        }}>
          {group.pathCount} of {group.totalPaths} paths
        </span>

        {/* Exclusion strength badge (UNLIKELY cards only) */}
        {exclusionInfo && (
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.03em',
            color: exclusionInfo.color, background: exclusionInfo.bg,
            border: `1px solid ${exclusionInfo.border}`,
            borderRadius: 4, padding: '2px 6px',
            flexShrink: 0, whiteSpace: 'nowrap',
          }}>
            {exclusionInfo.label}
          </span>
        )}

        {/* Chevron */}
        <span style={{
          fontSize: 8, color: 'rgba(0,0,0,0.25)',
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 180ms ease-out',
          display: 'inline-block', flexShrink: 0,
        }}>
          ▾
        </span>
      </div>}


      {/* ── EXPANDED CONTENT ── */}
      {isExpanded && (
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>

          {/* ── PRIMARY metadata: Convergence ── */}
          {group.tag === 'PRIMARY' && group.pathCount > 1 && (
            <div style={{
              padding: '7px 11px',
              borderBottom: '1px solid rgba(0,0,0,0.05)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(0,0,0,0.45)', flexShrink: 0, minWidth: 88 }}>
                Convergence
              </span>
              <span style={{
                fontSize: 8.5, fontWeight: 700, letterSpacing: '0.04em',
                color: '#1A6E3C', background: 'rgba(26,110,60,0.1)',
                border: '1px solid rgba(26,110,60,0.22)', borderRadius: 3,
                padding: '1px 5px', flexShrink: 0,
              }}>
                {group.pathCount} paths
              </span>
              <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.38)' }}>
                {group.pathCount} of {group.totalPaths} independent reasoning paths agree
              </span>
            </div>
          )}

          {/* ── ZONE 1: Narrative evidence summary ── */}
          {(hasEvidenceFor || hasEvidenceAgainst) && (
            <div style={{ padding: '10px 11px 6px', display: 'flex', flexDirection: 'column', gap: 6 }}>

              {hasEvidenceFor && (
                <div style={{
                  borderRadius: 7,
                  background: 'rgba(26,110,60,0.09)',
                  border: '1px solid rgba(26,110,60,0.18)',
                  borderLeft: '3px solid rgba(26,110,60,0.45)',
                  padding: '8px 10px',
                }}>
                  <div style={{
                    fontSize: 7.5, fontWeight: 700, letterSpacing: '0.11em', textTransform: 'uppercase',
                    color: '#1A5E35', marginBottom: 4,
                  }}>
                    Evidence supporting ({group.evidenceFor.length})
                  </div>
                  <div style={{ fontSize: 11.5, lineHeight: 1.58, color: 'rgba(0,0,0,0.68)' }}>
                    {supportingNarrative}
                  </div>
                </div>
              )}

              {hasEvidenceAgainst && (
                <div style={{
                  borderRadius: 7,
                  background: 'rgba(180,100,10,0.08)',
                  border: '1px solid rgba(180,100,10,0.18)',
                  borderLeft: '3px solid rgba(180,100,10,0.42)',
                  padding: '8px 10px',
                }}>
                  <div style={{
                    fontSize: 7.5, fontWeight: 700, letterSpacing: '0.11em', textTransform: 'uppercase',
                    color: '#7A5500', marginBottom: 4,
                  }}>
                    Key challenges ({group.evidenceAgainst.length})
                  </div>
                  <div style={{ fontSize: 11.5, lineHeight: 1.58, color: 'rgba(0,0,0,0.62)' }}>
                    {challengesNarrative}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── ZONE 2: Detailed evidence (collapsed by default) ── */}
          {(hasEvidenceFor || hasEvidenceAgainst) && (
            <div style={{ padding: '2px 11px 6px' }}>
              <ToggleBtn
                open={showEvidenceDetail}
                label={`Show detailed evidence`}
                closedLabel="Hide detailed evidence"
                onClick={() => setShowEvidenceDetail(!showEvidenceDetail)}
              />

              {showEvidenceDetail && (
                <div style={{ marginTop: 7 }}>
                  {hasEvidenceFor && (
                    <div style={{ marginBottom: hasEvidenceAgainst ? 8 : 0 }}>
                      <div style={{
                        fontSize: 7.5, fontWeight: 700, letterSpacing: '0.11em', textTransform: 'uppercase',
                        color: '#1A7042', marginBottom: 4, paddingLeft: 2,
                      }}>
                        For
                      </div>
                      {group.evidenceFor.map(entry => (
                        <EvidenceBullet
                          key={entry.nodeId}
                          entry={entry}
                          variant="for"
                          onClick={() => onEvidenceNodeClick(entry.nodeId)}
                        />
                      ))}
                    </div>
                  )}
                  {hasEvidenceAgainst && (
                    <div>
                      <div style={{
                        fontSize: 7.5, fontWeight: 700, letterSpacing: '0.11em', textTransform: 'uppercase',
                        color: '#7A3A1A', marginBottom: 4, paddingLeft: 2,
                      }}>
                        Against
                      </div>
                      {group.evidenceAgainst.map(entry => (
                        <EvidenceBullet
                          key={entry.nodeId}
                          entry={entry}
                          variant="against"
                          onClick={() => onEvidenceNodeClick(entry.nodeId)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── ZONE 3: Reasoning paths (collapsed by default) ── */}
          {hasBranchDetail && (
            <div style={{
              padding: '2px 11px 8px',
              borderTop: (hasEvidenceFor || hasEvidenceAgainst) ? '1px solid rgba(0,0,0,0.05)' : undefined,
              marginTop: (hasEvidenceFor || hasEvidenceAgainst) ? 4 : 0,
            }}>
              <ToggleBtn
                open={showPaths}
                label={`Show reasoning paths (${pathCount})`}
                closedLabel={`Hide reasoning paths`}
                onClick={() => setShowPaths(!showPaths)}
              />

              {showPaths && (
                <div style={{ marginTop: 7 }}>
                  {group.branches.map((branch, bi) => {
                    const isPathExpanded = expandedPathIds.has(branch.branchId)
                    const label = branch.isPrimary
                      ? 'Primary path'
                      : branch.keyDecision ?? `Path ${bi + 1}`
                    const intermediateSteps = branch.nodeSummaries.filter(ns => !ns.isDiagnosis)
                    const terminalStep = branch.nodeSummaries.find(ns => ns.isDiagnosis)
                    const stepCount = branch.nodeSummaries.length
                    const isConvergent = !branch.isPrimary && branch.convergsWith !== null

                    const branchAnnotationsByNode = new Map<string, DoctorAnnotation[]>()
                    annotations
                      .filter(a => branch.nodeSummaries.some(ns => ns.nodeId === a.nodeId))
                      .forEach(a => {
                        const list = branchAnnotationsByNode.get(a.nodeId) ?? []
                        list.push(a)
                        branchAnnotationsByNode.set(a.nodeId, list)
                      })

                    return (
                      <div key={branch.branchId} style={{ marginBottom: bi < group.branches.length - 1 ? 8 : 0 }}>
                        {/* Path header row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                          <button
                            onClick={() => togglePath(branch.branchId)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 5,
                              flex: 1, minWidth: 0, textAlign: 'left',
                              background: 'transparent', border: 'none', cursor: 'pointer',
                              padding: '3px 4px', borderRadius: 4,
                              fontSize: 10, fontWeight: 600, color: 'rgba(0,0,0,0.52)',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.04)' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                          >
                            <span style={{
                              display: 'inline-block', fontSize: 7,
                              transform: isPathExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                              transition: 'transform 160ms ease-out',
                              color: 'rgba(0,0,0,0.28)', flexShrink: 0,
                            }}>▶</span>
                            <span style={{
                              width: 5, height: 5, borderRadius: '50%',
                              background: branch.isPrimary ? '#1A52A8' : colors.accent,
                              flexShrink: 0, display: 'inline-block',
                            }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                              {label}
                            </span>
                            <span style={{ fontSize: 9, color: 'rgba(0,0,0,0.28)', fontWeight: 400, flexShrink: 0, marginLeft: 2 }}>
                              ({stepCount})
                            </span>
                          </button>

                          {/* View in tree — styled consistently with Audit → */}
                          <button
                            onClick={e => { e.stopPropagation(); onBranchClick(branch.branchId) }}
                            title="Focus this path in tree"
                            style={{
                              fontSize: 8.5, fontWeight: 600, color: colors.text,
                              background: colors.bg, border: `1px solid ${colors.border}`,
                              borderRadius: 4, padding: '2px 7px', cursor: 'pointer', flexShrink: 0,
                            }}
                          >
                            View →
                          </button>

                          {!branch.isPrimary && (
                            <button
                              onClick={e => { e.stopPropagation(); onPruneBranch(branch.branchId) }}
                              title="Prune this branch"
                              style={{
                                fontSize: 9, color: 'rgba(0,0,0,0.22)',
                                background: 'transparent', border: 'none', cursor: 'pointer',
                                padding: '2px 4px', flexShrink: 0,
                              }}
                              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(185,50,38,0.6)' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,0,0,0.22)' }}
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        {/* Convergence note */}
                        {isConvergent && (
                          <div style={{
                            fontSize: 9.5, color: '#1A52A8', fontStyle: 'italic',
                            marginBottom: 6, paddingLeft: 4,
                            display: 'flex', alignItems: 'center', gap: 4,
                          }}>
                            <span style={{ fontSize: 8, color: '#1A52A8' }}>⟳</span>
                            Independent path — converges with primary
                          </div>
                        )}

                        {/* Timeline */}
                        {isPathExpanded && (
                          <div style={{ paddingLeft: 2, paddingBottom: 2 }}>
                            {/* Intermediate steps with connecting line */}
                            {intermediateSteps.length > 0 && (
                              <div style={{ position: 'relative' }}>
                                {/* Vertical thread */}
                                {intermediateSteps.length > 1 && (
                                  <div style={{
                                    position: 'absolute', left: 9, top: 11, bottom: 11,
                                    width: 1, background: 'rgba(0,0,0,0.10)', zIndex: 0,
                                  }} />
                                )}
                                {intermediateSteps.map((ns, si) => (
                                  <PathStepRow
                                    key={ns.nodeId}
                                    step={ns}
                                    stepNumber={si + 1}
                                    annotations={branchAnnotationsByNode.get(ns.nodeId) ?? []}
                                    isSelected={
                                      focusState.mode === 'branch_focused' &&
                                      focusState.selectedNodeId === ns.nodeId
                                    }
                                    onClick={() => onNodeClick(ns.nodeId)}
                                    onMouseEnter={() => onNodeHoverEnter(ns.nodeId)}
                                    onMouseLeave={onNodeHoverLeave}
                                    onAnnotate={(type, content) => onAnnotate(ns.nodeId, type, content)}
                                    onRemoveAnnotation={onRemoveAnnotation}
                                  />
                                ))}
                              </div>
                            )}

                            {/* Terminal conclusion card */}
                            {terminalStep && (
                              <TerminalStepCard
                                step={terminalStep}
                                accentColor={colors.accent}
                                accentBg={colors.bg}
                                accentBorder={colors.border}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
          {/* ── ZONE 4: Next step ── */}
          {group.nextStep && (
            <NextStepZone nextStep={group.nextStep} accentColor={colors.accent} />
          )}
        </div>
      )}
    </div>
  )
}
