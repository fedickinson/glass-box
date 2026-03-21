/** NodeDetail — floating overlay card showing full content of the selected node */
import React from 'react'
import { PositionedNode, ViewMode } from '../../types/tree'

const TYPE_COLORS: Record<string, { accent: string; label: string; fill: string }> = {
  thought: { accent: 'var(--node-thought-border)', label: 'Reasoning', fill: 'var(--node-thought-fill)' },
  tool: { accent: 'var(--node-tool-border)', label: 'Tool Call', fill: 'var(--node-tool-fill)' },
  citation: { accent: 'var(--node-citation-border)', label: 'Citation', fill: 'var(--node-citation-fill)' },
}

interface Props {
  node: PositionedNode
  viewMode: ViewMode
  onClose: () => void
}

export default function NodeDetail({ node, viewMode, onClose }: Props) {
  const colors = TYPE_COLORS[node.type] ?? TYPE_COLORS.thought
  const label = node.is_decision_point ? 'Decision Point' : colors.label

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        right: 16,
        width: 320,
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderRadius: 16,
        border: '1px solid rgba(0,0,0,0.09)',
        borderTop: '1px solid rgba(255,255,255,0.95)',
        borderLeft: `3px solid ${colors.accent}`,
        boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)',
        overflow: 'hidden',
        zIndex: 10,
      }}
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 14px 10px',
          borderBottom: '1px solid rgba(0,0,0,0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 8,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 8.5,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: colors.accent,
              marginBottom: 4,
            }}
          >
            {label}
            {node.is_decision_point && (
              <span
                style={{
                  marginLeft: 6,
                  background: 'var(--node-decision-fill)',
                  color: 'var(--node-decision-border)',
                  border: `1px solid var(--node-decision-border)`,
                  borderRadius: 4,
                  padding: '1px 5px',
                  fontSize: 7,
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                }}
              >
                DECISION
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: '#111',
              lineHeight: 1.3,
              fontFamily: 'system-ui, -apple-system, sans-serif',
            }}
          >
            {node.headline}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.05)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            color: 'rgba(0,0,0,0.4)',
            lineHeight: 1,
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px', maxHeight: 260, overflowY: 'auto' }}>
        <p
          style={{
            fontSize: 12.5,
            lineHeight: 1.65,
            color: 'rgba(0,0,0,0.72)',
            margin: 0,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {node.content}
        </p>

        {/* Source */}
        {node.source && (
          <div
            style={{
              marginTop: 10,
              padding: '7px 10px',
              background: 'rgba(0,0,0,0.03)',
              borderRadius: 8,
              border: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            <div
              style={{
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(0,0,0,0.35)',
                marginBottom: 3,
              }}
            >
              Source
            </div>
            <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.6)', fontStyle: 'italic' }}>
              {node.source}
            </div>
          </div>
        )}

        {/* Architecture metadata */}
        {viewMode === 'architecture' && (node.tool_name || node.latency_ms) && (
          <div
            style={{
              marginTop: 8,
              display: 'flex',
              gap: 6,
              flexWrap: 'wrap',
            }}
          >
            {node.tool_name && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '3px 8px',
                  background: 'rgba(45,138,86,0.08)',
                  color: '#2D8A56',
                  border: '1px solid rgba(45,138,86,0.18)',
                  borderRadius: 6,
                }}
              >
                {node.tool_name}
              </span>
            )}
            {node.latency_ms && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '3px 8px',
                  background: 'rgba(0,0,0,0.04)',
                  color: 'rgba(0,0,0,0.5)',
                  border: '1px solid rgba(0,0,0,0.08)',
                  borderRadius: 6,
                }}
              >
                {node.latency_ms}ms
              </span>
            )}
          </div>
        )}

        {/* Shield flag */}
        {node.shield_severity && (
          <div
            style={{
              marginTop: 8,
              padding: '7px 10px',
              background: 'rgba(185,50,38,0.05)',
              borderRadius: 8,
              border: '1px solid rgba(185,50,38,0.18)',
              borderLeft: '3px solid rgba(185,50,38,0.7)',
            }}
          >
            <div
              style={{
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: '#a02a20',
                marginBottom: 3,
              }}
            >
              Shield — {node.shield_severity}
            </div>
            {node.prune_reason && (
              <div style={{ fontSize: 11, color: 'rgba(0,0,0,0.6)', lineHeight: 1.4 }}>
                {node.prune_reason}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer metadata */}
      <div
        style={{
          padding: '8px 14px',
          borderTop: '1px solid rgba(0,0,0,0.05)',
          fontSize: 10,
          color: 'rgba(0,0,0,0.3)',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        Step {(node.step_index ?? 0) + 1} · Branch: {node.branch_id}
        {node.diagnosis && (
          <span style={{ color: '#1A52A8', fontWeight: 600, marginLeft: 6 }}>
            → {node.diagnosis}
          </span>
        )}
      </div>
    </div>
  )
}
