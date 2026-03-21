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
  hoveredNodeId?: string | null
  onNodeClick: (nodeId: string) => void
  onCanvasClick: () => void
}

const CANVAS_PAD = 40

function computeFocusRole(
  node: PositionedNode,
  focusState: FocusState,
  selectedNode: PositionedNode | undefined
): FocusRole {
  if (focusState.mode === 'idle') return 'none'
  // Decision points are the pivot where branches diverge — don't dim anything
  // when one is selected, because all outgoing paths are equally valid.
  if (selectedNode?.is_decision_point) {
    return node.id === focusState.selectedNodeId ? 'selected' : 'none'
  }
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
  hoveredNodeId,
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

  const selectedNode =
    focusState.mode === 'branch_focused' && focusState.selectedNodeId
      ? nodes.find(n => n.id === focusState.selectedNodeId)
      : undefined

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

      {/* ── Convergence badges — small pill on each terminal node in a convergence group ── */}
      {convergences.map(conv =>
        conv.terminalNodeIds.map(id => {
          const node = nodes.find(n => n.id === id)
          if (!node) return null
          const bx = node.x + node.width + 6
          const by = node.y + node.height / 2
          return (
            <g key={`conv-${conv.diagnosis}-${id}`}>
              {/* Pill background */}
              <rect
                x={bx}
                y={by - 9}
                width={62}
                height={18}
                rx={9}
                fill="var(--node-tool-fill)"
                stroke="var(--conn-convergence-color)"
                strokeWidth={1.2}
                strokeOpacity={0.7}
              />
              <text
                x={bx + 31}
                y={by + 4.5}
                textAnchor="middle"
                style={{
                  fontSize: 8.5,
                  fontWeight: 700,
                  fill: 'var(--conn-convergence-color)',
                  letterSpacing: '0.06em',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
              >
                ↗ CONVERGES
              </text>
            </g>
          )
        })
      )}

      {/* ── Nodes ── */}
      {orderedNodes.map(node => (
        <TreeNode
          key={node.id}
          node={node}
          focusRole={computeFocusRole(node, focusState, selectedNode)}
          isPruned={prunedBranchIds.has(node.branch_id)}
          pruneSource={pruneSourceMap.get(node.branch_id)}
          isVisible={(node.step_index ?? 0) <= growthCursor}
          isGrowthPaused={false}
          isHovered={hoveredNodeId === node.id}
          annotations={annotationsByNode.get(node.id) ?? []}
          viewMode={viewMode}
          onClick={() => onNodeClick(node.id)}
        />
      ))}
    </svg>
  )
}
