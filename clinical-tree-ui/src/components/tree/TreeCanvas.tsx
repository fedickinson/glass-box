/** TreeCanvas — SVG element containing all nodes and connections */
import React, { useMemo } from 'react'
import { PositionedNode, Connection, Convergence, FocusState, DoctorAnnotation, ViewMode, PruneSource } from '../../types/tree'
import { buildBranchPath } from '../../data/transformer'
import TreeNode, { FocusRole } from './TreeNode'
import TreeConnections from './TreeConnections'
import TerminalCard, { TerminalVariant, deriveTerminalVariant } from './TerminalCard'

interface Props {
  nodes: PositionedNode[]
  connections: Connection[]
  convergences: Convergence[]
  focusState: FocusState
  prunedBranchIds: Set<string>
  pruneSourceMap: Map<string, 'shield' | 'doctor'>
  growthBeat: { visibleIds: string[]; activeBranchIds: string[] | null } | null
  decisionAutoPausedNodeId: string | null
  viewMode: ViewMode
  annotations: DoctorAnnotation[]
  hoveredNodeId?: string | null
  onNodeClick: (nodeId: string) => void
  onCanvasClick: () => void
}

const CANVAS_PAD = 40

const getTerminalVariant = deriveTerminalVariant

function computeFocusRole(
  node: PositionedNode,
  focusState: FocusState,
  selectedNode: PositionedNode | undefined,
  focusedNodeIds: Set<string> | null
): FocusRole {
  if (focusState.mode === 'idle') return 'none'

  if (focusState.mode === 'hypothesis_focused') {
    if (focusState.highlightedNodeId && node.id === focusState.highlightedNodeId) return 'selected'
    return focusedNodeIds?.has(node.id) ? 'on_focused_branch' : 'dimmed'
  }

  // branch_focused from here
  // Decision points are the pivot where branches diverge — don't dim anything
  // when one is selected, because all outgoing paths are equally valid.
  if (selectedNode?.is_decision_point) {
    return node.id === focusState.selectedNodeId ? 'selected' : 'none'
  }
  if (node.id === focusState.selectedNodeId) return 'selected'
  if (focusedNodeIds?.has(node.id)) return 'on_focused_branch'
  return 'dimmed'
}

export default function TreeCanvas({
  nodes,
  connections,
  convergences,
  focusState,
  prunedBranchIds,
  pruneSourceMap,
  growthBeat,
  decisionAutoPausedNodeId,
  viewMode,
  annotations,
  hoveredNodeId,
  onNodeClick,
  onCanvasClick,
}: Props) {
  if (nodes.length === 0) return null

  // Compute the set of highlighted node IDs for the current focus mode.
  // For branch_focused: includes ancestors + branch nodes (from branchNodeIds).
  // For hypothesis_focused: union of all paths for each branch in the group.
  const focusedNodeIds = useMemo((): Set<string> | null => {
    if (focusState.mode === 'branch_focused') {
      return new Set(focusState.branchNodeIds)
    }
    if (focusState.mode === 'hypothesis_focused') {
      const ids = new Set<string>()
      for (const branchId of focusState.branchIds) {
        buildBranchPath(branchId, nodes).forEach(id => ids.add(id))
      }
      return ids
    }
    return null
  }, [focusState, nodes])

  // Compute SVG canvas dimensions from node positions.
  // Add extra height for shield violation callouts (callout box is ~100px tall).
  const hasViolationCallout = nodes.some(
    n => n.shield_severity && !n.isTerminal && prunedBranchIds.has(n.branch_id) && pruneSourceMap.get(n.branch_id) === 'shield'
  )
  const maxX = Math.max(...nodes.map(n => n.x + n.width)) + CANVAS_PAD
  const maxY = Math.max(...nodes.map(n => n.y + n.height)) + CANVAS_PAD + (hasViolationCallout ? 120 : 0)

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

  // Build a set of visible node IDs from the current beat.
  // null means no growth active — all nodes are visible.
  const growthVisibleSet = growthBeat ? new Set(growthBeat.visibleIds) : null

  const selectedNode =
    focusState.mode === 'branch_focused' && focusState.selectedNodeId
      ? nodes.find(n => n.id === focusState.selectedNodeId)
      : undefined

  const isFocused = focusState.mode !== 'idle'

  return (
    <svg
      width={maxX}
      height={maxY}
      style={{ display: 'block', cursor: 'default' }}
      onClick={onCanvasClick}
    >
      {/* ── Shared defs: shadow filter + per-node clip paths ── */}
      <defs>
        {/* Drop shadow for all node cards — multi-layer like Variant F */}
        <filter id="node-drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="rgba(0,0,0,0.08)" />
          <feDropShadow dx="0" dy="4"  stdDeviation="7"  floodColor="rgba(0,0,0,0.09)" />
          <feDropShadow dx="0" dy="12" stdDeviation="22" floodColor="rgba(0,0,0,0.06)" />
        </filter>

        {/* Apple Glass tinted gradient fills — Variant F spec (148° ≈ x1=1,y1=0 → x2=0,y2=1) */}
        <linearGradient id="fill-thought" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgb(235,246,255)" stopOpacity="0.97" />
          <stop offset="100%" stopColor="rgb(215,235,255)" stopOpacity="0.94" />
        </linearGradient>
        <linearGradient id="fill-tool" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgb(232,250,240)" stopOpacity="0.97" />
          <stop offset="100%" stopColor="rgb(210,242,224)" stopOpacity="0.94" />
        </linearGradient>
        <linearGradient id="fill-citation" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgb(246,240,255)" stopOpacity="0.97" />
          <stop offset="100%" stopColor="rgb(232,220,255)" stopOpacity="0.94" />
        </linearGradient>
        <linearGradient id="fill-decision" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgb(255,250,230)" stopOpacity="0.97" />
          <stop offset="100%" stopColor="rgb(255,241,195)" stopOpacity="0.94" />
        </linearGradient>
        <linearGradient id="fill-flagged" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgb(255,240,238)" stopOpacity="0.97" />
          <stop offset="100%" stopColor="rgb(254,225,220)" stopOpacity="0.94" />
        </linearGradient>

        {/* Assessment start node fill — richer, deeper blue than standard thought nodes */}
        <linearGradient id="fill-assessment" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgb(220,237,255)" stopOpacity="0.98" />
          <stop offset="100%" stopColor="rgb(196,222,255)" stopOpacity="0.95" />
        </linearGradient>

        {/* Compliance check node fill — neutral slate, result communicated by badge not card color */}
        <linearGradient id="fill-compliance" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgb(248,249,252)" stopOpacity="0.98" />
          <stop offset="100%" stopColor="rgb(238,241,248)" stopOpacity="0.95" />
        </linearGradient>

        {/* Per-node clip paths for rounded left accent border.
            Use node.height directly — it already accounts for decision/compliance variants. */}
        {nodes.map(node => (
          <clipPath key={node.id} id={`clip-${node.id}`}>
            <rect
              x={node.x}
              y={node.y}
              width={node.width}
              height={node.height}
              rx={12}
            />
          </clipPath>
        ))}
      </defs>

      {/* ── Connections (behind nodes) ── */}
      <TreeConnections
        connections={connections}
        focusedNodeIds={focusedNodeIds}
        isFocused={isFocused}
        prunedBranchIds={prunedBranchIds}
        pruneSourceMap={pruneSourceMap}
        growthBeat={growthBeat}
      />

      {/* ── Convergence dot: marks where fan-in lines terminate on the assessment node ── */}
      {(() => {
        const fanTarget = connections.find(c => c.isPreflightFanIn)
        const targetNode = fanTarget ? nodes.find(n => n.id === fanTarget.targetId) : null
        if (!targetNode) return null
        const cx = targetNode.x
        const cy = targetNode.y + targetNode.height / 2
        return (
          <g>
            {/* Outer glow ring */}
            <circle cx={cx} cy={cy} r={9} fill="rgba(26,95,180,0.08)" />
            {/* Inner filled dot */}
            <circle cx={cx} cy={cy} r={4.5} fill="#1A5FB4" fillOpacity={0.7} />
            {/* Crisp center */}
            <circle cx={cx} cy={cy} r={2} fill="#fff" fillOpacity={0.9} />
          </g>
        )
      })()}


      {/* ── Nodes ── */}
      {orderedNodes.map(node => {
        const focusRole = computeFocusRole(node, focusState, selectedNode, focusedNodeIds)
        const isPruned = prunedBranchIds.has(node.branch_id)
        const pruneSource = pruneSourceMap.get(node.branch_id)
        const isVisible = growthVisibleSet === null || growthVisibleSet.has(node.id)

        // Growth-based dimming: when a beat specifies active branches, nodes
        // on other branches render at reduced opacity to focus the viewer's attention.
        const growthDimmed =
          growthBeat != null &&
          growthBeat.activeBranchIds != null &&
          !growthBeat.activeBranchIds.includes(node.branch_id)

        if (node.isTerminal) {
          return (
            <g key={node.id} style={growthDimmed ? { opacity: 0.35, transition: 'opacity 300ms ease-out' } : { transition: 'opacity 300ms ease-out' }}>
              <TerminalCard
                node={node}
                variant={getTerminalVariant(node, isPruned, pruneSource, convergences)}
                convergences={convergences}
                focusRole={focusRole}
                isVisible={isVisible}
                onClick={() => onNodeClick(node.id)}
              />
            </g>
          )
        }

        return (
          <g key={node.id} style={growthDimmed ? { opacity: 0.35, transition: 'opacity 300ms ease-out' } : { transition: 'opacity 300ms ease-out' }}>
            <TreeNode
              node={node}
              focusRole={focusRole}
              isPruned={isPruned}
              pruneSource={pruneSource}
              isVisible={isVisible}
              isDecisionAutoPaused={node.id === decisionAutoPausedNodeId}
              isHovered={hoveredNodeId === node.id}
              annotations={annotationsByNode.get(node.id) ?? []}
              viewMode={viewMode}
              onClick={() => onNodeClick(node.id)}
            />
          </g>
        )
      })}
    </svg>
  )
}
