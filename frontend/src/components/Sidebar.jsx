import { useStore } from '../store'

const NAV = [
  { id: 'warroom',   icon: '⚡', label: 'War Room',    color: 'var(--accent-cyan)' },
  { id: 'targets',   icon: '🎯', label: 'Targets',      color: 'var(--accent-orange)' },
  { id: 'ai',        icon: '🧠', label: 'AI Agents',    color: 'var(--accent-purple)' },
  { id: 'tools',     icon: '⚙',  label: 'Tools',        color: 'var(--accent-cyan)' },
  { id: 'osint',     icon: '🌐', label: 'OSINT',        color: 'var(--accent-green)' },
  { id: 'findings',  icon: '🔍', label: 'Findings',     color: 'var(--accent-red)' },
  { id: 'graph',     icon: '🕸',  label: 'Graph',        color: 'var(--accent-orange)' },
  { id: 'reports',   icon: '📄', label: 'Reports',      color: 'var(--accent-yellow)' },
  { id: 'ctf',       icon: '🏴', label: 'CTF Mode',     color: '#ffd700' },
  { id: 'docker',    icon: '🐉', label: 'Kali Linux',   color: '#7c3aed' },
  { id: 'flipper',   icon: '🐬', label: 'Flipper Zero', color: 'var(--accent-cyan)' },
  { id: 'network',   icon: '📡', label: 'Network',      color: 'var(--accent-green)' },
  { id: 'utilities', icon: '🔧', label: 'Utilities',    color: 'var(--accent-orange)' },
]

const BOTTOM = [
  { id: 'settings', icon: '⚙', label: 'Settings', color: 'var(--text-muted)' },
]

export default function Sidebar() {
  const { activeView, setActiveView, findings } = useStore()
  const criticalCount = findings.filter(f => f.severity === 'critical' || f.severity === 'high').length

  return (
    <div style={{
      width: 52,
      background: 'var(--bg-secondary)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '6px 0',
      gap: 1,
      flexShrink: 0,
      zIndex: 50,
      overflow: 'hidden',
    }}>
      {NAV.map(item => (
        <NavItem
          key={item.id}
          item={item}
          active={activeView === item.id}
          onClick={() => setActiveView(item.id)}
          badge={item.id === 'findings' && criticalCount > 0 ? criticalCount : null}
        />
      ))}
      <div style={{ flex: 1 }} />
      <div style={{ width: '100%', height: 1, background: 'var(--border)', margin: '4px 0' }} />
      {BOTTOM.map(item => (
        <NavItem
          key={item.id}
          item={item}
          active={activeView === item.id}
          onClick={() => setActiveView(item.id)}
        />
      ))}
      {/* Version */}
      <div style={{ color: 'var(--text-muted)', fontSize: 8, letterSpacing: 1, padding: '6px 0', textAlign: 'center', opacity: 0.5 }}>
        v1.0
      </div>
    </div>
  )
}

function NavItem({ item, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      title={item.label}
      style={{
        width: 44,
        height: 40,
        background: active ? `${item.color}18` : 'transparent',
        border: `1px solid ${active ? item.color + '55' : 'transparent'}`,
        borderRadius: 3,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        position: 'relative',
        transition: 'all 0.15s',
        boxShadow: active ? `0 0 8px ${item.color}22` : 'none',
        flexShrink: 0,
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
          e.currentTarget.style.borderColor = item.color + '33'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.borderColor = 'transparent'
        }
      }}
    >
      <span style={{ fontSize: 15, lineHeight: 1 }}>{item.icon}</span>
      <span style={{
        fontSize: 7,
        color: active ? item.color : 'var(--text-muted)',
        letterSpacing: 0.3,
        textTransform: 'uppercase',
        lineHeight: 1,
        maxWidth: 40,
        textAlign: 'center',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        display: 'block',
      }}>
        {item.label}
      </span>
      {badge && (
        <div style={{
          position: 'absolute', top: 2, right: 2,
          background: 'var(--accent-red)', color: 'white',
          fontSize: 7, width: 13, height: 13,
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700,
        }}>
          {badge > 9 ? '9+' : badge}
        </div>
      )}
    </button>
  )
}
