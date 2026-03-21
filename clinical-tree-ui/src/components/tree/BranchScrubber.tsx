/** BranchScrubber — bottom-bar navigation dots showing branch position. Visible when a branch is focused. */
import React, { useRef } from 'react'
import { PositionedNode } from '../../types/tree'

const TYPE_COLORS: Record<string, string> = {
  thought: '#3B7DD8',
  tool: '#2D8A56',
  citation: '#7B5EA7',
}
const DECISION_COLOR = '#D4950A'
const DOT_NORMAL = 8
const DOT_SELECTED = 12

interface Props {
  branchNodeIds: string[]
  nodes: PositionedNode[]
  selectedIndex: number
  onScrub: (index: number) => void
}

export default function BranchScrubber({ branchNodeIds, nodes, selectedIndex, onScrub }: Props) {
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const trackRef = useRef<HTMLDivElement>(null)

  function indexFromPointer(e: React.PointerEvent | PointerEvent): number {
    const track = trackRef.current
    if (!track || branchNodeIds.length <= 1) return selectedIndex
    const rect = track.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    return Math.round(ratio * (branchNodeIds.length - 1))
  }

  function handlePointerDown(e: React.PointerEvent) {
    e.preventDefault()
    onScrub(indexFromPointer(e))
    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (e.buttons > 0) onScrub(indexFromPointer(e))
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 48,
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(0,0,0,0.07)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: 0,
        userSelect: 'none',
      }}
    >
      {/* Label */}
      <span
        style={{
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: 'rgba(0,0,0,0.35)',
          marginRight: 16,
          whiteSpace: 'nowrap',
        }}
      >
        Branch path
      </span>

      {/* Track */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          position: 'relative',
          height: 28,
        }}
      >
        {/* Connector line */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '50%',
            height: 1.5,
            background: 'rgba(0,0,0,0.1)',
            transform: 'translateY(-50%)',
            borderRadius: 1,
          }}
        />

        {/* Progress fill */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            width:
              branchNodeIds.length > 1
                ? `${(selectedIndex / (branchNodeIds.length - 1)) * 100}%`
                : '100%',
            top: '50%',
            height: 1.5,
            background: 'rgba(59,125,216,0.45)',
            transform: 'translateY(-50%)',
            borderRadius: 1,
            transition: 'width 150ms ease-out',
          }}
        />

        {/* Dots */}
        {branchNodeIds.map((id, i) => {
          const node = nodeMap.get(id)
          const isSelected = i === selectedIndex
          const color = node?.is_decision_point
            ? DECISION_COLOR
            : TYPE_COLORS[node?.type ?? 'thought'] ?? '#888'
          const size = isSelected ? DOT_SELECTED : DOT_NORMAL
          const left =
            branchNodeIds.length > 1 ? `${(i / (branchNodeIds.length - 1)) * 100}%` : '50%'

          return (
            <div
              key={id}
              onClick={e => { e.stopPropagation(); onScrub(i) }}
              style={{
                position: 'absolute',
                left,
                transform: 'translateX(-50%)',
                width: size,
                height: size,
                borderRadius: '50%',
                background: isSelected ? color : `${color}88`,
                border: isSelected ? `2px solid ${color}` : '1.5px solid rgba(255,255,255,0.9)',
                boxShadow: isSelected ? `0 0 0 3px ${color}22` : 'none',
                transition: 'all 150ms ease-out',
                zIndex: isSelected ? 2 : 1,
              }}
              title={node?.headline ?? id}
            />
          )
        })}
      </div>

      {/* Position counter */}
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: 'rgba(0,0,0,0.35)',
          marginLeft: 16,
          whiteSpace: 'nowrap',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {selectedIndex + 1} / {branchNodeIds.length}
      </span>
    </div>
  )
}
