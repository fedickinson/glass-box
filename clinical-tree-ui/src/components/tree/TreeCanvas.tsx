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
      const node = nodes.find(n => n.id === focusState.selectedNodeId)
      if (node?.is_decision_point) {
        const nodeMap = new Map(nodes.map(n => [n.id, n]))
        const result = new Set<string>([node.id])
        // Walk UP to include ancestors (so connections leading into the decision stay visible)
        let ancestor = node.parent_id ? nodeMap.get(node.parent_id) : undefined
        while (ancestor) {
          result.add(ancestor.id)
          ancestor = ancestor.parent_id ? nodeMap.get(ancestor.parent_id) : undefined
        }
        // BFS DOWN to include all descendants
        const queue = [node.id]
        while (queue.length) {
          const cur = queue.shift()!
          for (const n of nodes) {
            if (n.parent_id === cur && !result.has(n.id)) {
              result.add(n.id)
              queue.push(n.id)
            }
          }
        }
        return result
      }
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

  // Intro beat: find root node for skeleton card positioning
  const introNode =
    growthBeat !== null && growthBeat.visibleIds.length === 0
      ? (nodes.find(n => n.id === 'root') ?? orderedNodes[0])
      : null

  // Build a set of visible node IDs from the current beat.
  // null means no growth active — all nodes are visible.
  const growthVisibleSet = growthBeat ? new Set(growthBeat.visibleIds) : null

  const selectedNode =
    focusState.mode === 'branch_focused' && focusState.selectedNodeId
      ? nodes.find(n => n.id === focusState.selectedNodeId)
      : undefined

  const isFocused = focusState.mode !== 'idle'
  const focusedDecisionId = selectedNode?.is_decision_point ? selectedNode.id : undefined

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
        focusedDecisionId={focusedDecisionId}
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


      {/* ── Intro skeleton card — visible only during the intro beat before any node appears ── */}
      {introNode && (() => {
        const nx = introNode.x, ny = introNode.y
        const nw = introNode.width, nh = introNode.height
        return (
          <g style={{ animation: 'card-intro-fadein 0.5s ease-out forwards', pointerEvents: 'none' }}>
            {/* Outer glow halo */}
            <rect x={nx - 12} y={ny - 12} width={nw + 24} height={nh + 24} rx={16}
              fill="rgba(26,95,180,0.04)" stroke="rgba(26,95,180,0.10)" strokeWidth={8}
              style={{ animation: 'assessment-loading-pulse 1.6s ease-in-out infinite' }} />
            {/* Card shell */}
            <rect x={nx} y={ny} width={nw} height={nh} rx={12}
              fill="rgba(220,237,255,0.62)" stroke="rgba(26,95,180,0.18)" strokeWidth={1}
              style={{ animation: 'assessment-loading-pulse 1.6s ease-in-out infinite' }} />
            {/* Left accent bar */}
            <rect x={nx} y={ny} width={3} height={nh} rx={1.5}
              fill="rgba(26,95,180,0.55)"
              style={{ animation: 'assessment-loading-pulse 1.6s ease-in-out infinite' }} />
            {/* Skeleton lines */}
            <rect x={nx + 16} y={ny + 18} width={nw * 0.55} height={10} rx={5}
              fill="rgba(26,95,180,0.18)"
              style={{ animation: 'assessment-loading-pulse 1.6s 0.1s ease-in-out infinite' }} />
            <rect x={nx + 16} y={ny + 38} width={nw * 0.80} height={8} rx={4}
              fill="rgba(26,95,180,0.12)"
              style={{ animation: 'assessment-loading-pulse 1.6s 0.25s ease-in-out infinite' }} />
            <rect x={nx + 16} y={ny + 54} width={nw * 0.65} height={8} rx={4}
              fill="rgba(26,95,180,0.10)"
              style={{ animation: 'assessment-loading-pulse 1.6s 0.4s ease-in-out infinite' }} />
            {/* "Initializing assessment…" label */}
            <text x={nx + nw / 2} y={ny + nh - 14} textAnchor="middle"
              fontSize={10} fill="rgba(26,95,180,0.45)" fontFamily="system-ui, sans-serif"
              style={{ animation: 'assessment-loading-pulse 1.6s 0.6s ease-in-out infinite' }}>
              Initializing assessment…
            </text>
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
          const nx = node.x, ny = node.y, nw = node.width, nh = node.height
          return (
            <g key={node.id} style={growthDimmed ? { opacity: 0.52, transition: 'opacity 300ms ease-out' } : { transition: 'opacity 300ms ease-out' }}>
              {/* Glow ring — mounts when node first becomes visible during growth, plays once */}
              {growthBeat !== null && isVisible && (
                <g style={{ animation: 'terminal-glow-ring 3s ease-out forwards', pointerEvents: 'none' }}>
                  <rect x={nx - 20} y={ny - 20} width={nw + 40} height={nh + 40} rx={18}
                    fill="rgba(212,149,10,0.05)" stroke="rgba(212,149,10,0.08)" strokeWidth={14} />
                  <rect x={nx - 10} y={ny - 10} width={nw + 20} height={nh + 20} rx={14}
                    fill="none" stroke="rgba(212,149,10,0.22)" strokeWidth={5} />
                  <rect x={nx - 3} y={ny - 3} width={nw + 6} height={nh + 6} rx={11}
                    fill="none" stroke="rgba(212,149,10,0.60)" strokeWidth={1.5} />
                </g>
              )}
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
          <g key={node.id} style={growthDimmed ? { opacity: 0.52, transition: 'opacity 300ms ease-out' } : { transition: 'opacity 300ms ease-out' }}>
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
