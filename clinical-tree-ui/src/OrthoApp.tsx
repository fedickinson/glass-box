/** OrthoApp — Clinical reasoning tree for the orthopedics board question demo */
import React, { useRef, useState, useMemo, useEffect } from 'react'
import { TreeProvider, useTreeContext } from './context/TreeContext'
import { useTreeKeyboard } from './hooks/useTreeKeyboard'
import { useGrowthTimer } from './hooks/useGrowthTimer'
import { useViewportControl } from './hooks/useViewportControl'
import { useGrowthCamera } from './hooks/useGrowthCamera'
import { ORTHO_PATIENT_CONTEXT, orthopedicsTreeNodes } from './data/orthopedicsTree'

import { transformTree } from './data/transformer'
import { computeSynthesis } from './data/computeSynthesis'
import { GrowthPlaybackState, AnimationBeat, GrowthSpeedSetting } from './types/tree'
import TreeViewport, { TreeViewportHandle } from './components/tree/TreeViewport'
import TreeCanvas from './components/tree/TreeCanvas'
import BranchScrubber from './components/tree/BranchScrubber'
import GrowthPreStart from './components/tree/GrowthPreStart'
import NodeDetail from './components/tree/NodeDetail'
import BranchConclusionPanel from './components/tree/BranchConclusionPanel'
import { TerminalVariant, deriveTerminalVariant } from './components/tree/TerminalCard'
import TreeLegend from './components/tree/TreeLegend'
import SynthesisPanel from './components/synthesis/SynthesisPanel'
import { ShieldIcon } from './components/shared/Icons'

// Transform once at module level
const POSITIONED_TREE = transformTree(orthopedicsTreeNodes)

// ─── Inner layout ────────────────────────────────────────────────────────────
function OrthoLayout({ reasoningMode = false, speed = 'medium' }: { reasoningMode?: boolean; speed?: GrowthSpeedSetting }) {
  const { state, dispatch } = useTreeContext()
  const viewportRef = useRef<TreeViewportHandle>(null)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const cameraMode = reasoningMode ? 'overview' : 'follow'
  const [synthesisPhase, setSynthesisPhase] = useState<'pre' | 'generating' | 'loading' | 'revealed'>('pre')
  const [synthesisPanelOpen, setSynthesisPanelOpen] = useState(true)
  const [headerOpen, setHeaderOpen] = useState(true)
  const prevGrowthMode = useRef<string>('idle')
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Enter pre_start immediately on mount in reasoning mode
  useEffect(() => {
    if (reasoningMode) {
      dispatch({ type: 'ENTER_REASONING_PRE_START' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Track growth playback transitions to trigger synthesis phase changes
  useEffect(() => {
    const prev = prevGrowthMode.current
    const curr = state.growth.mode
    prevGrowthMode.current = curr

    const playbackModes = new Set(['playing', 'paused_at_decision', 'paused_manual', 'paused_exploring'])
    const wasPlayback = playbackModes.has(prev)
    const isPlayback = playbackModes.has(curr)

    if (!wasPlayback && isPlayback) {
      // Playback just started (from pre_start or idle)
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current)
      setSynthesisPhase('generating')
    } else if (wasPlayback && curr === 'idle') {
      // Growth just completed — pan to terminal hypothesis nodes while synthesis slides in
      const terminalIds = state.tree.nodes.filter(n => n.isTerminal).map(n => n.id)
      const nodesSnapshot = state.tree.nodes
      if (terminalIds.length > 0) {
        viewportRef.current?.fitBranch(terminalIds, nodesSnapshot, 900)
      } else {
        viewportRef.current?.fitToView()
      }
      setSynthesisPhase('loading')
      loadingTimerRef.current = setTimeout(() => {
        setSynthesisPhase('revealed')
        // Re-focus tightly on terminals as diagnostic content appears
        if (terminalIds.length > 0) {
          viewportRef.current?.fitBranch(terminalIds, nodesSnapshot, 700, 40, 16)
        }
      }, 2200)
    }
  }, [state.growth.mode])

  useEffect(() => () => {
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current)
  }, [])

  const canvasDims = useMemo(() => {
    const nodes = state.tree.nodes
    if (nodes.length === 0) return { width: 2000, height: 2000 }
    const CANVAS_PAD = 200
    return {
      width:  Math.max(...nodes.map(n => n.x + n.width))  + CANVAS_PAD * 2,
      height: Math.max(...nodes.map(n => n.y + n.height)) + CANVAS_PAD * 2,
    }
  }, [state.tree.nodes])

  const currentGrowthBeat = useMemo((): AnimationBeat | null => {
    if (state.growth.mode === 'idle') return null
    // During pre_start, show no nodes (empty visibility set)
    if (state.growth.mode === 'pre_start') return { visibleIds: [], activeBranchIds: null, pauseMs: 0 }
    const g = state.growth as { beatIndex: number; sequence: AnimationBeat[] }
    return g.sequence[g.beatIndex] ?? null
  }, [state.growth])

  const shieldStats = useMemo(() => {
    if (state.growth.mode === 'idle' || state.growth.mode === 'pre_start') {
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
    <div className="h-screen flex overflow-hidden">

      {/* ── Left column: header + tree ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

      {/* ── Patient context bar ── */}
      <header
        className="shrink-0 border-b"
        style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderColor: 'rgba(0,0,0,0.07)',
          overflow: 'hidden',
          transition: 'padding 250ms ease',
          paddingTop: headerOpen ? 10 : 6,
          paddingBottom: headerOpen ? 10 : 6,
          paddingLeft: 24,
          paddingRight: 24,
        }}
      >
        {/* Always-visible row: toggle + identity + next patient */}
        <div className="flex items-center gap-0">
          {/* Logo */}
          <div className="flex items-center pr-4 mr-3" style={{ borderRight: '1px solid rgba(0,0,0,0.09)' }}>
            <video
              src="/logo.mp4"
              autoPlay
              muted
              playsInline
              className="w-14 h-14 object-contain"
            />
          </div>

          {/* Collapse toggle — left side */}
          <button
            onClick={() => setHeaderOpen(o => !o)}
            title={headerOpen ? 'Collapse patient info' : 'Expand patient info'}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 24, height: 24, borderRadius: 6, marginRight: 12,
              background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)',
              cursor: 'pointer', flexShrink: 0, outline: 'none',
              transition: 'background 150ms',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.08)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.04)' }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
              style={{ transform: headerOpen ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 250ms ease' }}
            >
              <path d="M2 4.5l4 3 4-3" stroke="rgba(0,0,0,0.45)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {/* Patient identity */}
          <div className="flex items-baseline gap-2.5 pr-5 mr-5" style={{ borderRight: '1px solid rgba(0,0,0,0.09)' }}>
            <span className="text-[13px] font-bold tracking-tight text-[#111]">
              {ORTHO_PATIENT_CONTEXT.name}
            </span>
            <span className="text-[11px] font-normal" style={{ color: 'rgba(0,0,0,0.45)' }}>
              {ORTHO_PATIENT_CONTEXT.age}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.07em',
              textTransform: 'uppercase' as const,
              padding: '2px 7px', borderRadius: 20,
              background: 'rgba(107,64,189,0.07)', border: '1px solid rgba(107,64,189,0.18)', color: '#6B40BD',
            }}>
              {ORTHO_PATIENT_CONTEXT.domain}
            </span>
          </div>

          {/* Collapsed summary — truncated quote inline when header is closed */}
          {!headerOpen && (
            <span className="text-[11px]" style={{ color: 'rgba(0,0,0,0.40)', fontStyle: 'italic', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {ORTHO_PATIENT_CONTEXT.transcript.quote}
            </span>
          )}

          {/* Right: Next patient */}
          <div className="ml-auto flex items-center gap-1.5">
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', color: 'rgba(0,0,0,0.30)' }}>
              Next patient
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2.5 6h7M6.5 3l3 3-3 3" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Expandable detail row */}
        <div style={{
          overflow: 'hidden',
          maxHeight: headerOpen ? 60 : 0,
          opacity: headerOpen ? 1 : 0,
          transition: 'max-height 250ms ease, opacity 200ms ease',
          marginTop: headerOpen ? 8 : 0,
          display: 'flex', alignItems: 'center', gap: 0,
        }}>
          {/* Parent quote */}
          <div className="flex flex-col gap-0.5 pr-5 mr-5" style={{ borderRight: '1px solid rgba(0,0,0,0.09)', maxWidth: 420 }}>
            <span className="text-[8px] font-bold uppercase tracking-[0.10em] leading-none" style={{ color: 'rgba(0,0,0,0.35)' }}>
              {ORTHO_PATIENT_CONTEXT.transcript.speaker}
            </span>
            <span className="text-[11px] leading-snug" style={{ color: 'rgba(0,0,0,0.60)', fontStyle: 'italic' }}>
              {ORTHO_PATIENT_CONTEXT.transcript.quote}
            </span>
          </div>

          {/* Clinical tags */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {ORTHO_PATIENT_CONTEXT.clinicalTags.map(tag => (
              <span key={tag} style={{
                fontSize: 9.5, fontWeight: 600,
                padding: '3px 9px', borderRadius: 20,
                background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.09)',
                color: 'rgba(0,0,0,0.55)', whiteSpace: 'nowrap' as const,
              }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </header>

        {/* ── Tree panel ── */}
        <div
          className="flex flex-col flex-1 overflow-hidden relative"
          style={{
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
              onFocusBranch={(branchId, startNodeId) => dispatch({ type: 'FOCUS_BRANCH', branchId, startNodeId })}
              onAddAnnotation={(nodeId, type, content) =>
                dispatch({ type: 'ADD_ANNOTATION', nodeId, annotationType: type, content })
              }
            />
          )}

          {/* Legend */}
          <TreeLegend bottomOffset={16} />

          {/* Pre-start overlay — shown when entering reasoning mode before growth begins */}
          {state.growth.mode === 'pre_start' && (
            <GrowthPreStart
              speed={speed}
              onStart={() => dispatch({ type: 'START_GROWTH', speed })}
              patientContext={ORTHO_PATIENT_CONTEXT}
            />
          )}
        </div>

      </div>{/* ── end left column ── */}

        {/* ── Synthesis panel — full height, collapsible, 35% when open, 52px tab when closed ── */}
        <div
          style={{
            width: (reasoningMode && state.growth.mode !== 'idle')
              ? 0
              : synthesisPanelOpen ? '35%' : 52,
            overflow: 'hidden',
            transition: 'width 300ms cubic-bezier(0.4,0,0.2,1)',
            flexShrink: 0,
            position: 'relative',
            display: 'flex',
          }}
        >
          {/* Toggle tab — always visible on the left edge of this column */}
          <button
            onClick={() => setSynthesisPanelOpen(o => !o)}
            title={synthesisPanelOpen ? 'Collapse panel' : 'Open Diagnostic Analysis'}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              bottom: 0,
              width: synthesisPanelOpen ? 44 : 52,
              zIndex: 20,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: synthesisPanelOpen ? 0 : 16,
              background: synthesisPanelOpen
                ? 'rgba(245,247,252,0.60)'
                : 'rgba(240,244,252,0.98)',
              borderRight: synthesisPanelOpen
                ? '1px solid rgba(0,0,0,0.06)'
                : 'none',
              borderLeft: synthesisPanelOpen
                ? 'none'
                : '1px solid rgba(26,82,168,0.12)',
              cursor: 'pointer',
              padding: 0,
              outline: 'none',
              transition: 'background 150ms, width 300ms cubic-bezier(0.4,0,0.2,1)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = synthesisPanelOpen
                ? 'rgba(235,240,252,0.85)'
                : 'rgba(226,234,252,0.99)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = synthesisPanelOpen
                ? 'rgba(245,247,252,0.60)'
                : 'rgba(240,244,252,0.98)'
            }}
          >
            {/* Chevron arrow */}
            <svg
              width="14" height="14" viewBox="0 0 14 14" fill="none"
              style={{
                transform: synthesisPanelOpen ? 'rotate(0deg)' : 'rotate(180deg)',
                transition: 'transform 300ms cubic-bezier(0.4,0,0.2,1)',
                flexShrink: 0,
                opacity: synthesisPanelOpen ? 0.4 : 0.55,
              }}
            >
              <path d="M9 3L5 7l4 4" stroke={synthesisPanelOpen ? 'rgba(0,0,0,0.7)' : '#1A52A8'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>

            {/* Rotated label — only visible when closed */}
            {!synthesisPanelOpen && (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.09em',
                  textTransform: 'uppercase',
                  color: '#1A52A8',
                  writingMode: 'vertical-rl',
                  textOrientation: 'mixed',
                  transform: 'rotate(180deg)',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                Diagnostic Analysis
              </span>
            )}
          </button>

          {/* Panel content — offset by the 44px tab */}
          <div
            style={{
              marginLeft: synthesisPanelOpen ? 44 : 52,
              width: `calc(100% - ${synthesisPanelOpen ? 44 : 52}px)`,
              height: '100%',
              overflow: 'hidden',
              opacity: synthesisPanelOpen ? 1 : 0,
              transition: 'opacity 200ms ease',
              pointerEvents: synthesisPanelOpen ? 'auto' : 'none',
            }}
          >
            <SynthesisPanel
              synthesis={synthesis}
              synthesisPhase={synthesisPhase}
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

// ─── Reasoning route — accepts speed from URL (slow/medium/fast) ──────────────
export function OrthoReasoningApp({ speed = 'medium' }: { speed?: GrowthSpeedSetting }) {
  return (
    <TreeProvider initialTree={POSITIONED_TREE}>
      <OrthoLayout reasoningMode speed={speed} />
    </TreeProvider>
  )
}
