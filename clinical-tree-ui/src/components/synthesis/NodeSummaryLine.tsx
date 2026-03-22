/** NodeSummaryLine — one-line node summary in a BranchCard. Hover reveals flag/context/challenge. */
import React, { useState } from 'react'
import { NodeSummary, DoctorAnnotation, DoctorAnnotationType } from '../../types/tree'
import AnnotationInput from './AnnotationInput'
import { FlagIcon, PaperclipIcon, LightningIcon, XIcon } from '../shared/Icons'

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
  onAnnotate: (type: DoctorAnnotationType, content: string) => void
  onRemoveAnnotation: (annotationId: string) => void
}

export default function NodeSummaryLine({
  nodeSummary,
  annotations,
  isSelected,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onAnnotate,
  onRemoveAnnotation,
}: Props) {
  const [isHovered, setIsHovered] = useState(false)
  const [openInput, setOpenInput] = useState<DoctorAnnotationType | null>(null)

  const dotColor = TYPE_DOT_COLORS[nodeSummary.type] ?? '#888'

  function handleAnnotate(type: DoctorAnnotationType, content: string) {
    onAnnotate(type, content)
    setOpenInput(null)
  }

  return (
    <div
      onMouseEnter={() => { setIsHovered(true); onMouseEnter() }}
      onMouseLeave={() => { setIsHovered(false); onMouseLeave() }}
    >
      {/* Main row */}
      <div
        onClick={onClick}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          padding: '5px 8px',
          borderRadius: 8,
          cursor: 'pointer',
          background: isSelected ? `${dotColor}10` : isHovered ? 'rgba(0,0,0,0.03)' : 'transparent',
          border: isSelected ? `1px solid ${dotColor}28` : '1px solid transparent',
          transition: 'background 120ms ease-out',
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

          {nodeSummary.source && (
            <div
              style={{ fontSize: 9.5, color: 'rgba(0,0,0,0.38)', marginTop: 1, fontStyle: 'italic' }}
            >
              {nodeSummary.source}
            </div>
          )}
        </div>

        {/* Shield badge */}
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

        {/* Hover action buttons */}
        {isHovered && !openInput && (
          <div
            style={{ display: 'flex', gap: 3, flexShrink: 0 }}
            onClick={e => e.stopPropagation()}
          >
            {(['flag', 'context', 'challenge'] as DoctorAnnotationType[]).map(t => {
              const colors: Record<string, string> = { flag: '#C53D2F', context: '#3B7DD8', challenge: '#D4950A' }
              const iconComponents: Record<string, React.ReactNode> = {
                flag: <FlagIcon size={9} color={colors.flag} />,
                context: <PaperclipIcon size={9} color={colors.context} />,
                challenge: <LightningIcon size={9} color={colors.challenge} />,
              }
              return (
                <button
                  key={t}
                  onClick={() => setOpenInput(t)}
                  title={t}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 5,
                    border: `1px solid ${colors[t]}30`,
                    background: `${colors[t]}10`,
                    color: colors[t],
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  {iconComponents[t]}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Inline annotations */}
      {annotations.length > 0 && (
        <div style={{ marginLeft: 18, marginBottom: 2 }}>
          {annotations.map(ann => (
            <div
              key={ann.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 5,
                padding: '3px 6px',
                borderRadius: 5,
                background: `${ANNOTATION_COLORS[ann.type] ?? '#888'}08`,
                borderLeft: `2px solid ${ANNOTATION_COLORS[ann.type] ?? '#888'}50`,
                marginBottom: 2,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0, marginTop: 1 }}>
                {ann.type === 'flag' ? <FlagIcon size={9} color={ANNOTATION_COLORS.flag} /> : ann.type === 'context' ? <PaperclipIcon size={9} color={ANNOTATION_COLORS.context} /> : <LightningIcon size={9} color={ANNOTATION_COLORS.challenge} />}
              </span>
              <span style={{ fontSize: 10.5, color: 'rgba(0,0,0,0.65)', flex: 1, lineHeight: 1.35 }}>
                {ann.content}
              </span>
              <button
                onClick={() => onRemoveAnnotation(ann.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  color: 'rgba(0,0,0,0.3)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                <XIcon size={9} color="rgba(0,0,0,0.35)" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Annotation input — opens inline below */}
      {openInput && (
        <AnnotationInput
          annotationType={openInput}
          onSubmit={content => handleAnnotate(openInput, content)}
          onCancel={() => setOpenInput(null)}
        />
      )}
    </div>
  )
}
