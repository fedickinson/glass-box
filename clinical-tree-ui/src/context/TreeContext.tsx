/** TreeContext — React context + useReducer for all clinical reasoning tree UI state */
import React, { createContext, useContext, useReducer } from 'react'
import { TreeUIState, TreeAction, PositionedTree } from '../types/tree'
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
}

interface TreeContextValue {
  state: TreeUIState
  dispatch: React.Dispatch<TreeAction>
}

const TreeContext = createContext<TreeContextValue | null>(null)

export function TreeProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(treeReducer, INITIAL_STATE)
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
