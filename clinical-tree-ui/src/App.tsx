/** App — root layout: header bar, tree panel (65%), synthesis panel (35%) */
import React, { useRef, useState, useMemo } from 'react'
import { TreeProvider, useTreeContext } from './context/TreeContext'
import { useTreeKeyboard } from './hooks/useTreeKeyboard'
import { useGrowthTimer } from './hooks/useGrowthTimer'
import { useViewportControl } from './hooks/useViewportControl'
import { MOCK_PATIENT_CONTEXT, mockTreeNodes } from './data/mockTree'
import { transformTree } from './data/transformer'
import { computeSynthesis } from './data/computeSynthesis'
import { GrowthPlaybackState } from './types/tree'
import TreeViewport, { TreeViewportHandle } from './components/tree/TreeViewport'
import TreeCanvas from './components/tree/TreeCanvas'
import BranchScrubber from './components/tree/BranchScrubber'
import NodeDetail from './components/tree/NodeDetail'
import SynthesisPanel from './components/synthesis/SynthesisPanel'
import AuditTrail from './components/AuditTrail'
import BaselineView from './components/BaselineView'

// Transform mock data once at module level
const POSITIONED_TREE = transformTree(mockTreeNodes)

function getGrowthCursor(growth: GrowthPlaybackState): number {
  if (growth.mode === 'idle') return Infinity
  return (growth as { cursor: number }).cursor
}

// ─── Inner layout — has access to TreeContext ──────────────────────
function AppLayout() {
  const { state, dispatch } = useTreeContext()
  const viewportRef = useRef<TreeViewportHandle>(null)
  const [showBaseline, setShowBaseline] = useState(false)
  const [showAuditTrail, setShowAuditTrail] = useState(false)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)

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
          {showBaseline ? (
            <BaselineView />
          ) : (
            <>
              <div className="flex-1 overflow-hidden">
                <TreeViewport ref={viewportRef}>
                  <TreeCanvas
                    nodes={state.tree.nodes}
                    connections={state.tree.connections}
                    convergences={state.tree.convergences}
                    focusState={state.focusState}
                    prunedBranchIds={state.prunedBranchIds}
                    pruneSourceMap={state.pruneSourceMap}
                    growthCursor={getGrowthCursor(state.growth)}
                    viewMode={state.viewMode}
                    annotations={state.annotations}
                    hoveredNodeId={hoveredNodeId}
                    onNodeClick={id => dispatch({ type: 'SELECT_NODE', nodeId: id })}
                    onCanvasClick={() => dispatch({ type: 'CLEAR_FOCUS' })}
                  />
                </TreeViewport>
              </div>

              {/* Node detail overlay */}
              {selectedNode && (
                <NodeDetail
                  node={selectedNode}
                  viewMode={state.viewMode}
                  onClose={() => dispatch({ type: 'CLEAR_FOCUS' })}
                />
              )}

              {/* Branch scrubber — visible when branch focused */}
              {isBranchFocused && focusBranch && state.growth.mode === 'idle' && (
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
            </>
          )}
        </div>

        {/* ── Synthesis panel — 35% ── */}
        <SynthesisPanel
          synthesis={synthesis}
          focusState={state.focusState}
          annotations={state.annotations}
          pinnedBranchId={state.pinnedBranchId}
          onBranchClick={branchId => dispatch({ type: 'FOCUS_BRANCH', branchId })}
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

      {/* ── Audit trail — collapsible bottom panel ── */}
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
            <span
              style={{
                fontSize: 8.5,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: 'rgba(0,0,0,0.35)',
              }}
            >
              Activity log
            </span>
            <button
              onClick={() => setShowAuditTrail(false)}
              style={{
                marginLeft: 'auto',
                fontSize: 10,
                color: 'rgba(0,0,0,0.3)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 6px',
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <AuditTrail
              auditLog={state.auditLog}
              tree={state.tree}
              onEntryClick={entry => {
                if (entry.nodeId) {
                  dispatch({ type: 'SELECT_NODE', nodeId: entry.nodeId })
                } else if (entry.branchId) {
                  dispatch({ type: 'FOCUS_BRANCH', branchId: entry.branchId })
                }
              }}
            />
          </div>
        </div>
      )}
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
