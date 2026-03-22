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
  XIcon, CheckIcon, CrossIcon, WarningIcon, ConvergeIcon, ArrowRightIcon, ScissorsIcon,
} from '../shared/Icons'

interface Props {
  terminalNode: PositionedNode
  variant: TerminalVariant
  branchSummary: BranchSummary | null
  convergences: Convergence[]
  rejectedPath: RejectedPath | null
  safetySummary: SafetySummary
  onClose: () => void
  onPruneBranch: (branchId: string) => void
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

const DRAWER_HEIGHT = 300

export default function BranchConclusionPanel({
  terminalNode, variant, branchSummary, convergences, rejectedPath, safetySummary,
  onClose, onPruneBranch, onRestoreBranch, onEvidenceNodeClick, onAuditHypothesis,
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
  const branchPassChecks = safetySummary.passedChecks.slice(0, 4)
  const keyEvidence      = branchSummary?.nodeSummaries.filter(s => s.isKeyStep).slice(0, 6) ?? []

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
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

        {/* ── Header ── */}
        <div style={{
          padding: '9px 16px 8px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Row 1: variant tag + convergence note */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{
                fontSize: 7.5, fontWeight: 800, letterSpacing: '0.12em',
                padding: '2px 6px', borderRadius: 4,
                background: cfg.tagBg, border: `1px solid ${cfg.tagBorder}`, color: cfg.tagColor,
              }}>
                {cfg.tagLabel}
              </span>
              {otherTerminalIds.length > 0 && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: '#2D8A56', fontWeight: 500 }}>
                  <ConvergeIcon size={11} color="#2D8A56" />
                  Also reached by {otherTerminalIds.length === 1 ? '1 other path' : `${otherTerminalIds.length} other paths`}
                </span>
              )}
            </div>
            {/* Row 2: diagnosis */}
            <div style={{
              fontSize: 16, fontWeight: 700, lineHeight: 1.2,
              color: isPruned ? 'rgba(0,0,0,0.38)' : '#0f172a',
              textDecoration: isPruned ? 'line-through' : 'none',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {diagnosis}
            </div>
            {/* Row 3: path label */}
            <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.38)', marginTop: 2 }}>
              {pathLabel}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 22, height: 22, borderRadius: '50%',
              background: 'rgba(0,0,0,0.05)', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <XIcon size={12} color="rgba(0,0,0,0.38)" />
          </button>
        </div>

        {/* ── Two-column body ── */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', minHeight: 0 }}>

          {/* LEFT — narrative, violation/prune notice, key evidence */}
          <div style={{
            width: '57%',
            borderRight: '1px solid rgba(0,0,0,0.05)',
            overflowY: 'auto',
            padding: '10px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 9,
          }}>
            {/* Shield violation block */}
            {isShieldKilled && rejectedPath && (
              <div style={{
                padding: '8px 10px',
                background: 'rgba(197,61,47,0.06)',
                border: '1px solid rgba(197,61,47,0.18)',
                borderLeft: '2px solid #C53D2F',
                borderRadius: 7,
              }}>
                <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '0.1em', color: '#C53D2F', marginBottom: 3 }}>
                  SAFETY VIOLATION
                </div>
                {guidelineRef && (
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#a02a20', marginBottom: 2 }}>
                    {guidelineRef}
                  </div>
                )}
                <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,0.6)', lineHeight: 1.5 }}>
                  {rejectedPath.pruneReason}
                </div>
              </div>
            )}

            {/* Doctor pruned notice */}
            {isDoctorPruned && (
              <div style={{
                padding: '8px 10px',
                background: 'rgba(100,116,139,0.05)',
                border: '1px solid rgba(100,116,139,0.14)',
                borderRadius: 7,
              }}>
                <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '0.1em', color: '#64748B', marginBottom: 2 }}>
                  PRUNED BY CLINICIAN
                </div>
                <div style={{ fontSize: 11.5, color: 'rgba(0,0,0,0.55)', lineHeight: 1.5 }}>
                  {rejectedPath?.pruneReason ?? 'Branch removed by clinician.'}
                </div>
              </div>
            )}

            {/* Branch narrative */}
            {branchSummary?.narrativeSummary && (
              <div>
                <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.28)', marginBottom: 5 }}>
                  {isShieldKilled ? 'Was exploring' : 'Branch narrative'}
                </div>
                <p style={{
                  fontSize: 12, lineHeight: 1.65, color: isPruned ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.68)',
                  margin: 0,
                }}>
                  {branchSummary.narrativeSummary}
                </p>
              </div>
            )}

            {/* Key evidence */}
            {keyEvidence.length > 0 && (
              <div>
                <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.28)', marginBottom: 5 }}>
                  Key evidence
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {keyEvidence.map(ev => (
                    <button
                      key={ev.nodeId}
                      onClick={() => onEvidenceNodeClick(ev.nodeId)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        padding: '5px 8px', borderRadius: 6,
                        background: 'none', border: '1px solid rgba(0,0,0,0.07)',
                        cursor: 'pointer', textAlign: 'left', transition: 'background 120ms',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.02)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <span style={{
                        width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
                        background: ev.type === 'citation' ? '#7C3AED' : ev.type === 'tool' ? '#2D8A56' : '#1A5FB4',
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 500, color: '#111', lineHeight: 1.3 }}>
                          {ev.headline}
                        </div>
                        {ev.source && (
                          <div style={{ fontSize: 9.5, color: 'rgba(0,0,0,0.36)', marginTop: 1 }}>
                            {ev.source}
                          </div>
                        )}
                      </div>
                      <ArrowRightIcon size={11} color="rgba(0,0,0,0.22)" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT — safety status + actions */}
          <div style={{
            width: '43%',
            overflow: 'hidden',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 9,
          }}>
            {/* Safety status */}
            {(nodeChecks.length > 0 || branchPassChecks.length > 0 || isShieldKilled) && (
              <div style={{
                padding: '8px 10px',
                background: 'rgba(0,0,0,0.02)',
                borderRadius: 7,
                border: '1px solid rgba(0,0,0,0.07)',
              }}>
                <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.28)', marginBottom: 6 }}>
                  Safety status
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {nodeChecks.length > 0 ? nodeChecks.map((chk, i) => {
                    const c = chk.status === 'fail' ? '#C53D2F' : chk.status === 'warn' ? '#B37A0A' : '#2D8A56'
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {chk.status === 'fail' ? <CrossIcon size={11} color={c} />
                         : chk.status === 'warn' ? <WarningIcon size={11} color={c} />
                         : <CheckIcon size={11} color={c} />}
                        <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.6)' }}>{chk.label}</span>
                      </div>
                    )
                  }) : isShieldKilled ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CrossIcon size={11} color="#C53D2F" />
                      <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.6)' }}>
                        {guidelineRef ? `Violation: ${guidelineRef}` : 'Safety violation'}
                      </span>
                    </div>
                  ) : branchPassChecks.slice(0, 3).map(chk => (
                    <div key={chk.nodeId} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CheckIcon size={11} color="#2D8A56" />
                      <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.55)' }}>{chk.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{
              flex: 1,
              padding: '8px 10px',
              background: 'rgba(0,0,0,0.02)',
              borderRadius: 7,
              border: '1px solid rgba(0,0,0,0.07)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}>
              <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.28)' }}>
                Actions
              </div>

              {!isPruned && (
                <button
                  onClick={() => onAuditHypothesis(diagnosis, [branchId])}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '7px 10px', borderRadius: 7,
                    background: 'rgba(26,82,168,0.07)',
                    border: '1px solid rgba(26,82,168,0.18)',
                    color: '#1A52A8', cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 600 }}>Audit full hypothesis</span>
                  <ArrowRightIcon size={11} color="#1A52A8" />
                </button>
              )}

              {!isPruned ? (
                <button
                  onClick={() => onPruneBranch(branchId)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '7px 10px', borderRadius: 7,
                    background: 'none', border: '1px solid rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                  }}
                >
                  <ScissorsIcon size={11} color="rgba(0,0,0,0.4)" />
                  <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(0,0,0,0.45)' }}>Prune branch</span>
                </button>
              ) : (
                <button
                  onClick={() => onRestoreBranch(branchId)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '7px 10px', borderRadius: 7,
                    background: isShieldKilled ? 'rgba(197,61,47,0.07)' : 'rgba(100,116,139,0.07)',
                    border: isShieldKilled ? '1px solid rgba(197,61,47,0.20)' : '1px solid rgba(100,116,139,0.18)',
                    color: isShieldKilled ? '#C53D2F' : '#475569',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 600 }}>
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
