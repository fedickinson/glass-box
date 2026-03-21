/** Root app — top nav with variant switcher, hash-based routing between style comps */
import React, { useState, useEffect } from 'react'
import StyleVariantA from './pages/StyleVariantA'
import StyleVariantB from './pages/StyleVariantB'
import StyleVariantC from './pages/StyleVariantC'
import StyleVariantD from './pages/StyleVariantD'
import StyleVariantE from './pages/StyleVariantE'
import StyleVariantF from './pages/StyleVariantF'
import StyleVariantG from './pages/StyleVariantG'

type Variant = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g'

function getVariantFromHash(): Variant {
  const hash = window.location.hash
  if (hash === '#/style/b') return 'b'
  if (hash === '#/style/c') return 'c'
  if (hash === '#/style/d') return 'd'
  if (hash === '#/style/e') return 'e'
  if (hash === '#/style/f') return 'f'
  if (hash === '#/style/g') return 'g'
  return 'a'
}

export default function App() {
  const [variant, setVariant] = useState<Variant>(getVariantFromHash)

  useEffect(() => {
    const handler = () => setVariant(getVariantFromHash())
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])

  function navigate(v: Variant) {
    window.location.hash = `/style/${v}`
    setVariant(v)
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface-primary font-body">
      {/* Top nav */}
      <nav className="flex items-center gap-0 border-b border-border px-6 py-0 bg-surface-elevated shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary mr-6 py-3">
          Stage 0 — Style Exploration
        </span>
        {(['a', 'b', 'c', 'd', 'e', 'f', 'g'] as Variant[]).map((v) => (
          <button
            key={v}
            onClick={() => navigate(v)}
            className={[
              'px-5 py-3 text-[13px] font-medium border-b-2 transition-colors',
              variant === v
                ? 'border-node-thought-border text-text-primary'
                : 'border-transparent text-text-tertiary hover:text-text-secondary',
            ].join(' ')}
          >
            {v === 'a' && 'A — Quiet Clinical'}
            {v === 'b' && 'B — Warm & Grounded'}
            {v === 'c' && 'C — High-Contrast Editorial'}
            {v === 'd' && 'D — Apple Glass Dark'}
            {v === 'e' && 'E — Apple Glass Light'}
            {v === 'f' && 'F — Glass Opaque'}
            {v === 'g' && 'G — Glass Translucent'}
          </button>
        ))}
      </nav>

      {/* Variant content */}
      <div className="flex-1 overflow-hidden">
        {variant === 'a' && <StyleVariantA />}
        {variant === 'b' && <StyleVariantB />}
        {variant === 'c' && <StyleVariantC />}
        {variant === 'd' && <StyleVariantD />}
        {variant === 'e' && <StyleVariantE />}
        {variant === 'f' && <StyleVariantF />}
        {variant === 'g' && <StyleVariantG />}
      </div>
    </div>
  )
}
