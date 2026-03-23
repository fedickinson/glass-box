<table><tr>
<td width="140"><video src="https://github.com/user-attachments/assets/f634784b-4f8c-4205-9eb9-b936580a6a3e" width="130" autoplay loop muted playsinline></video></td>
<td><h1>Glassbox — Empire Hacks 2026</h1><p><strong>Live demo:</strong> <a href="https://glass-box-seven.vercel.app/orthopedics/reasoning/fast">glass-box-seven.vercel.app/orthopedics/reasoning/fast</a></p></td>
</tr></table>

---

Clinical AI reasoning made transparent. Glassbox runs multi-path chain-of-thought reasoning over a medical scenario, explores counterfactual diagnostic branches in parallel, and visualizes the full reasoning tree so a doctor can see — and interact with — exactly how the AI thinks.

Built at **Empire Hacks 2026** (Cornell Tech × Columbia AI Hackathon, March 20–22).

---

## What it does

Standard AI diagnostic tools give you one answer. Glassbox gives you the full reasoning tree.

When presented with a clinical case, the system:
1. **Branches at decision points** — instead of committing to one diagnostic path, it explores multiple hypotheses simultaneously
2. **Grows the tree live** — nodes appear one by one, auto-pausing at critical junctures so a clinician can follow along
3. **Synthesizes into a clinical narrative** — the right panel translates the tree into a structured report the doctor actually reads
4. **Lets the doctor interact** — prune a branch, annotate a reasoning step, pin the conclusion they agree with. The synthesis panel updates live.

The core insight: **transparency is not a summary at the end, it's the reasoning itself made navigable.**

---

## System architecture

```
multibeam_search.py    ← Multi-path reasoning engine (beam search over diagnostic space)
entropy_branching.py   ← Entropy-based decision point detection
clinical-tree-ui/      ← Frontend (React + TypeScript + Tailwind)
tests/                 ← Backend test suite
```

### Backend

The reasoning engine (`multibeam_search.py`) takes a clinical scenario and runs parallel chain-of-thought beams. At high-entropy moments — where the differential diagnosis is genuinely ambiguous — it branches rather than committing. Each branch explores a distinct hypothesis (cardiac vs. GI, for example) and continues reasoning independently.

`entropy_branching.py` detects these branching moments by measuring entropy over the model's output distribution.

### Frontend

React + TypeScript application that consumes the reasoning tree and renders it as an interactive visualization.

- **Tree viewport** — pan/zoom SVG canvas with animated node growth and branch connections
- **Focus system** — click a branch to isolate it (everything else fades to 20% opacity); navigate with arrow keys; a scrubber shows branch progress
- **Synthesis panel** — structured clinical report that stays in sync with the tree; clicking a branch in the panel highlights it in the tree and vice versa
- **Growth playback** — tree grows node-by-node with auto-pause at decision points; supports live interaction while paused

Color encodes meaning: blue = reasoning steps, green = tool/evidence calls, amber = decision points, red = safety flags.

---

## Running locally

```bash
cd clinical-tree-ui
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

**Routes:**
- `/` — Chest pain differential: interactive reasoning tree with growth playback
- `/orthopedics/reasoning/fast` — Orthopedics case: fast-mode reasoning view (demo route)

---

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | React 18, TypeScript, Tailwind CSS, Vite |
| Tree layout | d3-hierarchy, d3-shape (layout math only — React renders all SVG) |
| Interaction | react-zoom-pan-pinch, framer-motion |
| Backend | Python, custom beam search engine |
| Deploy | Vercel |

---

## Team

Built in 48 hours at Empire Hacks 2026.
