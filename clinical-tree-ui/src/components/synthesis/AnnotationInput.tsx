/** AnnotationInput — inline input that opens below a NodeSummaryLine for flag/context/challenge */
import React, { useState, useRef, useEffect } from 'react'
import { DoctorAnnotationType } from '../../types/tree'

const TYPE_CONFIG: Record<DoctorAnnotationType, { icon: string; label: string; color: string; placeholder: string }> = {
  flag: {
    icon: '⚑',
    label: 'Flag concern',
    color: '#C53D2F',
    placeholder: 'What is the concern? (e.g. troponin timing unclear)',
  },
  context: {
    icon: '📎',
    label: 'Add context',
    color: '#3B7DD8',
    placeholder: 'Additional clinical information...',
  },
  challenge: {
    icon: '⚡',
    label: 'Challenge reasoning',
    color: '#D4950A',
    placeholder: 'What do you disagree with?',
  },
  pin: {
    icon: '★',
    label: 'Pin',
    color: '#1A52A8',
    placeholder: '',
  },
}

interface Props {
  annotationType: DoctorAnnotationType
  onSubmit: (content: string) => void
  onCancel: () => void
}

export default function AnnotationInput({ annotationType, onSubmit, onCancel }: Props) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const cfg = TYPE_CONFIG[annotationType]

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && value.trim()) {
      onSubmit(value.trim())
    } else if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div
      style={{
        marginTop: 4,
        marginLeft: 14,
        padding: '8px 10px',
        background: `${cfg.color}08`,
        borderRadius: 8,
        border: `1px solid ${cfg.color}28`,
        borderLeft: `2.5px solid ${cfg.color}70`,
      }}
      onClick={e => e.stopPropagation()}
    >
      <div
        style={{
          fontSize: 8.5,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: cfg.color,
          marginBottom: 5,
        }}
      >
        {cfg.icon} {cfg.label}
      </div>
      <input
        ref={inputRef}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={cfg.placeholder}
        style={{
          width: '100%',
          fontSize: 11.5,
          padding: '5px 8px',
          borderRadius: 6,
          border: `1px solid ${cfg.color}30`,
          background: 'rgba(255,255,255,0.9)',
          color: '#111',
          outline: 'none',
          boxSizing: 'border-box',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      />
      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        <button
          onClick={() => value.trim() && onSubmit(value.trim())}
          disabled={!value.trim()}
          style={{
            fontSize: 10,
            fontWeight: 600,
            padding: '3px 10px',
            borderRadius: 5,
            background: value.trim() ? cfg.color : 'rgba(0,0,0,0.08)',
            color: value.trim() ? '#fff' : 'rgba(0,0,0,0.3)',
            border: 'none',
            cursor: value.trim() ? 'pointer' : 'default',
            transition: 'all 120ms',
          }}
        >
          Save
        </button>
        <button
          onClick={onCancel}
          style={{
            fontSize: 10,
            fontWeight: 500,
            padding: '3px 8px',
            borderRadius: 5,
            background: 'transparent',
            color: 'rgba(0,0,0,0.4)',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
