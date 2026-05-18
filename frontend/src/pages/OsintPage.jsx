import { useState } from 'react'
import { useStore } from '../store'
import { runOsint } from '../utils/api'

const MODULES = [
  { id: 'whois', name: 'WHOIS', icon: '📋', desc: 'Domain registration info', param: 'domain', placeholder: 'example.com' },
  { id: 'dns', name: 'DNS Lookup', icon: '🌐', desc: 'DNS records (A, MX, NS, TXT)', param: 'domain', placeholder: 'example.com' },
  { id: 'subdomains', name: 'Subdomain Enum', icon: '🔱', desc: 'Find subdomains', param: 'domain', placeholder: 'example.com' },
  { id: 'cert_transparency', name: 'Cert Transparency', icon: '🔐', desc: 'SSL cert history', param: 'domain', placeholder: 'example.com' },
  { id: 'shodan', name: 'Shodan Lookup', icon: '👁', desc: 'Internet-wide scan data', param: 'ip', placeholder: '1.2.3.4' },
  { id: 'reverse_ip', name: 'Reverse IP', icon: '↩', desc: 'Domains sharing an IP', param: 'ip', placeholder: '1.2.3.4' },
  { id: 'email_hunt', name: 'Email Hunter', icon: '📧', desc: 'Find emails for domain', param: 'domain', placeholder: 'example.com' },
  { id: 'tech_stack', name: 'Tech Stack', icon: '⚙', desc: 'Identify web technologies', param: 'url', placeholder: 'https://example.com' },
  { id: 'google_dorks', name: 'Google Dorks', icon: '🔎', desc: 'Auto-generate dorks', param: 'domain', placeholder: 'example.com' },
  { id: 'headers', name: 'HTTP Headers', icon: '📡', desc: 'Analyze response headers', param: 'url', placeholder: 'https://example.com' },
  { id: 'robots', name: 'Robots & Sitemap', icon: '🤖', desc: 'robots.txt & sitemap.xml', param: 'url', placeholder: 'https://example.com' },
  { id: 'breach_check', name: 'Breach Check', icon: '💀', desc: 'Check for data breaches', param: 'email', placeholder: 'user@example.com' },
]

export default function OsintPage() {
  const { activeTarget, addNotification } = useStore()
  const [activeModule, setActiveModule] = useState(null)
  const [input, setInput] = useState('')
  const [results, setResults] = useState({})
  const [loading, setLoading] = useState(false)
  const [activeResult, setActiveResult] = useState(null)

  const selectModule = (mod) => {
    setActiveModule(mod)
    if (activeTarget) {
      const val = mod.param === 'domain' ? activeTarget.domain :
                  mod.param === 'ip' ? activeTarget.ip :
                  mod.param === 'url' ? `https://${activeTarget.domain}` : ''
      setInput(val || '')
    }
  }

  const runModule = async () => {
    if (!activeModule || !input) return
    setLoading(true)
    const key = `${activeModule.id}_${input}`
    try {
      const r = await runOsint({ module: activeModule.id, [activeModule.param]: input, target_id: activeTarget?.id })
      setResults(prev => ({ ...prev, [key]: r.data }))
      setActiveResult(key)
      addNotification({ type: 'success', title: activeModule.name, message: 'OSINT complete' })
    } catch (e) {
      setResults(prev => ({ ...prev, [key]: { error: e.response?.data?.detail || e.message } }))
      setActiveResult(key)
      addNotification({ type: 'error', title: 'OSINT Error', message: e.response?.data?.detail || e.message })
    }
    setLoading(false)
  }

  const current = activeResult ? results[activeResult] : null

  return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden' }}>
      {/* Module grid */}
      <div style={{
        width: 260,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        overflow: 'auto',
        padding: 12,
        flexShrink: 0
      }}>
        <div style={{ color: 'var(--accent-green)', fontSize: 12, fontWeight: 700, letterSpacing: 3, marginBottom: 12, padding: '0 4px' }}>OSINT</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {MODULES.map(mod => (
            <button
              key={mod.id}
              onClick={() => selectModule(mod)}
              style={{
                background: activeModule?.id === mod.id ? 'rgba(0,255,157,0.12)' : 'var(--bg-card)',
                border: `1px solid ${activeModule?.id === mod.id ? 'var(--accent-green)' : 'var(--border)'}`,
                padding: '8px 6px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex', flexDirection: 'column', gap: 3,
                transition: 'all 0.15s',
                fontFamily: 'inherit'
              }}
              onMouseEnter={e => { if (activeModule?.id !== mod.id) e.currentTarget.style.borderColor = 'var(--accent-green)44' }}
              onMouseLeave={e => { if (activeModule?.id !== mod.id) e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <span style={{ fontSize: 16 }}>{mod.icon}</span>
              <span style={{ color: 'var(--text-primary)', fontSize: 10, fontWeight: 600 }}>{mod.name}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 9 }}>{mod.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Input bar */}
        <div style={{ padding: 16, borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          {activeModule ? (
            <>
              <span style={{ fontSize: 20 }}>{activeModule.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: 'var(--accent-green)', fontSize: 11, marginBottom: 4 }}>{activeModule.name} — {activeModule.desc}</div>
                <input
                  className="cyber-input"
                  placeholder={activeModule.placeholder}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && runModule()}
                  style={{ flex: 1 }}
                />
              </div>
              <button className="cyber-btn-green cyber-btn" onClick={runModule} disabled={loading || !input}>
                {loading ? 'SCANNING...' : 'RUN'}
              </button>
            </>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Select an OSINT module from the left</div>
          )}
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {!current && !loading && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 60 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🌐</div>
              <div>Run an OSINT module to see results here</div>
            </div>
          )}
          {loading && (
            <div style={{ textAlign: 'center', color: 'var(--accent-green)', marginTop: 60 }}>
              <div className="pulse" style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <div>Gathering intelligence...</div>
            </div>
          )}
          {current && !loading && (
            <div className="fade-in">
              {current.error ? (
                <div style={{ color: 'var(--accent-red)', padding: 16, border: '1px solid var(--accent-red)', background: 'rgba(255,51,102,0.08)' }}>
                  ⚠ {current.error}
                </div>
              ) : (
                <OsintResult data={current} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function OsintResult({ data }) {
  if (typeof data === 'string') {
    return <pre className="terminal-text" style={{ whiteSpace: 'pre-wrap' }}>{data}</pre>
  }
  if (data.raw) {
    return (
      <div>
        {data.summary && (
          <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            {Object.entries(data.summary).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <span style={{ color: 'var(--text-muted)', fontSize: 11, minWidth: 120, textTransform: 'uppercase' }}>{k}:</span>
                <span style={{ color: 'var(--text-primary)', fontSize: 11 }}>{String(v)}</span>
              </div>
            ))}
          </div>
        )}
        <pre className="terminal-text" style={{ whiteSpace: 'pre-wrap', fontSize: 11 }}>{data.raw}</pre>
      </div>
    )
  }
  return (
    <pre style={{ color: 'var(--accent-green)', fontSize: 11, whiteSpace: 'pre-wrap' }}>
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}
