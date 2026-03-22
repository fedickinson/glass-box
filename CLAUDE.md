# CLAUDE.md — Clinical Reasoning Tree UI

## Project overview

This is the frontend for a clinical diagnostic reasoning system, built for Empire Hacks 2026 (Cornell Tech × Columbia AI Hackathon, March 20–22). The backend (built by a teammate) is a tracing engine that takes a medical scenario, runs chain-of-thought reasoning, identifies decision points, and branches off to explore counterfactual diagnostic paths. The output is a tree: one primary reasoning trunk with branches at critical junctures, each exploring an alternative hypothesis.

**This frontend has two jobs:**
1. Visualize the reasoning tree so a doctor can see *how* the system thinks
2. Provide a synthesis panel that translates the tree into a clinical narrative the doctor actually reads

**Timeline:** Demable by end of day Saturday March 21. Polish continues into Sunday morning. Demo is ~2 minutes at 5 PM Sunday.

## This repo is a foundation, not the whole project

This frontend is one piece of a larger system. Teammates will be adding:
- The **backend tracing engine** (Python) that produces the reasoning tree
- **API layer** connecting backend to frontend
- **Data pipeline** and any ML/analysis components
- Additional pages, views, or features as the project evolves

Build with this in mind:
- **Keep the directory structure clean and modular.** Teammates will add top-level directories (`/api`, `/backend`, `/data`, etc.) alongside `/src`. Don't sprawl files into the project root.
- **Shared types go in `src/types/`.** If the backend team needs to align on data shapes, this is the contract.
- **The transformer layer (`src/data/transformer.ts`) is the integration seam.** When the real backend comes online, only this file should need to change. Everything downstream works off `PositionedTree`.
- **Don't hardcode assumptions about how data arrives.** The mock data is a flat JSON array today. Tomorrow it might come from a WebSocket, an API endpoint, or a file. The transformer should accept the raw data and not care where it came from.
- **Environment config:** Use `.env` files for any API URLs or config that will change when the backend is ready. Don't bury localhost URLs in component files.

## Tech stack

- React 18 + TypeScript
- **Tailwind CSS is the primary styling system.** Use Tailwind utility classes for all layout, spacing, typography, borders, and responsive behavior. This is critical — Tailwind works exceptionally well with AI coding agents (Claude Code) because it keeps styles co-located with markup, making it easy to iterate and refactor without hunting through separate CSS files.
- CSS custom properties (`src/styles/tokens.css`) for the **semantic color system only** — the node type colors, shield severities, and connection styles that encode clinical meaning. These are referenced via Tailwind's `arbitrary value` syntax: `bg-[var(--node-thought-fill)]`, `border-[var(--node-thought-border)]`, etc. This gives us Tailwind's ergonomics with our domain-specific palette.
- **Extend `tailwind.config.ts`** to map our tokens to Tailwind theme values where it makes sense (e.g., `colors.node.thought`, `colors.node.tool`). This makes the most common patterns available as regular Tailwind classes like `bg-node-thought` instead of arbitrary values.
- `d3-hierarchy` and `d3-shape` for tree layout math only (NOT for rendering — React renders all SVG)
- `react-zoom-pan-pinch` for pan/zoom on the tree viewport
- `framer-motion` for node entrance animations and the incremental growth effect

**Do not use:** React Flow, react-force-graph, vis.js, or any opinionated node-graph library. We are rendering custom SVG via React components for full visual control.

**Do not use:** CSS modules, styled-components, Emotion, or any CSS-in-JS library. Tailwind + CSS custom properties covers everything we need.

## Architecture

Read `docs/ARCHITECTURE.md` for the full component tree, data flow, and **interaction model**. Key points:

- The tree data arrives as a flat array of nodes with `parent_id` references
- A transformer layer converts flat nodes → d3-hierarchy tree → positioned layout
- Every tree node is a React component (`TreeNode`) that receives position + data as props
- Connections are SVG `<path>` elements rendered by a `TreeConnections` component
- The synthesis panel reads from the same tree state and recomputes when branches are pruned/restored

### Interaction model (critical — read ARCHITECTURE.md §Interaction Model)

The tree has **three layers of focus** that are central to the UX:

1. **IDLE** — Full tree, nothing selected, 100% opacity everywhere
2. **BRANCH_FOCUSED** — Click a node and its entire branch (root → terminal) highlights. Everything else fades to **20–30% opacity** (heavy isolation). A scrubber appears at the bottom showing the branch's nodes as colored dots.
3. **NODE_SELECTED** — Within the focused branch, one node is active. Detail panel opens. Viewport pans to center it.

**Navigation:** Arrow keys (←→ along branch, ↑↓ to switch branches at decision points) + a visible scrubber/slider for the audience to follow along.

**Growth playback** coexists with focus: the tree grows node by node, **auto-pauses at decision points**, and the presenter can interact with already-rendered nodes while growth is paused, then resume.

This interaction model is the most complex part of the UI. The state types for focus and growth are defined in `src/types/tree.ts`. Build it into the Context/reducer from Stage 1 — do not defer it to later stages.

## Design system

Read `docs/STYLE_GUIDE.md` for the full design language. Key principles:

- **Quiet authority.** This is a clinical tool. No flashy gradients, no startup aesthetics. Muted, purposeful color.
- **Color encodes meaning only.** Blue = reasoning steps. Green = tool calls / evidence. Purple = citations. Amber = decision points. Red = shield flags. No decorative color.
- **Left-border accent pattern.** Node type is communicated via a 3px left border in the type color, not icons or badges. Clean and immediately scannable.
- **Primary path dominates visually.** Thicker strokes, saturated blue. Counterfactual branches recede: thinner, gray, lower opacity.
- **Typography hierarchy matters.** The synthesis panel uses a clear headline → confidence → caveats → metadata cascade. See the style guide for exact sizes and weights.

CSS tokens are in `src/styles/tokens.css`. Import this at the app root.

## File structure

```
src/
  types/tree.ts          — TypeScript interfaces (data, focus state, growth state, actions)
  data/mockTree.ts       — Hardcoded mock tree for development (realistic clinical scenario)
  data/transformer.ts    — Flat node array → d3 hierarchy → positioned layout
  styles/tokens.css      — CSS custom properties (semantic colors only — layout uses Tailwind)
  context/
    TreeContext.tsx       — React context + useReducer for all tree UI state
    treeReducer.ts       — State reducer handling all TreeAction types
  hooks/
    useTreeKeyboard.ts   — Keyboard shortcut handler (arrows, escape, space, enter)
    useGrowthTimer.ts    — Growth playback timer (auto-advance, auto-pause at decisions)
    useViewportControl.ts — Programmatic pan/zoom control via react-zoom-pan-pinch refs
  components/
    App.tsx              — Root layout: two-panel split
    tree/
      TreeViewport.tsx   — Pan/zoom container wrapping the SVG canvas
      TreeCanvas.tsx     — SVG element containing all nodes and connections
      TreeNode.tsx       — Individual node component (type variants, focus roles)
      TreeConnections.tsx — SVG paths connecting nodes (focus-aware opacity)
      NodeDetail.tsx     — Expanded detail view when a node is clicked
      BranchScrubber.tsx — Bottom bar: branch navigation dots (visible when branch focused)
      GrowthControls.tsx — Bottom bar: play/pause/step/speed (visible during growth)
    synthesis/
      SynthesisPanel.tsx — Right panel: interactive review interface (focus-reactive)
      BranchCard.tsx     — Collapsible card for one branch (narrative, node summaries, actions)
      NodeSummaryLine.tsx — Single node summary within a branch card (clickable, annotatable)
      RecommendationHeader.tsx — Top section: diagnosis headline, confidence, pin indicator
      RejectedPaths.tsx  — Pruned branches section with restore buttons
      AnnotationInput.tsx — Inline input for flag/context/challenge annotations
    shared/
      ShieldBadge.tsx    — Shield severity indicator (safety/guideline/correctness/traceability)
      AnnotationBadge.tsx — Doctor annotation indicator (flag/context/challenge) for tree nodes
      NodeTypeBadge.tsx  — Small type label used in detail views
```

## Build stages

Build in this order. Each stage should be showable to teammates.

### Stage 0: Style exploration — build 3–4 visual directions

**This happens BEFORE committing to the full component build.** The goal is to give the team options to react to, not to pick one direction alone.

Build 3–4 distinct visual variants of the tree + synthesis layout, each as a self-contained page/route (e.g., `/style/a`, `/style/b`, `/style/c`). Each variant should show:
- The two-panel layout (tree left, synthesis right)
- A few sample nodes (3–5 from the mock data) rendered as styled cards with the left-border accent pattern
- One branching connection (primary → decision point → two branches)
- The synthesis panel with placeholder content showing the typography hierarchy
- Enough visual identity to feel like a real direction, not a wireframe

**What varies between the options:**
- **Variant A: Quiet clinical** — Maximum restraint. Near-white backgrounds, thin borders, muted type colors. The tree feels like a medical journal figure. Synthesis reads like an UpToDate entry.
- **Variant B: Warm & grounded** — Slightly warmer neutrals (cream/linen tones), more generous spacing, a touch of depth via subtle card shadows. Feels like a well-designed patient-facing portal. More inviting, slightly less austere.
- **Variant C: High-contrast editorial** — Bolder color usage, sharper type hierarchy, more visual weight on decision points and convergence. The tree feels like an interactive data visualization in a medical journal or health tech publication. Punchier, better for a demo projected on a screen.
- **Variant D (optional): Dark-first** — Designed primarily for dark mode. Deep backgrounds, luminous accent colors, the tree glows against a dark canvas. Dramatic for a demo setting.

**What stays constant across all variants:**
- The color-meaning mapping (blue=reasoning, green=tool, purple=citation, amber=decision, red=flag)
- The left-border accent pattern for node type
- The primary vs. counterfactual visual weight difference
- The synthesis panel structure (recommendation → confidence → caveats → rejected)
- All Tailwind-based — each variant uses the same token system with different Tailwind class combinations

**Exit criteria:** Team can view all variants side by side (or navigate between routes), discuss, and pick a direction. Once chosen, delete the others and proceed with Stage 1 using the selected style.

**Implementation note:** Build these as separate page components that share the same mock data and type system but differ in their Tailwind classes and token overrides. Keep them lightweight — these are style comps, not functional prototypes. 5–8 nodes rendered statically, no interactivity needed yet. A simple nav bar or tabs to switch between variants is fine.

### Stage 1: Layout shell + style foundation + state scaffolding (using chosen variant)
- Two-panel layout (65/35 split, resizable is nice-to-have)
- Import tokens.css, verify colors render in both light and dark mode
- Top bar with patient context placeholder
- Empty tree panel (gray placeholder) and empty synthesis panel (placeholder text)
- **Set up TreeContext + treeReducer with the full state shape from the start.** Even though most state won't be used yet, having the reducer handle all action types from day one prevents costly refactors later. The FocusState and GrowthPlaybackState types are already defined in `src/types/tree.ts` — wire them into the context now.
- Stub out the keyboard hook (`useTreeKeyboard`) — it can just `console.log` the key events for now
- **Exit criteria:** Page loads, looks professional, color system works, Context is wired and the reducer handles basic actions

### Stage 2: Tree rendering with mock data
- Run mockTree through the transformer to get positioned nodes
- Render TreeCanvas with TreeNode components for each node
- TreeConnections draws SVG paths between parent-child pairs
- Node type differentiation via the left-border accent pattern
- Decision points get the amber glow treatment
- Primary path connections are 2.5px blue, branch connections are 1px gray
- TreeViewport wraps the canvas with `react-zoom-pan-pinch` — basic user-controlled pan/zoom works
- **Exit criteria:** Tree is visible, node types are distinguishable, branching looks correct, pan/zoom works

### Stage 3: Focus system + interactive synthesis panel
This is where the interaction model and the synthesis panel come alive together. Build in this order:

1. **Click a node → BRANCH_FOCUSED + NODE_SELECTED.** The node's branch highlights (full opacity). Everything else fades to 20–30% opacity. The selected node gets a scale bump and stronger border. Implement the `focusRole` prop on TreeNode (`'none' | 'on_focused_branch' | 'selected' | 'dimmed'`).
2. **Click empty canvas / Escape → clear focus (IDLE).** All nodes return to 100%.
3. **Arrow key navigation.** ←→ moves along the focused branch. ↑↓ switches to a sibling branch at the nearest decision point. Wire up `useTreeKeyboard` for real.
4. **BranchScrubber.** Appears at the bottom when a branch is focused. Shows the branch's nodes as type-colored dots. Clicking/dragging moves the selection. The audience can see where in the reasoning chain the presenter is.
5. **Programmatic viewport control.** When focus changes, the viewport smoothly pans/zooms: `fitBranch()` on branch focus, `panToNode()` on node selection, `fitToView()` on clear. Wire up `useViewportControl` with `react-zoom-pan-pinch` refs.
6. **NodeDetail panel.** Opens when a node is selected. Shows full content, source, tool metadata. Can be a slide-out panel on the right edge of the tree panel or an overlay.
7. **Interactive synthesis panel.** This is the big piece — the synthesis panel is NOT a static report. Build:
   - **RecommendationHeader** at the top: diagnosis headline, confidence line
   - **BranchCard** for each branch: clickable card with narrative summary. Clicking a branch card focuses that branch in the tree (same as clicking a node, but focuses the whole branch without selecting a specific node). The focused branch's card gets a highlighted border.
   - **NodeSummaryLine** within each BranchCard: one-line summaries of notable nodes on the branch. Clickable (selects that node in the tree, viewport pans). Hovering a node summary line subtly highlights the corresponding tree node (no full focus change, just a gentle pulse).
   - **Bidirectional sync:** When the tree focus changes (user clicks in the tree), the synthesis panel scrolls to and highlights the relevant branch card. When the user clicks in the synthesis panel, the tree responds. They feel like one connected interface, not two views.

**Exit criteria:** Full focus lifecycle works — click node, branch highlights, navigate with arrows, scrubber visible, viewport follows, detail panel opens. Synthesis panel shows branch cards and node summaries, clicking them drives the tree. Bidirectional sync feels seamless.

### Stage 4: Pruning, annotations, and live synthesis updates
Two subsystems here: the pruning/shield system (already designed) and the new doctor annotation system.

**Pruning (build first):**
- Click to prune a branch → visual change (dimmed, strikethrough, red tint)
- Synthesis panel recomputes: recalculates convergence, updates caveats, moves pruned branch to Rejected section
- Shield model visual indicators on flagged nodes
- Restore a pruned branch (doctor override of shield) via button in the Rejected section
- Pruning clears focus (returns to IDLE) so the doctor sees the updated full tree

**Doctor annotations (build second):**
- **Flag a node.** On each NodeSummaryLine in the synthesis panel, a flag button (⚑) appears on hover. Clicking it opens a small inline input ("What's the concern?"). Submitting creates a `DoctorAnnotation` of type `flag`. The annotation appears: (a) inline on the node summary in the synthesis panel, and (b) as a red dot badge on the corresponding tree node.
- **Add context.** Same pattern, different button (📎). Doctor types additional clinical information. Appears as a blue dot badge on the tree node and an inline note in the synthesis panel.
- **Challenge reasoning.** Same pattern, button (⚡). Doctor disagrees with a reasoning step. Amber dot badge on tree node. In the synthesis panel, the challenged step gets a visual indicator.
- **Pin a branch.** On each BranchCard, a pin button (★). Only one branch can be pinned at a time. Pinning a branch moves it to the top of the synthesis panel, adds a "Doctor concurs" badge to the recommendation header, and may boost the displayed confidence.
- **Remove annotations.** Each annotation has a small × to dismiss it.
- `AnnotationInput.tsx` handles the inline input for all three annotation types (flag, context, challenge). It's a small component that opens below the node summary line, accepts text, and dispatches `ADD_ANNOTATION`.
- `AnnotationBadge.tsx` renders the small colored dots on tree nodes. Multiple annotations on one node show multiple dots.

**Exit criteria:** Full doctor interaction loop works — prune a branch and see synthesis update, restore it and see it revert. Flag a node and see the badge appear in both the synthesis panel and the tree. Add context to a node and see it inline. Pin a branch and see the recommendation header update. Remove an annotation and see it disappear from both views.

### Stage 5: Growth playback + demo polish
This is the demo showpiece. Build in this order:

1. **Basic growth.** Pressing "Start" renders nodes one by one in `step_index` order. Each node fades in with a slight scale-up. Connections draw in as their target node appears. GrowthControls bar appears at the bottom (replacing the scrubber space).
2. **Auto-pause at decision points.** When the growth cursor reaches a node with `is_decision_point: true`, playback pauses automatically. The decision point node shows a subtle pulse animation (2-3 rings over 2 seconds). The presenter narrates, then clicks resume or presses Space.
3. **Branch forking on resume.** When growth resumes from a decision point, all branches that fork from it grow simultaneously. Within each branch, nodes still appear sequentially.
4. **Growth + interaction coexistence.** While growth is paused, clicking a visible node enters `PAUSED_EXPLORING` state — the normal focus system activates on already-rendered nodes. Escape returns to the paused state. Space resumes growth (and clears focus).
5. **Speed controls.** Slow (400ms/node), Normal (200ms), Fast (100ms). Step forward/back buttons for manual advance when paused. Skip-to-end button.
6. **Dual view toggle.** "Clinical view" (clean, just reasoning and synthesis) vs "Architecture view" (shows tool names, latency, shield check metadata on each node). A toggle in the top bar.

**Exit criteria:** Full demo flow works: start growth → watch tree grow → auto-pause at decision → narrate → resume → branches fork → pause again → click into a branch → navigate → escape → resume → tree completes → interact freely → prune a branch → synthesis updates. Dual view toggle works.

## Coding conventions

- Functional components with hooks, no class components
- Props interfaces defined inline or co-located with the component
- **Tailwind-first styling.** All layout, spacing, typography, borders, shadows, and responsive behavior should be Tailwind utility classes directly on JSX elements. This is the primary styling method.
- **CSS custom properties from tokens.css for semantic colors only** — node type colors, shield severities, connection styles. Reference via Tailwind arbitrary values: `bg-[var(--node-thought-fill)]` or via the extended theme if mapped in `tailwind.config.ts`.
- **No standalone `.css` files per component.** If a component needs styles beyond Tailwind utilities and CSS variables, use Tailwind's `@apply` in a shared stylesheet or inline styles for SVG-specific attributes (like `strokeWidth` or path `d`).
- **Tailwind class ordering:** Layout (flex, grid, position) → sizing (w, h) → spacing (p, m, gap) → typography (text, font) → color (bg, text, border) → effects (shadow, opacity, transition). Be consistent.
- All node rendering is SVG inside a single `<svg>` element in TreeCanvas. SVG elements use inline style props for positioning and path-specific attributes, but Tailwind classes for anything that maps (colors via arbitrary values, transitions, opacity).
- State management: React context for tree state (selected node, pruned branches, view mode). No Redux, no Zustand — the state is not complex enough to warrant it.
- **Keep the codebase navigable for teammates.** Use clear file names, export components as defaults, and add a one-line JSDoc comment at the top of each component file explaining what it does. Teammates joining later shouldn't need to read ARCHITECTURE.md to understand what a file is for.

## Mock data

`src/data/mockTree.ts` contains a realistic 40-node clinical reasoning tree for a chest pain differential diagnosis. Use this throughout development. The data shape matches what we expect from the backend (see `src/types/tree.ts`), but build the transformer with a clean interface so swapping in real data is a one-function change.

## What the demo needs to show

The demo is ~2 minutes. Every interaction should be rehearsed. Here's the likely flow:

1. **Single-shot comparison:** Show a standard single chain-of-thought (one path, one answer). Then show our system on the same input — the tree grows, branches form. The audience sees the difference immediately.
2. **Growth with auto-pause:** Tree grows node by node. When it hits the first decision point, it auto-pauses. The presenter narrates: "The system just identified a critical juncture — should it explore cardiac or GI?" Then resumes. Branches fork visibly.
3. **Shield in action:** During growth, a branch gets flagged — the shield model catches a safety violation. The node pulses red, the branch dims. The audience sees the safety system working in real time.
4. **Branch focus + navigation:** Growth completes. The presenter clicks a branch — it illuminates, everything else fades. They use the scrubber (visible to the audience) to walk through the reasoning steps. The detail panel shows each step's content. The audience follows along.
5. **Doctor interaction:** The presenter manually prunes a branch. The synthesis panel updates live — confidence recalculates, caveats change. This is the "wow" moment: the doctor has agency over the AI's reasoning.
6. **Dual view (if time):** Toggle from clinical to architecture view. The audience sees the tool calls, latencies, and shield checks that were running under the hood. Demonstrates technical depth without a single architecture slide.

### Demo survival rules

- **Auto-pause makes the presenter look polished.** They never fumble for a pause button. The system stops at the right moments naturally.
- **The scrubber is a visual anchor for the audience.** Even people in the back of the room can see the colored dots progressing along the branch.
- **Heavy fade (20-30%) on unfocused branches means no visual noise.** When the presenter focuses on a branch, the tree simplifies itself. No one gets lost in 50 nodes.
- **Growth + focus coexistence means the presenter can improvise.** If a judge asks a question mid-growth, the presenter can pause, click into a branch, explore, answer the question, then resume. The system supports it.

## Key constraints

- The backend data shape is not 100% confirmed. Build a clean data transformer interface so swapping the adapter is quick.
- The tree can be 30–50+ nodes. Pan/zoom is not optional. Programmatic viewport control (pan to node, fit branch, fit all) is essential for the focus system to work.
- Multiple branches can converge on the same diagnosis — this convergence must be visually clear (it's the confidence signal).
- Dark mode must work. Doctors use both. The demo room may be dark.
- **The interaction model (focus layers + growth playback) is the most complex subsystem.** Wire the full state shape into the Context/reducer in Stage 1, even if most of it isn't used until Stage 3+. Retrofitting focus state onto a reducer that wasn't designed for it is painful.
- **Growth playback and interactive focus must coexist.** The presenter needs to pause growth, explore rendered nodes, then resume. This is not two separate modes — it's one integrated system. See ARCHITECTURE.md §Growth Playback System.
- **The scrubber and growth controls share the same physical space** at the bottom of the tree panel. They alternate visibility: scrubber shows during focus, growth controls show during playback. Design the layout to accommodate both.
