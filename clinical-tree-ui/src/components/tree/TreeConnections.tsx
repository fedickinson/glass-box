/** TreeConnections — SVG paths connecting parent→child nodes, focus-aware opacity */
import React from 'react'
import { Connection } from '../../types/tree'

interface Props {
  connections: Connection[]
  /** Pre-computed set of highlighted node IDs (null = no focus active) */
  focusedNodeIds: Set<string> | null
  /** True when any focus mode is active (branch_focused or hypothesis_focused) */
  isFocused: boolean
  prunedBranchIds: Set<string>
  pruneSourceMap: Map<string, 'shield' | 'doctor'>
  /** Current animation beat — controls connection visibility and dimming */
  growthBeat: { visibleIds: string[]; activeBranchIds: string[] | null } | null
}

export default function TreeConnections({
  connections,
  focusedNodeIds,
  isFocused,
  prunedBranchIds,
  pruneSourceMap,
  growthBeat,
}: Props) {
  const growthVisibleSet = growthBeat ? new Set(growthBeat.visibleIds) : null

  return (
    <g>
      {connections.map(conn => {
        // Only render if both endpoints are visible in the current beat
        if (
          growthVisibleSet !== null &&
          (!growthVisibleSet.has(conn.sourceId) || !growthVisibleSet.has(conn.targetId))
        ) {
          return null
        }

        const isPruned =
          prunedBranchIds.has(conn.sourceBranchId) ||
          prunedBranchIds.has(conn.targetBranchId)

        const isShieldKilled =
          isPruned && (
            pruneSourceMap.get(conn.sourceBranchId) === 'shield' ||
            pruneSourceMap.get(conn.targetBranchId) === 'shield'
          )

        // Connection is "on focused branch" if both endpoints are in the focused path
        const isOnFocusedPath =
          focusedNodeIds !== null &&
          focusedNodeIds.has(conn.sourceId) &&
          focusedNodeIds.has(conn.targetId)

        // Growth-based dimming: when a beat specifies active branches, connections
        // on inactive branches render at reduced opacity.
        const growthDimmed =
          growthBeat !== null &&
          growthBeat.activeBranchIds !== null &&
          !growthBeat.activeBranchIds.includes(conn.targetBranchId) &&
          !growthBeat.activeBranchIds.includes(conn.sourceBranchId)

        // Compute visual style
        let stroke: string
        let strokeWidth: number
        let strokeOpacity: number
        let strokeDasharray: string | undefined

        // Only the focused path gets blue treatment.
        // In idle (nothing focused), no path is singled out.
        const isEffectivelyPrimary = isFocused && isOnFocusedPath

        if (isShieldKilled) {
          stroke = '#C53D2F'
          strokeWidth = 1.5
          strokeDasharray = '4,3'
          strokeOpacity = isFocused && !isOnFocusedPath ? 0.05 : 0.35
        } else if (isPruned) {
          stroke = 'var(--conn-pruned-color)'
          strokeWidth = 1
          strokeOpacity = isFocused && !isOnFocusedPath ? 0.05 : 0.2
        } else if (isEffectivelyPrimary) {
          stroke = 'var(--conn-primary-color)'
          strokeWidth = isOnFocusedPath ? 3 : 2.5
          strokeOpacity = isFocused && !isOnFocusedPath ? 0.1 : 0.65
        } else {
          stroke = 'rgba(0,0,0,0.32)'
          strokeWidth = isOnFocusedPath ? 2 : 1.25
          strokeOpacity = isFocused && !isOnFocusedPath ? 0.06 : 0.45
          strokeDasharray = '5,4'
        }

        // Preflight fan-in: thin line colored by compliance result, no bloom
        if (conn.isPreflightFanIn) {
          const resultColor =
            conn.complianceResult === 'pass'    ? '#2D8A56' :
            conn.complianceResult === 'warning' ? '#B37A0A' :
            conn.complianceResult === 'fail'    ? '#C53D2F' :
                                                  '#6B7280'
          return (
            <path
              key={conn.id}
              d={conn.pathData}
              fill="none"
              stroke={resultColor}
              strokeWidth={1.5}
              strokeOpacity={isFocused && !isOnFocusedPath ? 0.06 : 0.5}
              style={{ transition: 'stroke-opacity 200ms ease-out, opacity 300ms ease-out' }}
              opacity={growthDimmed ? 0.15 : undefined}
            />
          )
        }

        // For primary connections: render a multi-layer bloom (outer glow + crisp)
        if (isEffectivelyPrimary && !isPruned && !isShieldKilled) {
          const baseOpacity = growthDimmed ? 0.15 : (isFocused && !isOnFocusedPath ? 0.12 : 1)
          return (
            <g key={conn.id} style={{ transition: 'opacity 200ms ease-out' }} opacity={baseOpacity}>
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
        if (isFromDecision && !isPruned && !isShieldKilled) {
          const baseOpacity = growthDimmed ? 0.15 : (isFocused && !isOnFocusedPath ? 0.08 : 1)
          return (
            <g key={conn.id} style={{ transition: 'opacity 200ms ease-out' }} opacity={baseOpacity}>
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
            strokeOpacity={growthDimmed ? strokeOpacity * 0.15 : strokeOpacity}
            strokeDasharray={strokeDasharray}
            style={{ transition: 'stroke-opacity 200ms ease-out, stroke-width 150ms ease-out' }}
          />
        )
      })}
    </g>
  )
}
