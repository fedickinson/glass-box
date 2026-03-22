# Clinical Reasoning Tree — Claude Code Starter Kit

## What this is

A pre-built set of specifications, design tokens, type definitions, and mock data for bootstrapping the frontend of a clinical diagnostic reasoning tree visualization. Designed to be handed directly to Claude Code for scaffolding.

## How to use with Claude Code

### 1. Initialize the project

```bash
# Clone or copy this directory into your repo
cd clinical-reasoning-tree

# Tell Claude Code to set up the project
claude "Read CLAUDE.md, then initialize this as a Vite + React + TypeScript project with Tailwind CSS. Install the dependencies from package.json. Set up the Tailwind config and extend the theme to include our custom color tokens from src/styles/tokens.css (map them as Tailwind theme colors like colors.node.thought, colors.node.tool, etc.). Set up the project structure described in CLAUDE.md. Don't start building components yet — just get the project running with a blank page that imports tokens.css and has Tailwind working."
```

### 2. Build Stage 0 (Style exploration — 3-4 variants)

This is the most important early step. We need options to show the team before committing to a direction.

```bash
claude "Read CLAUDE.md and docs/STYLE_GUIDE.md carefully, especially the Stage 0 section. Build 3-4 visual direction variants as separate routes (/style/a, /style/b, /style/c, /style/d). Each variant shows the two-panel layout with 5-8 mock nodes from mockTree.ts rendered as styled cards, one branching connection, and the synthesis panel with placeholder text. Use Tailwind classes throughout — no separate CSS files per variant. The variants should feel genuinely different from each other: A is quiet/clinical/minimal, B is warmer with subtle depth, C is high-contrast editorial (best for projected demos), D is dark-mode-first with luminous accents. Include a simple nav to switch between them. See CLAUDE.md Stage 0 for full details."
```

Share the result with your team. Pick a direction. Then proceed.

### 3. Build Stage 1 (Layout shell with chosen style)

```bash
claude "We're going with Variant [X]. Read CLAUDE.md and docs/STYLE_GUIDE.md. Build Stage 1: the full two-panel layout shell using the chosen style direction. Left panel (65%) for the tree, right panel (35%) for synthesis. Include a top bar with the patient context from MOCK_PATIENT_CONTEXT in mockTree.ts. Use placeholder content in both panels. All styling via Tailwind classes + our CSS token variables. Make it look professional — this is a clinical tool, not a prototype."
```

### 4. Build Stage 2 (Tree rendering)

```bash
claude "Read CLAUDE.md, docs/ARCHITECTURE.md, and docs/STYLE_GUIDE.md. Build Stage 2: the tree rendering. Create the transformer (src/data/transformer.ts) that converts mockTreeNodes into a positioned tree using d3-hierarchy. Then build TreeCanvas, TreeNode, and TreeConnections components following the architecture doc. Use the node card pattern from the style guide (left-border accent, type labels, content text). Render the mock tree with proper node type differentiation and primary vs. branch connection styling. All styling via Tailwind — use arbitrary value syntax for our CSS token colors."
```

### 5. Continue with Stages 3–5

Follow the build stages in CLAUDE.md. Each stage builds on the previous one. Show teammates after each stage.

## Important: this repo grows

This starter kit is the **frontend foundation**. Teammates will add backend code, API layers, data pipelines, and other components alongside this frontend. The directory structure is designed for that — `src/` is the frontend's space, and the project root will accumulate other top-level directories as the system develops. Keep this in mind:
- Don't clutter the project root with frontend-specific config
- Shared data contracts live in `src/types/`
- The transformer layer is the integration seam with the backend

## File overview

```
CLAUDE.md                    ← Master instructions for Claude Code (read this first)
docs/
  ARCHITECTURE.md            ← Component tree, data flow, contracts
  STYLE_GUIDE.md             ← Design language, color system, typography
src/
  types/tree.ts              ← All TypeScript interfaces
  data/mockTree.ts           ← 40-node mock tree (chest pain scenario)
  styles/tokens.css          ← CSS custom properties (light + dark mode)
  components/                ← Empty — Claude Code fills these in
package.json                 ← Dependencies (React, d3, framer-motion, etc.)
```

## Key design decisions (already made)

- **Custom SVG via React** — not React Flow, not D3 for rendering
- **d3-hierarchy for layout math only** — computes positions, React renders
- **Left-to-right tree flow** — reasoning reads like a narrative
- **Left-border accent pattern** — node type shown via colored left border, not icons
- **Color = meaning** — blue/green/purple/amber/red each have a single semantic role
- **Tailwind CSS as primary styling** — all layout, spacing, typography via utility classes. CSS custom properties only for the semantic color tokens. No CSS modules, no styled-components.
- **react-zoom-pan-pinch** for viewport navigation
- **framer-motion** for growth animation and transitions
- **React Context** for state (not Redux/Zustand — state is simple enough)
- **Style exploration first** — 3-4 visual variants built before committing to the full component tree
- **Repo is a foundation** — structured so teammates can add backend, API, and data layers alongside the frontend
