/** NodeDetail — compact bottom drawer for mid-chain node detail.
 *  Slides up 280px, compresses the tree viewport. Includes embedded scrubber,
 *  branch context, and navigation. Terminal nodes use BranchConclusionPanel instead.
 */
import React, { useState, useEffect } from 'react'
import { PositionedNode, ViewMode, DoctorAnnotationType, DoctorAnnotation } from '../../types/tree'
import {
  XIcon, CheckIcon, WarningIcon,
  ArrowLeftIcon, ArrowRightIcon,
} from '../shared/Icons'

/** Split long prose into groups of ~2 sentences for visual breathing room.
 *  Uses lookbehind to avoid splitting on abbreviations like "Mateo R., 8 y/o". */
function chunkContent(text: string): string[] {
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z])/).map(s => s.trim()).filter(Boolean)
  if (sentences.length <= 2) return [text]
  const chunks: string[] = []
  for (let i = 0; i < sentences.length; i += 2) {
    chunks.push([sentences[i], sentences[i + 1]].filter(Boolean).join(' '))
  }
  return chunks
}

const TYPE_INFO: Record<string, { accent: string; label: string }> = {
  thought:  { accent: 'var(--node-thought-border)',  label: 'Reasoning'  },
  tool:     { accent: 'var(--node-tool-border)',     label: 'Tool Call'  },
  citation: { accent: 'var(--node-citation-border)', label: 'Citation'   },
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
  onFocusBranch: (branchId: string, startNodeId?: string) => void
  onAddAnnotation: (nodeId: string, type: DoctorAnnotationType, content: string) => void
}

const DRAWER_HEIGHT = 280

export default function NodeDetail({
  node, allNodes, branchNodeIds, selectedNodeIndex, viewMode,
  onClose, onNavigateNext, onNavigatePrev, onFocusBranch,
}: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

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

  // ── Decision-point children ────────────────────────────────────────────────
  const childNodes = isDecision ? allNodes.filter(n => node.children.includes(n.id)) : []

  // ── Source badge — tool calls only (citations show full attribution in body) ─
  const sourceBadge = node.type === 'tool' && node.tool_name
    ? `${node.tool_name}${node.latency_ms ? ` · ${node.latency_ms}ms` : ''}`
    : null

  // ── Parent tool node — for citations that were retrieved by a tool call ────
  const parentToolNode = node.type === 'citation'
    ? allNodes.find(n => n.id === node.parent_id && n.type === 'tool') ?? null
    : null

  // ── Per-branch terminal info for decision paths ────────────────────────────
  function getBranchTerminal(branchId: string) {
    return allNodes.find(n => n.branch_id === branchId && n.isTerminal) ?? null
  }
  function getBranchPathPreview(child: PositionedNode) {
    const terminal = getBranchTerminal(child.branch_id)
    if (!terminal) return null
    return terminal.diagnosis ?? terminal.headline ?? null
  }
  function getPathDotColor(child: PositionedNode) {
    const terminal = getBranchTerminal(child.branch_id)
    if (!terminal) return 'rgba(0,0,0,0.18)'
    if (terminal.shield_severity) return '#B37A0A'
    if (child.isOnPrimaryPath) return '#1A5FB4'
    return 'rgba(0,0,0,0.22)'
  }

  return (
    <div
      style={{
        position: 'relative',
        zIndex: 20,
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

        {/* ── Header: type, step, branch label, source badge, nav arrows, close ── */}
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
            </div>
            {/* Row 2: headline */}
            <div style={{
              fontSize: 22, fontWeight: 600, color: '#111', lineHeight: 1.25,
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

          {/* Source badge — only rendered when there's a real source */}
          {sourceBadge && (
            <span style={{
              fontSize: 9, fontWeight: 500,
              color: 'rgba(0,0,0,0.38)',
              background: 'rgba(0,0,0,0.05)',
              border: '1px solid rgba(0,0,0,0.09)',
              borderRadius: 5,
              padding: '2px 7px',
              whiteSpace: 'nowrap',
              maxWidth: 180,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              flexShrink: 0,
            }}>
              {sourceBadge}
            </span>
          )}

          {/* ← → navigation arrows */}
          <button
            onClick={onNavigatePrev}
            disabled={selectedNodeIndex === 0}
            style={{
              width: 26, height: 26, borderRadius: 7,
              background: selectedNodeIndex > 0 ? 'rgba(26,82,168,0.07)' : 'rgba(0,0,0,0.03)',
              border: selectedNodeIndex > 0 ? '1px solid rgba(26,82,168,0.18)' : '1px solid rgba(0,0,0,0.07)',
              color: selectedNodeIndex > 0 ? '#1A52A8' : 'rgba(0,0,0,0.2)',
              cursor: selectedNodeIndex > 0 ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 120ms ease-out',
            }}
          >
            <ArrowLeftIcon size={11} color={selectedNodeIndex > 0 ? '#1A52A8' : 'rgba(0,0,0,0.2)'} />
          </button>
          <button
            onClick={onNavigateNext}
            disabled={selectedNodeIndex >= branchNodeIds.length - 1}
            style={{
              width: 26, height: 26, borderRadius: 7,
              background: selectedNodeIndex < branchNodeIds.length - 1 ? 'rgba(26,82,168,0.07)' : 'rgba(0,0,0,0.03)',
              border: selectedNodeIndex < branchNodeIds.length - 1 ? '1px solid rgba(26,82,168,0.18)' : '1px solid rgba(0,0,0,0.07)',
              color: selectedNodeIndex < branchNodeIds.length - 1 ? '#1A52A8' : 'rgba(0,0,0,0.2)',
              cursor: selectedNodeIndex < branchNodeIds.length - 1 ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 120ms ease-out',
            }}
          >
            <ArrowRightIcon size={11} color={selectedNodeIndex < branchNodeIds.length - 1 ? '#1A52A8' : 'rgba(0,0,0,0.2)'} />
          </button>
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

        {/* ── Decision point: paths-first hero layout ── */}
        {isDecision && childNodes.length > 0 ? (
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>

            {/* Decision paths — the hero, always visible */}
            <div style={{
              padding: '10px 14px 8px',
              flexShrink: 0,
            }}>
              <div style={{
                fontSize: 8, fontWeight: 700, letterSpacing: '0.12em',
                textTransform: 'uppercase', color: '#9a6800', marginBottom: 8,
              }}>
                {childNodes.length} directions from this decision
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', gap: 8, overflowX: 'auto' }}>
                {childNodes.map((child, idx) => {
                  const preview = getBranchPathPreview(child)
                  const isPrimary = child.isOnPrimaryPath
                  const cardAccent = isPrimary ? '#1A5FB4' : `hsl(${(idx * 47 + 210) % 360}, 35%, 42%)`
                  return (
                    <button
                      key={child.id}
                      onClick={() => onFocusBranch(child.branch_id, child.id)}
                      style={{
                        display: 'flex', flexDirection: 'column', gap: 4,
                        minWidth: 160, flex: '1 1 0',
                        padding: '9px 12px',
                        background: isPrimary ? 'rgba(26,95,180,0.05)' : 'rgba(0,0,0,0.025)',
                        border: `1px solid ${isPrimary ? 'rgba(26,95,180,0.2)' : 'rgba(0,0,0,0.1)'}`,
                        borderLeft: `3px solid ${cardAccent}`,
                        borderRadius: 8,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 120ms ease-out, border-color 120ms ease-out',
                      }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = isPrimary ? 'rgba(26,95,180,0.09)' : 'rgba(0,0,0,0.05)'
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = isPrimary ? 'rgba(26,95,180,0.05)' : 'rgba(0,0,0,0.025)'
                      }}
                    >
                      {isPrimary && (
                        <span style={{
                          fontSize: 7.5, fontWeight: 700, letterSpacing: '0.10em',
                          textTransform: 'uppercase', color: '#1A5FB4',
                          marginBottom: 1,
                        }}>
                          Primary
                        </span>
                      )}
                      <div style={{
                        fontSize: 13, fontWeight: 600,
                        color: isPrimary ? '#1A3A6B' : 'rgba(0,0,0,0.72)',
                        lineHeight: 1.35,
                      }}>
                        {child.headline}
                      </div>
                      {preview && (
                        <div style={{
                          fontSize: 11, color: 'rgba(0,0,0,0.38)',
                          lineHeight: 1.4, marginTop: 2,
                          overflow: 'hidden', display: '-webkit-box',
                          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        }}>
                          {preview}
                        </div>
                      )}
                      <div style={{
                        marginTop: 'auto', paddingTop: 6,
                        fontSize: 10, fontWeight: 600,
                        color: cardAccent,
                        display: 'flex', alignItems: 'center', gap: 3,
                      }}>
                        Explore →
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(179,122,10,0.12)', flexShrink: 0, margin: '0 14px' }} />

            {/* Reasoning prose — secondary, scrollable */}
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, padding: '8px 14px' }}>
              {chunkContent(node.content).map((chunk, i) => (
                <p key={i} style={{
                  fontSize: 13, lineHeight: 1.6, color: 'rgba(0,0,0,0.5)',
                  margin: 0, marginTop: i > 0 ? 8 : 0,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}>
                  {chunk}
                </p>
              ))}
            </div>
          </div>

        ) : (
        /* ── Non-decision body ── */
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '9px 16px', gap: 8, minHeight: 0 }}>

          {/* Scrollable content area */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>

            {/* Patient context — assessment nodes only */}
            {isAssessment && (node.patient_context_summary || node.patient_vitals_summary) && (
              <div style={{
                padding: '7px 11px',
                background: 'rgba(26,95,180,0.05)',
                borderRadius: 6, border: '1px solid rgba(26,95,180,0.12)',
              }}>
                {node.patient_context_summary && (
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'rgba(0,0,0,0.75)', marginBottom: 2 }}>
                    {node.patient_context_summary}
                  </div>
                )}
                {node.patient_vitals_summary && (
                  <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>
                    {node.patient_vitals_summary}
                  </div>
                )}
              </div>
            )}

            {/* Tool name banner — always shown for tool nodes */}
            {node.type === 'tool' && node.tool_name && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px',
                background: 'rgba(45,138,86,0.07)',
                border: '1px solid rgba(45,138,86,0.18)',
                borderLeft: '3px solid rgba(45,138,86,0.55)',
                borderRadius: 7,
              }}>
                <span style={{
                  fontSize: 15, fontWeight: 700, color: '#2D8A56',
                  fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                  letterSpacing: '-0.01em',
                }}>
                  {node.tool_name}
                </span>
                {node.latency_ms && (
                  <span style={{
                    fontSize: 11, fontWeight: 500,
                    color: 'rgba(45,138,86,0.6)',
                  }}>
                    {node.latency_ms}ms
                  </span>
                )}
              </div>
            )}

            {/* Main content */}
            {node.type === 'citation' ? (
              <div style={{
                borderLeft: '3px solid rgba(123,94,167,0.45)',
                paddingLeft: 12,
              }}>
                {/* Retrieved via tool call */}
                {parentToolNode && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    marginBottom: 10,
                    padding: '5px 10px',
                    background: 'rgba(45,138,86,0.06)',
                    border: '1px solid rgba(45,138,86,0.15)',
                    borderRadius: 6,
                  }}>
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(45,138,86,0.7)' }}>
                      Retrieved via
                    </span>
                    <span style={{
                      fontSize: 12, fontWeight: 700, color: '#2D8A56',
                      fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                    }}>
                      {parentToolNode.tool_name ?? parentToolNode.headline}
                    </span>
                    {parentToolNode.latency_ms && (
                      <span style={{ fontSize: 11, color: 'rgba(45,138,86,0.55)', marginLeft: 'auto' }}>
                        {parentToolNode.latency_ms}ms
                      </span>
                    )}
                  </div>
                )}

                {/* Source attribution block */}
                {(node.source || node.source_author || node.source_chapter) && (
                  <div style={{
                    marginBottom: 10,
                    paddingBottom: 9,
                    borderBottom: '1px solid rgba(123,94,167,0.15)',
                  }}>
                    {node.source && (
                      <div style={{
                        fontSize: 12.5, fontWeight: 700, color: '#7B5EA7',
                        fontStyle: 'italic', lineHeight: 1.35, marginBottom: 3,
                      }}>
                        {node.source}
                      </div>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 14px' }}>
                      {node.source_author && (
                        <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', lineHeight: 1.5 }}>
                          {node.source_author}
                        </span>
                      )}
                      {node.source_chapter && (
                        <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)', lineHeight: 1.5 }}>
                          {node.source_chapter}
                        </span>
                      )}
                      {node.source_pages && (
                        <span style={{ fontSize: 11, color: 'rgba(123,94,167,0.65)', lineHeight: 1.5, fontWeight: 500 }}>
                          {node.source_pages}
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {chunkContent(node.content).map((chunk, i) => (
                  <p key={i} style={{
                    fontSize: 14, lineHeight: 1.7, color: 'rgba(0,0,0,0.72)',
                    margin: 0, marginTop: i > 0 ? 10 : 0, fontStyle: 'italic',
                    fontFamily: 'Georgia, "Times New Roman", serif',
                  }}>
                    {chunk}
                  </p>
                ))}
              </div>
            ) : (
              <div>
                {chunkContent(node.content).map((chunk, i) => (
                  <p key={i} style={{
                    fontSize: 14, lineHeight: 1.65, color: 'rgba(0,0,0,0.7)',
                    margin: 0, marginTop: i > 0 ? 10 : 0,
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                  }}>
                    {chunk}
                  </p>
                ))}
              </div>
            )}

            {/* Tool result — suppressed when a citation child already carries the result */}
            {node.result_summary && !(node.type === 'tool' && allNodes.some(n => n.parent_id === node.id && n.type === 'citation')) && (
              <div style={{
                padding: '9px 12px',
                borderRadius: 6,
                background: 'rgba(45,138,86,0.06)',
                border: '1px solid rgba(45,138,86,0.16)',
                borderLeft: '3px solid rgba(45,138,86,0.40)',
              }}>
                <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: '#2D8A56', marginBottom: 4 }}>
                  Result
                </div>
                <p style={{ fontSize: 13.5, lineHeight: 1.6, color: 'rgba(0,0,0,0.68)', margin: 0 }}>
                  {node.result_summary}
                </p>
              </div>
            )}


            {/* Shield — inline, compact */}
            {node.shield_checked && node.shield_severity && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 10px', borderRadius: 6,
                background: 'rgba(185,50,38,0.04)',
                border: '1px solid rgba(185,50,38,0.14)',
              }}>
                <WarningIcon size={11} color="#b83226" />
                <span style={{ fontSize: 10.5, fontWeight: 600, color: '#b83226' }}>
                  {node.shield_severity}
                </span>
                {node.prune_reason && (
                  <span style={{ fontSize: 10.5, color: 'rgba(0,0,0,0.45)' }}>— {node.prune_reason}</span>
                )}
              </div>
            )}
            {node.shield_checked && !node.shield_severity && viewMode === 'architecture' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <CheckIcon size={11} color="#2D8A56" />
                <span style={{ fontSize: 10.5, color: '#2D8A56' }}>Shield checked — no issues</span>
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  )
}
