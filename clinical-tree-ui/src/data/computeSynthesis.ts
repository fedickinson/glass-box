/**
 * computeSynthesis — pure function that derives SynthesisData from tree state.
 * Runs on every prune/restore/annotate/pin action. No side effects.
 */
import {
  PositionedTree,
  PositionedNode,
  DoctorAnnotation,
  SynthesisData,
  BranchSummary,
  NodeSummary,
  RejectedPath,
  PruneSource,
} from '../types/tree'
import { buildBranchPath } from './transformer'

export function computeSynthesis(
  tree: PositionedTree,
  prunedBranchIds: Set<string>,
  annotations: DoctorAnnotation[],
  pinnedBranchId: string | null,
  pruneSourceMap: Map<string, PruneSource>
): SynthesisData {
  const { nodes, branchIds } = tree
  const nodeMap = new Map(nodes.map(n => [n.id, n]))

  // Build annotation index
  const annotationsByNode = new Map<string, DoctorAnnotation[]>()
  annotations.forEach(a => {
    const list = annotationsByNode.get(a.nodeId) ?? []
    list.push(a)
    annotationsByNode.set(a.nodeId, list)
  })

  // Split active vs pruned branches
  const activeBranchIds = branchIds.filter(id => !prunedBranchIds.has(id))
  const pruned = branchIds.filter(id => prunedBranchIds.has(id))

  // Find the terminal node for a branch (node with no children, or last by step_index)
  function getTerminalNode(branchId: string): PositionedNode | undefined {
    const branchNodes = nodes.filter(n => n.branch_id === branchId)
    return (
      branchNodes.find(n => n.children.length === 0) ??
      [...branchNodes].sort((a, b) => (b.step_index ?? 0) - (a.step_index ?? 0))[0]
    )
  }

  // Group active branches by their terminal diagnosis
  const diagnosisGroups = new Map<string, string[]>()
  activeBranchIds.forEach(branchId => {
    const terminal = getTerminalNode(branchId)
    const diag = terminal?.diagnosis ?? 'Undetermined'
    const group = diagnosisGroups.get(diag) ?? []
    group.push(branchId)
    diagnosisGroups.set(diag, group)
  })

  // Primary diagnosis = largest convergence group (or pinned branch's diagnosis)
  let primaryDiagnosis = 'Undetermined'
  let maxGroupSize = 0
  for (const [diag, group] of diagnosisGroups) {
    if (group.length > maxGroupSize) {
      maxGroupSize = group.length
      primaryDiagnosis = diag
    }
  }
  if (pinnedBranchId) {
    const pinnedTerminal = getTerminalNode(pinnedBranchId)
    if (pinnedTerminal?.diagnosis) primaryDiagnosis = pinnedTerminal.diagnosis
  }

  const totalActive = activeBranchIds.length
  const convergingCount = diagnosisGroups.get(primaryDiagnosis)?.length ?? 0
  const convergenceRatio = totalActive > 0 ? convergingCount / totalActive : 0
  const confidenceLevel =
    convergenceRatio >= 0.66 ? 'high' : convergenceRatio >= 0.4 ? 'moderate' : 'low'

  // Primary path terminal node for recommendation text
  const primaryTerminal = getTerminalNode('primary')

  // --- Build branch summaries ---
  const branches: BranchSummary[] = activeBranchIds.map(branchId => {
    const branchPath = buildBranchPath(branchId, nodes)
    const branchPathNodes = branchPath
      .map(id => nodeMap.get(id))
      .filter((n): n is PositionedNode => !!n)
    const ownNodes = branchPathNodes.filter(n => n.branch_id === branchId)
    const terminal = ownNodes[ownNodes.length - 1]
    const terminalDiag = terminal?.diagnosis ?? null

    // Find the decision node this branch forked from
    const firstOwnNode = ownNodes[0]
    const forkDecisionNode = firstOwnNode?.parent_id ? nodeMap.get(firstOwnNode.parent_id) : undefined
    const decisionNode =
      forkDecisionNode?.is_decision_point ? forkDecisionNode :
      branchPathNodes.find(n => n.is_decision_point && n.branch_id !== branchId) ?? null

    // Convergence
    const convergsWith =
      terminalDiag === primaryDiagnosis && branchId !== 'primary' ? primaryDiagnosis : null

    // Node summaries: tool calls, citations, decision points, terminal
    const nodeSummaries: NodeSummary[] = ownNodes
      .filter(n => n.type === 'tool' || n.type === 'citation' || n.is_decision_point || n.diagnosis !== null)
      .map(n => ({
        nodeId: n.id,
        type: n.type,
        headline: n.headline,
        detail: n.content,
        source: n.source ?? null,
        isKeyStep: n.is_decision_point || n.diagnosis !== null || n.type === 'tool',
        shieldFlag: n.shield_severity ?? null,
      }))

    // Narrative from first thought node content
    const firstThought = ownNodes.find(n => n.type === 'thought')
    const toolNodes = ownNodes.filter(n => n.type === 'tool')
    let narrative = firstThought?.content.slice(0, 180) ?? ''
    if (firstThought && firstThought.content.length > 180) narrative += '…'
    if (toolNodes.length > 0 && branchId === 'primary') {
      narrative = `Sequential cardiac evaluation: risk stratification, drug interaction check, TIMI scoring. ${terminalDiag ? 'Concluded: ' + terminalDiag + '.' : ''}`
    }
    if (!narrative && terminalDiag) narrative = `Analysis concludes: ${terminalDiag}.`

    // Caveat for divergent branches
    let caveat = null
    if (terminalDiag && terminalDiag !== primaryDiagnosis && decisionNode) {
      caveat = {
        condition: `If the ${decisionNode.headline.toLowerCase()} shifts toward this hypothesis`,
        implication: `Pursue ${terminalDiag} as primary diagnosis`,
        sourceNodeId: decisionNode.id,
        sourceBranchId: branchId,
      }
    }

    return {
      branchId,
      isPrimary: branchId === 'primary',
      diagnosis: terminalDiag,
      convergsWith,
      narrativeSummary: narrative,
      keyDecision: decisionNode?.headline ?? null,
      decisionNodeId: decisionNode?.id ?? null,
      nodeSummaries,
      caveat,
    }
  })

  // Sort: primary first, pinned second, then convergent, then divergent
  branches.sort((a, b) => {
    if (a.branchId === 'primary') return -1
    if (b.branchId === 'primary') return 1
    if (a.branchId === pinnedBranchId) return -1
    if (b.branchId === pinnedBranchId) return 1
    if (a.convergsWith && !b.convergsWith) return -1
    if (!a.convergsWith && b.convergsWith) return 1
    return 0
  })

  // --- Rejected paths ---
  const rejectedPaths: RejectedPath[] = pruned.map(branchId => {
    const terminal = getTerminalNode(branchId)
    const pruneSource = pruneSourceMap.get(branchId) ?? 'doctor'
    // Find the first pruned node with a reason
    const prunedNode = nodes
      .filter(n => n.branch_id === branchId)
      .find(n => n.is_pruned && n.prune_reason)
    return {
      branchId,
      diagnosis: terminal?.diagnosis ?? null,
      pruneSource,
      pruneReason: prunedNode?.prune_reason ?? 'Branch removed',
      shieldSeverity: prunedNode?.shield_severity,
      terminalNodeId: terminal?.id ?? '',
    }
  })

  return {
    recommendation: {
      diagnosis: primaryDiagnosis,
      summary: primaryTerminal?.content.slice(0, 220) ?? '',
      supportingNodeIds: primaryTerminal ? [primaryTerminal.id] : [],
    },
    confidence: {
      level: confidenceLevel,
      convergenceRatio,
      totalBranches: totalActive,
      convergingBranches: convergingCount,
      explanation:
        confidenceLevel === 'high'
          ? `${convergingCount} of ${totalActive} independent reasoning paths converge on ${primaryDiagnosis}. Cross-validation through distinct methodologies strengthens confidence.`
          : convergenceRatio >= 0.4
          ? `${convergingCount} of ${totalActive} paths agree on ${primaryDiagnosis}, but divergent hypotheses warrant further workup.`
          : `Reasoning paths diverge significantly. Additional clinical data needed before committing to a diagnosis.`,
    },
    branches,
    rejectedPaths,
  }
}
