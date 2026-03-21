/** TreeContext — React context + useReducer for all clinical reasoning tree UI state */
import React, { createContext, useContext, useReducer } from 'react'
import { TreeUIState, TreeAction, PositionedTree, PruneSource, AuditEntry } from '../types/tree'
import { treeReducer } from './treeReducer'

const EMPTY_TREE: PositionedTree = {
  nodes: [],
  connections: [],
  convergences: [],
  primaryPathNodeIds: [],
  branchIds: [],
}

const INITIAL_STATE: TreeUIState = {
  tree: EMPTY_TREE,
  focusState: { mode: 'idle' },
  prunedBranchIds: new Set(),
  pruneSourceMap: new Map(),
  viewMode: 'clinical',
  growth: { mode: 'idle' },
  annotations: [],
  pinnedBranchId: null,
  auditLog: [],
}

/** Pre-populate prunedBranchIds and audit log from nodes shield-flagged by the backend */
function initFromTree(tree: PositionedTree): {
  prunedBranchIds: Set<string>
  pruneSourceMap: Map<string, PruneSource>
  auditLog: AuditEntry[]
} {
  const prunedBranchIds = new Set<string>()
  const pruneSourceMap = new Map<string, PruneSource>()
  const seenBranches = new Set<string>()
  const auditLog: AuditEntry[] = []
  const now = Date.now()

  tree.nodes.forEach(n => {
    if (n.is_pruned && n.pruned_by) {
      prunedBranchIds.add(n.branch_id)
      pruneSourceMap.set(n.branch_id, n.pruned_by)
      if (!seenBranches.has(n.branch_id)) {
        seenBranches.add(n.branch_id)
        auditLog.push({
          id: `audit-init-${n.branch_id}`,
          timestamp: now,
          type: 'shield',
          summary: `Shield terminated branch: ${n.branch_id}`,
          detail: n.prune_reason ?? null,
          nodeId: n.id,
          branchId: n.branch_id,
        })
      }
    }
  })
  return { prunedBranchIds, pruneSourceMap, auditLog }
}

interface TreeContextValue {
  state: TreeUIState
  dispatch: React.Dispatch<TreeAction>
}

const TreeContext = createContext<TreeContextValue | null>(null)

export function TreeProvider({
  children,
  initialTree,
}: {
  children: React.ReactNode
  initialTree?: PositionedTree
}) {
  const initial: TreeUIState = initialTree
    ? { ...INITIAL_STATE, tree: initialTree, ...initFromTree(initialTree) }
    : INITIAL_STATE
  const [state, dispatch] = useReducer(treeReducer, initial)
  return (
    <TreeContext.Provider value={{ state, dispatch }}>
      {children}
    </TreeContext.Provider>
  )
}

export function useTreeContext(): TreeContextValue {
  const ctx = useContext(TreeContext)
  if (!ctx) throw new Error('useTreeContext must be used within a TreeProvider')
  return ctx
}
