// ============================================================
// Raw data types — what the backend tracing engine produces
// ============================================================

export type NodeType = 'thought' | 'tool' | 'citation'

export type ShieldSeverity = 'safety' | 'guideline' | 'correctness' | 'traceability'

export type PruneSource = 'shield' | 'doctor'

/**
 * A single node from the tracing engine's flat output.
 * The backend sends an array of these; parent_id references build the tree.
 */
export interface TreeNode {
  id: string
  parent_id: string | null // null for root node
  branch_id: string // 'primary' for the main path, unique id for each branch
  type: NodeType
  headline: string // short 3-8 word summary for compact tree view — shown in collapsed card; content shown in detail panel
  content: string // the reasoning text, tool description, or citation text
  source?: string // for citation/tool nodes: guideline ref, db name, etc.
  is_decision_point: boolean
  is_pruned: boolean
  pruned_by: PruneSource | null
  prune_reason: string | null
  shield_severity?: ShieldSeverity // present if flagged by shield model
  children: string[] // ids of child nodes
  diagnosis: string | null // populated on terminal nodes only
  // Architecture-view metadata (hidden in clinical view)
  tool_name?: string // for tool nodes: which tool was called
  latency_ms?: number // for tool nodes: how long the call took
  step_index?: number // sequential position in the reasoning chain
}

// ============================================================
// Positioned types — after transformer processes the raw data
// ============================================================

/**
 * A node with pixel coordinates assigned by d3-hierarchy layout.
 * This is what React components receive for rendering.
 */
export interface PositionedNode extends TreeNode {
  x: number // pixel x (left edge of node card)
  y: number // pixel y (top edge of node card)
  width: number // node card width in px
  height: number // node card height in px
  depth: number // tree depth (0 = root)
  isOnPrimaryPath: boolean // true if this node is on the primary branch
}

/**
 * A connection between two nodes, with pre-computed SVG path data.
 */
export interface Connection {
  id: string // unique id: `${source.id}->${target.id}`
  sourceId: string
  targetId: string
  sourceBranchId: string
  targetBranchId: string
  isOnPrimaryPath: boolean
  pathData: string // SVG path `d` attribute (bezier curve)
}

/**
 * A convergence group: multiple branches that reach the same diagnosis.
 */
export interface Convergence {
  diagnosis: string
  branchIds: string[] // which branches converge on this
  terminalNodeIds: string[] // the terminal nodes for each branch
}

/**
 * The full positioned tree — everything the UI needs to render.
 */
export interface PositionedTree {
  nodes: PositionedNode[]
  connections: Connection[]
  convergences: Convergence[]
  primaryPathNodeIds: string[] // ordered list of node ids on the primary path
  branchIds: string[] // all unique branch ids
}

// ============================================================
// Synthesis types — derived from tree state for the right panel
// ============================================================

/**
 * Top-level synthesis: the overall recommendation + confidence.
 * This is the "headline" section of the synthesis panel.
 */
export interface SynthesisData {
  recommendation: {
    diagnosis: string
    summary: string
    supportingNodeIds: string[]
  }
  confidence: {
    level: 'high' | 'moderate' | 'low'
    convergenceRatio: number
    totalBranches: number
    convergingBranches: number
    explanation: string
  }
  branches: BranchSummary[]    // every branch gets a summary card
  rejectedPaths: RejectedPath[]
}

/**
 * A synthesized summary of a single branch.
 * Each branch gets a card in the synthesis panel. The card is clickable
 * (focuses the branch in the tree) and contains node-level summaries.
 */
export interface BranchSummary {
  branchId: string
  isPrimary: boolean
  diagnosis: string | null           // terminal node's diagnosis
  convergsWith: string | null        // if this branch converges with another, which diagnosis
  narrativeSummary: string           // 1-2 sentence plain-language summary of the branch's reasoning
  keyDecision: string | null         // what judgment call launched this branch
  decisionNodeId: string | null      // the decision point node that forked to this branch
  nodeSummaries: NodeSummary[]       // ordered summaries of notable nodes on this branch
  caveat: Caveat | null              // if this branch diverges, what condition would make it correct
}

/**
 * A synthesized summary of a single node within a branch.
 * Shown inside a BranchSummary card. Clickable (selects the node in the tree).
 * Supports doctor actions: flag, annotate, challenge.
 */
export interface NodeSummary {
  nodeId: string
  type: NodeType
  headline: string                   // short summary of what this node does/says (1 line)
  detail: string                     // fuller explanation (shown on expand)
  source: string | null              // citation or tool source, if any
  isKeyStep: boolean                 // true for steps that significantly drive the reasoning
  shieldFlag: ShieldSeverity | null  // non-null if the shield flagged this node
}

export interface Caveat {
  condition: string
  implication: string
  sourceNodeId: string
  sourceBranchId: string
}

export interface RejectedPath {
  branchId: string
  diagnosis: string | null
  pruneSource: PruneSource
  pruneReason: string
  shieldSeverity?: ShieldSeverity
  terminalNodeId: string
}

// ============================================================
// Doctor annotation types — actions the doctor takes on nodes/branches
// ============================================================

export type DoctorAnnotationType = 'flag' | 'context' | 'challenge' | 'pin'

/**
 * A doctor's annotation on a specific node.
 * Created via the synthesis panel's interactive node summaries.
 * Visible in the tree as a badge/indicator on the annotated node.
 */
export interface DoctorAnnotation {
  id: string
  nodeId: string
  type: DoctorAnnotationType
  content: string                    // the doctor's note, question, or flag reason
  createdAt: number                  // timestamp for ordering
}

/**
 * Flag: "I think this reasoning step is wrong/suspicious"
 *   → Node gets a doctor-flag badge in the tree (distinct from shield flags)
 *   → Synthesis panel shows the flag inline on that node's summary
 *
 * Context: "The patient also mentioned X" / "I have additional information"
 *   → Node gets a context badge in the tree
 *   → The added context is shown in the node detail panel
 *   → If backend supports it, downstream reasoning could be re-triggered
 *
 * Challenge: "I disagree with this interpretation"
 *   → Node gets a challenge badge
 *   → If backend supports it, could trigger re-reasoning from this point
 *   → Even without backend support, it's logged and visible — shows the doctor has agency
 *
 * Pin (branch-level): "This is the branch I think is correct"
 *   → Branch gets a pin indicator
 *   → Synthesis panel reorders to show pinned branch first
 *   → Confidence section notes the doctor's endorsement
 */

// ============================================================
// UI state types — Focus, Growth, and Interaction
// ============================================================

export type ViewMode = 'clinical' | 'architecture'

/**
 * Focus state: which branch and node the user is looking at.
 * 
 * IDLE: nothing selected, full tree visible at 100% opacity.
 * BRANCH_FOCUSED: an entire branch is highlighted (root → terminal),
 *   everything else fades to 20-30% opacity.
 *   selectedNodeId may be null (branch focused, no specific node)
 *   or a node id (specific node within the branch is active).
 */
export type FocusState =
  | { mode: 'idle' }
  | {
      mode: 'branch_focused'
      branchId: string
      branchNodeIds: string[]       // ordered root → terminal, for scrubber/navigation
      selectedNodeId: string | null // null = branch highlighted, no specific node
      selectedNodeIndex: number     // position in branchNodeIds (for scrubber)
    }

/**
 * Growth playback state: controls the incremental tree-growing animation.
 * 
 * The `cursor` is an index into the step_index-ordered node list.
 * Nodes with step_index <= cursor are visible; others don't render.
 * 
 * Growth auto-pauses when the cursor reaches a decision point node.
 * The presenter clicks resume (or presses space) to continue.
 * While paused, the presenter can click nodes to explore (PAUSED_EXPLORING),
 * which activates the normal focus/navigation system on the already-rendered nodes.
 */
export type GrowthPlaybackState =
  | { mode: 'idle' }
  | {
      mode: 'playing'
      cursor: number
      speed: GrowthSpeed
      /** Branch the camera (and optional growth filter) follows after a branch choice */
      chosenBranchId?: string
    }
  | { mode: 'paused_at_decision'; cursor: number; decisionNodeId: string }
  | { mode: 'paused_manual'; cursor: number }
  | { mode: 'paused_exploring'; cursor: number; previousFocusMode: 'paused_at_decision' | 'paused_manual' }

/** Growth speed presets in ms per node */
export type GrowthSpeed = 100 | 200 | 400

// ============================================================
// Audit trail — log of every system and doctor action
// ============================================================

export interface AuditEntry {
  id: string
  timestamp: number
  type: 'system' | 'shield' | 'doctor'
  summary: string
  detail: string | null
  nodeId: string | null
  branchId: string | null
}

/**
 * Full tree UI state — passed through TreeContext.
 */
export interface TreeUIState {
  tree: PositionedTree
  focusState: FocusState
  prunedBranchIds: Set<string>
  pruneSourceMap: Map<string, PruneSource>
  viewMode: ViewMode
  growth: GrowthPlaybackState
  annotations: DoctorAnnotation[]       // all doctor annotations across the tree
  pinnedBranchId: string | null          // doctor-endorsed branch (at most one)
  auditLog: AuditEntry[]
}

/**
 * All possible actions for the tree state reducer.
 */
export type TreeAction =
  // Focus actions
  | { type: 'SELECT_NODE'; nodeId: string }
  | { type: 'FOCUS_BRANCH'; branchId: string }
  | { type: 'NAVIGATE_NEXT' }
  | { type: 'NAVIGATE_PREV' }
  | { type: 'NAVIGATE_SIBLING_BRANCH'; direction: 'up' | 'down' }
  | { type: 'CLEAR_FOCUS' }
  // Pruning
  | { type: 'PRUNE_BRANCH'; branchId: string; source: PruneSource }
  | { type: 'RESTORE_BRANCH'; branchId: string }
  // Doctor annotations
  | { type: 'ADD_ANNOTATION'; nodeId: string; annotationType: DoctorAnnotationType; content: string }
  | { type: 'REMOVE_ANNOTATION'; annotationId: string }
  | { type: 'PIN_BRANCH'; branchId: string }
  | { type: 'UNPIN_BRANCH' }
  // View mode
  | { type: 'TOGGLE_VIEW_MODE' }
  // Growth playback
  | { type: 'START_GROWTH'; speed?: GrowthSpeed }
  | { type: 'PAUSE_GROWTH' }
  | { type: 'RESUME_GROWTH' }
  | { type: 'STEP_FORWARD' }
  | { type: 'STEP_BACKWARD' }
  | { type: 'SET_GROWTH_SPEED'; speed: GrowthSpeed }
  | { type: 'SKIP_TO_END' }
  // Internal: called by the growth timer, not by user actions directly
  | { type: 'GROWTH_TICK' }
  | { type: 'GROWTH_AUTO_PAUSE'; decisionNodeId: string }
  // Audit
  | { type: 'APPEND_AUDIT'; entry: Omit<AuditEntry, 'id' | 'timestamp'> }
