/** HypothesisCard — ultra-compact header + three-zone progressive disclosure when expanded */
import React, { useState, useRef, useEffect } from 'react'
import { HypothesisGroup, EvidenceEntry, FocusState, DoctorAnnotation, DoctorAnnotationType, NodeSummary } from '../../types/tree'
import AnnotationInput from './AnnotationInput'
import { FlagIcon, PaperclipIcon, LightningIcon, StarFilledIcon, ChevronDownIcon, WarningIcon, DotFilledIcon, XIcon, ThumbUpIcon, ThumbDownIcon, PencilIcon } from '../shared/Icons'

function firstSentence(text: string): string {
  const match = text.match(/^.+?[.!?](?:\s|$)/)
  return match ? match[0].trim() : text.slice(0, 120)
}

function firstTwoSentences(text: string): string {
  const matches = text.match(/[^.!?]+[.!?]+/g)
  if (!matches) return text.slice(0, 180)
  return matches.slice(0, 2).join(' ').trim()
}

const TAG_STYLES = {
  PRIMARY:      { text: '#1A52A8', bg: 'rgba(26,82,168,0.10)',   border: 'rgba(26,82,168,0.22)',   accent: '#1A52A8', barColor: '#1A52A8',  displayLabel: 'CONVERGING' },
  DIVERGENT:    { text: '#2B6CB0', bg: 'rgba(43,108,176,0.07)',  border: 'rgba(43,108,176,0.18)',  accent: '#2B6CB0', barColor: '#2B6CB0',  displayLabel: 'SUPPORTED' },
  UNLIKELY:     { text: '#7a3000', bg: 'rgba(196,90,16,0.08)',   border: 'rgba(196,90,16,0.20)',   accent: '#C45A10', barColor: '#C45A10',  displayLabel: 'FLAGGED' },
  CONTRADICTED: { text: '#9CA3AF', bg: 'rgba(156,163,175,0.08)', border: 'rgba(156,163,175,0.18)', accent: '#9CA3AF', barColor: '#9CA3AF',  displayLabel: 'NOT SUPPORTED' },
}

// Exclusion strength metadata for UNLIKELY cards — keyed by partial diagnosis match
const EXCLUSION_STRENGTH: Record<string, { label: string; detail: string; color: string; bg: string; border: string }> = {
  'pulmonary embolism': { label: 'Strong', detail: 'Wells Score 0/9',               color: '#1A6E3C', bg: 'rgba(26,110,60,0.10)',   border: 'rgba(26,110,60,0.22)' },
  'gerd':              { label: 'Moderate', detail: 'symptom mismatch + literature', color: '#7A5500', bg: 'rgba(212,149,10,0.10)', border: 'rgba(212,149,10,0.28)' },
}

// ── Hardcoded demo content for orthopedics scenario ─────────────
interface DemoCardContent {
  collapsedDescription?: string
  collapsedAction?: string      // INVESTIGATE / SAFETY REVIEW / NOT SUPPORTED one-liner
  collapsedActionLabel?: string // label for the one-liner
  expandedSections: Array<{
    label: string
    labelColor?: string
    bullets: string[]
  }>
}

const DEMO_CARD_CONTENT: Record<string, DemoCardContent> = {
  'Ulnar nerve palsy': {
    collapsedDescription: '3 independent reasoning paths converged on this diagnosis through anatomical, biomechanical, and literature analysis.',
    collapsedAction: 'Nerve conduction studies at the cubital tunnel',
    collapsedActionLabel: 'Investigate',
    expandedSections: [
      {
        label: 'WHY THIS HYPOTHESIS',
        bullets: [
          'Valgus deformity stretches the ulnar nerve \u2014 producing the tingling in ring and small fingers',
          'This is the textbook delayed complication of this type of fracture that didn\'t heal',
        ],
      },
      {
        label: 'CONFIDENCE',
        bullets: [
          '3 independent paths converged \u2014 through anatomy, biomechanics, and literature cross-check',
          'Confirmed across multiple pediatric orthopedic references',
        ],
      },
      {
        label: 'INVESTIGATE \u2014 TO CONFIRM OR RULE OUT',
        bullets: [
          'Order nerve conduction studies at the cubital tunnel',
          'Prolonged ulnar motor latency confirms the diagnosis',
          'Normal conduction deprioritizes this hypothesis',
        ],
      },
    ],
  },
  'Progressive cubitus valgus': {
    collapsedDescription: 'Structural deformity confirmed on exam and X-ray.',
    collapsedAction: 'Bilateral AP elbow radiographs \u2014 measure arm angle',
    collapsedActionLabel: 'Investigate',
    expandedSections: [
      {
        label: 'WHY THIS HYPOTHESIS',
        bullets: [
          'The fractured fragment stopped growing while the other side continued \u2014 producing a progressive arm deformity',
          'Patient\'s visible crooked arm and confirmed fracture that didn\'t heal on X-ray match this pattern',
        ],
      },
      {
        label: 'CONFIDENCE',
        bullets: [
          '1 reasoning path with strong mechanistic support',
          'Classified as the primary structural complication in pediatric orthopedic references',
        ],
      },
      {
        label: 'INVESTIGATE',
        bullets: [
          'Measure arm angle on bilateral X-rays, compare both sides',
          'Angle exceeding 15\u00B0 confirms progressive deformity',
          'Normal angle requires re-evaluating the cause',
        ],
      },
    ],
  },
  'Posterolateral instability': {
    collapsedAction: '\u26A0 Fluoroscopy requires clinical justification in an 8-year-old',
    collapsedActionLabel: 'Safety review',
    expandedSections: [
      {
        label: '\u26A0 PEDIATRIC SAFETY REVIEW REQUIRED',
        labelColor: '#8B4800',
        bullets: [
          'Investigation requires fluoroscopy \u2014 radiation exposure in an 8-year-old needs clinical justification',
          'Low pre-test probability (1 of 8 paths) does not support the risk',
        ],
      },
      {
        label: 'WHY THIS HYPOTHESIS',
        bullets: [
          'Mechanically plausible \u2014 the fractured piece normally stabilizes the joint',
          'But not the classically documented complication for this fracture type in children',
        ],
      },
      {
        label: 'INVESTIGATE \u2014 PENDING SPECIALIST REVIEW',
        bullets: [
          'Lateral pivot-shift test under fluoroscopy',
          'Positive result confirms instability',
          'Negative result redirects to the deformity pathway',
        ],
      },
    ],
  },
  'Radial nerve palsy': {
    collapsedAction: 'Wrong side of the anatomy \u2014 patient\'s symptoms are ulnar territory',
    collapsedActionLabel: undefined, // no label for NOT SUPPORTED — badge handles it
    expandedSections: [
      {
        label: 'WHY NOT SUPPORTED',
        bullets: [
          'The deformity stretches the ulnar nerve, not the radial \u2014 wrong side of the anatomy',
          'Patient\'s symptoms (ring and small finger tingling) are ulnar territory, not radial',
        ],
      },
      {
        label: 'EVIDENCE CONSIDERED',
        bullets: [
          'The system explored this path and found the anatomy contradicts the hypothesis',
          'Radial nerve injury in elbow fractures is an acute complication, not a delayed one like this case',
        ],
      },
    ],
  },
  'Delayed nerve symptoms': {
    collapsedAction: 'Too vague \u2014 doesn\'t identify which nerve or mechanism',
    collapsedActionLabel: undefined,
    expandedSections: [
      {
        label: 'WHY NOT SUPPORTED',
        bullets: [
          'Literature names a specific nerve (ulnar) and specific mechanism (traction from arm deformity)',
          '"Delayed nerve symptoms" doesn\'t identify which nerve or why \u2014 not actionable for clinical decision-making',
        ],
      },
      {
        label: 'EVIDENCE CONSIDERED',
        bullets: [
          'The system found this framing points in the right direction but stops short of the specific documented complication',
        ],
      },
    ],
  },
  'Chronic lateral pain': {
    collapsedAction: 'Pain is a symptom, not a structural diagnosis',
    collapsedActionLabel: undefined,
    expandedSections: [
      {
        label: 'WHY NOT SUPPORTED',
        bullets: [
          'Pain is a symptom, not a structural diagnosis \u2014 it doesn\'t explain the arm deformity or nerve symptoms',
          'The literature does not classify lateral pain as the primary complication of this fracture type',
        ],
      },
      {
        label: 'EVIDENCE CONSIDERED',
        bullets: [
          'Pain can accompany the fracture that didn\'t heal but is not the documented primary complication',
        ],
      },
    ],
  },
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
  const COLORS: Record<string, string> = { flag: '#C53D2F', context: '#3B7DD8', challenge: '#D4950A' }
  const ICON_COMPONENTS: Record<DoctorAnnotationType, React.ReactNode> = {
    flag: <FlagIcon size={8} color={COLORS.flag} />,
    context: <PaperclipIcon size={8} color={COLORS.context} />,
    challenge: <LightningIcon size={8} color={COLORS.challenge} />,
    pin: <StarFilledIcon size={8} color="#1A52A8" />,
  }
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
          {ICON_COMPONENTS[t]}
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
              <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0, marginTop: 1 }}>
                {ann.type === 'flag' ? <FlagIcon size={9} color={ANNOTATION_COLORS.flag} /> : ann.type === 'context' ? <PaperclipIcon size={9} color={ANNOTATION_COLORS.context} /> : <LightningIcon size={9} color={ANNOTATION_COLORS.challenge} />}
              </span>
              <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.62)', flex: 1, lineHeight: 1.35 }}>{ann.content}</span>
              <button
                onClick={() => onRemoveAnnotation(ann.id)}
                style={{ display: 'flex', alignItems: 'center', color: 'rgba(0,0,0,0.28)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              ><XIcon size={9} color="rgba(0,0,0,0.35)" /></button>
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
// Splits prose at real sentence boundaries (punctuation + space + capital),
// avoiding false splits on abbreviations like "Mateo R., 8 y/o".
function splitSentences(text: string): string[] {
  const parts = text.split(/(?<=[.!?])\s+(?=[A-Z])/)
  return parts.map(s => s.trim()).filter(Boolean)
}

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
  const sentences = splitSentences(nextStep)
  return (
    <div style={{
      margin: '6px 11px 10px',
      padding: '8px 10px',
      borderRadius: 7,
      background: `${accentColor}08`,
      border: `1px solid ${accentColor}22`,
      borderLeft: `3px solid ${accentColor}55`,
    }}>
      <span style={{
        fontSize: 8, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
        color: accentColor, display: 'block', marginBottom: 6,
      }}>
        Investigate
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {sentences.map((sentence, i) => (
          <div key={i} style={{
            display: 'flex', gap: 7, alignItems: 'flex-start',
          }}>
            <span style={{
              width: 4, height: 4, borderRadius: '50%', flexShrink: 0, marginTop: 6,
              background: `${accentColor}70`,
            }} />
            <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', lineHeight: 1.58 }}>
              {sentence}
            </span>
          </div>
        ))}
      </div>
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
        display: 'inline-flex',
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 160ms ease-out',
      }}><ChevronDownIcon size={11} color="rgba(0,0,0,0.36)" /></span>
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
  onAnnotate: (nodeId: string, type: DoctorAnnotationType, content: string) => void
  onRemoveAnnotation: (annotationId: string) => void
  onAddReview: (diagnosis: string, rating: 'up' | 'down' | null, text: string) => void
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
  onAnnotate,
  onRemoveAnnotation,
  onAddReview,
}: Props) {
  const [showPaths, setShowPaths] = useState(false)
  const [expandedPathIds, setExpandedPathIds] = useState<Set<string>>(new Set())
  const [thumbRating, setThumbRating] = useState<'up' | 'down' | null>(null)
  const [showReviewInput, setShowReviewInput] = useState(false)
  const [reviewDraft, setReviewDraft] = useState('')
  const [submittedReview, setSubmittedReview] = useState<string | null>(null)
  const reviewInputRef = useRef<HTMLTextAreaElement>(null)
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

  function handleThumb(rating: 'up' | 'down') {
    setThumbRating(prev => prev === rating ? null : rating)
  }

  function handleSubmitReview() {
    const text = reviewDraft.trim()
    if (!thumbRating && !text) return
    setSubmittedReview(text || null)
    setShowReviewInput(false)
    setReviewDraft('')
    onAddReview(group.diagnosis, thumbRating, text)
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
          : group.tag === 'CONTRADICTED'
          ? '1px dashed rgba(0,0,0,0.13)'
          : isFocused ? `1.5px solid ${colors.accent}50` : '1px solid rgba(0,0,0,0.07)',
        borderLeft: attachedToHeader
          ? '1px solid rgba(26,82,168,0.12)'
          : group.tag === 'CONTRADICTED'
          ? '3px dashed rgba(156,163,175,0.45)'
          : `3px solid ${isFocused ? colors.accent : colors.accent + '55'}`,
        borderTop: attachedToHeader ? 'none' : group.tag === 'CONTRADICTED' ? '1px dashed rgba(0,0,0,0.13)' : '1px solid rgba(255,255,255,1)',
        background: attachedToHeader
          ? 'linear-gradient(148deg, rgba(232,242,255,0.5) 0%, rgba(242,248,255,0.7) 100%)'
          : group.tag === 'CONTRADICTED'
          ? 'rgba(245,246,247,0.7)'
          : group.tag === 'DIVERGENT'
          ? 'linear-gradient(148deg, rgba(43,108,176,0.04) 0%, rgba(241,246,255,0.85) 100%)'
          : isFocused
          ? `linear-gradient(148deg, ${colors.accent}10 0%, rgba(255,255,255,0.92) 100%)`
          : 'linear-gradient(148deg, rgba(255,255,255,0.96) 0%, rgba(246,248,255,0.92) 100%)',
        boxShadow: attachedToHeader
          ? '0 2px 12px rgba(26,82,168,0.07)'
          : group.tag === 'CONTRADICTED'
          ? 'none'
          : isFocused
          ? `0 0 0 2px ${colors.accent}14, 0 1px 3px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,1)`
          : '0 1px 3px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1)',
        opacity: 1,
        marginBottom: 10,
        transition: 'all 200ms ease-out',
        overflow: 'hidden',
      }}
    >
      {/* ── TWO-ROW HEADER — matches Leading Diagnosis card layout ── */}
      {!attachedToHeader && <div
        onClick={onToggleExpand}
        style={{ padding: '9px 11px 7px', cursor: 'pointer', minWidth: 0 }}
      >
        {/* Row 1: status label + path count + chevron */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: group.tag === 'CONTRADICTED' ? 'rgba(0,0,0,0.35)' : colors.text,
            }}>
              {colors.displayLabel}
            </span>
            {exclusionInfo && (
              <span style={{
                fontSize: 8, fontWeight: 700, letterSpacing: '0.03em',
                color: exclusionInfo.color, background: exclusionInfo.bg,
                border: `1px solid ${exclusionInfo.border}`,
                borderRadius: 3, padding: '1px 5px',
              }}>
                {exclusionInfo.label}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 9, fontWeight: 600, color: colors.text,
              background: colors.bg, border: `1px solid ${colors.border}`,
              borderRadius: 4, padding: '2px 6px', whiteSpace: 'nowrap',
            }}>
              {group.pathCount} of {group.totalPaths} paths
            </span>
            <span style={{
              color: 'rgba(0,0,0,0.25)',
              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 180ms ease-out',
              display: 'inline-flex',
            }}>
              <ChevronDownIcon size={12} color="rgba(0,0,0,0.25)" />
            </span>
          </div>
        </div>

        {/* Row 2: diagnosis name */}
        <div style={{
          fontSize: 15, fontWeight: 600,
          color: group.tag === 'CONTRADICTED' ? 'rgba(0,0,0,0.45)' : '#111',
          lineHeight: 1.2,
          fontFamily: 'Georgia, "Times New Roman", serif',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          {group.diagnosis}
          {isPinned && <span style={{ display: 'inline-flex', verticalAlign: 'middle' }}><StarFilledIcon size={10} color="#1A52A8" /></span>}
        </div>
      </div>}

      {/* ── COLLAPSED CONTENT — uses hardcoded demo content when available ── */}
      {!attachedToHeader && !isExpanded && (() => {
        const demo = DEMO_CARD_CONTENT[group.diagnosis]

        // Description line (not for CONTRADICTED — badge is enough)
        const descriptionLine = demo?.collapsedDescription && group.tag !== 'CONTRADICTED'
          ? demo.collapsedDescription
          : (!demo && group.rationale && group.tag !== 'CONTRADICTED' && !group.safetyFlags?.length)
          ? firstSentence(group.rationale)
          : null

        // Action line
        const actionText = demo?.collapsedAction
          ?? (group.tag === 'CONTRADICTED' ? null
            : group.safetyFlags?.length ? firstSentence(group.safetyFlags[0].label)
            : group.nextStep ? firstSentence(group.nextStep) : null)
        const actionLabel = demo?.collapsedActionLabel
          ?? (group.tag === 'CONTRADICTED' ? undefined
            : group.safetyFlags?.length ? 'Safety review' : 'Investigate')

        return (
          <>
            {descriptionLine && (
              <div onClick={onToggleExpand} style={{ padding: '0 11px 6px', cursor: 'pointer' }}>
                <span style={{
                  fontSize: 11, lineHeight: 1.45, color: 'rgba(0,0,0,0.50)',
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                } as React.CSSProperties}>
                  {descriptionLine}
                </span>
              </div>
            )}
            {actionText && (
              <div onClick={onToggleExpand} style={{
                display: 'flex', alignItems: 'baseline', gap: 6,
                padding: '0 11px 9px', cursor: 'pointer',
              }}>
                {actionLabel && (
                  <span style={{
                    fontSize: 7.5, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
                    color: group.safetyFlags?.length ? '#B86200' : group.tag === 'CONTRADICTED' ? '#9CA3AF' : colors.accent,
                    flexShrink: 0,
                  }}>
                    {group.safetyFlags?.length
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><WarningIcon size={9} color="#B86200" /> {actionLabel}</span>
                      : actionLabel}
                  </span>
                )}
                <span style={{
                  fontSize: 11,
                  color: group.safetyFlags?.length ? 'rgba(0,0,0,0.62)' : group.tag === 'CONTRADICTED' ? 'rgba(0,0,0,0.60)' : 'rgba(0,0,0,0.48)',
                  lineHeight: 1.4, flex: 1, minWidth: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {actionText}
                </span>
              </div>
            )}
          </>
        )
      })()}

      {/* ── EXPANDED CONTENT ── */}
      {isExpanded && (
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>

          {/* ── PROVIDE ASSESSMENT — subtle link, expands to review controls ── */}
          {!attachedToHeader && !showReviewInput && !submittedReview && (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 11px 5px',
                borderBottom: '1px solid rgba(0,0,0,0.04)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => { setShowReviewInput(true); setTimeout(() => reviewInputRef.current?.focus(), 50) }}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  fontSize: 9.5, fontWeight: 500, color: 'rgba(0,0,0,0.32)',
                  padding: '2px 0', letterSpacing: '0.02em',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,0,0,0.50)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,0,0,0.32)' }}
              >
                Provide assessment ›
              </button>
            </div>
          )}

          {/* ── REVIEW INPUT — expands when Provide Assessment clicked ── */}
          {!attachedToHeader && showReviewInput && (
            <div
              style={{
                padding: '8px 11px 8px',
                borderBottom: '1px solid rgba(0,0,0,0.04)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                <button
                  onClick={() => handleThumb('up')}
                  title="Agree"
                  style={{
                    height: 20, borderRadius: 4, border: thumbRating === 'up' ? '1px solid rgba(26,110,60,0.25)' : '1px solid rgba(0,0,0,0.08)',
                    cursor: 'pointer', padding: '0 6px',
                    display: 'flex', alignItems: 'center', gap: 3,
                    background: thumbRating === 'up' ? 'rgba(26,110,60,0.08)' : 'transparent',
                    fontSize: 9, fontWeight: 500,
                    color: thumbRating === 'up' ? '#1A6E3C' : 'rgba(0,0,0,0.32)',
                    transition: 'all 120ms',
                  }}
                >
                  <ThumbUpIcon size={8} color={thumbRating === 'up' ? '#1A6E3C' : 'rgba(0,0,0,0.28)'} />
                  Agree
                </button>
                <button
                  onClick={() => handleThumb('down')}
                  title="Disagree"
                  style={{
                    height: 20, borderRadius: 4, border: thumbRating === 'down' ? '1px solid rgba(197,61,47,0.22)' : '1px solid rgba(0,0,0,0.08)',
                    cursor: 'pointer', padding: '0 6px',
                    display: 'flex', alignItems: 'center', gap: 3,
                    background: thumbRating === 'down' ? 'rgba(197,61,47,0.06)' : 'transparent',
                    fontSize: 9, fontWeight: 500,
                    color: thumbRating === 'down' ? '#C53D2F' : 'rgba(0,0,0,0.32)',
                    transition: 'all 120ms',
                  }}
                >
                  <ThumbDownIcon size={8} color={thumbRating === 'down' ? '#C53D2F' : 'rgba(0,0,0,0.28)'} />
                  Disagree
                </button>
              </div>
              <textarea
                ref={reviewInputRef}
                value={reviewDraft}
                onChange={e => setReviewDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmitReview(); if (e.key === 'Escape') setShowReviewInput(false) }}
                placeholder="Add your clinical assessment..."
                rows={2}
                style={{
                  width: '100%', resize: 'vertical', padding: '5px 8px', borderRadius: 6,
                  border: '1px solid rgba(0,0,0,0.10)', background: 'rgba(255,255,255,0.95)',
                  fontSize: 11.5, lineHeight: 1.5, color: '#111', outline: 'none',
                  fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
                <button
                  onClick={handleSubmitReview}
                  disabled={!thumbRating && !reviewDraft.trim()}
                  style={{
                    fontSize: 9.5, fontWeight: 600, padding: '3px 10px', borderRadius: 5,
                    border: 'none', cursor: (thumbRating || reviewDraft.trim()) ? 'pointer' : 'default',
                    background: (thumbRating || reviewDraft.trim()) ? '#1A52A8' : 'rgba(0,0,0,0.08)',
                    color: (thumbRating || reviewDraft.trim()) ? '#fff' : 'rgba(0,0,0,0.3)',
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => setShowReviewInput(false)}
                  style={{
                    fontSize: 9.5, fontWeight: 500, padding: '3px 8px', borderRadius: 5,
                    background: 'transparent', color: 'rgba(0,0,0,0.35)', border: 'none', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── SUBMITTED REVIEW — shown inline after submission ── */}
          {!attachedToHeader && (submittedReview !== null || thumbRating !== null) && !showReviewInput && (
            <div
              style={{
                margin: '6px 10px 6px',
                padding: '5px 8px',
                borderRadius: 6,
                background: thumbRating === 'up' ? 'rgba(26,110,60,0.04)' : thumbRating === 'down' ? 'rgba(197,61,47,0.04)' : 'rgba(26,82,168,0.03)',
                border: thumbRating === 'up' ? '1px solid rgba(26,110,60,0.14)' : thumbRating === 'down' ? '1px solid rgba(197,61,47,0.12)' : '1px solid rgba(26,82,168,0.09)',
                borderLeft: thumbRating === 'up' ? '2px solid rgba(26,110,60,0.40)' : thumbRating === 'down' ? '2px solid rgba(197,61,47,0.40)' : '2px solid rgba(26,82,168,0.22)',
                display: 'flex', alignItems: 'flex-start', gap: 5,
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 8, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
                  color: thumbRating === 'up' ? 'rgba(26,110,60,0.70)' : thumbRating === 'down' ? 'rgba(197,61,47,0.65)' : 'rgba(26,82,168,0.55)',
                  marginBottom: submittedReview ? 1 : 0,
                }}>
                  {thumbRating === 'up' ? 'Agreed' : thumbRating === 'down' ? 'Disagreed' : 'Your review'}
                </div>
                {submittedReview && (
                  <div style={{ fontSize: 10.5, color: 'rgba(0,0,0,0.58)', lineHeight: 1.4 }}>{submittedReview}</div>
                )}
              </div>
              <button
                onClick={() => { setSubmittedReview(null); setThumbRating(null); setReviewDraft('') }}
                style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
              >
                <XIcon size={8} color="rgba(0,0,0,0.22)" />
              </button>
            </div>
          )}

          {/* ── STRUCTURED SECTIONS — hardcoded demo content OR fallback ── */}
          {(() => {
            const demo = DEMO_CARD_CONTENT[group.diagnosis]
            if (demo) {
              // Render structured sections from demo content
              return (
                <div style={{ padding: '10px 11px 10px' }}>
                  {demo.expandedSections.map((section, si) => {
                    const isSafety = section.label.includes('\u26A0')
                    const isInvestigate = section.label.toUpperCase().includes('INVESTIGATE')
                    const isWhyNot = section.label.toUpperCase().includes('WHY NOT')
                    const isEvidence = section.label.toUpperCase().includes('EVIDENCE')
                    const sectionColor = section.labelColor
                      ?? (isSafety ? '#8B4800'
                        : isInvestigate ? colors.accent
                        : isWhyNot ? '#6B7280'
                        : isEvidence ? '#6B7280'
                        : 'rgba(0,0,0,0.50)')

                    return (
                      <div key={si} style={{
                        marginBottom: si < demo.expandedSections.length - 1 ? 12 : 0,
                        ...(isSafety ? {
                          borderRadius: 7,
                          background: 'rgba(184,98,0,0.06)',
                          border: '1px solid rgba(184,98,0,0.18)',
                          borderLeft: '3px solid rgba(184,98,0,0.50)',
                          padding: '8px 10px',
                        } : {}),
                      }}>
                        <div style={{
                          fontSize: 8, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
                          color: sectionColor, marginBottom: 6,
                        }}>
                          {section.label}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {section.bullets.map((bullet, bi) => (
                            <div key={bi} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                              <span style={{
                                width: 4, height: 4, borderRadius: '50%', flexShrink: 0, marginTop: 6,
                                background: isSafety ? 'rgba(197,61,47,0.55)' : `${sectionColor}60`,
                              }} />
                              <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', lineHeight: 1.58 }}>
                                {bullet}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            }

            // Fallback: original dynamic content for non-demo diagnoses
            return (
              <>
                {group.tag !== 'CONTRADICTED' && !group.safetyFlags?.length && group.rationale && (
                  <div style={{ padding: '10px 11px 4px' }}>
                    {splitSentences(group.rationale).map((sentence, i) => (
                      <div key={i} style={{
                        fontSize: 12, lineHeight: 1.65, color: 'rgba(0,0,0,0.62)',
                        marginTop: i > 0 ? 7 : 0,
                        paddingLeft: i > 0 ? 10 : 0,
                        borderLeft: i > 0 ? '2px solid rgba(0,0,0,0.08)' : 'none',
                      }}>
                        {sentence}
                      </div>
                    ))}
                  </div>
                )}
                {group.tag === 'CONTRADICTED' && group.whyNotSupported && (
                  <div style={{ padding: '10px 11px 6px' }}>
                    <div style={{
                      borderRadius: 7,
                      background: 'rgba(156,163,175,0.10)',
                      border: '1px solid rgba(156,163,175,0.22)',
                      borderLeft: '3px solid rgba(156,163,175,0.5)',
                      padding: '8px 10px',
                    }}>
                      <div style={{
                        fontSize: 7.5, fontWeight: 700, letterSpacing: '0.11em', textTransform: 'uppercase',
                        color: '#6B7280', marginBottom: 4,
                      }}>
                        Why not supported
                      </div>
                      {splitSentences(group.whyNotSupported).map((sentence, i) => (
                        <div key={i} style={{
                          fontSize: 12, lineHeight: 1.62, color: 'rgba(0,0,0,0.72)',
                          marginTop: i > 0 ? 5 : 0,
                          display: 'flex', gap: 6, alignItems: 'flex-start',
                        }}>
                          <span style={{ fontSize: 9, color: 'rgba(0,0,0,0.25)', flexShrink: 0, marginTop: 3 }}>—</span>
                          <span>{sentence}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {group.safetyFlags && group.safetyFlags.length > 0 && (
                  <div style={{ padding: '8px 11px 10px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{
                      borderRadius: 7,
                      background: 'rgba(184,98,0,0.07)',
                      border: '1px solid rgba(184,98,0,0.22)',
                      borderLeft: '3px solid rgba(184,98,0,0.60)',
                      padding: '8px 10px',
                    }}>
                      <div style={{
                        fontSize: 7.5, fontWeight: 700, letterSpacing: '0.11em', textTransform: 'uppercase',
                        color: '#8B4800', marginBottom: 5,
                      }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><WarningIcon size={10} color="#8B4800" /> Safety Review Required</span>
                      </div>
                      {group.safetyFlags.map((f, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: i < group.safetyFlags!.length - 1 ? 4 : 0 }}>
                          <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0, marginTop: 1 }}><DotFilledIcon size={8} color="#C53D2F" /></span>
                          <span style={{ fontSize: 12, lineHeight: 1.50, color: 'rgba(0,0,0,0.75)' }}>{f.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!group.safetyFlags?.length && group.nextStep && group.tag !== 'CONTRADICTED' && (
                  <div style={{ padding: '4px 11px 10px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    <NextStepZone nextStep={group.nextStep} accentColor={colors.accent} />
                  </div>
                )}
              </>
            )
          })()}


          {/* ── ZONE 3: Reasoning paths — removed ── */}
          {false && hasBranchDetail && (
            <div style={{
              padding: '2px 11px 8px',
              borderTop: '1px solid rgba(0,0,0,0.05)',
              marginTop: 4,
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
                              display: 'inline-flex',
                              transform: isPathExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                              transition: 'transform 160ms ease-out',
                              color: 'rgba(0,0,0,0.28)', flexShrink: 0,
                            }}><ChevronDownIcon size={10} color="rgba(0,0,0,0.28)" /></span>
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
        </div>
      )}
    </div>
  )
}
