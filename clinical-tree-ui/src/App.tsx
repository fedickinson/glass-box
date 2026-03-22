/** App — root layout: header bar, tree panel (65%), synthesis panel (35%) */
import React, { useRef, useState, useMemo } from 'react'
import { TreeProvider, useTreeContext } from './context/TreeContext'
import { useTreeKeyboard } from './hooks/useTreeKeyboard'
import { useGrowthTimer } from './hooks/useGrowthTimer'
import { useViewportControl } from './hooks/useViewportControl'
import { useGrowthCamera, GrowthCameraMode } from './hooks/useGrowthCamera'
import { MOCK_PATIENT_CONTEXT, mockTreeNodes } from './data/mockTree'
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
import BaselineView from './components/BaselineView'

// Transform mock data once at module level
const POSITIONED_TREE = transformTree(mockTreeNodes)

// ─── Inner layout — has access to TreeContext ──────────────────────
function AppLayout() {
  const { state, dispatch } = useTreeContext()
  const viewportRef = useRef<TreeViewportHandle>(null)
  const [showBaseline, setShowBaseline] = useState(false)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [cameraMode, setCameraMode] = useState<GrowthCameraMode>('follow')

  // Canvas bounds — drives zoom clamping in TreeViewport
  const canvasDims = useMemo(() => {
    const nodes = state.tree.nodes
    if (nodes.length === 0) return { width: 2000, height: 2000 }
    const CANVAS_PAD = 40
    return {
      width:  Math.max(...nodes.map(n => n.x + n.width))  + CANVAS_PAD,
      height: Math.max(...nodes.map(n => n.y + n.height)) + CANVAS_PAD,
    }
  }, [state.tree.nodes])

  // Current animation beat — used for TreeCanvas visibility and shieldStats
  const currentGrowthBeat = useMemo((): AnimationBeat | null => {
    if (state.growth.mode === 'idle') return null
    const g = state.growth as { beatIndex: number; sequence: AnimationBeat[] }
    return g.sequence[g.beatIndex] ?? null
  }, [state.growth])

  // Shield stats — counts revealed checks and violations for the status badge
  const shieldStats = useMemo(() => {
    if (state.growth.mode === 'idle') {
      const allNodes = state.tree.nodes
      const checkedRevealed = allNodes.filter(n => n.shield_checked)
      const violationsRevealed = allNodes.filter(n => n.shield_severity)
      const totalChecks = allNodes.filter(n => n.shield_checked).length
      return {
        checked: checkedRevealed.length,
        passed: checkedRevealed.length - violationsRevealed.length,
        violations: violationsRevealed.length,
        total: totalChecks,
      }
    }
    const g = state.growth as { beatIndex: number; sequence: { visibleIds: string[] }[] }
    const beat = g.sequence[g.beatIndex]
    const visibleSet = beat ? new Set(beat.visibleIds) : new Set<string>()
    const revealed = state.tree.nodes.filter(n => visibleSet.has(n.id))
    const checkedRevealed = revealed.filter(n => n.shield_checked)
    const violationsRevealed = revealed.filter(n => n.shield_severity)
    const totalChecks = state.tree.nodes.filter(n => n.shield_checked).length
    return {
      checked: checkedRevealed.length,
      passed: checkedRevealed.length - violationsRevealed.length,
      violations: violationsRevealed.length,
      total: totalChecks,
    }
  }, [state.growth, state.tree])

  // Computed synthesis — re-runs on every prune/restore/annotate/pin
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

      {/* ── Patient context bar ── */}
      <header
        className="flex items-center gap-0 shrink-0 border-b"
        style={{
          padding: '10px 24px',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderColor: 'rgba(0,0,0,0.07)',
        }}
      >
        {/* Patient identity */}
        <div
          className="flex items-baseline gap-2.5 pr-5 mr-5"
          style={{ borderRight: '1px solid rgba(0,0,0,0.09)' }}
        >
          <span className="text-[13px] font-bold tracking-tight text-[#111]">
            {MOCK_PATIENT_CONTEXT.age}{MOCK_PATIENT_CONTEXT.sex[0]}
          </span>
          <span className="text-[12px] font-normal text-[#333]">
            {MOCK_PATIENT_CONTEXT.chiefComplaint}
          </span>
        </div>

        {/* Vitals */}
        <div
          className="flex items-center gap-1 pr-5 mr-5"
          style={{ borderRight: '1px solid rgba(0,0,0,0.09)' }}
        >
          {[
            { label: 'HR',   value: `${MOCK_PATIENT_CONTEXT.vitals.hr}`,  unit: 'bpm',  flag: MOCK_PATIENT_CONTEXT.vitals.hr > 100 },
            { label: 'BP',   value: MOCK_PATIENT_CONTEXT.vitals.bp,        unit: '',     flag: true },
            { label: 'SpO₂', value: `${MOCK_PATIENT_CONTEXT.vitals.spo2}`, unit: '%',    flag: MOCK_PATIENT_CONTEXT.vitals.spo2 < 95 },
            { label: 'RR',   value: `${MOCK_PATIENT_CONTEXT.vitals.rr}`,  unit: '/min', flag: false },
          ].map((v, i) => (
            <div
              key={v.label}
              className="flex items-baseline gap-1"
              style={{
                padding: '3px 9px',
                background: v.flag ? 'rgba(185,50,38,0.07)' : 'rgba(255,255,255,0.75)',
                border: v.flag ? '1px solid rgba(185,50,38,0.2)' : '1px solid rgba(0,0,0,0.09)',
                borderRadius: 20,
                marginLeft: i === 0 ? 0 : 3,
              }}
            >
              <span
                className="text-[8px] font-bold uppercase tracking-[0.08em]"
                style={{ color: v.flag ? '#b83226' : 'rgba(0,0,0,0.4)' }}
              >
                {v.label}
              </span>
              <span className="text-[12px] font-bold" style={{ color: v.flag ? '#b83226' : '#111' }}>
                {v.value}
              </span>
              {v.unit && (
                <span className="text-[9px]" style={{ color: 'rgba(0,0,0,0.3)' }}>
                  {v.unit}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* PMH */}
        <div className="flex flex-col gap-0.5">
          <span
            className="text-[8px] font-bold uppercase tracking-[0.1em] leading-none"
            style={{ color: 'rgba(0,0,0,0.35)' }}
          >
            PMH
          </span>
          <span className="text-[11px] leading-none" style={{ color: 'rgba(0,0,0,0.55)' }}>
            {MOCK_PATIENT_CONTEXT.relevantHistory}
          </span>
        </div>

        {/* Right controls */}
        <div className="ml-auto flex items-center gap-2">

          {/* Link to orthopedics demo */}
          <a
            href="/orthopedics"
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.05em',
              padding: '5px 12px',
              borderRadius: 20,
              background: 'rgba(107,64,189,0.06)',
              border: '1px solid rgba(107,64,189,0.18)',
              color: '#6B40BD',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            Board Q →
          </a>

          {/* Start Growth / growth status */}
          {state.growth.mode === 'idle' && !showBaseline && (
            <button
              onClick={() => dispatch({ type: 'START_GROWTH' })}
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.06em',
                padding: '5px 14px',
                borderRadius: 20,
                background: 'rgba(59,125,216,0.1)',
                border: '1px solid rgba(59,125,216,0.25)',
                color: '#1A52A8',
                cursor: 'pointer',
                transition: 'all 150ms ease-out',
              }}
            >
              ▶ Start reasoning
            </button>
          )}

          {/* Baseline toggle */}
          <button
            onClick={() => setShowBaseline(s => !s)}
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.06em',
              padding: '5px 12px',
              borderRadius: 20,
              background: showBaseline ? 'rgba(212,149,10,0.1)' : 'rgba(0,0,0,0.05)',
              border: showBaseline ? '1px solid rgba(212,149,10,0.3)' : '1px solid rgba(0,0,0,0.1)',
              color: showBaseline ? '#8a6000' : 'rgba(0,0,0,0.5)',
              cursor: 'pointer',
              transition: 'all 150ms ease-out',
            }}
          >
            {showBaseline ? 'Show reasoning tree' : 'Show baseline'}
          </button>

        </div>
      </header>

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
          {/* ── Shield status badge — persistent top-right overlay ── */}
          {!showBaseline && shieldStats.checked > 0 && (
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
                transition: 'border-color 300ms ease-out',
              }}
            >
              <ShieldIcon size={13} color={shieldStats.violations > 0 ? '#C53D2F' : '#2D8A56'} />
              <span style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.05em',
                color: shieldStats.violations > 0 ? '#C53D2F' : '#2D8A56',
                transition: 'color 300ms ease-out',
              }}>
                Shield active
              </span>
              <span style={{
                fontSize: 9,
                color: 'rgba(0,0,0,0.45)',
                marginLeft: 2,
              }}>
                {shieldStats.passed} of {shieldStats.checked} checks passed
              </span>
              {shieldStats.violations > 0 && (
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: '#C53D2F',
                  marginLeft: 2,
                }}>
                  · {shieldStats.violations} violation{shieldStats.violations > 1 ? 's' : ''} caught
                </span>
              )}
            </div>
          )}

          {showBaseline ? (
            <BaselineView />
          ) : (
            <>
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

              {/* BranchConclusionPanel — bottom drawer for terminal nodes */}
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
                    onRestoreBranch={id => dispatch({ type: 'RESTORE_BRANCH', branchId: id })}
                    onEvidenceNodeClick={nodeId => dispatch({ type: 'PEEK_NODE', nodeId })}
                    onAuditHypothesis={(diagnosis, branchIds) =>
                      dispatch({ type: 'FOCUS_HYPOTHESIS', diagnosis, branchIds })
                    }
                  />
                )
              })()}

              {/* BranchScrubber — only when branch focused with no specific node selected (drawer handles navigation otherwise) */}
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

              {/* NodeDetail bottom drawer — mid-chain nodes only; embeds scrubber, slides up */}
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
                />
              )}

              {/* Legend */}
              <TreeLegend />

              {/* GrowthControls — shown during active growth playback */}
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
            </>
          )}
        </div>

        {/* ── Synthesis panel — 35% ── */}
        <SynthesisPanel
          synthesis={synthesis}
          focusState={state.focusState}
          annotations={state.annotations}
          pinnedBranchId={state.pinnedBranchId}
          auditLog={state.auditLog}
          onBranchClick={branchId => dispatch({ type: 'FOCUS_BRANCH', branchId })}
          onHypothesisClick={(diagnosis, branchIds) => dispatch({ type: 'FOCUS_HYPOTHESIS', diagnosis, branchIds })}
          onEvidenceNodeClick={nodeId => dispatch({ type: 'PEEK_NODE', nodeId })}
          onNodeClick={nodeId => dispatch({ type: 'SELECT_NODE', nodeId })}
          onNodeHoverEnter={setHoveredNodeId}
          onNodeHoverLeave={() => setHoveredNodeId(null)}
          onRestoreBranch={branchId => dispatch({ type: 'RESTORE_BRANCH', branchId })}
          onPinBranch={branchId => dispatch({ type: 'PIN_BRANCH', branchId })}
          onUnpinBranch={() => dispatch({ type: 'UNPIN_BRANCH' })}
          onAnnotate={(nodeId, type, content) => dispatch({ type: 'ADD_ANNOTATION', nodeId, annotationType: type, content })}
          onRemoveAnnotation={annotationId => dispatch({ type: 'REMOVE_ANNOTATION', annotationId })}
          onAddReview={(diagnosis, rating, text) => dispatch({
            type: 'APPEND_AUDIT',
            entry: {
              type: 'doctor',
              action: 'assess',
              summary: `Assessment: ${rating === 'up' ? 'Agree' : rating === 'down' ? 'Disagree' : 'Clinical note'} — ${diagnosis}`,
              detail: text || null,
              nodeId: null,
              branchId: null,
              hypothesisDiagnosis: diagnosis,
              assessmentRating: rating,
            },
          })}
        />
      </div>

    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <TreeProvider initialTree={POSITIONED_TREE}>
      <AppLayout />
    </TreeProvider>
  )
}
