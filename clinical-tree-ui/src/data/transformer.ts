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
export const NODE_H = 80
export const NODE_H_DECISION = 92
const DEPTH_STEP = NODE_W + 90   // horizontal distance between depth levels
const SIBLING_STEP = NODE_H + 20 // vertical distance between adjacent nodes
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
    width: NODE_W,
    height: d.data.is_decision_point ? NODE_H_DECISION : NODE_H,
    depth: d.depth,
    isOnPrimaryPath: d.data.branch_id === 'primary',
  }))

  // 5. Build node map for connection + convergence computation
  const nodeMap = new Map(positionedNodes.map(n => [n.id, n]))

  // 6. Compute connections with bezier curve SVG path data
  const connections: Connection[] = layoutRoot.links().map(link => {
    const source = nodeMap.get(link.source.data.id)!
    const target = nodeMap.get(link.target.data.id)!
    const sx = source.x + source.width
    const sy = source.y + source.height / 2
    const tx = target.x
    const ty = target.y + target.height / 2
    const midX = (sx + tx) / 2
    return {
      id: `${source.id}->${target.id}`,
      sourceId: source.id,
      targetId: target.id,
      sourceBranchId: source.branch_id,
      targetBranchId: target.branch_id,
      isOnPrimaryPath: source.branch_id === 'primary' && target.branch_id === 'primary',
      pathData: `M ${sx},${sy} C ${midX},${sy} ${midX},${ty} ${tx},${ty}`,
    }
  })

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
