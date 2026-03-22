/** useViewportControl — responds to focusState changes with programmatic pan/zoom */
import { useEffect, useRef } from 'react'
import { FocusState, PositionedTree } from '../types/tree'
import { TreeViewportHandle } from '../components/tree/TreeViewportHandle'

export function useViewportControl(
  focusState: FocusState,
  tree: PositionedTree,
  viewportRef: React.RefObject<TreeViewportHandle>
): void {
  const prevFocusRef = useRef<FocusState>({ mode: 'idle' })

  useEffect(() => {
    const prev = prevFocusRef.current
    prevFocusRef.current = focusState
    const vp = viewportRef.current
    if (!vp) return

    if (focusState.mode === 'idle') {
      if (prev.mode !== 'idle') vp.fitToView()
      return
    }

    if (focusState.mode === 'branch_focused') {
      const { branchNodeIds, selectedNodeId } = focusState
      const prevBranchId =
        prev.mode === 'branch_focused' ? prev.branchId : null
      const prevSelectedId =
        prev.mode === 'branch_focused' ? prev.selectedNodeId : null

      if (selectedNodeId && selectedNodeId !== prevSelectedId) {
        // New node selected — pan to it and zoom in for detail reading
        const node = tree.nodes.find(n => n.id === selectedNodeId)
        if (node) vp.panToNode(node, 1.35)
      } else if (focusState.branchId !== prevBranchId && !selectedNodeId) {
        // New branch focused — fit the branch
        vp.fitBranch(branchNodeIds, tree.nodes)
      } else if (prev.mode === 'idle' && selectedNodeId) {
        // Entering focus from idle — pan to selected node and zoom in
        const node = tree.nodes.find(n => n.id === selectedNodeId)
        if (node) vp.panToNode(node, 1.35)
      }
    }

    if (focusState.mode === 'hypothesis_focused') {
      const { highlightedNodeId } = focusState
      const prevHighlighted =
        prev.mode === 'hypothesis_focused' ? prev.highlightedNodeId : null
      const prevDiagnosis =
        prev.mode === 'hypothesis_focused' ? prev.diagnosis : null

      if (highlightedNodeId && highlightedNodeId !== prevHighlighted) {
        // Evidence bullet clicked — pan to that node
        const node = tree.nodes.find(n => n.id === highlightedNodeId)
        if (node) vp.panToNode(node)
      } else if (focusState.diagnosis !== prevDiagnosis) {
        // New hypothesis focused — fit all branches in the group
        const groupNodeIds = tree.nodes
          .filter(n => focusState.branchIds.includes(n.branch_id))
          .map(n => n.id)
        vp.fitBranch(groupNodeIds, tree.nodes)
      }
    }
  }, [focusState, tree, viewportRef])
}
