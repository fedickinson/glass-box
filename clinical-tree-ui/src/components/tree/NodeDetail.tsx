/** NodeDetail — compact bottom drawer for mid-chain node detail.
 *  Slides up 280px, compresses the tree viewport. Includes embedded scrubber,
 *  branch context, and action buttons. Terminal nodes use BranchConclusionPanel instead.
 */
import React, { useState, useEffect, useRef } from 'react'
import { PositionedNode, ViewMode, DoctorAnnotationType, DoctorAnnotation } from '../../types/tree'
import {
  XIcon, FlagIcon, PaperclipIcon, LightningIcon, RefreshIcon,
  ScissorsIcon, ArrowLeftIcon, ArrowRightIcon, CheckIcon, WarningIcon,
} from '../shared/Icons'

const TYPE_INFO: Record<string, { accent: string; label: string }> = {
  thought:  { accent: 'var(--node-thought-border)',  label: 'Reasoning'  },
  tool:     { accent: 'var(--node-tool-border)',     label: 'Tool Call'  },
  citation: { accent: 'var(--node-citation-border)', label: 'Citation'   },
}

const DOT_TYPE_COLOR: Record<string, string> = {
  thought: '#3B7DD8',
  tool: '#2D8A56',
  citation: '#7B5EA7',
}

interface Props {
  node: PositionedNode
  allNodes: PositionedNode[]
  branchNodeIds: string[]
  selectedNodeIndex: number
  viewMode: ViewMode
  annotations: DoctorAnnotation[]
  onClose: () => void
  onNavigateNext: () => void
  onNavigatePrev: () => void
  onScrub: (index: number) => void
  onFocusBranch: (branchId: string) => void
  onAddAnnotation: (nodeId: string, type: DoctorAnnotationType, content: string) => void
  onPruneBranch: (branchId: string) => void
}

type ActiveAction = 'flag' | 'context' | 'challenge' | null

const DRAWER_HEIGHT = 280

export default function NodeDetail({
  node, allNodes, branchNodeIds, selectedNodeIndex, viewMode, annotations,
  onClose, onNavigateNext, onNavigatePrev, onScrub, onFocusBranch,
  onAddAnnotation, onPruneBranch,
}: Props) {
  const [visible, setVisible] = useState(false)
  const [activeAction, setActiveAction] = useState<ActiveAction>(null)
  const [actionInput, setActionInput] = useState('')
  const [rerunActive, setRerunActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrubTrackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    setActiveAction(null)
    setActionInput('')
    setRerunActive(false)
  }, [node.id])

  useEffect(() => {
    if (activeAction && inputRef.current) inputRef.current.focus()
  }, [activeAction])

  // ── Node type / accent ─────────────────────────────────────────────────────
  const isAssessment = node.is_reasoning_start ?? false
  const isCompliance = node.is_compliance_check ?? false
  const isDecision   = node.is_decision_point

  const accent = isAssessment ? '#1A5FB4'
    : isCompliance
      ? (node.compliance_result === 'pass'    ? '#2D8A56'
       : node.compliance_result === 'warning' ? '#B37A0A'
       : node.compliance_result === 'fail'    ? '#C53D2F'
       : '#6B7280')
    : isDecision ? 'var(--node-decision-border)'
    : (TYPE_INFO[node.type] ?? TYPE_INFO.thought).accent

  const typeLabel = isAssessment ? 'Initial Assessment'
    : isCompliance ? `Safety Check — ${node.compliance_result ?? ''}`
    : isDecision   ? 'Decision Point'
    : (TYPE_INFO[node.type] ?? TYPE_INFO.thought).label

  // ── Branch context ─────────────────────────────────────────────────────────
  const terminalNode = allNodes.find(n => n.branch_id === node.branch_id && n.isTerminal)
  const branchOutcome = terminalNode?.diagnosis ?? null
  const branchLabel   = node.branch_id === 'primary' ? 'Primary path' : node.branch_id

  // ── Prev / next nodes along branch ────────────────────────────────────────
  const prevNode = selectedNodeIndex > 0
    ? allNodes.find(n => n.id === branchNodeIds[selectedNodeIndex - 1]) ?? null
    : null
  const nextNode = selectedNodeIndex < branchNodeIds.length - 1
    ? allNodes.find(n => n.id === branchNodeIds[selectedNodeIndex + 1]) ?? null
    : null

  // ── Decision-point children ────────────────────────────────────────────────
  const childNodes = isDecision ? allNodes.filter(n => node.children.includes(n.id)) : []

  // ── Node annotations ───────────────────────────────────────────────────────
  const nodeAnnotations = annotations.filter(a => a.nodeId === node.id)

  // ── Scrubber interaction ───────────────────────────────────────────────────
  function indexFromPointer(e: React.PointerEvent | PointerEvent): number {
    const track = scrubTrackRef.current
    if (!track || branchNodeIds.length <= 1) return selectedNodeIndex
    const rect = track.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    return Math.round(ratio * (branchNodeIds.length - 1))
  }

  function handleScrubPointerDown(e: React.PointerEvent) {
    e.preventDefault()
    onScrub(indexFromPointer(e))
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handleScrubPointerMove(e: React.PointerEvent) {
    if (e.buttons > 0) onScrub(indexFromPointer(e))
  }

  function handleActionSubmit() {
    if (!actionInput.trim() || !activeAction) return
    onAddAnnotation(node.id, activeAction, actionInput.trim())
    setActiveAction(null)
    setActionInput('')
  }

  function handleRerun() {
    setRerunActive(true)
    setTimeout(() => setRerunActive(false), 3000)
  }

  // ── Source display ─────────────────────────────────────────────────────────
  const sourceText = node.type === 'tool' && node.tool_name
    ? `${node.tool_name}${node.latency_ms ? ` · ${node.latency_ms}ms` : ''}`
    : node.source ?? null

  return (
    <div
      style={{
        height: visible ? DRAWER_HEIGHT : 0,
        transition: 'height 300ms ease-out',
        overflow: 'hidden',
        flexShrink: 0,
        background: 'rgba(252,253,255,0.98)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: `2px solid ${accent}`,
      }}
      onClick={e => e.stopPropagation()}
    >
      <div style={{ height: DRAWER_HEIGHT, display: 'flex', flexDirection: 'column' }}>

        {/* ── Header: type, step, branch label, outcome, close ── */}
        <div style={{
          padding: '8px 14px 7px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Row 1: type badge + step */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1 }}>
              <span style={{
                fontSize: 8, fontWeight: 700, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: accent,
              }}>
                {typeLabel}
              </span>
              <span style={{ fontSize: 8.5, color: 'rgba(0,0,0,0.28)', letterSpacing: '0.02em' }}>
                Step {selectedNodeIndex + 1} of {branchNodeIds.length}
              </span>
              {nodeAnnotations.length > 0 && (
                <span style={{
                  fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                  background: 'rgba(185,50,38,0.08)', color: '#b83226',
                  border: '1px solid rgba(185,50,38,0.18)',
                }}>
                  {nodeAnnotations.length} note{nodeAnnotations.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {/* Row 2: headline */}
            <div style={{
              fontSize: 13, fontWeight: 600, color: '#111', lineHeight: 1.25,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {node.headline}
            </div>
            {/* Row 3: branch + outcome */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <span style={{ fontSize: 8.5, color: 'rgba(0,0,0,0.35)' }}>{branchLabel}</span>
              {branchOutcome && (
                <>
                  <span style={{ fontSize: 8.5, color: 'rgba(0,0,0,0.2)' }}>→</span>
                  <span style={{ fontSize: 8.5, fontWeight: 600, color: 'rgba(0,0,0,0.45)' }}>
                    {branchOutcome}
                  </span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 22, height: 22, borderRadius: '50%',
              background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <XIcon size={12} color="rgba(0,0,0,0.38)" />
          </button>
        </div>

        {/* ── Mini scrubber ── */}
        <div
          ref={scrubTrackRef}
          onPointerDown={handleScrubPointerDown}
          onPointerMove={handleScrubPointerMove}
          style={{
            padding: '0 14px',
            height: 24,
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
            cursor: 'pointer',
            flexShrink: 0,
            borderBottom: '1px solid rgba(0,0,0,0.05)',
            userSelect: 'none',
          }}
        >
          {/* Track line */}
          <div style={{
            position: 'absolute', left: 14, right: 14, top: '50%',
            height: 1.5, background: 'rgba(0,0,0,0.08)',
            transform: 'translateY(-50%)', borderRadius: 1,
          }} />
          {/* Progress fill */}
          <div style={{
            position: 'absolute', left: 14,
            width: branchNodeIds.length > 1
              ? `calc(${(selectedNodeIndex / (branchNodeIds.length - 1)) * 100}% - ${(selectedNodeIndex / (branchNodeIds.length - 1)) * 28}px + ${selectedNodeIndex > 0 ? 0 : 0}px)`
              : '0%',
            top: '50%', height: 1.5,
            background: `${accent}66`,
            transform: 'translateY(-50%)', borderRadius: 1,
            transition: 'width 150ms ease-out',
          }} />
          {/* Dots */}
          {branchNodeIds.map((id, i) => {
            const n = allNodes.find(nd => nd.id === id)
            const isSelected = i === selectedNodeIndex
            const dotColor = n?.is_decision_point ? '#D4950A'
              : DOT_TYPE_COLOR[n?.type ?? 'thought'] ?? '#888'
            const left = branchNodeIds.length > 1
              ? `${(i / (branchNodeIds.length - 1)) * 100}%`
              : '50%'
            return (
              <div
                key={id}
                onClick={e => { e.stopPropagation(); onScrub(i) }}
                style={{
                  position: 'absolute',
                  left,
                  transform: 'translateX(-50%)',
                  width:  isSelected ? 10 : 6,
                  height: isSelected ? 10 : 6,
                  borderRadius: '50%',
                  background: isSelected ? dotColor : `${dotColor}88`,
                  border: isSelected ? `2px solid ${dotColor}` : `1.5px solid rgba(255,255,255,0.8)`,
                  boxShadow: isSelected ? `0 0 0 2px ${dotColor}30` : 'none',
                  transition: 'all 150ms ease-out',
                  zIndex: isSelected ? 2 : 1,
                }}
                title={n?.headline ?? id}
              />
            )
          })}
        </div>

        {/* ── Two-column body ── */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', minHeight: 0 }}>

          {/* LEFT — 58%: content + reasoning context + decision branches */}
          <div style={{
            width: '58%',
            borderRight: '1px solid rgba(0,0,0,0.05)',
            overflow: 'hidden',
            padding: '9px 13px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            {/* Content — scrollable within its own flex item */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {/* Patient context — assessment nodes only */}
              {isAssessment && (node.patient_context_summary || node.patient_vitals_summary) && (
                <div style={{
                  padding: '6px 9px', marginBottom: 7,
                  background: 'rgba(26,95,180,0.05)',
                  borderRadius: 6, border: '1px solid rgba(26,95,180,0.12)',
                }}>
                  {node.patient_context_summary && (
                    <div style={{ fontSize: 11.5, fontWeight: 500, color: 'rgba(0,0,0,0.75)', marginBottom: 1 }}>
                      {node.patient_context_summary}
                    </div>
                  )}
                  {node.patient_vitals_summary && (
                    <div style={{ fontSize: 10.5, color: 'rgba(0,0,0,0.45)' }}>
                      {node.patient_vitals_summary}
                    </div>
                  )}
                </div>
              )}
              <p style={{
                fontSize: 12, lineHeight: 1.6, color: 'rgba(0,0,0,0.7)',
                margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif',
              }}>
                {node.content}
              </p>
              {viewMode === 'architecture' && (node.tool_name || node.latency_ms) && (
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                  {node.tool_name && (
                    <span style={{
                      fontSize: 9.5, fontWeight: 600, padding: '2px 7px',
                      background: 'rgba(45,138,86,0.08)', color: '#2D8A56',
                      border: '1px solid rgba(45,138,86,0.18)', borderRadius: 5,
                    }}>
                      {node.tool_name}
                    </span>
                  )}
                  {node.latency_ms && (
                    <span style={{
                      fontSize: 9.5, fontWeight: 600, padding: '2px 7px',
                      background: 'rgba(0,0,0,0.04)', color: 'rgba(0,0,0,0.45)',
                      border: '1px solid rgba(0,0,0,0.08)', borderRadius: 5,
                    }}>
                      {node.latency_ms}ms
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Reasoning context — prev / next (fixed at bottom of left col) */}
            <div style={{
              flexShrink: 0,
              padding: '7px 10px',
              background: 'rgba(0,0,0,0.02)',
              borderRadius: 6,
              border: '1px solid rgba(0,0,0,0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}>
              {prevNode ? (
                <button
                  onClick={onNavigatePrev}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0,
                  }}
                >
                  <ArrowLeftIcon size={11} color="rgba(0,0,0,0.32)" />
                  <span style={{ fontSize: 11, color: '#1A52A8', lineHeight: 1.35 }}>
                    {prevNode.headline}
                  </span>
                </button>
              ) : (
                <span style={{ fontSize: 10.5, color: 'rgba(0,0,0,0.22)', fontStyle: 'italic' }}>
                  Start of branch
                </span>
              )}
              {nextNode ? (
                <button
                  onClick={onNavigateNext}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0,
                  }}
                >
                  <ArrowRightIcon size={11} color="rgba(0,0,0,0.32)" />
                  <span style={{ fontSize: 11, color: '#1A52A8', lineHeight: 1.35 }}>
                    {nextNode.headline}
                  </span>
                </button>
              ) : (
                <span style={{ fontSize: 10.5, color: 'rgba(0,0,0,0.22)', fontStyle: 'italic' }}>
                  {branchOutcome ? `Diagnosis: ${branchOutcome}` : 'Terminal diagnosis'}
                </span>
              )}
            </div>

            {/* Decision-point branches */}
            {isDecision && childNodes.length > 0 && (
              <div style={{
                flexShrink: 0,
                padding: '6px 10px',
                background: 'rgba(179,122,10,0.04)',
                borderRadius: 6,
                border: '1px solid rgba(179,122,10,0.14)',
                borderLeft: '2px solid rgba(179,122,10,0.4)',
              }}>
                <div style={{
                  fontSize: 7.5, fontWeight: 700, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: '#9a6800', marginBottom: 5,
                }}>
                  {childNodes.length} paths from this decision
                </div>
                {childNodes.map(child => (
                  <button
                    key={child.id}
                    onClick={() => onFocusBranch(child.branch_id)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 5,
                      background: 'none', border: 'none', cursor: 'pointer',
                      textAlign: 'left', padding: '2px 0',
                    }}
                  >
                    <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.3)', marginTop: 1 }}>→</span>
                    <span style={{ fontSize: 11, color: '#1A52A8', lineHeight: 1.3 }}>
                      {child.headline}
                      {child.isOnPrimaryPath && (
                        <span style={{
                          marginLeft: 5, fontSize: 7.5, fontWeight: 700,
                          letterSpacing: '0.06em', textTransform: 'uppercase', color: '#1A5FB4',
                        }}>
                          Primary
                        </span>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT — 42%: source, shield, actions */}
          <div style={{
            width: '42%',
            overflow: 'hidden',
            padding: '9px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}>
            {/* Source + shield — compact combined section */}
            <div style={{
              padding: '7px 10px',
              background: 'rgba(0,0,0,0.02)',
              borderRadius: 6,
              border: '1px solid rgba(0,0,0,0.07)',
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
            }}>
              {/* Source line */}
              <div>
                <span style={{
                  fontSize: 7.5, fontWeight: 700, letterSpacing: '0.1em',
                  textTransform: 'uppercase', color: 'rgba(0,0,0,0.28)', marginRight: 5,
                }}>
                  Source
                </span>
                <span style={{
                  fontSize: 11, color: sourceText ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.3)',
                  fontStyle: !sourceText ? 'italic' : 'normal',
                }}>
                  {sourceText ?? 'Model reasoning'}
                </span>
              </div>
              {/* Shield line */}
              {node.shield_checked && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{
                    fontSize: 7.5, fontWeight: 700, letterSpacing: '0.1em',
                    textTransform: 'uppercase', color: 'rgba(0,0,0,0.28)',
                  }}>
                    Shield
                  </span>
                  {node.shield_severity ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: '#b83226' }}>
                      <WarningIcon size={11} color="#b83226" />
                      {node.shield_severity}
                      {node.prune_reason && (
                        <span style={{ fontWeight: 400, color: 'rgba(0,0,0,0.5)' }}>
                          — {node.prune_reason}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#2D8A56' }}>
                      <CheckIcon size={11} color="#2D8A56" /> Checked — no issues
                    </span>
                  )}
                </div>
              )}
              {/* Existing annotations summary */}
              {nodeAnnotations.length > 0 && (
                <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 5, marginTop: 1 }}>
                  {nodeAnnotations.map(ann => (
                    <div key={ann.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 4, fontSize: 10.5, color: 'rgba(0,0,0,0.55)', lineHeight: 1.4, marginBottom: 2 }}>
                      {ann.type === 'flag'      && <FlagIcon      size={10} color="#b83226" />}
                      {ann.type === 'context'   && <PaperclipIcon size={10} color="#1A52A8" />}
                      {ann.type === 'challenge' && <LightningIcon size={10} color="#8a6000" />}
                      {ann.content}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{
              padding: '7px 10px',
              background: 'rgba(0,0,0,0.02)',
              borderRadius: 6,
              border: '1px solid rgba(0,0,0,0.07)',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}>
              <span style={{
                fontSize: 7.5, fontWeight: 700, letterSpacing: '0.1em',
                textTransform: 'uppercase', color: 'rgba(0,0,0,0.28)',
              }}>
                Actions
              </span>

              {/* Annotation action buttons — icon chips in a row */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {([
                  { id: 'flag'      as const, Icon: FlagIcon,       label: 'Flag',      color: '#b83226', bg: 'rgba(185,50,38,0.08)',  border: 'rgba(185,50,38,0.22)'  },
                  { id: 'context'   as const, Icon: PaperclipIcon,  label: 'Context',   color: '#1A52A8', bg: 'rgba(26,82,168,0.08)', border: 'rgba(26,82,168,0.22)'  },
                  { id: 'challenge' as const, Icon: LightningIcon,  label: 'Challenge', color: '#8a6000', bg: 'rgba(138,96,0,0.08)',  border: 'rgba(138,96,0,0.22)'   },
                ]).map(action => (
                  <button
                    key={action.id}
                    onClick={() => {
                      setActiveAction(activeAction === action.id ? null : action.id)
                      setActionInput('')
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '4px 9px', borderRadius: 20,
                      background: activeAction === action.id ? action.bg : 'rgba(0,0,0,0.04)',
                      border: activeAction === action.id
                        ? `1px solid ${action.border}`
                        : '1px solid rgba(0,0,0,0.1)',
                      cursor: 'pointer', transition: 'all 120ms ease-out',
                    }}
                  >
                    <action.Icon size={11} color={activeAction === action.id ? action.color : 'rgba(0,0,0,0.42)'} />
                    <span style={{
                      fontSize: 10, fontWeight: 600,
                      color: activeAction === action.id ? action.color : 'rgba(0,0,0,0.5)',
                    }}>
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Inline input for annotation */}
              {activeAction && (() => {
                const cfg = {
                  flag:      { color: '#b83226', border: 'rgba(185,50,38,0.3)',  ph: "What's the concern?"         },
                  context:   { color: '#1A52A8', border: 'rgba(26,82,168,0.3)',  ph: 'Additional information…'     },
                  challenge: { color: '#8a6000', border: 'rgba(138,96,0,0.3)',   ph: 'What do you disagree with?'  },
                }[activeAction]
                return (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <input
                      ref={inputRef}
                      value={actionInput}
                      onChange={e => setActionInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleActionSubmit()
                        if (e.key === 'Escape') { setActiveAction(null); setActionInput('') }
                      }}
                      placeholder={cfg.ph}
                      style={{
                        flex: 1, fontSize: 11, padding: '5px 8px',
                        border: `1px solid ${cfg.border}`,
                        borderRadius: 6, outline: 'none',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        background: 'rgba(255,255,255,0.9)',
                      }}
                    />
                    <button
                      onClick={handleActionSubmit}
                      style={{
                        fontSize: 10, fontWeight: 700, padding: '5px 9px',
                        borderRadius: 6, border: `1px solid ${cfg.border}`,
                        background: 'rgba(0,0,0,0.04)', color: cfg.color, cursor: 'pointer',
                      }}
                    >
                      Save
                    </button>
                  </div>
                )
              })()}

              {/* Secondary actions — compact row */}
              <div style={{ display: 'flex', gap: 4, marginTop: 'auto' }}>
                <button
                  onClick={handleRerun}
                  disabled={rerunActive}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    padding: '5px 8px', borderRadius: 6,
                    background: rerunActive ? 'rgba(59,125,216,0.07)' : 'rgba(0,0,0,0.04)',
                    border: rerunActive ? '1px solid rgba(59,125,216,0.2)' : '1px solid rgba(0,0,0,0.1)',
                    cursor: rerunActive ? 'default' : 'pointer',
                    transition: 'all 120ms ease-out',
                  }}
                >
                  <RefreshIcon size={11} color={rerunActive ? '#1A52A8' : 'rgba(0,0,0,0.42)'} />
                  <span style={{ fontSize: 10, fontWeight: 500, color: rerunActive ? '#1A52A8' : 'rgba(0,0,0,0.5)' }}>
                    {rerunActive ? 'Regenerating…' : 'Rerun'}
                  </span>
                </button>

                <button
                  onClick={() => onPruneBranch(node.branch_id)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    padding: '5px 8px', borderRadius: 6,
                    background: 'rgba(0,0,0,0.04)',
                    border: '1px solid rgba(0,0,0,0.1)',
                    cursor: 'pointer', transition: 'all 120ms ease-out',
                  }}
                >
                  <ScissorsIcon size={11} color="rgba(0,0,0,0.42)" />
                  <span style={{ fontSize: 10, fontWeight: 500, color: 'rgba(0,0,0,0.5)' }}>Prune</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
