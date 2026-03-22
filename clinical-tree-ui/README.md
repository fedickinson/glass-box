# Clinical Reasoning Tree UI

## Running the app

```bash
cd clinical-tree-ui
npm install      # first time only
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

## Pages

### Orthopedics (`/ortho`)
A clinical summary view for an orthopedics case — patient overview, diagnosis, and safety/compliance checks.

### Orthopedics Reasoning (`/`)
The full interactive reasoning tree visualization. Watch the AI's diagnostic reasoning grow branch by branch.

**To start:** Click the **"Start Reasoning"** button at the bottom of the screen. The tree will grow node by node, auto-pausing at key decision points so you can follow along. Press **Space** or click **Resume** to continue after each pause.

You can click any visible node while paused to explore that branch, then press **Escape** to return and **Space** to resume growth.

---

## Project structure

```
clinical-tree-ui/
  src/
    types/tree.ts              ← TypeScript interfaces (shared data contract with backend)
    data/                      ← Mock data + animation sequences
    components/
      tree/                    ← Tree canvas, nodes, connections, controls
      synthesis/               ← Right-panel synthesis + hypothesis cards
    context/                   ← React state (TreeContext + reducer)
    hooks/                     ← Growth timer, camera, keyboard
  docs/
    ARCHITECTURE.md            ← Component tree, data flow, interaction model
    STYLE_GUIDE.md             ← Design language and color system
```

See `CLAUDE.md` at the project root for full build instructions and design decisions.
