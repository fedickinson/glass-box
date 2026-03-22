/** TreeConnections — SVG paths connecting parent→child nodes, focus-aware opacity */
import React, { useRef, useEffect } from 'react'
import { Connection } from '../../types/tree'

interface Props {
  connections: Connection[]
  /** Pre-computed set of highlighted node IDs (null = no focus active) */
  focusedNodeIds: Set<string> | null
  /** True when any focus mode is active (branch_focused or hypothesis_focused) */
  isFocused: boolean
  /** If the focused node is a decision point, its ID — used to limit amber to direct children only */
  focusedDecisionId?: string
  prunedBranchIds: Set<string>
  pruneSourceMap: Map<string, 'shield' | 'doctor'>
  /** Current animation beat — controls connection visibility and dimming */
  growthBeat: { visibleIds: string[]; activeBranchIds: string[] | null } | null
}

export default function TreeConnections({
  connections,
  focusedNodeIds,
  isFocused,
  focusedDecisionId,
  prunedBranchIds,
  pruneSourceMap,
  growthBeat,
}: Props) {
  const growthVisibleSet = growthBeat ? new Set(growthBeat.visibleIds) : null

  // Track previous beat to detect newly-appearing connections for draw animation
  const prevBeatRef = useRef<{ visibleIds: string[] } | null>(null)
  const prevVisibleSet = prevBeatRef.current ? new Set(prevBeatRef.current.visibleIds) : null
  useEffect(() => {
    prevBeatRef.current = growthBeat
  })

  // Track which node IDs were newly added in the current beat.
  // Persists for the full beat duration (not just the first render) so the
  // active connection stays highlighted until the next beat fires.
  const currentBeatNewIdsRef = useRef<Set<string>>(new Set())
  const prevVisibleCountRef = useRef<number>(0)
  const currentVisibleCount = growthBeat?.visibleIds.length ?? 0
  if (!growthBeat) {
    // Growth stopped — reset
    if (currentBeatNewIdsRef.current.size > 0) currentBeatNewIdsRef.current = new Set()
    prevVisibleCountRef.current = 0
  } else if (currentVisibleCount !== prevVisibleCountRef.current) {
    // New beat: compute which IDs just appeared
    const prev = prevBeatRef.current
    const prevSet = prev ? new Set(prev.visibleIds) : new Set<string>()
    currentBeatNewIdsRef.current = new Set(growthBeat.visibleIds.filter(id => !prevSet.has(id)))
    prevVisibleCountRef.current = currentVisibleCount
  }
  const activeTargetIds = currentBeatNewIdsRef.current

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

        // Detect newly-appearing connections to animate path draw-in
        const bothVisibleNow = growthVisibleSet !== null &&
          growthVisibleSet.has(conn.sourceId) && growthVisibleSet.has(conn.targetId)
        const bothVisibleBefore = prevVisibleSet !== null &&
          prevVisibleSet.has(conn.sourceId) && prevVisibleSet.has(conn.targetId)
        const isNewlyAppearing = growthBeat !== null && bothVisibleNow && !bothVisibleBefore
        const drawAnimation: React.CSSProperties = isNewlyAppearing
          ? { animation: 'draw-connection 0.45s ease-out forwards', strokeDashoffset: 1 }
          : {}

        // Spotlight: is this connection leading to the currently-generating node?
        const isCurrentlyActive = growthBeat !== null && activeTargetIds.has(conn.targetId)
        // All previously-drawn connections that aren't the active one get dimmed
        const isPastDrawn = growthBeat !== null && bothVisibleNow && !isCurrentlyActive && !growthDimmed

        // Compute visual style
        let stroke: string
        let strokeWidth: number
        let strokeOpacity: number
        let strokeDasharray: string | undefined

        // Only the focused path gets blue treatment.
        // In idle (nothing focused), no path is singled out.
        const isEffectivelyPrimary = isFocused && isOnFocusedPath

        // Amber applies only to the single connection directly leaving the decision point.
        const isDirectDecisionConnection =
          focusedDecisionId !== undefined && conn.sourceId === focusedDecisionId

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
          if (isDirectDecisionConnection) {
            stroke = 'rgba(154,100,0,0.85)'
            strokeWidth = 2.5
            strokeOpacity = 0.85
          } else {
            stroke = 'var(--conn-primary-color)'
            strokeWidth = isOnFocusedPath ? 3 : 2.5
            strokeOpacity = isFocused && !isOnFocusedPath ? 0.1 : 0.65
          }
        } else {
          stroke = 'rgba(154,100,0,0.55)'
          strokeWidth = isOnFocusedPath ? 2 : 1.25
          strokeOpacity = (isFocused && !isOnFocusedPath) ? 0.28 : 0.45
          strokeDasharray = '5,4'
        }

        // Three-tier opacity during growth: active=1, past=0.50, inactive-branch=0.12
        const growthOpacity = growthDimmed ? 0.12 : isPastDrawn ? 0.50 : 1

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
              pathLength={isNewlyAppearing ? 1 : undefined}
              strokeDasharray={isNewlyAppearing ? '1' : undefined}
              style={{ transition: 'stroke-opacity 200ms ease-out, opacity 300ms ease-out', ...drawAnimation }}
              opacity={growthBeat ? growthOpacity : undefined}
            />
          )
        }

        // IDLE: render all non-pruned connections with the same amber glow treatment.
        // This replaces the old isFromDecision special case with a uniform look.
        if (!isFocused && !isPruned && !isShieldKilled && !conn.isPreflightFanIn) {
          const drawProps = isNewlyAppearing ? { pathLength: 1, strokeDasharray: '1', style: drawAnimation } : {}
          return (
            <g key={conn.id}>
              <path d={conn.pathData} fill="none" stroke="rgba(154,100,0,0.10)" strokeWidth={8}
                strokeDasharray={isNewlyAppearing ? '1' : strokeDasharray} {...drawProps} />
              <path d={conn.pathData} fill="none" stroke="rgba(154,100,0,0.22)" strokeWidth={3}
                strokeDasharray={isNewlyAppearing ? '1' : strokeDasharray} {...drawProps} />
              <path d={conn.pathData} fill="none" stroke="rgba(154,100,0,0.65)" strokeWidth={strokeWidth}
                strokeDasharray={isNewlyAppearing ? '1' : strokeDasharray} {...drawProps} />
            </g>
          )
        }

        // For primary/decision connections: render a multi-layer bloom (outer glow + crisp)
        if (isEffectivelyPrimary && !isPruned && !isShieldKilled) {
          const baseOpacity = growthBeat ? growthOpacity : (isFocused && !isOnFocusedPath ? 0.12 : 1)
          const drawProps = isNewlyAppearing ? { pathLength: 1, strokeDasharray: '1', style: drawAnimation } : {}
          if (isDirectDecisionConnection) {
            // Amber bloom — only on the single connection leaving the decision point
            return (
              <g key={conn.id} style={{ transition: 'opacity 300ms ease-out' }} opacity={baseOpacity}>
                <path d={conn.pathData} fill="none" stroke="rgba(154,100,0,0.10)" strokeWidth={10} {...drawProps} />
                <path d={conn.pathData} fill="none" stroke="rgba(154,100,0,0.22)" strokeWidth={4} {...drawProps} />
                <path d={conn.pathData} fill="none" stroke="rgba(154,100,0,0.85)" strokeWidth={2.5}
                  strokeOpacity={0.85} {...drawProps} />
              </g>
            )
          }
          return (
            <g key={conn.id} style={{ transition: 'opacity 300ms ease-out' }} opacity={baseOpacity}>
              <path d={conn.pathData} fill="none" stroke="rgba(59,125,216,0.10)" strokeWidth={10} {...drawProps} />
              <path d={conn.pathData} fill="none" stroke="rgba(59,125,216,0.22)" strokeWidth={4} {...drawProps} />
              <path
                d={conn.pathData}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeWidth}
                strokeOpacity={strokeOpacity}
                {...drawProps}
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
            strokeOpacity={growthBeat ? strokeOpacity * growthOpacity : (isFocused && !isOnFocusedPath ? strokeOpacity * 0.15 : strokeOpacity)}
            strokeDasharray={isNewlyAppearing ? '1' : strokeDasharray}
            pathLength={isNewlyAppearing ? 1 : undefined}
            style={{ transition: 'stroke-opacity 300ms ease-out, stroke-width 150ms ease-out', ...drawAnimation }}
          />
        )
      })}
    </g>
  )
}
