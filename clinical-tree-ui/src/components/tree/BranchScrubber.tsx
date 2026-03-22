/** BranchScrubber — bottom-bar branch navigation. Visible when a branch is focused with no node selected. */
import React from 'react'
import { PositionedNode } from '../../types/tree'
import { ArrowLeftIcon, ArrowRightIcon } from '../shared/Icons'

interface Props {
  branchNodeIds: string[]
  nodes: PositionedNode[]
  selectedIndex: number
  onScrub: (index: number) => void
}

export default function BranchScrubber({ branchNodeIds, nodes, selectedIndex, onScrub }: Props) {
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const currentNode = nodeMap.get(branchNodeIds[selectedIndex])
  const canPrev = selectedIndex > 0
  const canNext = selectedIndex < branchNodeIds.length - 1

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
        justifyContent: 'center',
        padding: '0 24px',
        gap: 12,
        userSelect: 'none',
      }}
    >
      {/* Prev */}
      <button
        onClick={() => canPrev && onScrub(selectedIndex - 1)}
        disabled={!canPrev}
        style={{
          width: 28, height: 28, borderRadius: 8,
          background: canPrev ? 'rgba(26,82,168,0.07)' : 'rgba(0,0,0,0.03)',
          border: canPrev ? '1px solid rgba(26,82,168,0.18)' : '1px solid rgba(0,0,0,0.07)',
          color: canPrev ? '#1A52A8' : 'rgba(0,0,0,0.2)',
          cursor: canPrev ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 120ms ease-out',
        }}
      >
        <ArrowLeftIcon size={10} color={canPrev ? '#1A52A8' : 'rgba(0,0,0,0.2)'} />
      </button>

      {/* Counter + current headline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
          color: 'rgba(0,0,0,0.35)', whiteSpace: 'nowrap',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {selectedIndex + 1} / {branchNodeIds.length}
        </span>
        {currentNode && (
          <span style={{
            fontSize: 10.5, color: 'rgba(0,0,0,0.5)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            maxWidth: 260,
          }}>
            {currentNode.headline}
          </span>
        )}
      </div>

      {/* Next */}
      <button
        onClick={() => canNext && onScrub(selectedIndex + 1)}
        disabled={!canNext}
        style={{
          width: 28, height: 28, borderRadius: 8,
          background: canNext ? 'rgba(26,82,168,0.07)' : 'rgba(0,0,0,0.03)',
          border: canNext ? '1px solid rgba(26,82,168,0.18)' : '1px solid rgba(0,0,0,0.07)',
          color: canNext ? '#1A52A8' : 'rgba(0,0,0,0.2)',
          cursor: canNext ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 120ms ease-out',
        }}
      >
        <ArrowRightIcon size={10} color={canNext ? '#1A52A8' : 'rgba(0,0,0,0.2)'} />
      </button>
    </div>
  )
}
