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
  HypothesisGroup,
  EvidenceEntry,
  NodeSummary,
  RejectedPath,
  PruneSource,
  SafetyCheck,
  SafetyViolation,
  SafetySummary,
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
    // Compliance check nodes are excluded — they belong in Safety & Compliance only
    const nodeSummaries: NodeSummary[] = ownNodes
      .filter(n => !n.is_compliance_check && (n.type === 'tool' || n.type === 'citation' || n.is_decision_point || n.diagnosis !== null))
      .map(n => ({
        nodeId: n.id,
        type: n.type,
        headline: n.headline,
        detail: n.content,
        source: n.source ?? null,
        isKeyStep: n.is_decision_point || n.diagnosis !== null || n.type === 'tool',
        shieldFlag: n.shield_severity ?? null,
        isDiagnosis: n.diagnosis !== null,
      }))

    // Narrative from first thought node content
    const firstThought = ownNodes.find(n => n.type === 'thought')
    const toolNodes = ownNodes.filter(n => n.type === 'tool')
    let narrative = firstThought?.content.slice(0, 180) ?? ''
    if (firstThought && firstThought.content.length > 180) narrative += '…'
    if (!narrative && toolNodes.length > 0 && terminalDiag) {
      narrative = `Referenced ${toolNodes.length} source${toolNodes.length > 1 ? 's' : ''} during evaluation. Concluded: ${terminalDiag}.`
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

  // --- Hypothesis groups ---
  // Group active branches by terminal diagnosis. Each group becomes one card in
  // the synthesis panel; convergence (multiple branches → same dx) is the confidence signal.
  const hypothesisGroups: HypothesisGroup[] = []
  for (const [diagnosis, diagBranchIds] of diagnosisGroups) {
    const groupBranches = branches.filter(b => diagBranchIds.includes(b.branchId))
    const isPrimary = diagnosis === primaryDiagnosis
    // A group is CONTRADICTED if its terminal node explicitly carries a contradiction explanation
    const contradictedNode = groupBranches
      .map(b => { const ns = b.nodeSummaries.find(s => s.isDiagnosis); return ns ? nodeMap.get(ns.nodeId) : undefined })
      .find(n => n?.terminal_contradiction)
    const whyNotSupported = contradictedNode?.terminal_contradiction

    // A group is UNLIKELY if its terminal node has 'flag'-status safety checks
    const hasFlagChecks = groupBranches.some(b => {
      const termId = b.nodeSummaries.find(ns => ns.isDiagnosis)?.nodeId
      const termNode = termId ? nodes.find(n => n.id === termId) : undefined
      return termNode?.terminal_safety_checks?.some(c => c.status === 'flag')
    })

    const tag: 'PRIMARY' | 'DIVERGENT' | 'UNLIKELY' | 'CONTRADICTED' =
      isPrimary ? 'PRIMARY' :
      whyNotSupported ? 'CONTRADICTED' :
      hasFlagChecks ? 'UNLIKELY' :
      'DIVERGENT'

    // Helper: get terminal node for the first branch in this group
    const firstBranch = groupBranches[0]
    const terminalNodeId = firstBranch?.nodeSummaries.find(ns => ns.isDiagnosis)?.nodeId
    const terminalNode = terminalNodeId ? nodeMap.get(terminalNodeId) : undefined

    let rationale: string
    if (isPrimary && diagBranchIds.length > 1) {
      // Multi-path convergence: lead with convergence signal, then terminal_summary for clinical context
      const summary = terminalNode?.terminal_summary ?? terminalNode?.content ?? ''
      const convergenceLine = `${diagBranchIds.length} of ${totalActive} independent paths converge on this diagnosis.`
      rationale = summary ? `${convergenceLine} ${summary}` : convergenceLine
    } else {
      // Single path (primary or divergent): terminal_summary is the richest pre-written rationale.
      // Fall back to content, then narrative summary.
      rationale =
        terminalNode?.terminal_summary ??
        terminalNode?.content ??
        firstBranch?.narrativeSummary.slice(0, 160) ??
        `${diagnosis}.`
    }

    // ── Evidence FOR: citations first, then tool results, from all branches in group ──
    const evidenceForList: EvidenceEntry[] = []
    const seenForIds = new Set<string>()

    // Citations (most authoritative — formal guidelines/references)
    for (const branchId of diagBranchIds) {
      nodes
        .filter(n => n.branch_id === branchId && n.type === 'citation' && !n.is_compliance_check)
        .sort((a, b) => (a.step_index ?? 0) - (b.step_index ?? 0))
        .forEach(n => {
          if (!seenForIds.has(n.id)) {
            seenForIds.add(n.id)
            evidenceForList.push({ nodeId: n.id, headline: n.headline, source: n.source ?? null })
          }
        })
    }
    // Tool results (calculated findings)
    for (const branchId of diagBranchIds) {
      nodes
        .filter(n => n.branch_id === branchId && n.type === 'tool' && !n.is_compliance_check)
        .sort((a, b) => (a.step_index ?? 0) - (b.step_index ?? 0))
        .forEach(n => {
          if (!seenForIds.has(n.id)) {
            seenForIds.add(n.id)
            evidenceForList.push({
              nodeId: n.id,
              headline: n.headline,
              source: n.source ?? n.tool_name ?? null,
            })
          }
        })
    }
    const evidenceFor = evidenceForList.slice(0, 4)

    // ── Evidence AGAINST: key nodes from competing branches ──
    const evidenceAgainst: EvidenceEntry[] = []
    const competingBranchIds = activeBranchIds.filter(id => !diagBranchIds.includes(id))

    for (const competingId of competingBranchIds) {
      if (evidenceAgainst.length >= 2) break
      const competingBranch = branches.find(b => b.branchId === competingId)
      const competingDiag = competingBranch?.diagnosis ?? null
      if (!competingDiag) continue

      const competingOwnNodes = nodes
        .filter(n => n.branch_id === competingId && !n.is_compliance_check)
        .sort((a, b) => (a.step_index ?? 0) - (b.step_index ?? 0))

      // For PRIMARY: use the competing branch's opening reasoning (what they considered)
      // For DIVERGENT/UNLIKELY: use the primary path's strongest evidence (why it didn't choose this)
      const keyNode = tag === 'PRIMARY'
        ? (competingOwnNodes.find(n => n.type === 'thought' && !n.is_decision_point) ?? competingOwnNodes[0])
        : (competingOwnNodes.find(n => n.type === 'tool' || n.type === 'citation')
           ?? competingOwnNodes.find(n => n.type === 'thought'))

      if (keyNode) {
        evidenceAgainst.push({
          nodeId: keyNode.id,
          headline: keyNode.headline,
          source: `${competingDiag} path`,
        })
      }
    }

    // nextStep: prefer primary branch terminal, then first branch terminal
    const nextStepNode = groupBranches
      .map(b => {
        const termId = b.nodeSummaries.find(ns => ns.isDiagnosis)?.nodeId
        return termId ? nodes.find(n => n.id === termId) : undefined
      })
      .find(n => n?.next_step)
    const nextStep = nextStepNode?.next_step

    // safetyFlags: 'flag'-status entries from any terminal node in this group
    const safetyFlagChecks: Array<{ label: string }> = []
    groupBranches.forEach(b => {
      const termId = b.nodeSummaries.find(ns => ns.isDiagnosis)?.nodeId
      const termNode = termId ? nodes.find(n => n.id === termId) : undefined
      termNode?.terminal_safety_checks
        ?.filter(c => c.status === 'flag')
        .forEach(c => safetyFlagChecks.push({ label: c.label }))
    })

    hypothesisGroups.push({
      diagnosis,
      tag,
      branchIds: diagBranchIds,
      pathCount: diagBranchIds.length,
      totalPaths: totalActive,
      rationale,
      branches: groupBranches,
      evidenceFor,
      evidenceAgainst,
      nextStep: tag === 'CONTRADICTED' ? undefined : nextStep,
      whyNotSupported,
      safetyFlags: safetyFlagChecks.length > 0 ? safetyFlagChecks : undefined,
    })
  }

  // Sort: primary first, contradicted last, then by path count descending
  hypothesisGroups.sort((a, b) => {
    if (a.tag === 'PRIMARY') return -1
    if (b.tag === 'PRIMARY') return 1
    if (a.tag === 'CONTRADICTED' && b.tag !== 'CONTRADICTED') return 1
    if (b.tag === 'CONTRADICTED' && a.tag !== 'CONTRADICTED') return -1
    return b.pathCount - a.pathCount
  })

  // --- Rejected paths ---
  const rejectedPaths: RejectedPath[] = pruned.map(branchId => {
    const terminal = getTerminalNode(branchId)
    const pruneSource = pruneSourceMap.get(branchId) ?? 'doctor'
    // Find the first pruned node with a reason
    const prunedNode = nodes
      .filter(n => n.branch_id === branchId)
      .find(n => n.is_pruned && n.prune_reason)
    const pruneReason = prunedNode?.prune_reason ?? 'Branch removed'
    const guidelineMatch = pruneReason.match(/([A-Z]{2,}[^\s]*\s*(?:§[\d.]+|CG\d+|Guideline[s]?))/i)
    return {
      branchId,
      diagnosis: terminal?.diagnosis ?? null,
      pruneSource,
      pruneReason,
      shieldSeverity: prunedNode?.shield_severity,
      guidelineRef: guidelineMatch ? guidelineMatch[1].trim() : null,
      terminalNodeId: terminal?.id ?? '',
    }
  })

  // --- Safety summary ---
  // Passed checks: compliance nodes with pass/warn result from active branches,
  // plus safety-relevant tool nodes (drug interaction, guideline queries).
  const SAFETY_TOOL_NAMES = new Set(['drug_interaction_check', 'guideline_query', 'allergy_screen', 'contraindication_check'])

  const passedChecks: SafetyCheck[] = []
  const seenCheckIds = new Set<string>()

  for (const branchId of activeBranchIds) {
    nodes
      .filter(n => n.branch_id === branchId && n.is_compliance_check && (n.compliance_result === 'pass' || n.compliance_result === 'warning'))
      .sort((a, b) => (a.step_index ?? 0) - (b.step_index ?? 0))
      .forEach(n => {
        if (!seenCheckIds.has(n.id)) {
          seenCheckIds.add(n.id)
          passedChecks.push({
            nodeId: n.id,
            label: n.headline,
            source: n.source ?? null,
            // compliance 'warning' = noted but cleared = info, not a problem
            status: n.compliance_result === 'warning' ? 'info' : 'pass',
          })
        }
      })
    nodes
      .filter(n => n.branch_id === branchId && n.type === 'tool' && n.tool_name && SAFETY_TOOL_NAMES.has(n.tool_name) && !n.is_compliance_check && !n.is_pruned)
      .sort((a, b) => (a.step_index ?? 0) - (b.step_index ?? 0))
      .forEach(n => {
        if (!seenCheckIds.has(n.id)) {
          seenCheckIds.add(n.id)
          passedChecks.push({
            nodeId: n.id,
            label: n.headline,
            source: n.source ?? n.tool_name ?? null,
            status: 'pass',
          })
        }
      })
  }

  // Violations: shield-pruned branches only
  const shieldPrunedIds = pruned.filter(id => (pruneSourceMap.get(id) ?? 'doctor') === 'shield')
  const violations: SafetyViolation[] = shieldPrunedIds.map(branchId => {
    const terminal = getTerminalNode(branchId)
    const prunedNode = nodes
      .filter(n => n.branch_id === branchId && n.is_pruned && n.prune_reason)
      .sort((a, b) => (a.step_index ?? 0) - (b.step_index ?? 0))[0]
    const pruneReason = prunedNode?.prune_reason ?? 'Safety violation'
    // Extract guideline ref from prune_reason (e.g. "ACC/AHA §6.1" or "NICE CG95")
    const guidelineMatch = pruneReason.match(/([A-Z]{2,}[^\s]*\s*(?:§[\d.]+|CG\d+|Guideline[s]?))/i)
    return {
      branchId,
      diagnosis: terminal?.diagnosis ?? null,
      severity: prunedNode?.shield_severity ?? 'safety',
      violation: pruneReason,
      guidelineRef: guidelineMatch ? guidelineMatch[1].trim() : null,
      terminalNodeId: terminal?.id ?? '',
    }
  })

  // flaggedPaths: active branches where terminal node has any 'flag'-status safety check
  const flaggedPaths = activeBranchIds.filter(branchId => {
    const terminal = getTerminalNode(branchId)
    return terminal?.terminal_safety_checks?.some(c => c.status === 'flag') ?? false
  }).length

  // passedPaths: active (not shield-terminated) — excludes doctor-pruned per spec
  const safetySummary: SafetySummary = {
    passedPaths: activeBranchIds.length,
    totalPaths: activeBranchIds.length + shieldPrunedIds.length,
    flaggedPaths,
    passedChecks: passedChecks.slice(0, 6),
    violations,
  }

  const primaryHypothesis = hypothesisGroups.find(g => g.tag === 'PRIMARY')

  return {
    recommendation: {
      diagnosis: primaryDiagnosis,
      summary: primaryTerminal?.content.slice(0, 220) ?? '',
      supportingNodeIds: primaryTerminal ? [primaryTerminal.id] : [],
      nextStep: primaryHypothesis?.nextStep,
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
    hypothesisGroups,
    rejectedPaths,
    safetySummary,
  }
}
