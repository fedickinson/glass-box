/** GrowthPreStart — clinical intake handoff screen shown before reasoning begins */
import React from 'react'
import { GrowthSpeedSetting } from '../../types/tree'

interface PatientContext {
  name: string
  age: string
  domain: string
  transcript: { speaker: string; quote: string }
  clinicalTags: string[]
}

interface Props {
  speed: GrowthSpeedSetting
  onStart: () => void
  patientContext?: PatientContext
}

const ANALYSIS_DEPTH: Record<GrowthSpeedSetting, string> = {
  slow: 'Extended',
  medium: 'Standard',
  fast: 'Rapid',
}

export default function GrowthPreStart({ speed, onStart, patientContext }: Props) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
        background: 'rgba(245,247,252,0.72)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      <div
        style={{
          background: 'rgba(255,255,255,0.97)',
          borderRadius: 18,
          border: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.06), 0 20px 60px rgba(0,0,0,0.10)',
          width: 480,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* System label bar */}
        <div style={{
          padding: '10px 20px',
          background: 'rgba(26,82,168,0.05)',
          borderBottom: '1px solid rgba(26,82,168,0.10)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: '#1A52A8',
          }}>
            Differential Reasoning System
          </div>
          <div style={{
            fontSize: 9, fontWeight: 600, letterSpacing: '0.08em',
            textTransform: 'uppercase', color: 'rgba(0,0,0,0.28)',
          }}>
            Ready
          </div>
        </div>

        {/* Patient block */}
        {patientContext ? (
          <div style={{ padding: '20px 24px 16px' }}>
            {/* Name + identifiers */}
            <div style={{ marginBottom: 4, display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: 'rgba(0,0,0,0.88)', letterSpacing: '-0.01em' }}>
                {patientContext.name}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', fontWeight: 500 }}>
                {patientContext.age}
              </div>
            </div>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
              textTransform: 'uppercase', color: 'rgba(26,82,168,0.7)',
              marginBottom: 14,
            }}>
              {patientContext.domain}
            </div>

            {/* Chief complaint */}
            <div style={{
              background: 'rgba(0,0,0,0.025)',
              border: '1px solid rgba(0,0,0,0.07)',
              borderLeft: '3px solid rgba(0,0,0,0.18)',
              borderRadius: '0 8px 8px 0',
              padding: '10px 14px',
              marginBottom: 14,
            }}>
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.09em',
                textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)',
                marginBottom: 5,
              }}>
                {patientContext.transcript.speaker}
              </div>
              <div style={{
                fontSize: 12.5, lineHeight: 1.55, color: 'rgba(0,0,0,0.68)',
                fontStyle: 'italic',
              }}>
                {patientContext.transcript.quote}
              </div>
            </div>

            {/* Clinical tags */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {patientContext.clinicalTags.map(tag => (
                <span key={tag} style={{
                  fontSize: 10.5, fontWeight: 600,
                  padding: '3px 9px',
                  borderRadius: 20,
                  background: 'rgba(26,82,168,0.07)',
                  color: 'rgba(26,82,168,0.85)',
                  border: '1px solid rgba(26,82,168,0.15)',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ padding: '24px 24px 16px' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(0,0,0,0.7)' }}>
              Clinical assessment ready
            </div>
          </div>
        )}

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin: '0 24px' }} />

        {/* Action section */}
        <div style={{ padding: '16px 24px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            fontSize: 11, color: 'rgba(0,0,0,0.42)', lineHeight: 1.5,
          }}>
            The system will explore branching diagnostic paths, auto-pausing at critical decision points for review.
          </div>

          <button
            onClick={onStart}
            style={{
              fontSize: 13, fontWeight: 700, letterSpacing: '0.02em',
              padding: '12px 24px',
              borderRadius: 10,
              background: '#1A52A8',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(26,82,168,0.30)',
              transition: 'background 130ms ease-out, box-shadow 130ms',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLButtonElement).style.background = '#1644A0'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 16px rgba(26,82,168,0.42)'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLButtonElement).style.background = '#1A52A8'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 10px rgba(26,82,168,0.30)'
            }}
          >
            Run Differential Analysis
            <span style={{ opacity: 0.75, fontSize: 15 }}>→</span>
          </button>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{
              fontSize: 9, color: 'rgba(0,0,0,0.28)',
              letterSpacing: '0.04em',
            }}>
              Space to pause · ← → to navigate
            </div>
            <div style={{
              fontSize: 9, fontWeight: 600, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'rgba(0,0,0,0.28)',
            }}>
              {ANALYSIS_DEPTH[speed]} analysis
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
