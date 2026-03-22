/**
 * transformer.ts — the integration seam between backend data and the React UI.
 * Converts a flat TreeNode[] array into a PositionedTree with pixel coordinates
 * and pre-computed SVG path data. Only place in the codebase that uses d3.
 * When the real backend arrives, only this file changes.
 */
import { stratify, tree as d3tree } from 'd3-hierarchy'
import { TreeNode, PositionedNode, PositionedTree, Connection, Convergence } from '../types/tree'

// ── Layout constants (exported so components can size SVG canvas) ──
export const NODE_W = 220
export const NODE_W_ASSESSMENT = 264 // first reasoning node — wider to show patient context
export const NODE_W_TERMINAL = 210   // terminal verdict cards — compact label only, detail in panel
export const NODE_H = 80
export const NODE_H_DECISION = 108
export const NODE_H_COMPLIANCE = 64  // preflight/terminal safety checks — compact
export const NODE_H_ASSESSMENT = 128 // first reasoning node — expanded with patient context + vitals
export const NODE_H_TERMINAL = 120   // terminal verdict cards — taller for visual distinction
const DEPTH_STEP = NODE_W + 90   // horizontal distance between depth levels
const SIBLING_STEP = NODE_H + 20 // vertical distance between adjacent nodes
const FAN_SPACING = NODE_H_COMPLIANCE + 18 // vertical gap between fanned preflight nodes
const PADDING_X = 32
const PADDING_Y = 32

export function transformTree(nodes: TreeNode[]): PositionedTree {
  if (nodes.length === 0) {
    return { nodes: [], connections: [], convergences: [], primaryPathNodeIds: [], branchIds: [] }
  }

  // 1. Build d3 hierarchy from parent_id references
  const root = stratify<TreeNode>()
    .id(d => d.id)
    .parentId(d => d.parent_id ?? undefined)(nodes)

  // 2. Compute left-to-right layout.
  //    d3.tree() default is top-down (x = horizontal, y = depth).
  //    We swap: pixel_x = d.y (depth axis), pixel_y = d.x (sibling spread axis).
  //    layout(root) returns HierarchyPointNode where x/y are guaranteed numbers.
  const layoutRoot = d3tree<TreeNode>().nodeSize([SIBLING_STEP, DEPTH_STEP])(root)

  // 3. Find min x to normalize (d3 centers root at x=0, so siblings go negative)
  let minX = Infinity
  layoutRoot.each(node => { minX = Math.min(minX, node.x) })

  // 4. Map to PositionedNode[] with pixel coordinates
  const positionedNodes: PositionedNode[] = layoutRoot.descendants().map(d => ({
    ...d.data,
    x: d.y + PADDING_X,
    y: d.x - minX + PADDING_Y,
    width: d.data.is_reasoning_start ? NODE_W_ASSESSMENT
         : (!d.children && d.data.diagnosis !== null) ? NODE_W_TERMINAL
         : NODE_W,
    height: d.data.is_decision_point ? NODE_H_DECISION
          : d.data.is_compliance_check ? NODE_H_COMPLIANCE
          : d.data.is_reasoning_start ? NODE_H_ASSESSMENT
          : (!d.children && d.data.diagnosis !== null) ? NODE_H_TERMINAL
          : NODE_H,
    depth: d.depth,
    isOnPrimaryPath: d.data.branch_id === 'primary',
    isTerminal: !d.children && d.data.diagnosis !== null,
  }))

  // ── POST-PROCESS: preflight fan layout ─────────────────────────────────────
  // Instead of a linear chain (c001→c002→c003→n001), position the preflight
  // compliance nodes as a vertical fan all converging on the first reasoning node.
  // This is purely a visual re-arrangement; the data relationships are unchanged.
  const preflightNodes = positionedNodes
    .filter(n => n.is_compliance_check && n.compliance_check_type === 'preflight')
    .sort((a, b) => (a.step_index ?? 0) - (b.step_index ?? 0))

  const preflightIds = new Set(preflightNodes.map(n => n.id))
  let preflightTargetId: string | null = null

  if (preflightNodes.length > 0) {
    // The convergence target is the child of the last preflight node in the chain
    const lastPreflight = preflightNodes[preflightNodes.length - 1]
    preflightTargetId = nodes.find(raw => raw.parent_id === lastPreflight.id)?.id ?? null
    const targetNode = preflightTargetId
      ? positionedNodes.find(n => n.id === preflightTargetId)
      : null

    if (targetNode) {
      // Shift all non-preflight nodes left so the fan only takes one depth column
      // instead of N columns (one per chained node).
      const shift = (preflightNodes.length - 1) * DEPTH_STEP
      positionedNodes.forEach(n => {
        if (!preflightIds.has(n.id)) n.x -= shift
      })

      // Place all preflight nodes at the same x, vertically centered around target
      const fanX = targetNode.x - DEPTH_STEP
      const totalSpread = (preflightNodes.length - 1) * FAN_SPACING
      const centerY = targetNode.y + targetNode.height / 2
      preflightNodes.forEach((n, i) => {
        n.x = fanX
        n.y = centerY - totalSpread / 2 + i * FAN_SPACING - n.height / 2
      })
    }
  }

  // 5. Build node map from FINAL positions (after any fan repositioning)
  const nodeMap = new Map(positionedNodes.map(n => [n.id, n]))

  // 6. Compute connections with bezier curve SVG path data
  const makePath = (
    sx: number, sy: number,
    tx: number, ty: number
  ): string => {
    const midX = (sx + tx) / 2
    return `M ${sx},${sy} C ${midX},${sy} ${midX},${ty} ${tx},${ty}`
  }

  const d3Connections: Connection[] = layoutRoot.links().map(link => {
    const source = nodeMap.get(link.source.data.id)!
    const target = nodeMap.get(link.target.data.id)!
    const sx = source.x + source.width
    const tx = target.x
    const ty = target.y + target.height / 2
    // Assessment nodes are taller than standard nodes — align exit Y to target center
    // so the connection is a straight horizontal line instead of a diagonal curve
    const sy = source.is_reasoning_start ? ty : source.y + source.height / 2
    return {
      id: `${source.id}->${target.id}`,
      sourceId: source.id,
      targetId: target.id,
      sourceBranchId: source.branch_id,
      targetBranchId: target.branch_id,
      isOnPrimaryPath: source.branch_id === 'primary' && target.branch_id === 'primary',
      pathData: makePath(sx, sy, tx, ty),
    }
  })

  // Replace preflight chain connections with fan-in connections.
  // Chain links (preflight→preflight and last-preflight→target) are removed;
  // synthetic fan-in links (each preflight→target) are added in their place.
  let connections: Connection[]
  if (preflightNodes.length > 0 && preflightTargetId) {
    const targetNode = nodeMap.get(preflightTargetId)!
    const tx = targetNode.x
    const ty = targetNode.y + targetNode.height / 2

    const filteredConnections = d3Connections.filter(conn =>
      // Drop all preflight-to-preflight chain links
      !(preflightIds.has(conn.sourceId) && preflightIds.has(conn.targetId)) &&
      // Drop last-preflight-to-target link (replaced by explicit fan-in below)
      !(preflightIds.has(conn.sourceId) && conn.targetId === preflightTargetId)
    )

    const fanInConnections: Connection[] = preflightNodes.map(pfn => {
      const sx = pfn.x + pfn.width
      const sy = pfn.y + pfn.height / 2
      return {
        id: `${pfn.id}->${preflightTargetId}`,
        sourceId: pfn.id,
        targetId: preflightTargetId!,
        sourceBranchId: pfn.branch_id,
        targetBranchId: targetNode.branch_id,
        isOnPrimaryPath: false,
        pathData: makePath(sx, sy, tx, ty),
        isPreflightFanIn: true,
        complianceResult: pfn.compliance_result,
      }
    })

    connections = [...filteredConnections, ...fanInConnections]
  } else {
    connections = d3Connections
  }

  // 7. Find convergences: multiple branches that reach the same terminal diagnosis
  const diagnosisGroups = new Map<string, PositionedNode[]>()
  positionedNodes
    .filter(n => n.diagnosis !== null)
    .forEach(n => {
      const list = diagnosisGroups.get(n.diagnosis!) ?? []
      list.push(n)
      diagnosisGroups.set(n.diagnosis!, list)
    })

  const convergences: Convergence[] = []
  for (const [diagnosis, group] of diagnosisGroups) {
    if (group.length > 1) {
      convergences.push({
        diagnosis,
        branchIds: [...new Set(group.map(n => n.branch_id))],
        terminalNodeIds: group.map(n => n.id),
      })
    }
  }

  // 8. Primary path node IDs in step_index order
  const primaryPathNodeIds = positionedNodes
    .filter(n => n.branch_id === 'primary')
    .sort((a, b) => (a.step_index ?? 0) - (b.step_index ?? 0))
    .map(n => n.id)

  // 9. All branch IDs (primary first, then others in order of appearance)
  const branchIds = [...new Set(['primary', ...positionedNodes.map(n => n.branch_id)])]
    .filter(id => positionedNodes.some(n => n.branch_id === id))

  return { nodes: positionedNodes, connections, convergences, primaryPathNodeIds, branchIds }
}

/**
 * Build the full path of node IDs from root to the terminal node of a branch.
 * Includes ancestor nodes (which may be on the primary branch) before the fork.
 * Used by the reducer to populate branchNodeIds for navigation and the scrubber.
 */
export function buildBranchPath(branchId: string, nodes: PositionedNode[]): string[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]))
  const branchNodes = nodes
    .filter(n => n.branch_id === branchId)
    .sort((a, b) => (a.step_index ?? 0) - (b.step_index ?? 0))

  if (branchNodes.length === 0) return []

  // Walk up from first branch node to root, collecting ancestors
  const ancestors: string[] = []
  let current: PositionedNode | undefined =
    branchNodes[0].parent_id ? nodeMap.get(branchNodes[0].parent_id) : undefined
  while (current) {
    ancestors.unshift(current.id)
    current = current.parent_id ? nodeMap.get(current.parent_id) : undefined
  }

  return [...ancestors, ...branchNodes.map(n => n.id)]
}
