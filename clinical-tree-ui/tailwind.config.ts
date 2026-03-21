import type { Config } from 'tailwindcss'

/**
 * Tailwind config for Clinical Reasoning Tree.
 * 
 * Maps our CSS custom property tokens to Tailwind theme values
 * so we can write `bg-node-thought` instead of `bg-[var(--node-thought-fill)]`.
 * 
 * The CSS variables are defined in src/styles/tokens.css with light/dark mode variants.
 * Tailwind just references them — the actual color switching happens in CSS.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          primary: 'var(--surface-primary)',
          secondary: 'var(--surface-secondary)',
          tertiary: 'var(--surface-tertiary)',
          elevated: 'var(--surface-elevated)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },
        border: {
          DEFAULT: 'var(--border-default)',
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
        // Node type semantic colors
        node: {
          thought: {
            fill: 'var(--node-thought-fill)',
            border: 'var(--node-thought-border)',
            text: 'var(--node-thought-text)',
            label: 'var(--node-thought-label)',
          },
          tool: {
            fill: 'var(--node-tool-fill)',
            border: 'var(--node-tool-border)',
            text: 'var(--node-tool-text)',
            label: 'var(--node-tool-label)',
          },
          citation: {
            fill: 'var(--node-citation-fill)',
            border: 'var(--node-citation-border)',
            text: 'var(--node-citation-text)',
            label: 'var(--node-citation-label)',
          },
          decision: {
            fill: 'var(--node-decision-fill)',
            border: 'var(--node-decision-border)',
            glow: 'var(--node-decision-glow)',
            text: 'var(--node-decision-text)',
            label: 'var(--node-decision-label)',
          },
          flagged: {
            fill: 'var(--node-flagged-fill)',
            border: 'var(--node-flagged-border)',
            text: 'var(--node-flagged-text)',
            label: 'var(--node-flagged-label)',
          },
        },
        // Shield severity
        shield: {
          safety: {
            bg: 'var(--shield-safety-bg)',
            text: 'var(--shield-safety-text)',
          },
          guideline: {
            bg: 'var(--shield-guideline-bg)',
            text: 'var(--shield-guideline-text)',
          },
          correctness: {
            bg: 'var(--shield-correctness-bg)',
            text: 'var(--shield-correctness-text)',
          },
          traceability: {
            bg: 'var(--shield-traceability-bg)',
            text: 'var(--shield-traceability-text)',
          },
        },
        // Connection colors
        conn: {
          primary: 'var(--conn-primary-color)',
          branch: 'var(--conn-branch-color)',
          convergence: 'var(--conn-convergence-color)',
          pruned: 'var(--conn-pruned-color)',
        },
      },
      fontFamily: {
        body: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'system-ui', 'sans-serif'],
        clinical: ['Georgia', 'Times New Roman', 'serif'],
      },
      borderWidth: {
        'node': '3px',
        'node-bold': '4px', // for Variant C
      },
      borderRadius: {
        'node': '10px',
      },
      // Common node sizing — use as min-w-node, max-w-node
      minWidth: {
        'node': '160px',
      },
      maxWidth: {
        'node': '220px',
      },
    },
  },
  plugins: [],
} satisfies Config
