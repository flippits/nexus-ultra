import { useEffect, useState, useRef } from 'react'
import { useStore } from '../store'
import { getTargets, getFindings, healthCheck } from '../utils/api'

const SEV_COLOR = { critical: '#ff0040', high: '#ff3366', medium: '#ff6b35', low: '#ffd700', info: '#00f5ff' }

export default function WarRoom() {
  const { targets, setTargets, findings, setFindings, backendOnline, setActiveView, setActiveTarget } = useStore()
  const [stats, setStats] = useState({ targets: 0, findings: 0, critical: 0, high: 0, medium: 0, low: 0 })
  const [sessionTime, setSessionTime] = useState(0)
  const [systemHealth, setSystemHealth] = useState({ backend: false, groq: false, ollama: false })
  const sessionStart = useRef(Date.now())

  // Session timer
  useEffect(() => {
    const iv = setInterval(() => setSessionTime(Math.floor((Date.now() - sessionStart.current) / 1000)), 1000)
    return () => clearInterval(iv)
  }, [])

  // Data + health polling
  useEffect(() => {
    const load = async () => {
      try {
        const [tr, fr] = await Promise.all([getTargets(), getFindings(null)])
        setTargets(tr.data)
        setFindings(fr.data)
        setStats({
          targets: tr.data.length,
          findings: fr.data.length,
          critical: fr.data.filter(f => f.severity === 'critical').length,
          high:     fr.data.filter(f => f.severity === 'high').length,
          medium:   fr.data.filter(f => f.severity === 'medium').length,
          low:      fr.data.filter(f => f.severity === 'low').length,
        })
      } catch {}

      // Check system health
      const cfg = JSON.parse(localStorage.getItem('nexus_config') || '{}')
      const hasGroq = !!(cfg.groqKey || cfg.geminiKey)
      let ollamaOk = false
      try {
        const r = await fetch('http://localhost:11434/api/tags', { signal: AbortSignal.timeout(2000) })
        ollamaOk = r.ok
      } catch {}
      setSystemHealth({ backend: backendOnline, groq: hasGroq, ollama: ollamaOk })
    }
    load()
    const iv = setInterval(load, 10000)
    return () => clearInterval(iv)
  }, [backendOnline])

  const formatTime = (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
    return h > 0
      ? `${h}h ${String(m).padStart(2,'0')}m`
      : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  }

  const recentFindings  = [...findings].sort((a,b) => new Date(b.created_at)-new Date(a.created_at)).slice(0, 8)
  const criticalFindings = findings.filter(f => f.severity === 'critical' || f.severity === 'high').slice(0, 5)
  const totalSevere = stats.critical + stats.high

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ color: 'var(--accent-cyan)', fontSize: 20, fontWeight: 900, letterSpacing: 4, textShadow: '0 0 20px rgba(0,245,255,0.4)' }}>
            WAR ROOM
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: 3, marginTop: 2 }}>
            NEXUS ULTRA · COMMAND CENTER
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Session timer */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '6px 14px', textAlign: 'center' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 9, letterSpacing: 2, marginBottom: 2 }}>SESSION</div>
            <div style={{ color: 'var(--accent-green)', fontSize: 14, fontWeight: 700, fontFamily: 'monospace' }}>
              {formatTime(sessionTime)}
            </div>
          </div>
          <button className="cyber-btn" onClick={() => setActiveView('targets')}>+ NEW TARGET</button>
        </div>
      </div>

      {/* System health bar */}
      <div style={{ display: 'flex', gap: 8, padding: '8px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', flexShrink: 0 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: 2, marginRight: 4 }}>SYSTEM:</span>
        {[
          { label: 'BACKEND',     ok: systemHealth.backend },
          { label: 'GROQ / GEMINI', ok: systemHealth.groq },
          { label: 'OLLAMA',      ok: systemHealth.ollama },
        ].map(s => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5, marginRight: 10 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: s.ok ? 'var(--accent-green)' : 'var(--accent-red)',
              boxShadow: s.ok ? '0 0 6px var(--accent-green)' : 'none',
            }} className={s.ok ? 'pulse' : ''} />
            <span style={{ color: s.ok ? 'var(--text-secondary)' : 'var(--text-muted)', fontSize: 10 }}>{s.label}</span>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: 1 }}>
          Press <kbd style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '1px 5px', borderRadius: 2, fontSize: 9 }}>⌘K</kbd> for command palette
        </span>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, flexShrink: 0 }}>
        <StatCard label="TARGETS"  value={stats.targets}   color="var(--accent-cyan)"   icon="🎯" onClick={() => setActiveView('targets')} />
        <StatCard label="FINDINGS" value={stats.findings}  color="var(--accent-orange)" icon="🔍" onClick={() => setActiveView('findings')} />
        <StatCard label="CRITICAL" value={stats.critical}  color="#ff0040"              icon="💀" onClick={() => setActiveView('findings')} pulse={stats.critical > 0} />
        <StatCard label="HIGH"     value={stats.high}      color="var(--accent-red)"    icon="⚠"  onClick={() => setActiveView('findings')} />
        <StatCard label="AI READY" value={systemHealth.groq || systemHealth.ollama ? 'YES' : 'NO'}
          color={systemHealth.groq || systemHealth.ollama ? 'var(--accent-green)' : 'var(--accent-red)'}
          icon="🧠" onClick={() => setActiveView('ai')} />
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, flex: 1, minHeight: 0 }}>

        {/* Active Targets */}
        <div className="cyber-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexShrink: 0 }}>
            <div style={{ color: 'var(--accent-cyan)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>Active Targets</div>
            <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{targets.length} total</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {targets.length === 0 ? (
              <EmptyState text="No targets yet." action={() => setActiveView('targets')} actionLabel="Add Target" />
            ) : (
              targets.slice(0, 8).map(t => (
                <TargetRow key={t.id} target={t} onClick={() => { setActiveTarget(t); setActiveView('graph') }} />
              ))
            )}
          </div>
        </div>

        {/* Severity breakdown + critical findings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Severity bars */}
          {stats.findings > 0 && (
            <div className="cyber-card" style={{ padding: 14, flexShrink: 0 }}>
              <div style={{ color: 'var(--accent-orange)', fontSize: 11, letterSpacing: 2, marginBottom: 10 }}>SEVERITY BREAKDOWN</div>
              {[
                { label: 'CRITICAL', count: stats.critical, color: '#ff0040' },
                { label: 'HIGH',     count: stats.high,     color: '#ff3366' },
                { label: 'MEDIUM',   count: stats.medium,   color: '#ff6b35' },
                { label: 'LOW',      count: stats.low,      color: '#ffd700' },
              ].filter(s => s.count > 0).map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ color: s.color, fontSize: 10, width: 56 }}>{s.label}</span>
                  <div style={{ flex: 1, height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      width: `${(s.count / stats.findings) * 100}%`, height: '100%',
                      background: s.color, boxShadow: `0 0 6px ${s.color}88`, transition: 'width 0.6s ease'
                    }} />
                  </div>
                  <span style={{ color: s.color, fontSize: 11, fontWeight: 700, width: 20, textAlign: 'right' }}>{s.count}</span>
                </div>
              ))}
            </div>
          )}

          {/* Critical findings */}
          <div className="cyber-card" style={{ padding: 16, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexShrink: 0 }}>
              <div style={{ color: 'var(--accent-red)', fontSize: 11, letterSpacing: 2 }}>CRITICAL / HIGH</div>
              {totalSevere > 0 && <span style={{ color: 'var(--accent-red)', fontSize: 10 }}>{totalSevere} alerts</span>}
            </div>
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {criticalFindings.length === 0 ? (
                <EmptyState text="No critical findings. Good posture." />
              ) : (
                criticalFindings.map(f => (
                  <FindingRow key={f.id} finding={f} onClick={() => setActiveView('findings')} />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Launch */}
        <div className="cyber-card" style={{ padding: 16 }}>
          <div style={{ color: 'var(--accent-green)', fontSize: 11, letterSpacing: 2, marginBottom: 12 }}>QUICK LAUNCH</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {QUICK_ACTIONS.map(a => (
              <QuickBtn key={a.label} {...a} onClick={() => setActiveView(a.view)} />
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="cyber-card" style={{ padding: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ color: 'var(--accent-purple)', fontSize: 11, letterSpacing: 2, marginBottom: 10, flexShrink: 0 }}>RECENT ACTIVITY</div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {recentFindings.length === 0 ? (
              <EmptyState text="Activity will appear as you run scans and find vulnerabilities." />
            ) : (
              recentFindings.map(f => (
                <div key={f.id} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                  <div style={{ color: SEV_COLOR[f.severity] || 'var(--text-muted)', fontSize: 8, marginTop: 3, flexShrink: 0 }}>◆</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ color: SEV_COLOR[f.severity], fontSize: 10, textTransform: 'uppercase' }}>[{f.severity}]</span>
                    {' '}
                    <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{f.title}</span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 10, flexShrink: 0 }}>
                    {new Date(f.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, color, icon, onClick, pulse }) {
  return (
    <div
      className="cyber-card"
      onClick={onClick}
      style={{ padding: '14px 12px', cursor: 'pointer', transition: 'all 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.borderColor = color }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.borderColor = 'var(--border)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 9, letterSpacing: 1 }}>{label}</span>
      </div>
      <div style={{
        fontSize: typeof value === 'string' ? 16 : 28,
        fontWeight: 900, color,
        textShadow: `0 0 16px ${color}55`,
      }} className={pulse ? 'pulse' : ''}>
        {value}
      </div>
    </div>
  )
}

function TargetRow({ target, onClick }) {
  const statusColor = { active: 'var(--accent-green)', idle: 'var(--text-muted)', completed: 'var(--accent-cyan)' }
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '7px 10px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        cursor: 'pointer', transition: 'all 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-cyan)'; e.currentTarget.style.background = 'var(--bg-hover)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-secondary)' }}
    >
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor[target.status] || 'var(--text-muted)', flexShrink: 0 }}
        className={target.status === 'active' ? 'pulse' : ''} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: 'var(--text-primary)', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{target.name}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>{target.ip || target.domain || target.type || 'No address'}</div>
      </div>
      <span style={{ color: 'var(--accent-cyan)', fontSize: 12 }}>→</span>
    </div>
  )
}

function FindingRow({ finding, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '7px 10px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${SEV_COLOR[finding.severity] || 'var(--border)'}`,
        cursor: 'pointer',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ color: 'var(--text-primary)', fontSize: 12, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{finding.title}</span>
        <span style={{ color: SEV_COLOR[finding.severity], fontSize: 9, textTransform: 'uppercase', flexShrink: 0 }}>{finding.severity}</span>
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 2 }}>{finding.target_name || 'Unknown target'}</div>
    </div>
  )
}

function QuickBtn({ icon, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--bg-secondary)', border: `1px solid ${color}33`,
        color, padding: '10px 6px', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        transition: 'all 0.15s', fontFamily: 'inherit', width: '100%',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = `${color}15`; e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 0 12px ${color}33` }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.borderColor = `${color}33`; e.currentTarget.style.boxShadow = 'none' }}
    >
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</span>
    </button>
  )
}

function EmptyState({ text, action, actionLabel }) {
  return (
    <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '20px 0', textAlign: 'center', lineHeight: 1.6 }}>
      {text}
      {action && (
        <div style={{ marginTop: 10 }}>
          <button className="cyber-btn" style={{ fontSize: 10 }} onClick={action}>{actionLabel || 'Get Started'}</button>
        </div>
      )}
    </div>
  )
}

const QUICK_ACTIONS = [
  { icon: '🧠', label: 'AI',     color: 'var(--accent-purple)', view: 'ai' },
  { icon: '🔭', label: 'Recon',  color: 'var(--accent-cyan)',   view: 'tools' },
  { icon: '🌐', label: 'OSINT',  color: 'var(--accent-green)',  view: 'osint' },
  { icon: '🕸',  label: 'Graph',  color: 'var(--accent-orange)', view: 'graph' },
  { icon: '💥', label: 'Exploit',color: 'var(--accent-red)',    view: 'ai' },
  { icon: '🏴', label: 'CTF',    color: '#ffd700',             view: 'ctf' },
  { icon: '📄', label: 'Report', color: 'var(--accent-yellow)', view: 'reports' },
  { icon: '🐉', label: 'Kali',   color: '#7c3aed',             view: 'docker' },
]
