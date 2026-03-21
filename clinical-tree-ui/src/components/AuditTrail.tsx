/** AuditTrail — collapsible timeline log of all system and doctor actions */
import React, { useEffect, useRef, useState } from 'react'
import { AuditEntry, PositionedTree } from '../types/tree'

const TYPE_COLORS = {
  system: '#3B7DD8',
  shield: '#C53D2F',
  doctor: '#2D8A56',
}

const TYPE_LABELS = {
  system: 'System',
  shield: 'Shield',
  doctor: 'Dr.',
}

function relativeTime(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 5) return 'just now'
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

interface Props {
  auditLog: AuditEntry[]
  tree: PositionedTree
  onEntryClick: (entry: AuditEntry) => void
}

export default function AuditTrail({ auditLog, tree, onEntryClick }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const [, forceUpdate] = useState(0)

  // Scroll to bottom on new entries
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [auditLog.length])

  // Refresh relative timestamps every 10s
  useEffect(() => {
    const id = setInterval(() => forceUpdate(n => n + 1), 10_000)
    return () => clearInterval(id)
  }, [])

  if (auditLog.length === 0) {
    return (
      <div
        style={{
          padding: '10px 24px',
          fontSize: 11,
          color: 'rgba(0,0,0,0.3)',
          fontStyle: 'italic',
        }}
      >
        No events yet.
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        padding: '8px 16px 8px',
        overflowX: 'auto',
        overflowY: 'auto',
        height: '100%',
      }}
    >
      <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start', minWidth: 0 }}>
        {/* Vertical line */}
        <div
          style={{
            width: 1,
            background: 'rgba(0,0,0,0.08)',
            alignSelf: 'stretch',
            flexShrink: 0,
            marginLeft: 5,
            marginRight: 12,
            marginTop: 8,
          }}
        />
        {/* Entries */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {auditLog.map((entry, i) => {
            const color = TYPE_COLORS[entry.type]
            const node = entry.nodeId ? tree.nodes.find(n => n.id === entry.nodeId) : null
            const isClickable = !!(entry.nodeId || entry.branchId)

            return (
              <div
                key={entry.id}
                onClick={() => isClickable && onEntryClick(entry)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '4px 6px 4px 0',
                  borderRadius: 6,
                  cursor: isClickable ? 'pointer' : 'default',
                  marginBottom: 1,
                  position: 'relative',
                }}
                title={isClickable ? 'Click to navigate' : undefined}
              >
                {/* Dot */}
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: color,
                    flexShrink: 0,
                    marginTop: 4,
                    marginLeft: -16,
                    border: '1.5px solid rgba(255,255,255,0.9)',
                    boxShadow: `0 0 0 2px ${color}25`,
                  }}
                />

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: 8,
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        color,
                        flexShrink: 0,
                      }}
                    >
                      {TYPE_LABELS[entry.type]}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: 'rgba(0,0,0,0.75)',
                        fontWeight: isClickable ? 500 : 400,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                      }}
                    >
                      {entry.summary}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        color: 'rgba(0,0,0,0.3)',
                        flexShrink: 0,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {relativeTime(entry.timestamp)}
                    </span>
                  </div>
                  {entry.detail && (
                    <div
                      style={{
                        fontSize: 10.5,
                        color: 'rgba(0,0,0,0.45)',
                        marginTop: 1,
                        fontStyle: 'italic',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {entry.detail}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}
