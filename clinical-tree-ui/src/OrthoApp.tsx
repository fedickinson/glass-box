/** OrthoApp — Clinical reasoning tree for the orthopedics board question demo */
import React, { useRef, useState, useMemo } from 'react'
import { TreeProvider, useTreeContext } from './context/TreeContext'
import { useTreeKeyboard } from './hooks/useTreeKeyboard'
import { useGrowthTimer } from './hooks/useGrowthTimer'
import { useViewportControl } from './hooks/useViewportControl'
import { useGrowthCamera, GrowthCameraMode } from './hooks/useGrowthCamera'
import { ORTHO_PATIENT_CONTEXT, orthopedicsTreeNodes } from './data/orthopedicsTree'
import { transformTree } from './data/transformer'
import { computeSynthesis } from './data/computeSynthesis'
import { GrowthPlaybackState, GrowthSpeed } from './types/tree'
import TreeViewport, { TreeViewportHandle } from './components/tree/TreeViewport'
import TreeCanvas from './components/tree/TreeCanvas'
import BranchScrubber from './components/tree/BranchScrubber'
import GrowthControls from './components/tree/GrowthControls'
import NodeDetail from './components/tree/NodeDetail'
import BranchConclusionPanel from './components/tree/BranchConclusionPanel'
import { TerminalVariant } from './components/tree/TerminalCard'
import SynthesisPanel from './components/synthesis/SynthesisPanel'
import AuditTrail from './components/AuditTrail'
import { ShieldIcon } from './components/shared/Icons'

// Transform once at module level
const POSITIONED_TREE = transformTree(orthopedicsTreeNodes)

function getGrowthCursor(growth: GrowthPlaybackState): number {
  if (growth.mode === 'idle') return Infinity
  return (growth as { cursor: number }).cursor
}

// ─── Inner layout ────────────────────────────────────────────────────────────
function OrthoLayout() {
  const { state, dispatch } = useTreeContext()
  const viewportRef = useRef<TreeViewportHandle>(null)
  const [showAuditTrail, setShowAuditTrail] = useState(false)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [cameraMode, setCameraMode] = useState<GrowthCameraMode>('follow')

  const canvasDims = useMemo(() => {
    const nodes = state.tree.nodes
    if (nodes.length === 0) return { width: 2000, height: 2000 }
    const CANVAS_PAD = 40
    return {
      width:  Math.max(...nodes.map(n => n.x + n.width))  + CANVAS_PAD,
      height: Math.max(...nodes.map(n => n.y + n.height)) + CANVAS_PAD,
    }
  }, [state.tree.nodes])

  const shieldStats = useMemo(() => {
    const cursor = getGrowthCursor(state.growth)
    const sorted = [...state.tree.nodes].sort((a, b) => (a.step_index ?? 0) - (b.step_index ?? 0))
    const revealedMax = cursor === Infinity ? sorted.length : Math.min(cursor + 1, sorted.length)
    const revealed = sorted.slice(0, revealedMax)
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

      {/* ── Patient context bar ── */}
      <header
        className="flex items-center gap-0 shrink-0 border-b"
        style={{
          padding: '9px 20px',
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderColor: 'rgba(0,0,0,0.07)',
        }}
      >
        {/* Patient identity chip */}
        <div
          className="flex items-center gap-2 pr-5 mr-5 shrink-0"
          style={{ borderRight: '1px solid rgba(0,0,0,0.09)' }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{
                fontSize: 7, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
                color: '#6B40BD', background: 'rgba(107,64,189,0.08)',
                border: '1px solid rgba(107,64,189,0.2)', borderRadius: 4, padding: '1.5px 5px',
              }}>
                {ORTHO_PATIENT_CONTEXT.domain}
              </span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#111', lineHeight: 1.1 }}>
              {ORTHO_PATIENT_CONTEXT.name}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(0,0,0,0.42)', marginTop: 1 }}>
              {ORTHO_PATIENT_CONTEXT.age}
            </div>
          </div>
        </div>

        {/* Transcript quote */}
        <div className="flex-1 min-w-0 pr-5">
          <div style={{
            fontSize: 8, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
            color: 'rgba(0,0,0,0.32)', marginBottom: 3,
          }}>
            {ORTHO_PATIENT_CONTEXT.transcript.speaker}
          </div>
          <div style={{
            fontSize: 11.5, fontStyle: 'italic', color: '#222', lineHeight: 1.4,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {ORTHO_PATIENT_CONTEXT.transcript.quote}
          </div>
        </div>

        {/* Clinical tags */}
        <div className="flex items-center gap-1.5 shrink-0 pr-5 mr-5" style={{ borderRight: '1px solid rgba(0,0,0,0.09)' }}>
          {ORTHO_PATIENT_CONTEXT.clinicalTags.map(tag => (
            <span key={tag} style={{
              fontSize: 9, fontWeight: 600, color: 'rgba(0,0,0,0.52)',
              background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.09)',
              borderRadius: 5, padding: '2px 7px', whiteSpace: 'nowrap',
            }}>
              {tag}
            </span>
          ))}
        </div>

        {/* Right controls */}
        <div className="ml-auto flex items-center gap-2 shrink-0">

          {/* Back to patient case */}
          <a
            href="/"
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.05em',
              padding: '5px 12px',
              borderRadius: 20,
              background: 'rgba(0,0,0,0.04)',
              border: '1px solid rgba(0,0,0,0.1)',
              color: 'rgba(0,0,0,0.5)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            ← Chest pain case
          </a>

          {/* Start Growth */}
          {state.growth.mode === 'idle' && (
            <button
              onClick={() => dispatch({ type: 'START_GROWTH', speed: 200 })}
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

          {/* Audit trail toggle */}
          <button
            onClick={() => setShowAuditTrail(s => !s)}
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.06em',
              padding: '5px 12px',
              borderRadius: 20,
              background: showAuditTrail ? 'rgba(45,138,86,0.1)' : 'rgba(0,0,0,0.05)',
              border: showAuditTrail ? '1px solid rgba(45,138,86,0.3)' : '1px solid rgba(0,0,0,0.1)',
              color: showAuditTrail ? '#2D8A56' : 'rgba(0,0,0,0.5)',
              cursor: 'pointer',
              transition: 'all 150ms ease-out',
            }}
          >
            Audit trail {state.auditLog.length > 0 && `(${state.auditLog.length})`}
          </button>

          {/* View mode toggle */}
          <button
            onClick={() => dispatch({ type: 'TOGGLE_VIEW_MODE' })}
            style={{
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              padding: '5px 12px',
              borderRadius: 20,
              background: state.viewMode === 'architecture' ? 'rgba(59,125,216,0.12)' : 'rgba(59,125,216,0.07)',
              border: '1px solid rgba(59,125,216,0.18)',
              color: '#1A52A8',
              cursor: 'pointer',
            }}
          >
            {state.viewMode === 'clinical' ? 'Clinical view' : 'Architecture view'}
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
                growthCursor={getGrowthCursor(state.growth)}
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
            const isShieldKilled = isPruned && pruneSource === 'shield'
            const isConverging = !isPruned && state.tree.convergences.some(
              c => c.terminalNodeIds.includes(selectedNode.id) && c.terminalNodeIds.length > 1
            )
            const variant: TerminalVariant = isShieldKilled ? 'shield_killed'
              : isPruned ? 'doctor_pruned'
              : isConverging ? 'converging'
              : 'divergent'
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
              onSetSpeed={(speed: GrowthSpeed) => dispatch({ type: 'SET_GROWTH_SPEED', speed })}
              onSkipToEnd={() => dispatch({ type: 'SKIP_TO_END' })}
            />
          )}
        </div>

        {/* ── Synthesis panel — 35% ── */}
        <SynthesisPanel
          synthesis={synthesis}
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
        />
      </div>

      {/* ── Audit trail ── */}
      {showAuditTrail && (
        <div
          style={{
            height: 180,
            borderTop: '1px solid rgba(0,0,0,0.09)',
            background: 'rgba(252,252,253,0.97)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding: '8px 20px 0',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderBottom: '1px solid rgba(0,0,0,0.05)',
              paddingBottom: 7,
            }}
          >
            <span style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)' }}>
              Activity log
            </span>
            <button
              onClick={() => setShowAuditTrail(false)}
              style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(0,0,0,0.3)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}
            >
              ✕
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <AuditTrail
              auditLog={state.auditLog}
              tree={state.tree}
              onEntryClick={entry => {
                if (entry.nodeId) dispatch({ type: 'SELECT_NODE', nodeId: entry.nodeId })
                else if (entry.branchId) dispatch({ type: 'FOCUS_BRANCH', branchId: entry.branchId })
              }}
            />
          </div>
        </div>
      )}
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
