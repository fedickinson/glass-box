/** treeReducer — handles all TreeAction types for the clinical reasoning tree UI state */
import { TreeUIState, TreeAction, PositionedNode, AuditEntry, AnimationBeat } from '../types/tree'
import { buildBranchPath } from '../data/transformer'
import { buildAnimationSequence } from '../data/buildAnimationSequence'

function makeAuditId() {
  return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}

function audit(
  overrides: Omit<AuditEntry, 'id' | 'timestamp'>
): AuditEntry {
  return { id: makeAuditId(), timestamp: Date.now(), ...overrides }
}

export function treeReducer(state: TreeUIState, action: TreeAction): TreeUIState {
  switch (action.type) {

    // ── Focus actions ──────────────────────────────────────────────

    case 'SELECT_NODE': {
      const node = state.tree.nodes.find(n => n.id === action.nodeId)
      if (!node) return state
      const branchNodeIds = buildBranchPath(node.branch_id, state.tree.nodes)
      const selectedNodeIndex = branchNodeIds.indexOf(action.nodeId)
      // During paused growth, clicking a node enters PAUSED_EXPLORING so the
      // presenter can navigate without losing the paused growth state.
      let nextGrowth = state.growth
      if (state.growth.mode === 'paused_at_decision' || state.growth.mode === 'paused_manual') {
        nextGrowth = {
          mode: 'paused_exploring',
          beatIndex: state.growth.beatIndex,
          sequence: state.growth.sequence,
          previousFocusMode: state.growth.mode,
        }
      }
      return {
        ...state,
        growth: nextGrowth,
        focusState: {
          mode: 'branch_focused',
          branchId: node.branch_id,
          branchNodeIds,
          selectedNodeId: action.nodeId,
          selectedNodeIndex,
        },
      }
    }

    case 'FOCUS_BRANCH': {
      const branchNodeIds = buildBranchPath(action.branchId, state.tree.nodes)
      return {
        ...state,
        focusState: {
          mode: 'branch_focused',
          branchId: action.branchId,
          branchNodeIds,
          selectedNodeId: branchNodeIds[0] ?? null,
          selectedNodeIndex: 0,
        },
      }
    }

    case 'FOCUS_HYPOTHESIS': {
      return {
        ...state,
        focusState: {
          mode: 'hypothesis_focused',
          diagnosis: action.diagnosis,
          branchIds: action.branchIds,
          highlightedNodeId: null,
        },
      }
    }

    case 'PEEK_NODE': {
      // Only valid within hypothesis_focused — pans to a node while keeping all
      // hypothesis branches highlighted. Has no effect in other focus modes.
      if (state.focusState.mode !== 'hypothesis_focused') return state
      return {
        ...state,
        focusState: {
          ...state.focusState,
          highlightedNodeId: action.nodeId,
        },
      }
    }

    case 'NAVIGATE_NEXT': {
      if (state.focusState.mode !== 'branch_focused') return state
      const { branchNodeIds, selectedNodeIndex } = state.focusState
      const nextIndex = Math.min(selectedNodeIndex + 1, branchNodeIds.length - 1)
      return {
        ...state,
        focusState: {
          ...state.focusState,
          selectedNodeId: branchNodeIds[nextIndex],
          selectedNodeIndex: nextIndex,
        },
      }
    }

    case 'NAVIGATE_PREV': {
      if (state.focusState.mode !== 'branch_focused') return state
      const { branchNodeIds, selectedNodeIndex } = state.focusState
      const prevIndex = Math.max(selectedNodeIndex - 1, 0)
      return {
        ...state,
        focusState: {
          ...state.focusState,
          selectedNodeId: branchNodeIds[prevIndex],
          selectedNodeIndex: prevIndex,
        },
      }
    }

    case 'NAVIGATE_SIBLING_BRANCH': {
      if (state.focusState.mode !== 'branch_focused') return state
      const { branchId, selectedNodeId } = state.focusState
      if (!selectedNodeId) return state

      const nodeMap = new Map(state.tree.nodes.map(n => [n.id, n]))
      const selectedNode = nodeMap.get(selectedNodeId)
      if (!selectedNode) return state

      let decisionPoint: PositionedNode | undefined
      let curr: PositionedNode | undefined = selectedNode
      while (curr) {
        const parentId: string | null = curr.parent_id
        const parent: PositionedNode | undefined = parentId ? nodeMap.get(parentId) : undefined
        if (parent?.is_decision_point) {
          decisionPoint = parent
          break
        }
        curr = parent
      }
      if (!decisionPoint && selectedNode.is_decision_point) {
        decisionPoint = selectedNode
      }
      if (!decisionPoint) return state

      const branchesFromDecision = [
        ...new Set(
          state.tree.nodes
            .filter(n => n.parent_id === decisionPoint!.id)
            .map(n => n.branch_id)
        ),
      ]
      const currentIdx = branchesFromDecision.indexOf(branchId)
      if (currentIdx === -1) return state

      const nextIdx =
        action.direction === 'down'
          ? (currentIdx + 1) % branchesFromDecision.length
          : (currentIdx - 1 + branchesFromDecision.length) % branchesFromDecision.length

      const nextBranchId = branchesFromDecision[nextIdx]
      if (!nextBranchId || nextBranchId === branchId) return state

      const newBranchNodeIds = buildBranchPath(nextBranchId, state.tree.nodes)
      const newIdx = Math.min(state.focusState.selectedNodeIndex, newBranchNodeIds.length - 1)

      return {
        ...state,
        focusState: {
          mode: 'branch_focused',
          branchId: nextBranchId,
          branchNodeIds: newBranchNodeIds,
          selectedNodeId: newBranchNodeIds[newIdx] ?? null,
          selectedNodeIndex: newIdx,
        },
      }
    }

    case 'CLEAR_FOCUS': {
      return { ...state, focusState: { mode: 'idle' } }
    }

    // ── Pruning ────────────────────────────────────────────────────

    case 'PRUNE_BRANCH': {
      const next = new Set(state.prunedBranchIds)
      next.add(action.branchId)
      const nextMap = new Map(state.pruneSourceMap)
      nextMap.set(action.branchId, action.source)
      const entry = audit({
        type: action.source === 'shield' ? 'shield' : 'doctor',
        summary: action.source === 'doctor'
          ? `Dr. pruned branch: ${action.branchId}`
          : `Shield terminated: ${action.branchId}`,
        detail: null,
        nodeId: null,
        branchId: action.branchId,
      })
      return {
        ...state,
        prunedBranchIds: next,
        pruneSourceMap: nextMap,
        focusState: { mode: 'idle' },
        auditLog: [...state.auditLog, entry],
      }
    }

    case 'RESTORE_BRANCH': {
      const next = new Set(state.prunedBranchIds)
      next.delete(action.branchId)
      const nextMap = new Map(state.pruneSourceMap)
      nextMap.delete(action.branchId)
      const entry = audit({
        type: 'doctor',
        summary: `Dr. restored branch: ${action.branchId}`,
        detail: null,
        nodeId: null,
        branchId: action.branchId,
      })
      return {
        ...state,
        prunedBranchIds: next,
        pruneSourceMap: nextMap,
        auditLog: [...state.auditLog, entry],
      }
    }

    // ── Doctor annotations ─────────────────────────────────────────

    case 'ADD_ANNOTATION': {
      const annotation = {
        id: `ann-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        nodeId: action.nodeId,
        type: action.annotationType,
        content: action.content,
        createdAt: Date.now(),
      }
      const node = state.tree.nodes.find(n => n.id === action.nodeId)
      const verbMap: Record<string, string> = {
        flag: 'flagged', context: 'annotated', challenge: 'challenged', pin: 'pinned',
      }
      const entry = audit({
        type: 'doctor',
        summary: `Dr. ${verbMap[action.annotationType] ?? 'annotated'}: ${node?.headline ?? action.nodeId}`,
        detail: action.content,
        nodeId: action.nodeId,
        branchId: node?.branch_id ?? null,
      })
      return {
        ...state,
        annotations: [...state.annotations, annotation],
        auditLog: [...state.auditLog, entry],
      }
    }

    case 'REMOVE_ANNOTATION': {
      return {
        ...state,
        annotations: state.annotations.filter(a => a.id !== action.annotationId),
      }
    }

    case 'PIN_BRANCH': {
      const entry = audit({
        type: 'doctor',
        summary: `Dr. endorsed branch: ${action.branchId}`,
        detail: null,
        nodeId: null,
        branchId: action.branchId,
      })
      return {
        ...state,
        pinnedBranchId: action.branchId,
        auditLog: [...state.auditLog, entry],
      }
    }

    case 'UNPIN_BRANCH': {
      return { ...state, pinnedBranchId: null }
    }

    // ── View mode ──────────────────────────────────────────────────

    case 'TOGGLE_VIEW_MODE': {
      return {
        ...state,
        viewMode: state.viewMode === 'clinical' ? 'architecture' : 'clinical',
      }
    }

    // ── Growth playback ────────────────────────────────────────────

    case 'START_GROWTH': {
      const sequence = buildAnimationSequence()
      const entry = audit({
        type: 'system',
        summary: 'System initiated reasoning exploration',
        detail: null,
        nodeId: null,
        branchId: null,
      })
      return {
        ...state,
        focusState: { mode: 'idle' },
        growth: { mode: 'playing', beatIndex: 0, sequence },
        auditLog: [...state.auditLog, entry],
      }
    }

    case 'PAUSE_GROWTH': {
      if (state.growth.mode !== 'playing') return state
      return {
        ...state,
        growth: { mode: 'paused_manual', beatIndex: state.growth.beatIndex, sequence: state.growth.sequence },
      }
    }

    case 'RESUME_GROWTH': {
      const g = state.growth
      if (g.mode !== 'paused_at_decision' && g.mode !== 'paused_manual') return state
      return {
        ...state,
        growth: { mode: 'playing', beatIndex: g.beatIndex, sequence: g.sequence },
        // Clear focus when resuming so tree is unobstructed
        focusState: { mode: 'idle' },
      }
    }

    case 'STEP_FORWARD': {
      const g = state.growth
      if (g.mode === 'idle') return state
      const seq = (g as { sequence: AnimationBeat[] }).sequence
      const cur = (g as { beatIndex: number }).beatIndex
      const next = Math.min(cur + 1, seq.length - 1)
      return { ...state, growth: { mode: 'paused_manual', beatIndex: next, sequence: seq } }
    }

    case 'STEP_BACKWARD': {
      const g = state.growth
      if (g.mode === 'idle') return state
      const seq = (g as { sequence: AnimationBeat[] }).sequence
      const cur = (g as { beatIndex: number }).beatIndex
      const prev = Math.max(cur - 1, 0)
      return { ...state, growth: { mode: 'paused_manual', beatIndex: prev, sequence: seq } }
    }

    case 'SKIP_TO_END': {
      const entry = audit({
        type: 'system',
        summary: `Tree fully loaded — ${state.tree.nodes.length} nodes`,
        detail: null,
        nodeId: null,
        branchId: null,
      })
      return {
        ...state,
        growth: { mode: 'idle' },
        auditLog: [...state.auditLog, entry],
      }
    }

    case 'GROWTH_TICK': {
      if (state.growth.mode !== 'playing') return state
      const g = state.growth
      const sequence = g.sequence
      const nextBeatIndex = g.beatIndex + 1

      // Sequence complete — go idle
      if (nextBeatIndex >= sequence.length) {
        const entry = audit({
          type: 'system',
          summary: `System explored ${state.tree.branchIds.length} branches`,
          detail: null,
          nodeId: null,
          branchId: null,
        })
        return {
          ...state,
          growth: { mode: 'idle' },
          auditLog: [...state.auditLog, entry],
        }
      }

      const nextBeat = sequence[nextBeatIndex]

      // Auto-pause at decision points and convergence moments
      if (nextBeat.autoPause) {
        const decisionNodeId = nextBeat.isDecisionReveal
          ? (nextBeat.visibleIds[nextBeat.visibleIds.length - 1] ?? '')
          : ''
        const entry = audit({
          type: 'system',
          summary: nextBeat.phase ?? `Paused at beat ${nextBeatIndex}`,
          detail: null,
          nodeId: decisionNodeId || null,
          branchId: null,
        })
        return {
          ...state,
          growth: {
            mode: 'paused_at_decision',
            beatIndex: nextBeatIndex,
            sequence,
            decisionNodeId,
          },
          auditLog: [...state.auditLog, entry],
        }
      }

      return {
        ...state,
        growth: { mode: 'playing', beatIndex: nextBeatIndex, sequence },
      }
    }

    case 'APPEND_AUDIT': {
      return {
        ...state,
        auditLog: [...state.auditLog, audit(action.entry)],
      }
    }

    default: {
      return state
    }
  }
}
