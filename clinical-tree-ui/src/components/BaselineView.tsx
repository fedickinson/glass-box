/** BaselineView — plain-text AI response for contrast with the reasoning tree */
import React from 'react'

export default function BaselineView() {
  return (
    <div
      className="flex flex-col items-center justify-center h-full"
      style={{
        background: 'radial-gradient(ellipse at 38% 38%, #e8eef8 0%, #dde6f4 55%, #d8e2f0 100%)',
        padding: '40px 60px',
      }}
    >
      {/* Label */}
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          color: 'rgba(0,0,0,0.35)',
          marginBottom: 16,
        }}
      >
        Standard AI response — no reasoning trace
      </div>

      {/* Chat-bubble style card */}
      <div
        style={{
          maxWidth: 540,
          background: 'rgba(255,255,255,0.96)',
          borderRadius: 18,
          borderTopLeftRadius: 4,
          border: '1px solid rgba(0,0,0,0.09)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.1), 0 1px 4px rgba(0,0,0,0.05)',
          padding: '20px 24px',
        }}
      >
        {/* Model label */}
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'rgba(0,0,0,0.35)',
            letterSpacing: '0.06em',
            marginBottom: 10,
          }}
        >
          AI Assistant
        </div>

        {/* Flat response text */}
        <p
          style={{
            fontSize: 14.5,
            lineHeight: 1.65,
            color: '#111',
            margin: 0,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          Based on the symptoms described, this appears to be cardiac in origin.
          The patient's age, sex, and cardiovascular risk factors combined with
          exertional chest tightness and left arm radiation are consistent with
          anginal disease. Recommend cardiology referral and EKG.
        </p>

        {/* No citations, no reasoning, no confidence */}
        <div
          style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: '1px solid rgba(0,0,0,0.07)',
            fontSize: 11,
            color: 'rgba(0,0,0,0.35)',
            fontStyle: 'italic',
          }}
        >
          No citations · No confidence estimate · No alternatives explored · No safety checks
        </div>
      </div>

      {/* Arrow hint */}
      <div
        style={{
          marginTop: 28,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.3)' }}>
          vs. what our system produces →
        </div>
        <div
          style={{
            fontSize: 9.5,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgba(0,0,0,0.22)',
          }}
        >
          Click "Show reasoning tree" to compare
        </div>
      </div>
    </div>
  )
}
