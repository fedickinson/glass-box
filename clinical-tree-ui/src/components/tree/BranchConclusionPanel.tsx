/** BranchConclusionPanel — bottom drawer for terminal nodes.
 *  Same slide-up pattern as NodeDetail. Shows branch conclusion, evidence, safety, actions.
 *  Distinct from NodeDetail (mid-chain) — focuses on the diagnosis outcome.
 */
import React, { useState, useEffect } from 'react'
import {
  PositionedNode, Convergence, BranchSummary, RejectedPath, SafetySummary,
} from '../../types/tree'
import { TerminalVariant } from './TerminalCard'
import {
  XIcon, CheckIcon, CrossIcon, WarningIcon, ConvergeIcon, ArrowRightIcon, DotFilledIcon,
} from '../shared/Icons'

interface Props {
  terminalNode: PositionedNode
  variant: TerminalVariant
  branchSummary: BranchSummary | null
  convergences: Convergence[]
  rejectedPath: RejectedPath | null
  safetySummary: SafetySummary
  onClose: () => void
  onRestoreBranch: (branchId: string) => void
  onEvidenceNodeClick: (nodeId: string) => void
  onAuditHypothesis: (diagnosis: string, branchIds: string[]) => void
}

const VARIANT_CFG = {
  converging: {
    accent: '#2D8A56',
    tagBg: 'rgba(45,138,86,0.08)', tagBorder: 'rgba(45,138,86,0.22)', tagColor: '#2D8A56',
    tagLabel: 'CONVERGING',
  },
  divergent: {
    accent: '#64748B',
    tagBg: 'rgba(100,116,139,0.08)', tagBorder: 'rgba(100,116,139,0.20)', tagColor: '#64748B',
    tagLabel: 'DIVERGENT',
  },
  supported: {
    accent: '#3B7DD8',
    tagBg: 'rgba(59,125,216,0.08)', tagBorder: 'rgba(59,125,216,0.22)', tagColor: '#3B7DD8',
    tagLabel: 'SUPPORTED',
  },
  flagged: {
    accent: '#C45A10',
    tagBg: 'rgba(196,90,16,0.08)', tagBorder: 'rgba(196,90,16,0.22)', tagColor: '#C45A10',
    tagLabel: 'FLAGGED',
  },
  not_supported: {
    accent: '#94A3B8',
    tagBg: 'rgba(148,163,184,0.08)', tagBorder: 'rgba(148,163,184,0.20)', tagColor: '#94A3B8',
    tagLabel: 'NOT SUPPORTED',
  },
  shield_killed: {
    accent: '#C53D2F',
    tagBg: 'rgba(197,61,47,0.08)', tagBorder: 'rgba(197,61,47,0.22)', tagColor: '#C53D2F',
    tagLabel: 'SHIELD TERMINATED',
  },
  doctor_pruned: {
    accent: '#64748B',
    tagBg: 'rgba(100,116,139,0.07)', tagBorder: 'rgba(100,116,139,0.18)', tagColor: '#64748B',
    tagLabel: 'CLINICIAN PRUNED',
  },
}

const DRAWER_HEIGHT = 260

export default function BranchConclusionPanel({
  terminalNode, variant, branchSummary, convergences, rejectedPath, safetySummary,
  onClose, onRestoreBranch, onEvidenceNodeClick, onAuditHypothesis,
}: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const cfg = VARIANT_CFG[variant]
  const branchId  = terminalNode.branch_id
  const diagnosis = terminalNode.diagnosis ?? 'Unknown diagnosis'
  const pathLabel = terminalNode.path_label ?? branchId

  const isShieldKilled = variant === 'shield_killed'
  const isDoctorPruned = variant === 'doctor_pruned'
  const isPruned       = isShieldKilled || isDoctorPruned

  const violation    = safetySummary.violations.find(v => v.branchId === branchId)
  const guidelineRef = violation?.guidelineRef ?? null

  const sameGroup        = convergences.find(c => c.terminalNodeIds.includes(terminalNode.id))
  const otherTerminalIds = sameGroup ? sameGroup.terminalNodeIds.filter(id => id !== terminalNode.id) : []

  const nodeChecks       = terminalNode.terminal_safety_checks ?? []
  const branchPassChecks = safetySummary.passedChecks.slice(0, 3)
  const keyEvidence      = branchSummary?.nodeSummaries.filter(s => s.isKeyStep).slice(0, 4) ?? []

  const hasSafetyFlag    = nodeChecks.some(c => c.status === 'flag')
  const isContradicted   = !!terminalNode.terminal_contradiction
  const isConverging     = otherTerminalIds.length > 0

  const actionIsGate = hasSafetyFlag

  return (
    <div
      onClick={e => e.stopPropagation()}
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
        borderTop: `2px solid ${cfg.accent}`,
      }}
    >
      <div style={{ height: DRAWER_HEIGHT, display: 'flex', flexDirection: 'column' }}>

        {/* ── Header — compact single row ── */}
        <div style={{
          padding: '7px 14px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: 7.5, fontWeight: 800, letterSpacing: '0.12em',
            padding: '2px 6px', borderRadius: 4, flexShrink: 0,
            background: cfg.tagBg, border: `1px solid ${cfg.tagBorder}`, color: cfg.tagColor,
          }}>
            {cfg.tagLabel}
          </span>
          <div style={{
            fontSize: 15, fontWeight: 700, lineHeight: 1.2, flex: 1, minWidth: 0,
            color: isPruned ? 'rgba(0,0,0,0.38)' : '#0f172a',
            textDecoration: isPruned ? 'line-through' : 'none',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {diagnosis}
          </div>
          {otherTerminalIds.length > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: '#2D8A56', fontWeight: 500, flexShrink: 0 }}>
              <ConvergeIcon size={10} color="#2D8A56" />
              {otherTerminalIds.length === 1 ? '+1 path' : `+${otherTerminalIds.length} paths`}
            </span>
          )}
          <span style={{ fontSize: 10, color: 'rgba(0,0,0,0.32)', flexShrink: 0 }}>{pathLabel}</span>
          <button
            onClick={onClose}
            style={{
              width: 20, height: 20, borderRadius: '50%',
              background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <XIcon size={11} color="rgba(0,0,0,0.38)" />
          </button>
        </div>

        {/* ── Two-column body ── */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', minHeight: 0 }}>

          {/* LEFT — narrative + key evidence */}
          <div style={{
            width: '54%',
            borderRight: '1px solid rgba(0,0,0,0.05)',
            overflowY: 'auto',
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 7,
          }}>
            {/* Shield violation / prune notice */}
            {isShieldKilled && rejectedPath && (
              <div style={{
                padding: '5px 9px',
                background: 'rgba(197,61,47,0.05)',
                border: '1px solid rgba(197,61,47,0.16)',
                borderLeft: '2px solid #C53D2F',
                borderRadius: 6,
              }}>
                <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.1em', color: '#C53D2F', marginBottom: 2 }}>
                  SAFETY VIOLATION{guidelineRef ? ` — ${guidelineRef}` : ''}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.6)', lineHeight: 1.45 }}>
                  {rejectedPath.pruneReason}
                </div>
              </div>
            )}
            {isDoctorPruned && (
              <div style={{
                padding: '5px 9px',
                background: 'rgba(100,116,139,0.04)',
                border: '1px solid rgba(100,116,139,0.13)',
                borderRadius: 6,
              }}>
                <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.1em', color: '#64748B', marginBottom: 2 }}>
                  PRUNED BY CLINICIAN
                </div>
                <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.5)', lineHeight: 1.45 }}>
                  {rejectedPath?.pruneReason ?? 'Branch removed by clinician.'}
                </div>
              </div>
            )}

            {/* Branch narrative — 2 lines max */}
            {branchSummary?.narrativeSummary && (
              <div>
                <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.25)', marginBottom: 3 }}>
                  {isShieldKilled ? 'Was exploring' : 'Branch narrative'}
                </div>
                <p style={{
                  fontSize: 11.5, lineHeight: 1.55,
                  color: isPruned ? 'rgba(0,0,0,0.42)' : 'rgba(0,0,0,0.62)',
                  margin: 0,
                  overflow: 'hidden', display: '-webkit-box',
                  WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                }}>
                  {branchSummary.narrativeSummary}
                </p>
              </div>
            )}

            {/* Key evidence — compact rows */}
            {keyEvidence.length > 0 && (
              <div>
                <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.25)', marginBottom: 3 }}>
                  Key evidence
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {keyEvidence.map(ev => (
                    <button
                      key={ev.nodeId}
                      onClick={() => onEvidenceNodeClick(ev.nodeId)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '4px 7px', borderRadius: 5,
                        background: 'none', border: '1px solid rgba(0,0,0,0.06)',
                        cursor: 'pointer', textAlign: 'left', transition: 'background 100ms',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.025)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <span style={{
                        width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                        background: ev.type === 'citation' ? '#7C3AED' : ev.type === 'tool' ? '#2D8A56' : '#1A5FB4',
                      }} />
                      <span style={{
                        flex: 1, minWidth: 0, fontSize: 11, fontWeight: 500,
                        color: '#111', lineHeight: 1.3,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {ev.headline}
                      </span>
                      <ArrowRightIcon size={10} color="rgba(0,0,0,0.18)" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — safety status + action */}
          <div style={{
            width: '46%',
            overflow: 'hidden',
            padding: '8px 11px',
            display: 'flex',
            flexDirection: 'column',
            gap: 7,
          }}>

            {/* Safety status */}
            {(nodeChecks.length > 0 || branchPassChecks.length > 0 || isShieldKilled) && (
              <div style={{
                padding: '7px 9px',
                background: hasSafetyFlag
                  ? 'rgba(196,90,16,0.04)'
                  : isShieldKilled
                  ? 'rgba(197,61,47,0.04)'
                  : 'rgba(0,0,0,0.02)',
                borderRadius: 6,
                border: hasSafetyFlag
                  ? '1px solid rgba(196,90,16,0.16)'
                  : isShieldKilled
                  ? '1px solid rgba(197,61,47,0.16)'
                  : '1px solid rgba(0,0,0,0.07)',
              }}>
                <div style={{
                  fontSize: 7, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: hasSafetyFlag ? '#9a5000' : isShieldKilled ? '#C53D2F' : 'rgba(0,0,0,0.25)',
                  marginBottom: 5,
                }}>
                  Safety status
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {nodeChecks.length > 0 ? nodeChecks.map((chk, i) => {
                    const isFlag = chk.status === 'flag'
                    const isFail = chk.status === 'fail'
                    const isWarn = chk.status === 'warn'
                    const iconColor = isFail ? '#C53D2F' : isFlag ? '#B37A0A' : isWarn ? '#B37A0A' : '#2D8A56'
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 5 }}>
                        {isFail ? <CrossIcon size={10} color={iconColor} />
                         : (isFlag || isWarn) ? <WarningIcon size={10} color={iconColor} />
                         : <CheckIcon size={10} color={iconColor} />}
                        <span style={{
                          fontSize: 10.5, lineHeight: 1.4,
                          color: (isFlag || isFail) ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.55)',
                          overflow: 'hidden', display: '-webkit-box',
                          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        }}>
                          {chk.label}
                        </span>
                      </div>
                    )
                  }) : isShieldKilled ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <CrossIcon size={10} color="#C53D2F" />
                      <span style={{ fontSize: 10.5, color: 'rgba(0,0,0,0.6)' }}>
                        {guidelineRef ? `Violation: ${guidelineRef}` : 'Safety violation'}
                      </span>
                    </div>
                  ) : branchPassChecks.map(chk => (
                    <div key={chk.nodeId} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <CheckIcon size={10} color="#2D8A56" />
                      <span style={{ fontSize: 10.5, color: 'rgba(0,0,0,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {chk.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action CTA */}
            <div style={{
              padding: '6px 9px',
              background: 'rgba(0,0,0,0.015)',
              borderRadius: 6,
              border: '1px solid rgba(0,0,0,0.06)',
            }}>
              <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.25)', marginBottom: 5 }}>
                Actions
              </div>
              {!isPruned && (
                <button
                  onClick={actionIsGate ? undefined : () => onAuditHypothesis(diagnosis, [branchId])}
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    padding: '6px 9px', borderRadius: 6,
                    background: actionIsGate ? 'rgba(184,98,0,0.09)' : 'rgba(26,82,168,0.07)',
                    border: actionIsGate ? '1px solid rgba(184,98,0,0.22)' : '1px solid rgba(26,82,168,0.18)',
                    color: actionIsGate ? '#8B4800' : '#1A52A8',
                    cursor: actionIsGate ? 'default' : 'pointer',
                  }}
                >
                  {actionIsGate && <WarningIcon size={10} color="#8B4800" />}
                  <span style={{ fontSize: 10.5, fontWeight: 600 }}>
                    {actionIsGate ? 'Requires specialist review' : isContradicted ? 'Review reasoning trace' : isConverging ? 'View corroborating paths' : 'View reasoning trace'}
                  </span>
                  {!actionIsGate && <ArrowRightIcon size={10} color={isConverging ? '#2D8A56' : '#1A52A8'} />}
                </button>
              )}
              {isPruned && (
                <button
                  onClick={() => onRestoreBranch(branchId)}
                  style={{
                    width: '100%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    padding: '6px 9px', borderRadius: 6,
                    background: isShieldKilled ? 'rgba(197,61,47,0.07)' : 'rgba(100,116,139,0.07)',
                    border: isShieldKilled ? '1px solid rgba(197,61,47,0.20)' : '1px solid rgba(100,116,139,0.18)',
                    color: isShieldKilled ? '#C53D2F' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 10.5, fontWeight: 600 }}>
                    {isShieldKilled ? 'Override — restore branch' : 'Restore branch'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
