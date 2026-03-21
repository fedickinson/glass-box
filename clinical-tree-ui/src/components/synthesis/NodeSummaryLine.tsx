/** NodeSummaryLine — one-line summary of a node within a BranchCard. Clickable, hoverable. */
import React from 'react'
import { NodeSummary, DoctorAnnotation } from '../../types/tree'

const TYPE_DOT_COLORS: Record<string, string> = {
  thought: '#3B7DD8',
  tool: '#2D8A56',
  citation: '#7B5EA7',
}
const ANNOTATION_COLORS: Record<string, string> = {
  flag: '#C53D2F',
  context: '#3B7DD8',
  challenge: '#D4950A',
}

interface Props {
  nodeSummary: NodeSummary
  annotations: DoctorAnnotation[]
  isSelected: boolean
  onClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}

export default function NodeSummaryLine({
  nodeSummary,
  annotations,
  isSelected,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: Props) {
  const dotColor = TYPE_DOT_COLORS[nodeSummary.type] ?? '#888'
  const isDiagnosis = !!nodeSummary.shieldFlag === false && nodeSummary.headline.toLowerCase().includes('dx:')

  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '5px 8px',
        borderRadius: 8,
        cursor: 'pointer',
        background: isSelected ? `${dotColor}10` : 'transparent',
        border: isSelected ? `1px solid ${dotColor}28` : '1px solid transparent',
        transition: 'background 120ms ease-out, border-color 120ms ease-out',
        marginLeft: -4,
      }}
    >
      {/* Type dot */}
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: dotColor,
          flexShrink: 0,
          marginTop: 5,
        }}
      />

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11.5,
            color: isSelected ? '#111' : 'rgba(0,0,0,0.7)',
            lineHeight: 1.35,
            fontWeight: nodeSummary.isKeyStep ? 500 : 400,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={nodeSummary.headline}
        >
          {nodeSummary.headline}
        </div>

        {/* Source */}
        {nodeSummary.source && (
          <div
            style={{ fontSize: 9.5, color: 'rgba(0,0,0,0.38)', marginTop: 1, fontStyle: 'italic' }}
          >
            {nodeSummary.source}
          </div>
        )}

        {/* Annotations inline */}
        {annotations.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 3 }}>
            {annotations.map(ann => (
              <span
                key={ann.id}
                style={{
                  fontSize: 9,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: `${ANNOTATION_COLORS[ann.type] ?? '#888'}14`,
                  color: ANNOTATION_COLORS[ann.type] ?? '#888',
                  border: `1px solid ${ANNOTATION_COLORS[ann.type] ?? '#888'}30`,
                  fontWeight: 600,
                  letterSpacing: '0.03em',
                }}
              >
                {ann.type === 'flag' ? '⚑' : ann.type === 'context' ? '📎' : '⚡'}{' '}
                {ann.content.slice(0, 40)}{ann.content.length > 40 ? '…' : ''}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Shield flag */}
      {nodeSummary.shieldFlag && (
        <span
          style={{
            fontSize: 8,
            fontWeight: 700,
            padding: '1px 5px',
            borderRadius: 4,
            background: 'rgba(185,50,38,0.08)',
            color: '#a02a20',
            border: '1px solid rgba(185,50,38,0.2)',
            letterSpacing: '0.06em',
            flexShrink: 0,
            marginTop: 2,
          }}
        >
          SHIELD
        </span>
      )}
    </div>
  )
}
