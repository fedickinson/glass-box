# Rosy Rat Boys — Empire Hacks 2026

Clinical diagnostic reasoning tree system built for Empire Hacks 2026 (Cornell Tech × Columbia AI Hackathon, March 20–22).

The system runs multi-path chain-of-thought reasoning over a medical scenario, explores counterfactual diagnostic branches, and visualizes the full reasoning tree so a doctor can see — and interact with — how the AI thinks.

## Repo structure

```
clinical-tree-ui/   ← Frontend (React + TypeScript)
tests/              ← Backend tests
multibeam_search.py ← Core reasoning/branching engine
entropy_branching.py
```

## Running the frontend

```bash
cd clinical-tree-ui
npm install         # first time only
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

**Pages:**
- `/` — Interactive reasoning tree. Click **"Start Reasoning"** at the bottom to watch the tree grow.
- `/ortho` — Orthopedics case summary view.

See `clinical-tree-ui/README.md` for more detail on the UI.

## Team

Built at Empire Hacks 2026.
