import { useState, useEffect, useRef } from 'react'
import { useStore } from '../store'

const platform = typeof window !== 'undefined' ? (window.electronAPI?.platform ?? '') : ''
const isMac = platform !== 'win32' && platform !== 'linux'
const KBD = isMac ? '⌘K' : 'Ctrl+K'

const COMMANDS = [
  // Navigation
  { id: 'warroom',   label: 'War Room',       desc: 'Command center overview',     icon: '⚡', type: 'nav',    view: 'warroom' },
  { id: 'targets',   label: 'Targets',        desc: 'Manage engagement targets',   icon: '🎯', type: 'nav',    view: 'targets' },
  { id: 'ai',        label: 'AI Agents',      desc: 'Talk to AI — execute tools',  icon: '🧠', type: 'nav',    view: 'ai' },
  { id: 'tools',     label: 'Tools',          desc: 'Run nmap, gobuster, ffuf…',   icon: '⚙',  type: 'nav',    view: 'tools' },
  { id: 'osint',     label: 'OSINT',          desc: 'Open-source intelligence',    icon: '🌐', type: 'nav',    view: 'osint' },
  { id: 'findings',  label: 'Findings',       desc: 'Vulnerability tracker',       icon: '🔍', type: 'nav',    view: 'findings' },
  { id: 'graph',     label: 'Attack Graph',   desc: 'Visual network map',          icon: '🕸',  type: 'nav',    view: 'graph' },
  { id: 'reports',   label: 'Reports',        desc: 'Generate PDF report',         icon: '📄', type: 'nav',    view: 'reports' },
  { id: 'ctf',       label: 'CTF Mode',       desc: 'Capture The Flag solver',     icon: '🏴', type: 'nav',    view: 'ctf' },
  { id: 'docker',    label: 'Kali Linux',     desc: 'Docker container manager',    icon: '🐉', type: 'nav',    view: 'docker' },
  { id: 'flipper',   label: 'Flipper Zero',   desc: 'Hardware hacking device',     icon: '🐬', type: 'nav',    view: 'flipper' },
  { id: 'network',   label: 'Network Map',    desc: 'Live host discovery',         icon: '📡', type: 'nav',    view: 'network' },
  { id: 'utilities', label: 'Utilities',      desc: 'Encoders, hashes, wordlists', icon: '🔧', type: 'nav',    view: 'utilities' },
  { id: 'settings',  label: 'Settings',       desc: 'API keys, models, config',   icon: '⚙',  type: 'nav',    view: 'settings' },
  // Quick actions
  { id: 'ai-recon',   label: 'Run RECON agent',   desc: 'Autonomous recon on active target', icon: '🔭', type: 'action', view: 'ai', agent: 'recon' },
  { id: 'ai-osint',   label: 'Run OSINT agent',   desc: 'Full OSINT research on target',     icon: '🌐', type: 'action', view: 'ai', agent: 'osint' },
  { id: 'ai-autopwn', label: 'Run AUTOPWN agent', desc: 'Autonomous exploit chain',          icon: '🤖', type: 'action', view: 'ai', agent: 'autopwn' },
  { id: 'ai-ctf',     label: 'Run CTF agent',     desc: 'CTF challenge solver',              icon: '🏴', type: 'action', view: 'ai', agent: 'ctf' },
]

export default function CommandPalette() {
  const { activeView, setActiveView, setSelectedAgent } = useStore()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
        setQuery('')
        setSelected(0)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const filtered = query.trim()
    ? COMMANDS.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.desc.toLowerCase().includes(query.toLowerCase())
      )
    : COMMANDS

  const execute = (cmd) => {
    if (cmd.agent) setSelectedAgent(cmd.agent)
    setActiveView(cmd.view)
    setOpen(false)
    setQuery('')
  }

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && filtered[selected]) execute(filtered[selected])
  }

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        zIndex: 10000, display: 'flex', alignItems: 'flex-start',
        justifyContent: 'center', paddingTop: '15vh', backdropFilter: 'blur(4px)'
      }}
      onClick={() => setOpen(false)}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 560,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--accent-cyan)44',
          boxShadow: '0 0 60px rgba(0,245,255,0.15), 0 32px 80px rgba(0,0,0,0.8)',
        }}
        className="fade-in"
      >
        {/* Search input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--accent-cyan)', fontSize: 16 }}>{isMac ? '⌘' : '⌃'}</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0) }}
            onKeyDown={handleKey}
            placeholder="Search commands, pages, agents..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 14,
            }}
          />
          <kbd style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '2px 6px', fontSize: 10, color: 'var(--text-muted)', borderRadius: 3 }}>ESC</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 400, overflow: 'auto' }}>
          {filtered.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
              No commands found
            </div>
          )}
          {!query && (
            <div style={{ padding: '8px 16px 4px', color: 'var(--text-muted)', fontSize: 10, letterSpacing: 2 }}>
              NAVIGATION
            </div>
          )}
          {filtered.map((cmd, i) => (
            <div
              key={cmd.id}
              onClick={() => execute(cmd)}
              onMouseEnter={() => setSelected(i)}
              style={{
                padding: '10px 16px',
                background: selected === i ? 'var(--accent-cyan)12' : 'transparent',
                borderLeft: `2px solid ${selected === i ? 'var(--accent-cyan)' : 'transparent'}`,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                transition: 'all 0.1s',
              }}
            >
              <span style={{ fontSize: 18, width: 24, textAlign: 'center' }}>{cmd.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: selected === i ? 'var(--accent-cyan)' : 'var(--text-primary)', fontSize: 13 }}>
                  {cmd.label}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{cmd.desc}</div>
              </div>
              {cmd.type === 'action' && (
                <span style={{ fontSize: 10, color: 'var(--accent-orange)', border: '1px solid var(--accent-orange)44', padding: '2px 6px' }}>ACTION</span>
              )}
              {activeView === cmd.view && cmd.type === 'nav' && (
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>current</span>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 16, color: 'var(--text-muted)', fontSize: 10 }}>
          <span><kbd style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '1px 5px', borderRadius: 2, marginRight: 4 }}>↑↓</kbd>navigate</span>
          <span><kbd style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '1px 5px', borderRadius: 2, marginRight: 4 }}>↵</kbd>select</span>
          <span><kbd style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '1px 5px', borderRadius: 2, marginRight: 4 }}>{KBD}</kbd>toggle</span>
        </div>
      </div>
    </div>
  )
}
