/** treeReducer — handles all TreeAction types for the clinical reasoning tree UI state */
import { TreeUIState, TreeAction } from '../types/tree'

export function treeReducer(state: TreeUIState, action: TreeAction): TreeUIState {
  switch (action.type) {

    // ── Focus actions ──────────────────────────────────────────────

    case 'SELECT_NODE': {
      const node = state.tree.nodes.find(n => n.id === action.nodeId)
      if (!node) return state
      const branchNodeIds = state.tree.nodes
        .filter(n => n.branch_id === node.branch_id)
        .sort((a, b) => (a.step_index ?? 0) - (b.step_index ?? 0))
        .map(n => n.id)
      const selectedNodeIndex = branchNodeIds.indexOf(action.nodeId)
      return {
        ...state,
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
      const branchNodeIds = state.tree.nodes
        .filter(n => n.branch_id === action.branchId)
        .sort((a, b) => (a.step_index ?? 0) - (b.step_index ?? 0))
        .map(n => n.id)
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
      // Stage 3: find decision point in focused branch, jump to sibling branch
      return state
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
      return {
        ...state,
        prunedBranchIds: next,
        pruneSourceMap: nextMap,
        focusState: { mode: 'idle' },
      }
    }

    case 'RESTORE_BRANCH': {
      const next = new Set(state.prunedBranchIds)
      next.delete(action.branchId)
      const nextMap = new Map(state.pruneSourceMap)
      nextMap.delete(action.branchId)
      return { ...state, prunedBranchIds: next, pruneSourceMap: nextMap }
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
      return { ...state, annotations: [...state.annotations, annotation] }
    }

    case 'REMOVE_ANNOTATION': {
      return {
        ...state,
        annotations: state.annotations.filter(a => a.id !== action.annotationId),
      }
    }

    case 'PIN_BRANCH': {
      return { ...state, pinnedBranchId: action.branchId }
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
      return {
        ...state,
        growth: { mode: 'playing', cursor: 0, speed: action.speed ?? 200 },
      }
    }

    case 'PAUSE_GROWTH': {
      if (state.growth.mode !== 'playing') return state
      return {
        ...state,
        growth: { mode: 'paused_manual', cursor: state.growth.cursor },
      }
    }

    case 'RESUME_GROWTH': {
      const g = state.growth
      if (g.mode === 'paused_at_decision') {
        return { ...state, growth: { mode: 'playing', cursor: g.cursor, speed: 200 } }
      }
      if (g.mode === 'paused_manual') {
        return { ...state, growth: { mode: 'playing', cursor: g.cursor, speed: 200 } }
      }
      if (g.mode === 'paused_exploring') {
        return {
          ...state,
          growth: { mode: 'playing', cursor: g.cursor, speed: 200 },
          focusState: { mode: 'idle' },
        }
      }
      return state
    }

    case 'STEP_FORWARD': {
      const cursor = state.growth.mode !== 'idle' ? (state.growth as { cursor: number }).cursor : 0
      const maxCursor = Math.max(0, state.tree.nodes.length - 1)
      return {
        ...state,
        growth: { mode: 'paused_manual', cursor: Math.min(cursor + 1, maxCursor) },
      }
    }

    case 'STEP_BACKWARD': {
      const cursor = state.growth.mode !== 'idle' ? (state.growth as { cursor: number }).cursor : 0
      return {
        ...state,
        growth: { mode: 'paused_manual', cursor: Math.max(cursor - 1, 0) },
      }
    }

    case 'SET_GROWTH_SPEED': {
      if (state.growth.mode !== 'playing') return state
      return { ...state, growth: { ...state.growth, speed: action.speed } }
    }

    case 'SKIP_TO_END': {
      return { ...state, growth: { mode: 'idle' } }
    }

    case 'GROWTH_TICK': {
      if (state.growth.mode !== 'playing') return state
      const maxCursor = state.tree.nodes.length - 1
      const nextCursor = state.growth.cursor + 1
      if (nextCursor > maxCursor) {
        return { ...state, growth: { mode: 'idle' } }
      }
      const orderedNodes = [...state.tree.nodes].sort(
        (a, b) => (a.step_index ?? 0) - (b.step_index ?? 0)
      )
      const nextNode = orderedNodes[nextCursor]
      if (nextNode?.is_decision_point) {
        return {
          ...state,
          growth: {
            mode: 'paused_at_decision',
            cursor: nextCursor,
            decisionNodeId: nextNode.id,
          },
        }
      }
      return { ...state, growth: { ...state.growth, cursor: nextCursor } }
    }

    case 'GROWTH_AUTO_PAUSE': {
      if (state.growth.mode !== 'playing') return state
      return {
        ...state,
        growth: {
          mode: 'paused_at_decision',
          cursor: state.growth.cursor,
          decisionNodeId: action.decisionNodeId,
        },
      }
    }

    default: {
      return state
    }
  }
}
