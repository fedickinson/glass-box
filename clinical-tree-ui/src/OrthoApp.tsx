/** OrthoApp — Clinical reasoning tree for the orthopedics board question demo */
import React, { useRef, useState, useMemo, useEffect } from 'react'
import { TreeProvider, useTreeContext } from './context/TreeContext'
import { useTreeKeyboard } from './hooks/useTreeKeyboard'
import { useGrowthTimer } from './hooks/useGrowthTimer'
import { useViewportControl } from './hooks/useViewportControl'
import { useGrowthCamera, GrowthCameraMode } from './hooks/useGrowthCamera'
import { ORTHO_PATIENT_CONTEXT, orthopedicsTreeNodes } from './data/orthopedicsTree'
import { transformTree } from './data/transformer'
import { computeSynthesis } from './data/computeSynthesis'
import { GrowthPlaybackState, AnimationBeat } from './types/tree'
import TreeViewport, { TreeViewportHandle } from './components/tree/TreeViewport'
import TreeCanvas from './components/tree/TreeCanvas'
import BranchScrubber from './components/tree/BranchScrubber'
import GrowthControls from './components/tree/GrowthControls'
import NodeDetail from './components/tree/NodeDetail'
import BranchConclusionPanel from './components/tree/BranchConclusionPanel'
import { TerminalVariant, deriveTerminalVariant } from './components/tree/TerminalCard'
import TreeLegend from './components/tree/TreeLegend'
import SynthesisPanel from './components/synthesis/SynthesisPanel'
import { ShieldIcon } from './components/shared/Icons'

// Transform once at module level
const POSITIONED_TREE = transformTree(orthopedicsTreeNodes)

// ─── Inner layout ────────────────────────────────────────────────────────────
function OrthoLayout() {
  const { state, dispatch } = useTreeContext()
  const viewportRef = useRef<TreeViewportHandle>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [cameraMode, setCameraMode] = useState<GrowthCameraMode>('follow')
  const [synthesisPhase, setSynthesisPhase] = useState<'pre' | 'generating' | 'revealed'>('pre')
  const prevGrowthMode = useRef<string>('idle')

  // Track growth → idle transition to trigger synthesis reveal
  useEffect(() => {
    const prev = prevGrowthMode.current
    const curr = state.growth.mode
    prevGrowthMode.current = curr

    if (prev === 'idle' && curr !== 'idle') {
      // Growth just started
      setSynthesisPhase('generating')
    } else if (prev !== 'idle' && curr === 'idle') {
      // Growth just completed — zoom out to overview, then reveal synthesis
      viewportRef.current?.fitToView()
      setSynthesisPhase('revealed')
    }
  }, [state.growth.mode])

  const canvasDims = useMemo(() => {
    const nodes = state.tree.nodes
    if (nodes.length === 0) return { width: 2000, height: 2000 }
    const CANVAS_PAD = 40
    return {
      width:  Math.max(...nodes.map(n => n.x + n.width))  + CANVAS_PAD,
      height: Math.max(...nodes.map(n => n.y + n.height)) + CANVAS_PAD,
    }
  }, [state.tree.nodes])

  const currentGrowthBeat = useMemo((): AnimationBeat | null => {
    if (state.growth.mode === 'idle') return null
    const g = state.growth as { beatIndex: number; sequence: AnimationBeat[] }
    return g.sequence[g.beatIndex] ?? null
  }, [state.growth])

  const shieldStats = useMemo(() => {
    if (state.growth.mode === 'idle') {
      // All nodes visible
      const allNodes = state.tree.nodes
      const checkedRevealed = allNodes.filter(n => n.shield_checked)
      const violationsRevealed = allNodes.filter(n => n.shield_severity)
      return {
        checked: checkedRevealed.length,
        passed: checkedRevealed.length - violationsRevealed.length,
        violations: violationsRevealed.length,
      }
    }
    const g = state.growth as { beatIndex: number; sequence: { visibleIds: string[] }[] }
    const beat = g.sequence[g.beatIndex]
    const visibleSet = beat ? new Set(beat.visibleIds) : new Set<string>()
    const revealed = state.tree.nodes.filter(n => visibleSet.has(n.id))
    const checkedRevealed = revealed.filter(n => n.shield_checked)
    const violationsRevealed = revealed.filter(n => n.shield_severity)
    return {
      checked: checkedRevealed.length,
      passed: checkedRevealed.length - violationsRevealed.length,
      violations: violationsRevealed.length,
    }
  }, [state.growth, state.tree])

  const synthesis = useMemo(
    () =>
      computeSynthesis(
        state.tree,
        state.prunedBranchIds,
        state.annotations,
        state.pinnedBranchId,
        state.pruneSourceMap
      ),
    [state.tree, state.prunedBranchIds, state.annotations, state.pinnedBranchId, state.pruneSourceMap]
  )

  useTreeKeyboard(state.focusState, state.growth, dispatch)
  useGrowthTimer(state.growth, dispatch)
  useViewportControl(state.focusState, state.tree, viewportRef)
  useGrowthCamera(state.growth, state.tree, cameraMode, viewportRef)

  const isBranchFocused = state.focusState.mode === 'branch_focused'
  const focusBranch = state.focusState.mode === 'branch_focused' ? state.focusState : null
  const selectedNodeId = focusBranch?.selectedNodeId ?? null
  const selectedNode = selectedNodeId
    ? state.tree.nodes.find(n => n.id === selectedNodeId)
    : undefined

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* ── Two-panel content area ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Tree panel — 65% ── */}
        <div
          className="flex flex-col overflow-hidden relative"
          style={{
            width: '65%',
            background: 'radial-gradient(ellipse at 38% 38%, #e8eef8 0%, #dde6f4 55%, #d8e2f0 100%)',
            borderRight: '1px solid rgba(0,0,0,0.07)',
          }}
        >
          {/* Shield status badge */}
          {shieldStats.checked > 0 && (
            <div
              style={{
                position: 'absolute',
                top: 10,
                right: 12,
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 11px',
                borderRadius: 20,
                background: 'rgba(255,255,255,0.92)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                border: shieldStats.violations > 0
                  ? '1px solid rgba(197,61,47,0.28)'
                  : '1px solid rgba(45,138,86,0.28)',
                boxShadow: '0 1px 8px rgba(0,0,0,0.07)',
              }}
            >
              <ShieldIcon size={13} color={shieldStats.violations > 0 ? '#C53D2F' : '#2D8A56'} />
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', color: shieldStats.violations > 0 ? '#C53D2F' : '#2D8A56' }}>
                Shield active
              </span>
              <span style={{ fontSize: 9, color: 'rgba(0,0,0,0.45)', marginLeft: 2 }}>
                {shieldStats.passed} of {shieldStats.checked} checks passed
              </span>
            </div>
          )}

          <div className="flex-1 overflow-hidden">
            <TreeViewport
              ref={viewportRef}
              canvasWidth={canvasDims.width}
              canvasHeight={canvasDims.height}
              nodeCount={state.tree.nodes.length}
            >
              <TreeCanvas
                nodes={state.tree.nodes}
                connections={state.tree.connections}
                convergences={state.tree.convergences}
                focusState={state.focusState}
                prunedBranchIds={state.prunedBranchIds}
                pruneSourceMap={state.pruneSourceMap}
                growthBeat={currentGrowthBeat}
                decisionAutoPausedNodeId={
                  state.growth.mode === 'paused_at_decision'
                    ? state.growth.decisionNodeId
                    : null
                }
                viewMode={state.viewMode}
                annotations={state.annotations}
                hoveredNodeId={hoveredNodeId}
                onNodeClick={id => dispatch({ type: 'SELECT_NODE', nodeId: id })}
                onCanvasClick={() => dispatch({ type: 'CLEAR_FOCUS' })}
              />
            </TreeViewport>
          </div>

          {/* BranchConclusionPanel — terminal nodes */}
          {selectedNode && selectedNode.isTerminal && (() => {
            const branchId = selectedNode.branch_id
            const isPruned = state.prunedBranchIds.has(branchId)
            const pruneSource = state.pruneSourceMap.get(branchId)
            const variant: TerminalVariant = deriveTerminalVariant(
              selectedNode, isPruned, pruneSource, state.tree.convergences
            )
            const branchSummary = synthesis.branches.find(b => b.branchId === branchId) ?? null
            const rejectedPath = synthesis.rejectedPaths.find(r => r.branchId === branchId) ?? null
            return (
              <BranchConclusionPanel
                terminalNode={selectedNode}
                variant={variant}
                branchSummary={branchSummary}
                convergences={state.tree.convergences}
                rejectedPath={rejectedPath}
                safetySummary={synthesis.safetySummary}
                onClose={() => dispatch({ type: 'CLEAR_FOCUS' })}
                onPruneBranch={id => dispatch({ type: 'PRUNE_BRANCH', branchId: id, source: 'doctor' })}
                onRestoreBranch={id => dispatch({ type: 'RESTORE_BRANCH', branchId: id })}
                onEvidenceNodeClick={nodeId => dispatch({ type: 'PEEK_NODE', nodeId })}
                onAuditHypothesis={(diagnosis, branchIds) =>
                  dispatch({ type: 'FOCUS_HYPOTHESIS', diagnosis, branchIds })
                }
              />
            )
          })()}

          {/* BranchScrubber */}
          {state.growth.mode === 'idle' && isBranchFocused && focusBranch && !selectedNode && (
            <BranchScrubber
              branchNodeIds={focusBranch.branchNodeIds}
              nodes={state.tree.nodes}
              selectedIndex={focusBranch.selectedNodeIndex}
              onScrub={index => {
                const nodeId = focusBranch.branchNodeIds[index]
                if (nodeId) dispatch({ type: 'SELECT_NODE', nodeId })
              }}
            />
          )}

          {/* NodeDetail bottom drawer */}
          {selectedNode && !selectedNode.isTerminal && focusBranch && (
            <NodeDetail
              node={selectedNode}
              allNodes={state.tree.nodes}
              branchNodeIds={focusBranch.branchNodeIds}
              selectedNodeIndex={focusBranch.selectedNodeIndex}
              viewMode={state.viewMode}
              annotations={state.annotations}
              onClose={() => dispatch({ type: 'CLEAR_FOCUS' })}
              onNavigateNext={() => dispatch({ type: 'NAVIGATE_NEXT' })}
              onNavigatePrev={() => dispatch({ type: 'NAVIGATE_PREV' })}
              onScrub={index => {
                const nodeId = focusBranch.branchNodeIds[index]
                if (nodeId) dispatch({ type: 'SELECT_NODE', nodeId })
              }}
              onFocusBranch={branchId => dispatch({ type: 'FOCUS_BRANCH', branchId })}
              onAddAnnotation={(nodeId, type, content) =>
                dispatch({ type: 'ADD_ANNOTATION', nodeId, annotationType: type, content })
              }
              onPruneBranch={branchId =>
                dispatch({ type: 'PRUNE_BRANCH', branchId, source: 'doctor' })
              }
            />
          )}

          {/* Legend — shifts up when GrowthControls bar is visible */}
          <TreeLegend bottomOffset={state.growth.mode !== 'idle' ? 72 : 16} />

          {/* Start Reasoning — bottom-right, clear of legend */}
          {state.growth.mode === 'idle' && (
            <button
              onClick={() => dispatch({ type: 'START_GROWTH' })}
              style={{
                position: 'absolute',
                bottom: 16,
                right: 16,
                zIndex: 10,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.06em',
                padding: '6px 16px',
                borderRadius: 20,
                background: 'rgba(255,255,255,0.88)',
                backdropFilter: 'blur(18px)',
                WebkitBackdropFilter: 'blur(18px)',
                border: '1px solid rgba(59,125,216,0.28)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
                color: '#1A52A8',
                cursor: 'pointer',
                transition: 'background 140ms ease-out',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.96)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.88)')}
            >
              ▶ Start reasoning
            </button>
          )}

          {/* GrowthControls */}
          {state.growth.mode !== 'idle' && (
            <GrowthControls
              growth={state.growth}
              totalNodes={state.tree.nodes.length}
              cameraMode={cameraMode}
              onCameraMode={setCameraMode}
              onPlay={() => dispatch({ type: 'RESUME_GROWTH' })}
              onPause={() => dispatch({ type: 'PAUSE_GROWTH' })}
              onStepForward={() => dispatch({ type: 'STEP_FORWARD' })}
              onStepBackward={() => dispatch({ type: 'STEP_BACKWARD' })}
              onSkipToEnd={() => dispatch({ type: 'SKIP_TO_END' })}
            />
          )}
        </div>

        {/* ── Synthesis panel — 35% ── */}
        <SynthesisPanel
          synthesis={synthesis}
          synthesisPhase={synthesisPhase}
          focusState={state.focusState}
          annotations={state.annotations}
          pinnedBranchId={state.pinnedBranchId}
          onBranchClick={branchId => dispatch({ type: 'FOCUS_BRANCH', branchId })}
          onHypothesisClick={(diagnosis, branchIds) => dispatch({ type: 'FOCUS_HYPOTHESIS', diagnosis, branchIds })}
          onEvidenceNodeClick={nodeId => dispatch({ type: 'PEEK_NODE', nodeId })}
          onNodeClick={nodeId => dispatch({ type: 'SELECT_NODE', nodeId })}
          onNodeHoverEnter={setHoveredNodeId}
          onNodeHoverLeave={() => setHoveredNodeId(null)}
          onPruneBranch={branchId => dispatch({ type: 'PRUNE_BRANCH', branchId, source: 'doctor' })}
          onRestoreBranch={branchId => dispatch({ type: 'RESTORE_BRANCH', branchId })}
          onPinBranch={branchId => dispatch({ type: 'PIN_BRANCH', branchId })}
          onUnpinBranch={() => dispatch({ type: 'UNPIN_BRANCH' })}
          onAnnotate={(nodeId, type, content) => dispatch({ type: 'ADD_ANNOTATION', nodeId, annotationType: type, content })}
          onRemoveAnnotation={annotationId => dispatch({ type: 'REMOVE_ANNOTATION', annotationId })}
          onAddReview={(diagnosis, rating, text) => dispatch({
            type: 'APPEND_AUDIT',
            entry: {
              type: 'doctor',
              summary: `Reviewed "${diagnosis}"${rating ? ` — ${rating === 'up' ? 'Agreed ↑' : 'Disagreed ↓'}` : ''}${text ? `: ${text.slice(0, 60)}${text.length > 60 ? '…' : ''}` : ''}`,
              detail: text || null,
              nodeId: null,
              branchId: null,
            },
          })}
        />
      </div>

    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function OrthoApp() {
  return (
    <TreeProvider initialTree={POSITIONED_TREE}>
      <OrthoLayout />
    </TreeProvider>
  )
}
