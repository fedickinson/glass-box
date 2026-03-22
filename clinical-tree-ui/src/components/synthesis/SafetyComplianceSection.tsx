/** SafetyComplianceSection — collapsed safety summary with expandable violation details */
import React, { useState } from 'react'
import { SafetySummary, ShieldSeverity } from '../../types/tree'

const SEVERITY_STYLES: Record<ShieldSeverity, { label: string; color: string; bg: string; border: string }> = {
  safety:        { label: 'Safety',        color: '#b03020', bg: 'rgba(185,50,38,0.07)',  border: 'rgba(185,50,38,0.20)' },
  guideline:     { label: 'Guideline',     color: '#7A5500', bg: 'rgba(212,149,10,0.07)', border: 'rgba(212,149,10,0.20)' },
  correctness:   { label: 'Correctness',   color: '#4A5568', bg: 'rgba(74,85,104,0.07)',  border: 'rgba(74,85,104,0.18)' },
  traceability:  { label: 'Traceability',  color: '#4A5568', bg: 'rgba(74,85,104,0.07)',  border: 'rgba(74,85,104,0.18)' },
}

interface Props {
  safetySummary: SafetySummary
  onViewInTree: (branchId: string) => void
  onRestoreBranch: (branchId: string) => void
}

export default function SafetyComplianceSection({ safetySummary, onViewInTree, onRestoreBranch }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [confirmingRestore, setConfirmingRestore] = useState<string | null>(null)

  const { passedPaths, totalPaths, passedChecks, violations } = safetySummary
  const hasViolations = violations.length > 0

  function handleRestoreClick(branchId: string) {
    if (confirmingRestore === branchId) {
      onRestoreBranch(branchId)
      setConfirmingRestore(null)
    } else {
      setConfirmingRestore(branchId)
    }
  }

  return (
    <div>
      {/* Section label */}
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.10em',
          textTransform: 'uppercase',
          color: 'rgba(0,0,0,0.35)',
          marginBottom: 8,
        }}
      >
        Safety &amp; Compliance
      </div>

      {/* Collapsed summary card */}
      <div
        style={{
          borderRadius: 10,
          border: hasViolations ? '1px solid rgba(185,50,38,0.15)' : '1px solid rgba(0,0,0,0.07)',
          background: hasViolations
            ? 'linear-gradient(148deg, rgba(255,248,247,0.96) 0%, rgba(255,255,255,0.92) 100%)'
            : 'linear-gradient(148deg, rgba(240,252,245,0.94) 0%, rgba(255,255,255,0.92) 100%)',
          borderTop: '1px solid rgba(255,255,255,1)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,1)',
          overflow: 'hidden',
        }}
      >
        {/* Summary lines */}
        <div style={{ padding: '10px 12px 8px' }}>
          {/* Passed paths line */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
            <span style={{ fontSize: 11, color: '#1A7042', fontWeight: 700 }}>✓</span>
            <span style={{ fontSize: 11.5, color: 'rgba(0,0,0,0.65)', lineHeight: 1.35 }}>
              <strong style={{ fontWeight: 600, color: '#18192a' }}>{passedPaths} of {totalPaths}</strong> paths cleared all safety checks
            </span>
          </div>

          {/* Passed check lines (up to 3 shown collapsed) */}
          {passedChecks.slice(0, expanded ? passedChecks.length : 3).map(check => {
            const icon =
              check.status === 'warn' ? { glyph: '⚠', color: '#7A5500' } :
              check.status === 'info' ? { glyph: 'ℹ', color: '#1A52A8' } :
                                        { glyph: '✓', color: '#1A7042' }
            return (
              <div key={check.nodeId} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 3 }}>
                <span style={{ fontSize: check.status === 'info' ? 9.5 : 10, color: icon.color, fontWeight: 700, marginTop: 1, flexShrink: 0 }}>
                  {icon.glyph}
                </span>
                <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.52)', lineHeight: 1.35, flex: 1 }}>
                  {check.label}
                  {check.source && (
                    <span style={{ color: 'rgba(0,0,0,0.32)', fontStyle: 'italic', marginLeft: 4 }}>
                      — {check.source}
                    </span>
                  )}
                </span>
              </div>
            )
          })}

          {/* Violation summary line */}
          {hasViolations && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
              <span style={{ fontSize: 10, color: '#b03020', fontWeight: 700, flexShrink: 0 }}>⚠</span>
              <span style={{ fontSize: 11, color: '#b03020', lineHeight: 1.35 }}>
                <strong style={{ fontWeight: 600 }}>{violations.length}</strong> path{violations.length > 1 ? 's' : ''} terminated by shield model
              </span>
            </div>
          )}
        </div>

        {/* Toggle */}
        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            width: '100%',
            padding: '6px 12px',
            borderTop: '1px solid rgba(0,0,0,0.05)',
            background: 'transparent',
            border: 'none',
            borderTopColor: 'rgba(0,0,0,0.05)',
            borderTopStyle: 'solid',
            borderTopWidth: 1,
            cursor: 'pointer',
            fontSize: 10,
            fontWeight: 600,
            color: 'rgba(0,0,0,0.40)',
            letterSpacing: '0.03em',
            textAlign: 'left',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,0,0,0.60)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'rgba(0,0,0,0.40)' }}
        >
          <span style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block', transition: 'transform 180ms ease-out', fontSize: 8 }}>▾</span>
          {expanded ? 'Hide safety details' : 'View safety details'}
        </button>

        {/* Expanded: violation cards */}
        {expanded && violations.length > 0 && (
          <div style={{ padding: '0 10px 10px' }}>
            <div
              style={{
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(185,50,38,0.6)',
                margin: '6px 0 6px 2px',
              }}
            >
              Terminated paths
            </div>
            {violations.map(v => {
              const sev = SEVERITY_STYLES[v.severity]
              const isConfirming = confirmingRestore === v.branchId
              return (
                <div
                  key={v.branchId}
                  style={{
                    borderRadius: 8,
                    border: `1px solid ${sev.border}`,
                    borderLeft: `3px solid ${sev.color}`,
                    borderTop: '1px solid rgba(255,255,255,0.9)',
                    background: sev.bg,
                    padding: '9px 10px',
                    marginBottom: 7,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,1)',
                  }}
                >
                  {/* Severity + diagnosis row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                    <span
                      style={{
                        fontSize: 7.5, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
                        padding: '1px 5px', borderRadius: 3,
                        background: sev.bg, color: sev.color, border: `1px solid ${sev.border}`,
                        flexShrink: 0,
                      }}
                    >
                      {sev.label}
                    </span>
                    {v.guidelineRef && (
                      <span style={{ fontSize: 9, color: sev.color, fontStyle: 'italic', opacity: 0.8 }}>
                        {v.guidelineRef}
                      </span>
                    )}
                  </div>

                  {/* Diagnosis */}
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#18192a', marginBottom: 3, lineHeight: 1.3 }}>
                    {v.diagnosis ?? 'Unknown diagnosis'}
                  </div>

                  {/* Violation text */}
                  <div style={{ fontSize: 10.5, color: 'rgba(0,0,0,0.50)', lineHeight: 1.45, marginBottom: 8 }}>
                    {v.violation}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => onViewInTree(v.branchId)}
                      style={{
                        fontSize: 9.5, fontWeight: 600,
                        color: 'rgba(0,0,0,0.45)',
                        background: 'rgba(0,0,0,0.04)',
                        border: '1px solid rgba(0,0,0,0.10)',
                        borderRadius: 5, padding: '3px 9px', cursor: 'pointer',
                      }}
                    >
                      View in tree
                    </button>

                    {isConfirming ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flex: 1 }}>
                        <span style={{ fontSize: 9.5, color: sev.color, fontWeight: 500 }}>
                          Override shield decision?
                        </span>
                        <button
                          onClick={() => handleRestoreClick(v.branchId)}
                          style={{
                            fontSize: 9.5, fontWeight: 700,
                            color: '#fff',
                            background: sev.color,
                            border: 'none',
                            borderRadius: 5, padding: '3px 9px', cursor: 'pointer',
                          }}
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmingRestore(null)}
                          style={{
                            fontSize: 9.5, fontWeight: 600,
                            color: 'rgba(0,0,0,0.40)',
                            background: 'transparent',
                            border: '1px solid rgba(0,0,0,0.10)',
                            borderRadius: 5, padding: '3px 8px', cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleRestoreClick(v.branchId)}
                        style={{
                          fontSize: 9.5, fontWeight: 600,
                          color: sev.color,
                          background: `${sev.bg}`,
                          border: `1px solid ${sev.border}`,
                          borderRadius: 5, padding: '3px 9px', cursor: 'pointer',
                        }}
                      >
                        Override — restore
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Expanded: all passed checks if no violations but more than 3 */}
        {expanded && violations.length === 0 && passedChecks.length > 3 && (
          <div style={{ padding: '0 12px 10px' }}>
            {passedChecks.slice(3).map(check => {
              const icon =
                check.status === 'warn' ? { glyph: '⚠', color: '#7A5500' } :
                check.status === 'info' ? { glyph: 'ℹ', color: '#1A52A8' } :
                                          { glyph: '✓', color: '#1A7042' }
              return (
                <div key={check.nodeId} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: check.status === 'info' ? 9.5 : 10, color: icon.color, fontWeight: 700, marginTop: 1, flexShrink: 0 }}>
                    {icon.glyph}
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.52)', lineHeight: 1.35, flex: 1 }}>
                    {check.label}
                    {check.source && (
                      <span style={{ color: 'rgba(0,0,0,0.32)', fontStyle: 'italic', marginLeft: 4 }}>
                        — {check.source}
                      </span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
