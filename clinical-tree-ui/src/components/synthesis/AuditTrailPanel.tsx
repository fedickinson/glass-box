/** AuditTrailPanel — chronological log of all system and doctor interactions for this session */
import React, { useEffect, useRef } from 'react'
import { AuditEntry } from '../../types/tree'
import {
  NodeIcon, RefreshIcon, ShieldIcon, FlagIcon, PaperclipIcon, LightningIcon,
  StarFilledIcon, ScissorsIcon, ThumbUpIcon, ThumbDownIcon, PencilIcon, CheckIcon,
} from '../shared/Icons'

interface Props {
  auditLog: AuditEntry[]           // live entries from reducer
  onBranchClick: (branchId: string) => void
  onSwitchToSynthesis: () => void  // called alongside onBranchClick for branch links
}

// ── Mock entries — seeded from the actual orthopedics reasoning session ────────
// These reflect the real branches, node IDs, and diagnoses in orthopedicsTree.ts.
// Branch IDs: primary, branch-pain, branch-nerve, branch-instability, branch-ulnar, branch-radial
// Decision point node IDs: dp0 ("Branch: valgus vs nerve vs instability"),
//   dp1 ("Branch: valgus vs lateral pain as answer"),
//   dp2 ("Branch: instability vs specific nerve complication")

const SESSION_BASE = new Date()
SESSION_BASE.setHours(14, 18, 2, 0)

function mockTs(offsetMs: number) {
  return SESSION_BASE.getTime() + offsetMs
}

const MOCK_ENTRIES: AuditEntry[] = [
  {
    id: 'mock-01', timestamp: mockTs(0),
    type: 'system', action: 'system_event',
    summary: 'Reasoning tree generation started',
    detail: 'Mateo R., 8 y/o M — lateral condyle nonunion at 5 months, right elbow valgus deformity + digital paresthesias',
    nodeId: 'root', branchId: 'primary',
  },
  {
    id: 'mock-02', timestamp: mockTs(22_000),
    type: 'system', action: 'system_event',
    summary: 'Decision point reached: Branch — valgus vs. nerve vs. instability',
    detail: 'Three concurrent findings implicate different primary mechanisms. System paused — three counterfactual branches launched.',
    nodeId: 'dp0', branchId: 'primary',
  },
  {
    id: 'mock-03', timestamp: mockTs(48_000),
    type: 'system', action: 'system_event',
    summary: 'Decision point reached: Branch — valgus vs. lateral pain as primary answer',
    detail: 'Reference search returned cubitus valgus as structural sequela; lateral pain classified as nonspecific symptom. Splitting to confirm.',
    nodeId: 'dp1', branchId: 'primary',
  },
  {
    id: 'mock-04', timestamp: mockTs(71_000),
    type: 'system', action: 'system_event',
    summary: 'Decision point reached: Branch — instability vs. specific nerve complication',
    detail: 'Grip weakness could reflect instability or ulnar motor fiber involvement. Separating to evaluate evidence for each.',
    nodeId: 'dp2', branchId: 'branch-instability',
  },
  {
    id: 'mock-05', timestamp: mockTs(89_000),
    type: 'shield', action: 'shield_flag',
    summary: 'Posterolateral instability path flagged: fluoroscopy in pediatric patient',
    detail: 'Fluoroscopic pivot-shift test likely requires pediatric sedation protocol — risk-benefit assessment by pediatric orthopedics recommended before ordering. Pre-test probability is low (1 of 8 paths, not classically documented for this fracture type).',
    nodeId: 'term-instability', branchId: 'branch-instability',
    hypothesisDiagnosis: 'Posterolateral instability',
  },
  {
    id: 'mock-06', timestamp: mockTs(112_000),
    type: 'system', action: 'system_event',
    summary: 'Reasoning tree complete',
    detail: '8 paths explored — 3 convergences on Ulnar nerve palsy. Primary structural sequela: Progressive cubitus valgus.',
    nodeId: null, branchId: null,
  },
  {
    id: 'mock-07', timestamp: mockTs(138_000),
    type: 'doctor', action: 'annotate',
    summary: 'Flagged: Confirm NCS timing — may be falsely normal within first 3 weeks',
    detail: 'Nerve conduction velocity is unreliable in the acute phase; obtain NCS at least 3 weeks after symptom onset to avoid false negatives',
    nodeId: 'tool2', branchId: 'branch-ulnar',
    hypothesisDiagnosis: 'Ulnar nerve palsy',
  },
  {
    id: 'mock-08', timestamp: mockTs(162_000),
    type: 'doctor', action: 'annotate',
    summary: 'Context added: Parent confirms no follow-up after initial casting',
    detail: 'Family did not return for the 6-week post-cast X-ray — nonunion was therefore undetected until this visit. Relevant to timeline of deformity progression.',
    nodeId: 'ref0', branchId: 'primary',
    hypothesisDiagnosis: 'Progressive cubitus valgus',
  },
  {
    id: 'mock-09', timestamp: mockTs(191_000),
    type: 'doctor', action: 'annotate',
    summary: 'Challenged: Grip weakness may reflect instability, not only ulnar motor involvement',
    detail: 'The evidence base for posterolateral instability is weaker, but grip strength testing in this patient should be compared against contralateral side before excluding',
    nodeId: 't8', branchId: 'branch-instability',
    hypothesisDiagnosis: 'Posterolateral instability',
  },
  {
    id: 'mock-10', timestamp: mockTs(219_000),
    type: 'doctor', action: 'prune',
    summary: 'Branch excluded: Chronic lateral pain',
    detail: 'Pain is a symptom of nonunion, not the primary structural sequela. Does not explain valgus deformity or ulnar-distribution nerve findings. Divergent answer.',
    nodeId: 'term-pain', branchId: 'branch-pain',
    hypothesisDiagnosis: 'Chronic lateral pain',
  },
  {
    id: 'mock-11', timestamp: mockTs(247_000),
    type: 'doctor', action: 'assess',
    summary: 'Assessment: Agree — Progressive cubitus valgus',
    detail: 'Consistent with exam and confirmed on X-ray. Lateral condyle nonunion arresting physeal growth explains the valgus progression. Recommend bilateral AP elbow radiographs to quantify carrying angle deviation.',
    nodeId: null, branchId: 'primary',
    hypothesisDiagnosis: 'Progressive cubitus valgus',
    assessmentRating: 'up',
  },
  {
    id: 'mock-12', timestamp: mockTs(283_000),
    type: 'doctor', action: 'assess',
    summary: 'Assessment: Disagree — Delayed nerve symptoms',
    detail: 'Too nonspecific. Paresthesias are clearly in ulnar distribution (ring and small fingers — C8/T1 territory). Generic "delayed nerve symptoms" does not name the nerve or mechanism and would not guide workup.',
    nodeId: null, branchId: 'branch-nerve',
    hypothesisDiagnosis: 'Delayed nerve symptoms',
    assessmentRating: 'down',
  },
]

// ── Icon + color helpers ────────────────────────────────────────────────────

function getEntryStyle(entry: AuditEntry): { borderColor: string; icon: React.ReactNode; actionLabel: string } {
  // Shield entries
  if (entry.type === 'shield') {
    return {
      borderColor: '#C53D2F',
      icon: <ShieldIcon size={10} color="#C53D2F" />,
      actionLabel: 'SHIELD',
    }
  }

  // System entries
  if (entry.type === 'system') {
    return {
      borderColor: 'rgba(0,0,0,0.15)',
      icon: <NodeIcon size={10} color="rgba(0,0,0,0.30)" />,
      actionLabel: 'SYSTEM',
    }
  }

  // Doctor entries — vary by action
  const action = entry.action
  if (action === 'annotate') {
    // Infer annotation type from summary verb
    const s = entry.summary.toLowerCase()
    if (s.startsWith('flagged') || s.includes('flag')) {
      return { borderColor: '#C53D2F', icon: <FlagIcon size={10} color="#C53D2F" />, actionLabel: 'FLAG' }
    }
    if (s.startsWith('context') || s.includes('context added')) {
      return { borderColor: '#3B7DD8', icon: <PaperclipIcon size={10} color="#3B7DD8" />, actionLabel: 'CONTEXT' }
    }
    if (s.startsWith('challenged') || s.includes('challenge')) {
      return { borderColor: '#D4950A', icon: <LightningIcon size={10} color="#D4950A" />, actionLabel: 'CHALLENGE' }
    }
    return { borderColor: '#3B7DD8', icon: <PaperclipIcon size={10} color="#3B7DD8" />, actionLabel: 'NOTE' }
  }
  if (action === 'assess') {
    const rating = entry.assessmentRating
    if (rating === 'up') return { borderColor: '#2A7D4F', icon: <ThumbUpIcon size={10} color="#2A7D4F" />, actionLabel: 'AGREE' }
    if (rating === 'down') return { borderColor: '#C53D2F', icon: <ThumbDownIcon size={10} color="#C53D2F" />, actionLabel: 'DISAGREE' }
    return { borderColor: '#3B7DD8', icon: <PencilIcon size={10} color="#3B7DD8" />, actionLabel: 'ASSESSMENT' }
  }
  if (action === 'pin') {
    return { borderColor: '#1A52A8', icon: <StarFilledIcon size={10} color="#1A52A8" />, actionLabel: 'PINNED' }
  }
  if (action === 'prune') {
    return { borderColor: 'rgba(0,0,0,0.22)', icon: <ScissorsIcon size={10} color="rgba(0,0,0,0.35)" />, actionLabel: 'EXCLUDED' }
  }
  if (action === 'restore') {
    return { borderColor: '#2A7D4F', icon: <RefreshIcon size={10} color="#2A7D4F" />, actionLabel: 'RESTORED' }
  }
  if (action === 'sign_off') {
    return { borderColor: '#2A7D4F', icon: <CheckIcon size={10} color="#2A7D4F" />, actionLabel: 'SIGNED OFF' }
  }

  // Fallback for older entries without action field
  return { borderColor: '#3B7DD8', icon: <PencilIcon size={10} color="#3B7DD8" />, actionLabel: 'DOCTOR' }
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

// ── Entry component ───────────────────────────────────────────────────────────

function AuditEntryRow({
  entry,
  onBranchClick,
  onSwitchToSynthesis,
}: {
  entry: AuditEntry
  onBranchClick: (branchId: string) => void
  onSwitchToSynthesis: () => void
}) {
  const { borderColor, icon, actionLabel } = getEntryStyle(entry)

  return (
    <div style={{
      paddingLeft: 11,
      paddingTop: 8,
      paddingBottom: 8,
      paddingRight: 10,
      borderLeft: `2.5px solid ${borderColor}`,
      background: 'transparent',
      marginBottom: 2,
    }}>
      {/* Top row: icon + timestamp + action label */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
        <span style={{ display: 'inline-flex', flexShrink: 0 }}>{icon}</span>
        <span style={{
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 9.5,
          color: 'rgba(0,0,0,0.35)',
          flexShrink: 0,
        }}>
          {formatTime(entry.timestamp)}
        </span>
        <span style={{
          fontSize: 7.5,
          fontWeight: 700,
          letterSpacing: '0.10em',
          textTransform: 'uppercase' as const,
          color: `${borderColor}CC`,
          flexShrink: 0,
        }}>
          {actionLabel}
        </span>
      </div>

      {/* Summary */}
      <div style={{ fontSize: 11.5, fontWeight: 500, color: '#111', lineHeight: 1.35, marginBottom: entry.detail ? 3 : 0 }}>
        {entry.summary}
      </div>

      {/* Detail */}
      {entry.detail && (
        <div style={{ fontSize: 10.5, color: 'rgba(0,0,0,0.50)', lineHeight: 1.45, marginBottom: entry.hypothesisDiagnosis || entry.branchId ? 4 : 0 }}>
          {entry.detail}
        </div>
      )}

      {/* Branch link */}
      {(entry.hypothesisDiagnosis || entry.branchId) && (
        <div>
          {entry.branchId ? (
            <button
              onClick={() => { onBranchClick(entry.branchId!); onSwitchToSynthesis() }}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontSize: 9.5,
                color: borderColor,
                textDecoration: 'underline',
                textDecorationColor: `${borderColor}55`,
                fontWeight: 500,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.textDecorationColor = borderColor }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.textDecorationColor = `${borderColor}55` }}
            >
              {entry.hypothesisDiagnosis ?? entry.branchId} →
            </button>
          ) : entry.hypothesisDiagnosis ? (
            <span style={{ fontSize: 9.5, color: 'rgba(0,0,0,0.35)', fontStyle: 'italic' }}>
              {entry.hypothesisDiagnosis}
            </span>
          ) : null}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AuditTrailPanel({ auditLog, onBranchClick, onSwitchToSynthesis }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  // Combine mock entries with live entries, sorted chronologically
  const allEntries = [...MOCK_ENTRIES, ...auditLog].sort((a, b) => a.timestamp - b.timestamp)

  // Auto-scroll to bottom when new live entries arrive
  const prevLiveCount = useRef(auditLog.length)
  useEffect(() => {
    if (auditLog.length > prevLiveCount.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevLiveCount.current = auditLog.length
  }, [auditLog.length])

  return (
    <div
      className="flex-1 overflow-y-auto"
      style={{ padding: '12px 16px 20px' }}
    >
      {/* Header */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontSize: 8.5, fontWeight: 700, letterSpacing: '0.12em',
          textTransform: 'uppercase', color: 'rgba(0,0,0,0.45)',
          marginBottom: 3,
        }}>
          Clinical Decision Audit Trail
        </div>
        <div style={{ fontSize: 10.5, color: 'rgba(0,0,0,0.35)' }}>
          Session: 14:18:02 &nbsp;·&nbsp; Mateo R., 8 y/o M &nbsp;·&nbsp; Lateral condyle nonunion — right elbow
        </div>
      </div>

      {/* Thin divider */}
      <div style={{
        height: 1,
        background: 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.07) 20%, rgba(0,0,0,0.07) 80%, transparent 100%)',
        marginBottom: 10,
      }} />

      {/* Entry list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {allEntries.map((entry, i) => (
          <React.Fragment key={entry.id}>
            <AuditEntryRow
              entry={entry}
              onBranchClick={onBranchClick}
              onSwitchToSynthesis={onSwitchToSynthesis}
            />
            {i < allEntries.length - 1 && (
              <div style={{
                height: 1,
                background: 'rgba(0,0,0,0.04)',
                margin: '0 0 0 11px',
              }} />
            )}
          </React.Fragment>
        ))}
      </div>

      <div ref={bottomRef} />

      {/* Back to synthesis */}
      <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <button
          onClick={onSwitchToSynthesis}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid rgba(0,0,0,0.10)',
            background: 'rgba(0,0,0,0.03)',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 600,
            color: 'rgba(0,0,0,0.45)',
            letterSpacing: '0.02em',
            transition: 'background 120ms, color 120ms',
          }}
          onMouseEnter={e => {
            const b = e.currentTarget as HTMLButtonElement
            b.style.background = 'rgba(0,0,0,0.07)'
            b.style.color = 'rgba(0,0,0,0.65)'
          }}
          onMouseLeave={e => {
            const b = e.currentTarget as HTMLButtonElement
            b.style.background = 'rgba(0,0,0,0.03)'
            b.style.color = 'rgba(0,0,0,0.45)'
          }}
        >
          ← Back to Synthesis
        </button>
      </div>
    </div>
  )
}
