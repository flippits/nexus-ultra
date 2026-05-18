import { useStore } from '../store'
import { useState, useEffect, useRef } from 'react'
import { getTargets } from '../utils/api'

const platform = typeof window !== 'undefined' ? (window.electronAPI?.platform ?? '') : ''
const isMac = platform !== 'win32' && platform !== 'linux'

export default function TopBar() {
  const { backendOnline, activeTarget, setActiveTarget, targets, setTargets } = useStore()
  const [time, setTime] = useState(new Date())
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef(null)

  useEffect(() => {
    const iv = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(iv)
  }, [])

  // Load targets for the picker if not yet loaded
  useEffect(() => {
    if (targets.length === 0) {
      getTargets().then(r => setTargets(r.data)).catch(() => {})
    }
  }, [])

  // Close picker on outside click
  useEffect(() => {
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div style={{
      height: 42,
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      WebkitAppRegion: 'drag',
      flexShrink: 0,
      zIndex: 100,
      gap: 12,
    }}>
      {/* Left: Logo + status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, WebkitAppRegion: 'no-drag' }}>
        <span style={{ color: 'var(--accent-cyan)', fontWeight: 900, fontSize: 14, letterSpacing: 3 }}>NEXUS</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: 2 }}>ULTRA</span>
        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
        <StatusDot online={backendOnline} label="ENGINE" />
      </div>

      {/* Center: Target Selector — always visible */}
      <div ref={pickerRef} style={{ position: 'relative', WebkitAppRegion: 'no-drag', flex: 1, maxWidth: 340 }}>
        <button
          onClick={() => setShowPicker(!showPicker)}
          style={{
            width: '100%',
            background: activeTarget ? 'var(--accent-orange)11' : 'var(--bg-card)',
            border: `1px solid ${activeTarget ? 'var(--accent-orange)88' : 'var(--border)'}`,
            color: activeTarget ? 'var(--accent-orange)' : 'var(--text-muted)',
            padding: '5px 12px',
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: 11,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            letterSpacing: 0.5,
          }}
        >
          <span style={{ fontSize: 13 }}>🎯</span>
          <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {activeTarget
              ? `${activeTarget.name}${activeTarget.ip ? '  (' + activeTarget.ip + ')' : ''}${activeTarget.domain ? '  ' + activeTarget.domain : ''}`
              : 'Click to select target...'
            }
          </span>
          <span style={{ fontSize: 9, opacity: 0.6 }}>{showPicker ? '▲' : '▼'}</span>
        </button>

        {showPicker && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 2,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            zIndex: 999,
            maxHeight: 260,
            overflow: 'auto',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}>
            {/* Clear option */}
            {activeTarget && (
              <div
                onClick={() => { setActiveTarget(null); setShowPicker(false) }}
                style={{ padding: '8px 14px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 11, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span>✕</span> <span>Clear active target</span>
              </div>
            )}
            {targets.length === 0 && (
              <div style={{ padding: '12px 14px', color: 'var(--text-muted)', fontSize: 11 }}>
                No targets yet — add one in Targets
              </div>
            )}
            {targets.map(t => {
              const isActive = activeTarget?.id === t.id
              return (
                <div
                  key={t.id}
                  onClick={() => { setActiveTarget(t); setShowPicker(false) }}
                  style={{
                    padding: '8px 14px',
                    cursor: 'pointer',
                    background: isActive ? 'var(--accent-orange)15' : 'transparent',
                    borderLeft: `3px solid ${isActive ? 'var(--accent-orange)' : 'transparent'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: t.status === 'active' ? 'var(--accent-green)' : 'var(--text-muted)', flexShrink: 0 }} />
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ color: isActive ? 'var(--accent-orange)' : 'var(--text-primary)', fontSize: 12, fontWeight: isActive ? 700 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.name}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>
                      {[t.ip, t.domain].filter(Boolean).join('  ·  ') || t.type}
                    </div>
                  </div>
                  {isActive && <span style={{ color: 'var(--accent-orange)', fontSize: 10 }}>ACTIVE</span>}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Right: date + clock + shortcut hint */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, WebkitAppRegion: 'no-drag' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: 1 }}>
          {time.toLocaleDateString([], { month: 'short', day: 'numeric' })}
        </span>
        <span style={{ color: 'var(--text-secondary)', fontSize: 11, fontFamily: 'monospace', letterSpacing: 1 }}>
          {time.toLocaleTimeString()}
        </span>
        <div style={{ width: 1, height: 16, background: 'var(--border)' }} />
        <kbd
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: isMac, ctrlKey: !isMac, bubbles: true }))}
          style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            padding: '2px 8px', fontSize: 10, color: 'var(--text-muted)',
            borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 1
          }}
          title="Open command palette"
        >
          {isMac ? '⌘K' : 'Ctrl+K'}
        </kbd>
      </div>
    </div>
  )
}

function StatusDot({ online, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      <div style={{
        width: 6, height: 6, borderRadius: '50%',
        background: online ? 'var(--accent-green)' : 'var(--accent-red)',
        boxShadow: online ? '0 0 6px var(--accent-green)' : '0 0 6px var(--accent-red)',
      }} className={online ? 'pulse' : ''} />
      <span style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: 1 }}>{label}</span>
    </div>
  )
}
