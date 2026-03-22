# Style Guide — Clinical Reasoning Tree

## Design philosophy

This is a clinical decision support tool. The design must earn a doctor's trust in the first second they see it. That trust comes from restraint, clarity, and the feeling that every pixel was considered.

**We are NOT building:**
- A developer tool (no React Flow / node graph aesthetics)
- A startup dashboard (no gradient cards, no rounded-everything)
- A medical device UI from 2005 (no gray-on-gray institutional drab)

**We ARE building:**
- A modern clinical product — think UpToDate's clarity meets Linear's polish
- Something a doctor would screenshot and send to a colleague
- A tool that communicates "this system is rigorous" through its visual design

### Four principles

1. **Quiet authority** — Muted palette, purposeful color, generous whitespace. The UI recedes so the clinical content leads. No element fights for attention unless it's genuinely important.

2. **Color encodes meaning only** — If something is colored, that color tells you what kind of thing it is. No decorative color. A doctor should be able to scan the tree and instantly know "blue = reasoning, green = evidence, amber = decision" without a legend.

3. **Information density without clutter** — Doctors scan. Show the right information at the right level of detail. The tree shows structure at a glance; click for depth. The synthesis panel is readable at arm's length.

4. **Designed, not decorated** — Every choice is intentional. The generous spacing, the restrained typography, the subtle animations — these aren't missing features, they're design decisions. The difference between a medical instrument and a product someone chooses to use.

---

## Style variants (Stage 0 exploration)

Before committing to the full build, we create 3–4 distinct visual directions as lightweight prototypes. The team picks one; the rest are discarded. All variants share the same color-meaning mapping and structural patterns — they differ in tone, density, and visual weight.

### Variant A: Quiet clinical

The most restrained option. Closest to what a doctor would expect from a tool embedded in their EHR.

- **Backgrounds:** Pure white panels, `#fafafa` tree canvas. Almost no visual distinction between surface layers — hierarchy comes from whitespace and typography alone.
- **Node cards:** Very thin borders (1px), generous internal padding, no shadows. The left-border accent is the only color on the card. Card backgrounds are barely tinted — `opacity: 0.3` on the type fill.
- **Connections:** Thin across the board. Primary path is 2px (not 2.5). Branches are hairline (0.75px). The tree looks like a medical journal figure.
- **Typography:** Conservative sizes. System sans throughout (no serif for the synthesis headline). The synthesis panel reads like a structured clinical note.
- **Spacing:** Very generous. Nodes feel like they're floating. The tree breathes.
- **Mood:** "I am a serious medical tool. I have been validated."

### Variant B: Warm & grounded

A step warmer. Still clinical, but feels more like a modern health platform than an EHR module.

- **Backgrounds:** Warm neutrals — `#faf9f6` base, `#f5f3ef` for surfaces. A slight linen/cream undertone that feels organic and calming.
- **Node cards:** Subtle card shadows (`0 1px 3px rgba(0,0,0,0.06)`), slightly warmer fill tints. Feels like physical cards arranged on a surface. Rounded corners at 12px (a touch softer).
- **Connections:** Standard weights from the style guide. Curves feel slightly more organic — longer control point handles on the beziers.
- **Typography:** System sans for body, but the synthesis panel headline uses the serif font (Georgia). Adds gravitas to the recommendation without being stuffy.
- **Spacing:** Generous but not sparse. Cards feel grouped and related.
- **Mood:** "I am a modern clinical product. A doctor would choose to use me."

### Variant C: High-contrast editorial

The boldest option. Designed to look striking projected on a screen in a demo room.

- **Backgrounds:** Slightly cooler white (`#f8f9fb`). Panels have more visible borders and distinct surface layers.
- **Node cards:** Stronger type fill colors (full opacity, not muted). The left border is 4px instead of 3px. Decision points have a more pronounced glow. Cards have a very subtle inset shadow that gives them physicality.
- **Connections:** Full style guide weights. Primary path is clearly dominant. Branch connections have visible dashed patterns for different branch types.
- **Typography:** Slightly larger sizes overall (+1px). Synthesis headline is bold and serif. Section headers have more contrast. Metadata is crisper.
- **Spacing:** Tighter than A or B. Higher information density. The tree feels packed with intelligence.
- **Mood:** "I am a data visualization in Nature Medicine. Look at my beautiful reasoning."

### Variant D (optional): Dark-first

Designed primarily for dark mode. The tree is the hero element — glowing nodes on a dark canvas.

- **Backgrounds:** Deep charcoal (`#1c1c1a`) base. Panels use subtle elevation via very slight lightening (`#242422` cards on `#1c1c1a` background).
- **Node cards:** Type fill colors are darker and richer (the dark-mode values from tokens.css). The left-border accents feel like they're luminous — they pop against the dark surface. Decision points glow amber.
- **Connections:** Primary path in the bright blue (`#5a9de6`). Branches in muted gray. Against the dark background, the path structure reads immediately.
- **Typography:** Light text on dark backgrounds. The synthesis headline in light cream. High readability contrast.
- **Spacing:** Similar to B. The dark background naturally provides visual separation, so less whitespace is needed.
- **Mood:** "I am a mission control interface. The reasoning is the signal; everything else is dark."

### What stays constant across all variants

These are non-negotiable regardless of which direction is chosen:

1. **Color-meaning mapping** — Blue = reasoning, Green = tool/evidence, Purple = citation, Amber = decision, Red = flag. Same hues, different saturation/intensity per variant.
2. **Left-border accent pattern** — All variants use the 3px (or 4px in C) left border to indicate node type. No icons, no corner badges.
3. **Primary vs. counterfactual visual weight** — Primary path always visually dominates. Branches always recede.
4. **Synthesis panel structure** — Recommendation → Confidence → Caveats → Rejected paths. Same sections, same hierarchy, different styling.
5. **Tailwind-based implementation** — Each variant is just different Tailwind class combinations on the same structural components.

---

### Node type colors

Each node type has a single hue. Used for left-border accents, connection strokes, and type labels. The full range from fill (light) to text (dark) for each:

| Type | Role | Fill (light) | Fill (dark) | Border/Accent | Text on fill (light) | Text on fill (dark) |
|------|------|-------------|-------------|--------------|---------------------|---------------------|
| **Reasoning** | `thought` nodes | `#EDF4FC` | `#1a2a3d` | `#3B7DD8` | `#1a5098` | `#7bb8f0` |
| **Tool/Evidence** | `tool` nodes | `#EEF6F0` | `#1a2d22` | `#2D8A56` | `#1c6138` | `#6dd498` |
| **Citation** | `citation` nodes | `#F4F0FA` | `#251e35` | `#7B5EA7` | `#5a3f82` | `#c0a4e8` |
| **Decision** | `is_decision_point: true` | `#FFF8ED` | `#2d2510` | `#D4950A` | `#8a6200` | `#f0c040` |
| **Flagged** | Shield-flagged nodes | `#FEF0EE` | `#2d1a18` | `#C53D2F` | `#922218` | `#f07060` |

### Shield severity colors

| Severity | Background (light) | Background (dark) | Text (light) | Text (dark) |
|----------|-------------------|-------------------|-------------|-------------|
| Safety violation | `#FEF0EE` | `#2d1a18` | `#C53D2F` | `#f07060` |
| Guideline conflict | `#FFF5EB` | `#2d2210` | `#B8700A` | `#f0b040` |
| Correctness issue | `#FFFBE6` | `#2d2a10` | `#8A7A10` | `#e0d040` |
| Traceability gap | Surface secondary | Surface secondary | Text tertiary | Text tertiary |

### Connection colors

| Connection type | Stroke color | Width | Opacity |
|----------------|-------------|-------|---------|
| Primary path | `#3B7DD8` | 2.5px | 0.6 |
| Counterfactual branch | Border tertiary | 1px | 0.4 |
| Convergence indicator | `#2D8A56` | 1.5px dashed | 0.5 |
| Pruned branch | `#C53D2F` | 1px | 0.2 |

### Neutral palette

Use CSS custom properties for all neutrals — these auto-adapt to light/dark mode:
- `--bg-primary`: Main background
- `--bg-secondary`: Card/panel surfaces
- `--bg-tertiary`: Subtle section backgrounds
- `--text-primary`: Main text
- `--text-secondary`: Supporting text
- `--text-tertiary`: Metadata, hints
- `--border-default`: Standard borders
- `--border-subtle`: Lighter borders

---

## Typography

Font: System font stack (the app should feel native, not branded). `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`.

For the synthesis panel and anywhere clinical text appears, consider a serif for the headline recommendation to add gravitas: `'Georgia', 'Times New Roman', serif`.

| Role | Size | Weight | Line height | Color |
|------|------|--------|-------------|-------|
| Synthesis headline | 20px | 600 | 1.3 | Text primary |
| Synthesis subhead | 15px | 500 | 1.4 | Text secondary |
| Confidence line | 14px | 400 | 1.5 | Text secondary |
| Caveat / qualifier | 13px | 400 italic | 1.5 | Text tertiary |
| Node body text | 13px | 400 | 1.5 | Text primary |
| Node type label | 10px | 600 | 1 | Type accent color, uppercase, 0.06em tracking |
| Node metadata | 11px | 400 | 1.3 | Text tertiary |
| Panel section header | 11px | 600 | 1 | Text tertiary, uppercase, 0.08em tracking |

---

## Node anatomy (the left-border card pattern)

Every node in the tree is rendered as a card with:

```
┌─────────────────────────────┐
│▌ REASONING                  │  ← 3px left border in type color
│▌                            │     10px uppercase type label
│▌ Chest tightness with age   │     13px body text
│▌ and medication history     │
│▌ suggests cardiac eval      │
│▌                            │
│▌ Step 12 of 34              │  ← 11px metadata line
└─────────────────────────────┘
```

- Background: Type fill color (very light tint)
- Left border: 3px solid in the type accent color
- Corner radius: 10px (softer than standard 8px, feels more clinical-product, less developer-tool)
- Padding: 12px 14px
- Min width on tree: ~160px. Max width: ~220px. Text truncates with ellipsis in tree view, expands in detail view.

### Decision point nodes get extra treatment:
- 1.5px full border in amber instead of just left border
- Subtle box-shadow: `0 0 0 3px rgba(212, 149, 10, 0.1)` — a gentle glow
- Slightly larger in the tree (scale 1.05 or a few px wider)

### Flagged/pruned nodes:
- Dimmed to 40% opacity
- Body text gets `text-decoration: line-through` with 60% opacity
- Red-tinted left border
- Small shield badge showing the severity level

---

## Tree layout

The tree flows **left to right** (not top to bottom). Reasoning progresses along the x-axis. Branches fork vertically.

```
[Start] ─── [Step 1] ─── [Step 2] ─── [Decision] ─┬── [Branch A] ─── [Dx: Angina]
                                                    │
                                                    ├── [Branch B] ─── [Dx: GERD]
                                                    │
                                                    └── [Branch C] ─── [Dx: Angina] ← converges!
```

- Node horizontal spacing: 60px gap between nodes
- Node vertical spacing at branch points: 40px between branches
- Primary path is the visual "spine" — centered vertically, strongest visual weight
- Branches extend above and below the spine

### Convergence visualization
When two branches reach the same diagnosis, connect their terminal nodes with a dashed green line. This is the key confidence signal — independent reasoning paths arriving at the same conclusion.

---

## Synthesis panel layout

Right panel, 35% width. Sticky header with the patient context line.

```
┌─────────────────────────────────────┐
│ RECOMMENDATION                       │  ← Section header (uppercase, small)
│                                       │
│ Likely diagnosis: Unstable angina    │  ← Headline (serif, 20px, weight 600)
│                                       │
│ CONFIDENCE                           │
│ High — 3 of 4 branches converge     │  ← Subhead (15px)
│ on this diagnosis through            │
│ independent reasoning paths          │  ← Body (14px)
│                                       │
│ WHAT WOULD CHANGE THIS               │
│ If troponin returns elevated,        │  ← Caveat (13px, italic)
│ reclassify as NSTEMI                 │
│                                       │
│ If chest wall tenderness on exam,    │
│ musculoskeletal origin more likely   │
│                                       │
│ ─────────────────────────────────── │
│                                       │
│ REJECTED PATHS                       │
│ ┌─ Shield: Safety violation ────┐   │
│ │ Empiric anticoagulation       │   │  ← Pruned path card
│ │ without imaging               │   │
│ │ ACC/AHA §6.1                  │   │
│ └───────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## Animation principles

- **Purposeful, not decorative.** Every animation communicates state change or draws attention to something meaningful.
- **Tree growth:** Nodes appear left-to-right with 80–120ms stagger. Each node fades in (opacity 0→1) and scales up slightly (0.95→1). Connections draw after both endpoints are visible.
- **Pruning:** Node dims over 300ms. Connection stroke-dasharray animates to create a "dissolving" effect. Synthesis panel content cross-fades.
- **Selection:** Selected node gets a subtle scale bump (1.02) and the border thickens. Other nodes dim slightly (opacity 0.7).
- **No bouncing, no elastic easing, no playful spring physics.** Clinical tone. Use `ease-out` for entrances, `ease-in-out` for transitions.

---

## Responsive behavior

This is a demo tool, not a mobile app. Optimize for:
- **Primary:** 1440px+ laptop/external monitor (demo will be projected)
- **Secondary:** 1280px laptop screen
- Below 1024px: stack panels vertically (synthesis below tree)

---

## Dark mode

All colors are defined as CSS custom properties with light/dark variants. The node type fills, borders, and text colors all have explicit dark-mode values (see color table above). Test both modes — the demo environment may be a dark room with a projector.
