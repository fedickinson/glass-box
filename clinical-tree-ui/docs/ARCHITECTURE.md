# Architecture — Clinical Reasoning Tree UI

## System overview

```
Backend Tracing Engine (teammate)
        │
        ▼
  Flat node array (JSON)
        │
        ▼
  ┌─────────────────┐
  │  Transformer     │  ← Converts flat array → d3 hierarchy → positioned layout
  │  (transformer.ts)│
  └────────┬────────┘
           │
           ▼
  ┌──────────────────────────────────────────────────┐
  │  TreeContext (React Context)                       │
  │  - positionedNodes: PositionedNode[]               │
  │  - selectedNodeId: string | null                   │
  │  - prunedBranchIds: Set<string>                    │
  │  - viewMode: 'clinical' | 'architecture'           │
  │  - growthState: 'idle' | 'growing' | 'complete'    │
  │  - visibleNodeCount: number (for growth animation)  │
  └──────────┬───────────────────────┬────────────────┘
             │                       │
             ▼                       ▼
  ┌──────────────────┐    ┌─────────────────────┐
  │  Tree Panel (65%) │    │  Synthesis Panel (35%)│
  │  ┌──────────────┐│    │  ┌─────────────────┐ │
  │  │ TreeViewport ││    │  │ Recommendation   │ │
  │  │ (zoom/pan)   ││    │  │ Confidence       │ │
  │  │ ┌──────────┐ ││    │  │ Caveats          │ │
  │  │ │TreeCanvas│ ││    │  │ PrunedPaths      │ │
  │  │ │ Nodes    │ ││    │  └─────────────────┘ │
  │  │ │ Conns    │ ││    └─────────────────────┘
  │  │ └──────────┘ ││
  │  └──────────────┘│
  └──────────────────┘
```

## Data flow

### 1. Raw data → Positioned tree

The backend sends a flat array of `TreeNode` objects. The transformer does three things:

1. **Build hierarchy:** Uses `parent_id` references to construct a tree. `d3.stratify()` handles this.
2. **Compute layout:** `d3.tree()` assigns x/y coordinates. We rotate the default layout (d3 trees are top-down) so the tree flows left-to-right.
3. **Enrich positions:** Adds pixel coordinates, connection paths, and metadata needed for rendering.

```typescript
// transformer.ts — the key interface
function transformTree(nodes: TreeNode[]): PositionedTree {
  // 1. Stratify into hierarchy
  // 2. Run d3.tree() layout
  // 3. Map to PositionedNode[] with pixel coords
  // 4. Compute connection paths (SVG path data strings)
  // 5. Identify convergence groups (branches with same terminal diagnosis)
  return { nodes: PositionedNode[], connections: Connection[], convergences: Convergence[] }
}
```

The transformer is the **only** place where d3 is used. Everything downstream is pure React.

### 2. TreeContext holds all UI state

```typescript
interface TreeState {
  // Data
  tree: PositionedTree
  
  // Focus state (see Interaction Model below)
  focusState: FocusState
  
  // Pruning
  prunedBranchIds: Set<string>
  pruneSourceMap: Map<string, 'shield' | 'doctor'>
  
  // View mode
  viewMode: 'clinical' | 'architecture'
  
  // Growth playback (see Growth Playback System below)
  growth: GrowthPlaybackState
}
```

---

## Interaction model

The tree has three layers of focus and a growth playback mode that coexists with interactive selection. This is the most complex part of the UI and needs to be designed into the state management from Stage 1, not bolted on later.

### The three focus layers

**Layer 0: IDLE** — Full tree visible. All nodes at full opacity. Nothing selected. This is the landing state and the state you return to on Escape or clicking empty canvas.

**Layer 1: BRANCH_FOCUSED** — An entire reasoning path (root → terminal node) is highlighted. All nodes on that branch go to full opacity and full color. Every other node and connection drops to **20–30% opacity** — heavy fade, the selected branch is the whole focus. The connections on the focused branch thicken slightly. The terminal node (diagnosis) gets extra visual emphasis (scale bump, stronger border). The synthesis panel updates to emphasize content relevant to this branch.

**Layer 2: NODE_SELECTED** — Within a focused branch, one specific node is active. The detail panel opens (or the synthesis panel scrolls to show "you are here" context). The viewport smoothly pans/zooms to center the selected node with its immediate parent and children visible. The selected node gets a subtle scale bump (1.03×) and a stronger border.

**How they relate:** Selecting a node always implies focusing its branch. You can't have a selected node without a focused branch. Clicking a node transitions directly to `BRANCH_FOCUSED + NODE_SELECTED`. Clicking empty canvas or pressing Escape goes back to IDLE (both layers clear at once).

### Focus state type

```typescript
type FocusState =
  | { mode: 'idle' }
  | { 
      mode: 'branch_focused'
      branchId: string
      branchNodeIds: string[]     // ordered root→terminal, for navigation
      selectedNodeId: string | null  // null = branch focused but no specific node
      selectedNodeIndex: number      // position in branchNodeIds, for scrubber
    }
```

### Entering focus

These actions all transition from any state to `BRANCH_FOCUSED`:

- **Click a node** → Focus that node's branch, select that node. Viewport pans to center it.
- **Click a connection line** → Focus the branch that connection belongs to. Select the source node of that connection.
- **Click a synthesis claim** → Focus the branch containing the linked nodes. Select the first linked node.
- **Arrow key (up/down) from IDLE** → Focus the primary path, select the first node.

### Navigating within a focused branch

Once in `BRANCH_FOCUSED`, the user can move along the branch:

**Keyboard (for the presenter):**
- **→ (Right arrow)** — Move to the next node along the branch. If at the terminal node, do nothing (don't wrap).
- **← (Left arrow)** — Move to the previous node. If at the root, do nothing.
- **↑ / ↓ (Up/Down arrow)** — At a decision point where branches fork: jump to the same-depth node on the sibling branch. This switches the focused branch. If the current node isn't at a fork, up/down do nothing.
- **Escape** — Clear all focus, return to IDLE.
- **Enter** — Open the full detail panel for the currently selected node (if not already open).

**Scrubber (visible to the audience):**
A horizontal slider/progress bar at the bottom of the tree panel. It shows the selected branch's nodes as discrete steps. Dragging the scrubber moves through the branch sequentially. The scrubber is visible whenever a branch is focused, hidden in IDLE. It serves two purposes:
1. The presenter can drag it for smooth navigation
2. The audience can see where in the reasoning chain the presenter is — it's a progress indicator

The scrubber shows node type indicators (colored dots matching the type colors) at each position, so the audience can see "oh, that blue dot is reasoning, the green one was a tool call."

**Clicking a different node:** If you click a node on a different branch, focus switches to that branch and selects the clicked node. If you click a node on the same branch, it just moves the selection.

### Viewport behavior on focus changes

When focus changes, the viewport (react-zoom-pan-pinch) animates smoothly:

- **Branch focus (no specific node):** Zoom to fit the entire branch in view. The branch should fill most of the tree panel horizontally with some padding.
- **Node selected:** Pan to center the selected node, maintaining current zoom level. If the node would be off-screen at current zoom, zoom out just enough to show it.
- **Arrow key navigation:** Pan follows the selected node smoothly (200ms ease-out). Don't re-zoom on every arrow press — just pan.
- **Return to IDLE:** Zoom to fit the entire tree (fit-to-view).

This means `react-zoom-pan-pinch` must be programmatically controlled via refs, not just user-dragged. The `TreeViewport` component needs a `focusOnNode(nodeId)` and `fitBranch(branchId)` method that the context actions can call.

### Visual states summary

| Element | IDLE | BRANCH_FOCUSED (not on branch) | BRANCH_FOCUSED (on branch) | NODE_SELECTED |
|---------|------|-------------------------------|---------------------------|---------------|
| Node opacity | 100% | 20–30% | 100% | 100% |
| Node scale | 1.0 | 0.97 (subtle shrink) | 1.0 | 1.03 (bump) |
| Node border | normal | normal | normal | +1px, slightly brighter |
| Connection opacity | 100% | 15% | 100% | 100% |
| Connection width | normal | normal | +0.5px | +0.5px |
| Terminal node | normal | faded | emphasized (glow, badge) | emphasized |
| Detail panel | closed | closed | closed | open |
| Scrubber | hidden | hidden | visible | visible |

Transitions between states: 200ms ease-out for opacity/scale. 300ms ease-out for viewport pan/zoom. All via framer-motion to keep animations in one system.

---

## Growth playback system

The tree growth animation is not just a visual flourish — it's a core demo mechanic. The presenter uses it to walk the audience through the reasoning process. It coexists with the interactive focus system.

### Growth states

```typescript
type GrowthPlaybackState =
  | { mode: 'idle' }                    // tree fully visible, no playback
  | { mode: 'playing'; cursor: number; speed: number }  // auto-advancing
  | { mode: 'paused_at_decision'; cursor: number; decisionNodeId: string }  // auto-paused
  | { mode: 'paused_manual'; cursor: number }  // user-paused
  | { mode: 'paused_exploring'; cursor: number; previousFocus: FocusState }  // paused + interacting
```

`cursor` is the index into the ordered node list (nodes ordered by `step_index`). Nodes with index ≤ cursor are visible. Nodes with index > cursor are hidden.

### Growth playback flow

```
IDLE ──(start growth)──→ PLAYING
                           │
                    ┌──────┴──────────┐
                    │                  │
          (hit decision point)    (manual pause)
                    │                  │
                    ▼                  ▼
          PAUSED_AT_DECISION    PAUSED_MANUAL
                    │                  │
              ┌─────┴─────┐      ┌─────┴─────┐
              │           │      │           │
         (resume)    (click node) (resume)  (click node)
              │           │      │           │
              ▼           ▼      ▼           ▼
           PLAYING   PAUSED_EXPLORING   PLAYING   PAUSED_EXPLORING
                          │                          │
                     (Escape / deselect)        (Escape / deselect)
                          │                          │
                          ▼                          ▼
                   PAUSED_AT_DECISION          PAUSED_MANUAL
                   or PAUSED_MANUAL

(cursor reaches end) ──→ IDLE (tree fully visible)
```

### Auto-pause at decision points

This is the key demo mechanic. When the growth cursor advances to a node where `is_decision_point: true`, playback automatically pauses. The decision point node renders with a subtle pulse animation to signal "the system is about to branch." The presenter narrates why this is a decision, then clicks resume (or presses spacebar) to continue. When growth resumes from a decision point, the branches that fork from it grow simultaneously — the audience sees the tree fork in real time.

### Growth speed and controls

The growth playback has a control bar (bottom of tree panel, same area as the scrubber but shown during growth instead):

- **Play/Pause button** — Spacebar also toggles.
- **Speed control** — 3 presets: Slow (400ms per node), Normal (200ms), Fast (100ms). The presenter can adjust mid-demo. Normal is the default.
- **Step forward/back** — Arrow keys advance or retreat one node at a time when paused. This lets the presenter manually walk through nodes if they want full control.
- **Skip to end** — Button to immediately show the full tree (exits growth, enters IDLE).
- **Progress indicator** — Shows `cursor / totalNodes` so the presenter knows how far along they are.

### Growth + interaction coexistence

When growth is paused (at a decision point or manually), the presenter can interact with the already-rendered portion of the tree:

1. Clicking a visible node transitions growth to `PAUSED_EXPLORING` and activates `BRANCH_FOCUSED` on that node's branch (only the visible portion of the branch highlights).
2. The presenter can navigate within the visible nodes using arrow keys or the scrubber.
3. Pressing Escape or clicking empty canvas exits the focus and returns to the paused growth state.
4. Pressing spacebar or clicking Play resumes growth (and clears any focus state).

Nodes that haven't been revealed yet (cursor < their index) do not exist visually — they don't render at all, not even as placeholders. The tree literally grows.

### Growth animation details

- Each node enters with: fade in (opacity 0 → 1), slight scale (0.92 → 1.0), over 200ms ease-out.
- The connection to a new node draws in: stroke-dasharray animation from 100% offset to 0%, 200ms, timed to complete just before the next node appears.
- At decision points: after the decision node appears and auto-pauses, a subtle pulse ring animates around it (2-3 gentle pulses over 2 seconds, then stops). This draws the audience's eye.
- When growth resumes from a decision point: branches grow simultaneously. If 3 branches fork, all 3 start growing at once. Within each branch, nodes still appear sequentially.
- Growth renders nodes in `step_index` order. The primary path's nodes appear first for each depth level, then branch nodes. This means the audience sees the main reasoning first, then alternatives.

---

### All actions (updated)

```
// Focus
selectNode(nodeId)           → BRANCH_FOCUSED + NODE_SELECTED
focusBranch(branchId)        → BRANCH_FOCUSED (no specific node)
navigateNext()               → move to next node in focused branch
navigatePrev()               → move to previous node
navigateSiblingBranch(dir)   → switch to sibling branch at decision point
clearFocus()                 → return to IDLE

// Pruning
pruneBranch(branchId, source)  → add to pruned set, clear focus, recompute synthesis
restoreBranch(branchId)        → remove from pruned set, recompute synthesis

// Doctor annotations
addAnnotation(nodeId, type, content) → attach annotation to node, visible in tree + synthesis
removeAnnotation(annotationId)       → remove an annotation
pinBranch(branchId)                  → doctor endorses this branch as correct
unpinBranch()                        → remove pin

// View mode
toggleViewMode()               → swap clinical ↔ architecture

// Growth playback
startGrowth(speed?)            → begin playback from cursor 0
pauseGrowth()                  → manual pause
resumeGrowth()                 → continue from current cursor
stepForward()                  → advance cursor by 1 (when paused)
stepBackward()                 → retreat cursor by 1 (when paused)
setGrowthSpeed(speed)          → change playback speed
skipToEnd()                    → show full tree, exit growth
```

### 3. Synthesis computation

The synthesis panel is NOT a static report. It's an **interactive review interface** with two tiers of content:

**Branch summaries** — every branch gets a card with: a plain-language narrative of what the branch explored, its terminal diagnosis, whether it converges with other branches, and a caveat (what condition would make this branch the correct one). Each card is clickable (focuses the branch in the tree) and has branch-level actions (prune, pin as preferred).

**Node summaries** — within each branch card, notable nodes get a one-line summary. These are clickable (selects the node in the tree) and have node-level actions:
- **Flag** — doctor marks this node as suspicious or wrong
- **Add context** — doctor attaches a note ("patient also reported nausea")
- **Challenge** — doctor disagrees with this reasoning step

These doctor actions create `DoctorAnnotation` objects stored in the tree state. Each annotation is visible both in the synthesis panel (inline on the node's summary) and in the tree (as a small badge on the annotated node). This bidirectional visibility is key — the doctor acts in the synthesis panel, the tree reflects it, and vice versa.

The synthesis data is derived from the tree state as a pure function:

```typescript
function computeSynthesis(
  tree: PositionedTree,
  prunedBranchIds: Set<string>,
  annotations: DoctorAnnotation[],
  pinnedBranchId: string | null
): SynthesisData {
  // 1. Find the primary path's terminal diagnosis → recommendation
  //    If a branch is pinned, that branch's diagnosis becomes the recommendation instead
  // 2. Count unpruned branches. Group by terminal diagnosis.
  //    Convergence ratio = (largest group size) / (total unpruned branches) → confidence
  //    Doctor pin can boost confidence ("doctor concurs")
  // 3. For each branch: generate a BranchSummary with narrative, key decision, and node summaries
  //    Node summaries include any doctor annotations attached to those nodes
  // 4. For each divergent branch (different diagnosis), extract the decision point
  //    where it forked → these become caveats ("what would change your mind")
  // 5. Collect all pruned branches with their prune reasons → rejected paths section
  return { recommendation, confidence, branches, rejectedPaths }
}
```

This function runs on every prune/restore/annotate/pin action. It should be fast (it's just tree traversal and data assembly, no API calls).

### Synthesis panel layout (updated)

The synthesis panel is structured as:

```
┌─────────────────────────────────────┐
│ RECOMMENDATION                       │
│ Likely diagnosis: Unstable angina    │  ← headline
│ High confidence · 2 of 3 converge   │  ← confidence line
│ [★ Doctor concurs]                   │  ← shown if branch is pinned
│                                       │
│ ─────────────────────────────────── │
│                                       │
│ BRANCH: Primary path                 │  ← branch summary card (clickable)
│ Evaluated cardiac risk, ran TIMI     │     narrative summary
│ score, concluded unstable angina.    │
│  ┌─ Step 3: ASCVD risk 18.2%       │  ← node summary (clickable)
│  │  [🏥 Tool: risk_calculator]       │     type indicator
│  ├─ Step 7: No drug interactions    │
│  │  [📎 Dr: "check renal function"] │  ← doctor annotation (context)
│  ├─ Step 10: TIMI score 4/7        │
│  │  [⚑ Dr: flagged as concern]      │  ← doctor annotation (flag)
│  └─ → Dx: Unstable angina ★        │  ← terminal diagnosis + pin
│                                       │
│ BRANCH: Bayesian path               │  ← another branch card
│ Converges → Unstable angina          │     convergence indicator
│ Independent probability analysis...  │
│                                       │
│ BRANCH: GI hypothesis               │  ← divergent branch
│ GERD considered but exertional       │
│ pattern argues against.              │
│ ⤷ Caveat: If cardiac workup         │  ← caveat inline
│   negative, pursue GI evaluation     │
│                                       │
│ ─────────────────────────────────── │
│                                       │
│ REJECTED                             │
│ ┌─ Shield: Safety violation ────┐   │
│ │ NSTEMI — premature anticoag   │   │
│ │ [Restore branch]              │   │  ← doctor can override shield
│ └───────────────────────────────┘   │
└─────────────────────────────────────┘
```

Every branch card and every node summary line is interactive:
- Click branch card → focuses that branch in the tree (heavy fade on everything else)
- Click node summary → selects that specific node (viewport pans, detail opens)
- Hover on a node summary → the corresponding tree node gets a subtle highlight (no full focus change)
- Action buttons (flag, context, challenge) appear on hover or expand of each node summary

---

## Component contracts

### TreeCanvas

```typescript
interface TreeCanvasProps {
  nodes: PositionedNode[]
  connections: Connection[]
  convergences: Convergence[]
  focusState: FocusState
  prunedBranchIds: Set<string>
  growthCursor: number          // nodes with step_index <= this are visible
  viewMode: 'clinical' | 'architecture'
  onNodeClick: (nodeId: string) => void
  onConnectionClick: (connectionId: string) => void
  onCanvasClick: () => void     // click on empty space → clear focus
  onBranchPrune: (branchId: string) => void
}
```

Renders a single `<svg>` element. Layer order (back to front):
1. Connections (behind everything)
2. Nodes
3. Convergence indicators
4. Selection ring / pulse animation on focused decision points

Applies opacity dimming based on `focusState`: when a branch is focused, all elements not on that branch get `opacity: 0.2–0.3`. Elements on the focused branch stay at full opacity with slightly thickened connections.

### TreeNode

```typescript
interface TreeNodeProps {
  node: PositionedNode
  focusRole: 'none' | 'on_focused_branch' | 'selected' | 'dimmed'
  isPruned: boolean
  pruneSource?: 'shield' | 'doctor'
  isVisible: boolean           // false = not yet grown in (growth cursor hasn't reached it)
  isGrowthPaused: boolean      // true = growth just stopped on this node (show pulse)
  annotations: DoctorAnnotation[]  // doctor annotations attached to this node
  viewMode: 'clinical' | 'architecture'
  onClick: () => void
}
```

The `focusRole` prop controls visual treatment:
- `'none'`: IDLE state, default styling
- `'on_focused_branch'`: full opacity, normal styling (the branch is highlighted, this node is part of it but not specifically selected)
- `'selected'`: 1.03× scale, stronger border, detail panel is open for this node
- `'dimmed'`: 20–30% opacity, 0.97× scale — this node is not on the focused branch

Returns an SVG `<g>` group positioned at the node's coordinates. Contains:
- A `<rect>` with the type-colored fill and left border
- A `<text>` for the type label
- A `<text>` for the content (truncated)
- A `<text>` for metadata (in architecture view)
- Entrance animation via framer-motion's SVG support
- Conditional pulse ring when `isGrowthPaused` is true (decision point auto-pause indicator)
- **Annotation badges** — small icons/dots in the top-right corner of the node card indicating doctor annotations. Color-coded: flag = red dot, context = blue dot, challenge = amber dot. Multiple annotations show multiple dots. These badges are visible at all zoom levels so the doctor can scan the tree and see where they've annotated.

### TreeConnections

```typescript
interface TreeConnectionsProps {
  connections: Connection[]
  focusState: FocusState
  prunedBranchIds: Set<string>
  growthCursor: number
}
```

Renders SVG `<path>` elements for each connection. Each connection's visual treatment depends on focus state and branch membership:
- **IDLE:** Primary path = thick blue, branch = thin gray, pruned = thin red
- **BRANCH_FOCUSED, on focused branch:** Thickened +0.5px, full opacity
- **BRANCH_FOCUSED, not on focused branch:** 15% opacity

Connection lines are clickable — clicking a connection focuses the branch it belongs to.

Path shape: horizontal bezier curves. From parent's right edge to child's left edge, with a smooth S-curve:

```
M parentRightX, parentCenterY
C controlX1, parentCenterY, controlX2, childCenterY, childLeftX, childCenterY
```

Where `controlX1 = parentRightX + gapX/2` and `controlX2 = childLeftX - gapX/2`.

### BranchScrubber

```typescript
interface BranchScrubberProps {
  branchNodeIds: string[]        // ordered root → terminal
  nodeTypes: NodeType[]          // parallel array, for type-colored dots
  selectedIndex: number          // current position
  onScrub: (index: number) => void
}
```

New component — renders at the bottom of the tree panel when a branch is focused. Shows the branch's nodes as a horizontal series of type-colored dots (blue, green, purple) connected by a thin line. The selected position has a larger, brighter dot. Dragging or clicking moves the selection. The scrubber is hidden in IDLE and during active growth playback (it shares space with the growth control bar).

### GrowthControls

```typescript
interface GrowthControlsProps {
  growth: GrowthPlaybackState
  totalNodes: number
  onPlayPause: () => void
  onStepForward: () => void
  onStepBackward: () => void
  onSpeedChange: (speed: number) => void
  onSkipToEnd: () => void
}
```

New component — renders at the bottom of the tree panel during growth playback. Contains: play/pause button, step buttons, speed selector (slow/normal/fast), skip-to-end button, and a progress bar showing cursor position. This bar shares the same physical space as the BranchScrubber — they alternate visibility depending on whether growth is active.

### TreeViewport

```typescript
interface TreeViewportProps {
  children: React.ReactNode      // wraps TreeCanvas
  focusState: FocusState
  tree: PositionedTree
}
```

Wraps the SVG canvas in `react-zoom-pan-pinch`'s TransformWrapper. Exposes imperative methods via ref:
- `fitToView()` — zoom/pan to show entire tree
- `fitBranch(branchNodeIds: string[])` — zoom/pan to fit a specific branch
- `panToNode(nodeId: string)` — smoothly pan to center a specific node at current zoom
- All transitions animate over 300ms ease-out

Responds to `focusState` changes:
- Transition to `BRANCH_FOCUSED`: calls `fitBranch` for the focused branch
- Transition to `NODE_SELECTED`: calls `panToNode` for the selected node
- Transition to `IDLE`: calls `fitToView`

### SynthesisPanel

```typescript
interface SynthesisPanelProps {
  synthesis: SynthesisData
  focusState: FocusState
  annotations: DoctorAnnotation[]
  pinnedBranchId: string | null
  onBranchClick: (branchId: string) => void      // focus a branch in the tree
  onNodeClick: (nodeId: string) => void           // select a node in the tree
  onNodeHover: (nodeId: string | null) => void    // hover highlight (subtle, no full focus change)
  onAnnotate: (nodeId: string, type: DoctorAnnotationType, content: string) => void
  onRemoveAnnotation: (annotationId: string) => void
  onPinBranch: (branchId: string) => void
  onUnpinBranch: () => void
  onPruneBranch: (branchId: string) => void
  onRestoreBranch: (branchId: string) => void
}
```

The synthesis panel is an **interactive review interface**, not a static report. It renders:

1. **Recommendation header** — diagnosis headline, confidence line, doctor pin indicator
2. **Branch summary cards** — one per branch, each clickable. Contains:
   - Narrative summary (1-2 sentences)
   - Key decision that launched the branch
   - Node summaries for notable steps (clickable, with hover highlight in tree)
   - Inline doctor annotations on annotated nodes
   - Branch-level actions: prune, pin, focus in tree
3. **Rejected paths** — pruned branches with restore buttons

Each node summary line within a branch card has action buttons that appear on hover:
- **Flag** (⚑) — opens a small input for the doctor to note what's wrong
- **Add context** (📎) — opens an input for additional information
- **Challenge** (⚡) — opens an input for the doctor's disagreement

These actions create `DoctorAnnotation` objects via `onAnnotate`. The annotation immediately appears both inline in the synthesis panel AND as a badge on the corresponding tree node.

When a branch is focused in the tree, the synthesis panel responds:
- The focused branch's card gets a highlighted border and scrolls into view
- Other branch cards dim slightly (but remain interactive)
- If a specific node is selected, its summary line within the card highlights

### KeyboardHandler

```typescript
// Not a visual component — a hook or invisible component that captures keyboard events
function useTreeKeyboard(
  focusState: FocusState,
  growth: GrowthPlaybackState,
  dispatch: (action: TreeAction) => void
): void
```

Handles all keyboard shortcuts:
- **← →** — Navigate prev/next node in focused branch
- **↑ ↓** — Switch to sibling branch at nearest decision point
- **Escape** — Clear focus (or exit growth exploring mode)
- **Enter** — Open detail panel for selected node
- **Space** — Toggle growth play/pause
- **[ ]** — Step backward/forward one node (when growth is paused)

---

## Key decisions and rationale

**Why custom SVG instead of React Flow?**
React Flow optimizes for interactive node editors (drag, connect, resize). We need a read-only tree visualization with very specific styling. Overriding React Flow's opinions (handle dots, bezier defaults, selection rectangles) is harder than building the SVG rendering ourselves. D3-hierarchy gives us the layout math; React gives us the component model.

**Why left-to-right instead of top-to-bottom?**
Clinical reasoning is a sequence — it reads like a narrative, left to right. Top-to-bottom trees feel like org charts. The horizontal flow also fits better in the 65% panel width since trees are typically wider than they are tall.

**Why React Context instead of Zustand/Redux?**
The state is small (selected node, pruned set, view mode, growth counter) and only consumed by components in one tree. Context + useReducer is sufficient and adds no dependencies.

**Why framer-motion for animations?**
We need staggered entrance animations for the growth effect, smooth transitions for pruning, and SVG-aware animation. Framer-motion handles all three and works naturally with React's component lifecycle. CSS animations alone can't handle the dynamic stagger timing (each node's delay depends on its position in the reasoning sequence).

---

## Integration with backend

The backend teammate's tracing engine produces a flat array of nodes. The exact shape may evolve. Our contract:

**We expect:**
```typescript
{
  nodes: TreeNode[]  // see src/types/tree.ts
}
```

**We provide:**
```typescript
// A single transformer function that converts their output to our internal format.
// If their shape changes, only this function changes.
transformTree(backendOutput: BackendResponse): PositionedTree
```

Until the backend is ready, we develop against `src/data/mockTree.ts`.
