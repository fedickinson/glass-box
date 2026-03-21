/** TreeCanvas — SVG element containing all nodes and connections */
import React from 'react'
import { PositionedNode, Connection, Convergence, FocusState, DoctorAnnotation, ViewMode } from '../../types/tree'
import { NODE_W, NODE_H, NODE_H_DECISION } from '../../data/transformer'
import TreeNode, { FocusRole } from './TreeNode'
import TreeConnections from './TreeConnections'

interface Props {
  nodes: PositionedNode[]
  connections: Connection[]
  convergences: Convergence[]
  focusState: FocusState
  prunedBranchIds: Set<string>
  pruneSourceMap: Map<string, 'shield' | 'doctor'>
  growthCursor: number
  viewMode: ViewMode
  annotations: DoctorAnnotation[]
  onNodeClick: (nodeId: string) => void
  onCanvasClick: () => void
}

const CANVAS_PAD = 40

function computeFocusRole(
  node: PositionedNode,
  focusState: FocusState
): FocusRole {
  if (focusState.mode === 'idle') return 'none'
  const { branchNodeIds, selectedNodeId } = focusState
  if (node.id === selectedNodeId) return 'selected'
  if (branchNodeIds.includes(node.id)) return 'on_focused_branch'
  return 'dimmed'
}

export default function TreeCanvas({
  nodes,
  connections,
  convergences,
  focusState,
  prunedBranchIds,
  pruneSourceMap,
  growthCursor,
  viewMode,
  annotations,
  onNodeClick,
  onCanvasClick,
}: Props) {
  if (nodes.length === 0) return null

  // Compute SVG canvas dimensions from node positions
  const maxX = Math.max(...nodes.map(n => n.x + n.width)) + CANVAS_PAD
  const maxY = Math.max(...nodes.map(n => n.y + n.height)) + CANVAS_PAD

  // Group annotations by nodeId for quick lookup
  const annotationsByNode = new Map<string, DoctorAnnotation[]>()
  annotations.forEach(a => {
    const list = annotationsByNode.get(a.nodeId) ?? []
    list.push(a)
    annotationsByNode.set(a.nodeId, list)
  })

  const orderedNodes = [...nodes].sort(
    (a, b) => (a.step_index ?? 0) - (b.step_index ?? 0)
  )

  return (
    <svg
      width={maxX}
      height={maxY}
      style={{ display: 'block', cursor: 'default' }}
      onClick={onCanvasClick}
    >
      {/* ── Shared defs: shadow filter + per-node clip paths ── */}
      <defs>
        {/* Drop shadow for all node cards */}
        <filter id="node-drop-shadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow
            dx="0"
            dy="2"
            stdDeviation="5"
            floodColor="rgba(0,0,0,0.09)"
          />
          <feDropShadow
            dx="0"
            dy="8"
            stdDeviation="16"
            floodColor="rgba(0,0,0,0.06)"
          />
        </filter>

        {/* Per-node clip paths for rounded left accent border.
            Coordinates are in SVG root space — the accent rect inside a
            translated <g> maps to the same root coords, so clipping works. */}
        {nodes.map(node => {
          const h = node.is_decision_point ? NODE_H_DECISION : NODE_H
          return (
            <clipPath key={node.id} id={`clip-${node.id}`}>
              <rect
                x={node.x}
                y={node.y}
                width={NODE_W}
                height={h}
                rx={12}
              />
            </clipPath>
          )
        })}
      </defs>

      {/* ── Connections (behind nodes) ── */}
      <TreeConnections
        connections={connections}
        focusState={focusState}
        prunedBranchIds={prunedBranchIds}
        growthCursor={growthCursor}
      />

      {/* ── Convergence indicators — green dashed arcs between terminal nodes ── */}
      {convergences.map(conv => {
        const terminals = conv.terminalNodeIds
          .map(id => nodes.find(n => n.id === id))
          .filter(Boolean) as PositionedNode[]
        if (terminals.length < 2) return null
        const first = terminals[0]
        const last = terminals[terminals.length - 1]
        const fx = first.x + first.width
        const fy = first.y + first.height / 2
        const lx = last.x + last.width
        const ly = last.y + last.height / 2
        const cx = Math.max(fx, lx) + 30
        return (
          <g key={conv.diagnosis} opacity={0.6}>
            <path
              d={`M ${fx},${fy} C ${cx},${fy} ${cx},${ly} ${lx},${ly}`}
              fill="none"
              stroke="var(--conn-convergence-color)"
              strokeWidth={1.5}
              strokeDasharray="5,3"
              strokeOpacity={0.5}
            />
          </g>
        )
      })}

      {/* ── Nodes ── */}
      {orderedNodes.map(node => (
        <TreeNode
          key={node.id}
          node={node}
          focusRole={computeFocusRole(node, focusState)}
          isPruned={prunedBranchIds.has(node.branch_id)}
          pruneSource={pruneSourceMap.get(node.branch_id)}
          isVisible={(node.step_index ?? 0) <= growthCursor}
          isGrowthPaused={false}
          annotations={annotationsByNode.get(node.id) ?? []}
          viewMode={viewMode}
          onClick={() => onNodeClick(node.id)}
        />
      ))}
    </svg>
  )
}
