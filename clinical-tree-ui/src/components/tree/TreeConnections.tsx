/** TreeConnections — SVG paths connecting parent→child nodes, focus-aware opacity */
import React from 'react'
import { Connection, FocusState } from '../../types/tree'

interface Props {
  connections: Connection[]
  focusState: FocusState
  prunedBranchIds: Set<string>
  /** Nodes with step_index > growthCursor are hidden; Infinity = show all */
  growthCursor: number
}

export default function TreeConnections({
  connections,
  focusState,
  prunedBranchIds,
  growthCursor,
}: Props) {
  const focusedBranchId =
    focusState.mode === 'branch_focused' ? focusState.branchId : null
  const focusedNodeIds =
    focusState.mode === 'branch_focused'
      ? new Set(focusState.branchNodeIds)
      : null
  const isFocused = focusedBranchId !== null

  return (
    <g>
      {connections.map(conn => {
        const isPruned =
          prunedBranchIds.has(conn.sourceBranchId) ||
          prunedBranchIds.has(conn.targetBranchId)

        // Connection is "on focused branch" if both endpoints are in the focused path
        const isOnFocusedPath =
          focusedNodeIds !== null &&
          focusedNodeIds.has(conn.sourceId) &&
          focusedNodeIds.has(conn.targetId)

        // Compute visual style
        let stroke: string
        let strokeWidth: number
        let strokeOpacity: number
        let strokeDasharray: string | undefined

        if (isPruned) {
          stroke = 'var(--conn-pruned-color)'
          strokeWidth = 1
          strokeOpacity = isFocused && !isOnFocusedPath ? 0.05 : 0.2
        } else if (conn.isOnPrimaryPath) {
          stroke = 'var(--conn-primary-color)'
          strokeWidth = isOnFocusedPath ? 3 : 2.5
          strokeOpacity = isFocused && !isOnFocusedPath ? 0.1 : 0.65
        } else {
          stroke = 'rgba(0,0,0,0.32)'
          strokeWidth = isOnFocusedPath ? 2 : 1.25
          strokeOpacity = isFocused && !isOnFocusedPath ? 0.06 : 0.45
          strokeDasharray = '5,4'
        }

        // For primary connections: render a multi-layer bloom (outer glow + crisp)
        if (conn.isOnPrimaryPath && !isPruned) {
          return (
            <g key={conn.id} style={{ transition: 'opacity 200ms ease-out' }} opacity={isFocused && !isOnFocusedPath ? 0.12 : 1}>
              <path d={conn.pathData} fill="none" stroke="rgba(59,125,216,0.10)" strokeWidth={10} />
              <path d={conn.pathData} fill="none" stroke="rgba(59,125,216,0.22)" strokeWidth={4} />
              <path
                d={conn.pathData}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeOpacity={strokeOpacity}
              />
            </g>
          )
        }

        // For branching connections: amber glow if forking from a decision point
        const isFromDecision =
          !conn.isOnPrimaryPath && conn.sourceBranchId === 'primary'
        if (isFromDecision && !isPruned) {
          return (
            <g key={conn.id} style={{ transition: 'opacity 200ms ease-out' }} opacity={isFocused && !isOnFocusedPath ? 0.08 : 1}>
              <path d={conn.pathData} fill="none" stroke="rgba(154,100,0,0.10)" strokeWidth={8} strokeDasharray={strokeDasharray} />
              <path d={conn.pathData} fill="none" stroke="rgba(154,100,0,0.22)" strokeWidth={3} strokeDasharray={strokeDasharray} />
              <path
                d={conn.pathData}
                fill="none"
                stroke="rgba(154,100,0,0.65)"
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
              />
            </g>
          )
        }

        return (
          <path
            key={conn.id}
            d={conn.pathData}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeOpacity={strokeOpacity}
            strokeDasharray={strokeDasharray}
            style={{ transition: 'stroke-opacity 200ms ease-out, stroke-width 150ms ease-out' }}
          />
        )
      })}
    </g>
  )
}
