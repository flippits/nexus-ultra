import { useState, useRef, useEffect } from 'react'
import { useStore } from '../store'
import { runTool, getScans } from '../utils/api'

const TOOLS = [
  {
    category: 'RECON',
    color: 'var(--accent-cyan)',
    tools: [
      { id: 'nmap', name: 'Nmap', desc: 'Network scanner', icon: '🔍',
        params: [
          { key: 'target', label: 'Target', placeholder: '192.168.1.1 or 10.0.0.0/24', required: true },
          { key: 'flags', label: 'Flags', placeholder: '-sV -sC -O -p- --script vuln', default: '-sV -sC -T4' },
        ]
      },
      { id: 'masscan', name: 'Masscan', desc: 'Fast port scanner', icon: '⚡',
        params: [
          { key: 'target', label: 'Target', placeholder: '10.0.0.0/24', required: true },
          { key: 'rate', label: 'Rate', placeholder: '1000', default: '1000' },
          { key: 'ports', label: 'Ports', placeholder: '0-65535', default: '0-65535' },
        ]
      },
      { id: 'nikto', name: 'Nikto', desc: 'Web vulnerability scanner', icon: '🌐',
        params: [
          { key: 'target', label: 'Target URL', placeholder: 'http://192.168.1.1', required: true },
        ]
      },
    ]
  },
  {
    category: 'EXPLOITATION',
    color: 'var(--accent-red)',
    tools: [
      { id: 'metasploit', name: 'Metasploit', desc: 'Exploitation framework', icon: '💥',
        params: [
          { key: 'command', label: 'msfconsole command', placeholder: 'use exploit/multi/handler', required: true },
        ]
      },
      { id: 'searchsploit', name: 'SearchSploit', desc: 'ExploitDB search', icon: '🔎',
        params: [
          { key: 'query', label: 'Search query', placeholder: 'apache 2.4.49', required: true },
        ]
      },
    ]
  },
  {
    category: 'FUZZING',
    color: 'var(--accent-orange)',
    tools: [
      { id: 'gobuster', name: 'Gobuster', desc: 'Directory fuzzer', icon: '📂',
        params: [
          { key: 'url', label: 'URL', placeholder: 'http://target.com', required: true },
          { key: 'wordlist', label: 'Wordlist', placeholder: '~/nexus-ultra/data/wordlists/common.txt', default: '~/nexus-ultra/data/wordlists/common.txt' },
          { key: 'threads', label: 'Threads', placeholder: '50', default: '50' },
        ]
      },
      { id: 'ffuf', name: 'FFuf', desc: 'Web fuzzer', icon: '⚡',
        params: [
          { key: 'url', label: 'URL (use FUZZ)', placeholder: 'http://target.com/FUZZ', required: true },
          { key: 'wordlist', label: 'Wordlist', placeholder: '~/nexus-ultra/data/wordlists/common.txt', default: '~/nexus-ultra/data/wordlists/common.txt' },
        ]
      },
      { id: 'hydra', name: 'Hydra', desc: 'Brute force login', icon: '🔑',
        params: [
          { key: 'target', label: 'Target', placeholder: '192.168.1.1', required: true },
          { key: 'service', label: 'Service', placeholder: 'ssh / ftp / http-post-form', default: 'ssh' },
          { key: 'userlist', label: 'Users', placeholder: '/usr/share/wordlists/users.txt', default: 'admin' },
          { key: 'passlist', label: 'Passwords', placeholder: '~/nexus-ultra/data/wordlists/rockyou.txt', default: '~/nexus-ultra/data/wordlists/rockyou.txt' },
        ]
      },
    ]
  },
  {
    category: 'OSINT',
    color: 'var(--accent-green)',
    tools: [
      { id: 'theharvester', name: 'theHarvester', desc: 'Email & domain recon', icon: '🌾',
        params: [
          { key: 'domain', label: 'Domain', placeholder: 'example.com', required: true },
          { key: 'source', label: 'Source', placeholder: 'google,bing,linkedin', default: 'google,bing' },
        ]
      },
      { id: 'sherlock', name: 'Sherlock', desc: 'Username OSINT', icon: '🔍',
        params: [
          { key: 'username', label: 'Username', placeholder: 'johndoe', required: true },
        ]
      },
      { id: 'whatweb', name: 'WhatWeb', desc: 'Web tech fingerprint', icon: '🕵',
        params: [
          { key: 'url', label: 'URL', placeholder: 'http://target.com', required: true },
        ]
      },
    ]
  },
  {
    category: 'CRACKING',
    color: 'var(--accent-yellow)',
    tools: [
      { id: 'hashcat', name: 'Hashcat', desc: 'Password cracker (GPU)', icon: '🔓',
        params: [
          { key: 'hash', label: 'Hash', placeholder: '5f4dcc3b5aa765d61d8327deb882cf99', required: true },
          { key: 'mode', label: 'Hash mode', placeholder: '0 (MD5), 1000 (NTLM), 1800 (sha512crypt)', default: '0' },
          { key: 'wordlist', label: 'Wordlist', placeholder: '~/nexus-ultra/data/wordlists/rockyou.txt', default: '~/nexus-ultra/data/wordlists/rockyou.txt' },
        ]
      },
      { id: 'john', name: 'John the Ripper', desc: 'Password cracker', icon: '🗝',
        params: [
          { key: 'hashfile', label: 'Hash file', placeholder: '/path/to/hashes.txt', required: true },
          { key: 'wordlist', label: 'Wordlist', placeholder: '~/nexus-ultra/data/wordlists/rockyou.txt', default: '~/nexus-ultra/data/wordlists/rockyou.txt' },
        ]
      },
    ]
  },
]

export default function ToolsPage() {
  const { activeTarget, appendScanOutput, scanResults, addNotification } = useStore()
  const [activeTool, setActiveTool] = useState(null)
  const [params, setParams] = useState({})
  const [running, setRunning] = useState(false)
  const [activeScanId, setActiveScanId] = useState(null)
  const [scans, setScans] = useState([])
  const [dockerMode, setDockerMode] = useState(false)
  const outputRef = useRef(null)

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight
    }
  }, [scanResults, activeScanId])

  const selectTool = (tool) => {
    setActiveTool(tool)
    const defaults = {}
    tool.params.forEach(p => { if (p.default) defaults[p.key] = p.default })
    if (activeTarget?.ip) defaults.target = activeTarget.ip
    if (activeTarget?.domain) defaults.domain = activeTarget.domain
    if (activeTarget?.domain) defaults.url = `http://${activeTarget.domain}`
    setParams(defaults)
  }

  const runSelectedTool = async () => {
    if (!activeTool) return
    const missing = activeTool.params.filter(p => p.required && !params[p.key])
    if (missing.length) {
      addNotification({ type: 'warning', title: 'Missing params', message: `Required: ${missing.map(p => p.label).join(', ')}` })
      return
    }
    setRunning(true)
    const scanId = `${activeTool.id}_${Date.now()}`
    setActiveScanId(scanId)
    try {
      const r = await runTool({
        tool: activeTool.id,
        params,
        target_id: activeTarget?.id,
        scan_id: scanId,
        use_docker: dockerMode
      })
      if (r.data.output) {
        r.data.output.split('\n').forEach(line => appendScanOutput(scanId, line))
      }
      addNotification({ type: 'success', title: `${activeTool.name} Complete`, message: 'Scan finished' })
    } catch (e) {
      appendScanOutput(scanId, `ERROR: ${e.response?.data?.detail || e.message}`)
      addNotification({ type: 'error', title: 'Tool Error', message: e.response?.data?.detail || e.message })
    }
    setRunning(false)
  }

  const output = activeScanId ? (scanResults[activeScanId] || []).join('\n') : ''

  return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden' }}>
      {/* Tool list */}
      <div style={{
        width: 220,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        overflow: 'auto',
        flexShrink: 0
      }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--accent-cyan)', fontSize: 12, fontWeight: 700, letterSpacing: 3 }}>TOOLS</div>
          {activeTarget && <div style={{ color: 'var(--accent-orange)', fontSize: 10, marginTop: 2 }}>{activeTarget.name}</div>}
          <div
            style={{ marginTop: 8, padding: '6px 8px', background: dockerMode ? 'rgba(255,51,102,0.1)' : 'var(--bg-card)', border: `1px solid ${dockerMode ? 'var(--accent-red)' : 'var(--border)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            onClick={() => setDockerMode(d => !d)}
          >
            <span style={{ fontSize: 10, color: dockerMode ? 'var(--accent-red)' : 'var(--text-muted)' }}>🐉 Kali Mode</span>
            <div style={{ width: 28, height: 14, borderRadius: 7, background: dockerMode ? 'var(--accent-red)' : 'var(--border)', position: 'relative', transition: 'background 0.2s' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'white', position: 'absolute', top: 2, left: dockerMode ? 16 : 2, transition: 'left 0.2s' }} />
            </div>
          </div>
        </div>
        {TOOLS.map(cat => (
          <div key={cat.category}>
            <div style={{ padding: '8px 16px 4px', color: cat.color, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.8 }}>
              {cat.category}
            </div>
            {cat.tools.map(tool => (
              <div
                key={tool.id}
                onClick={() => selectTool(tool)}
                style={{
                  padding: '8px 16px',
                  cursor: 'pointer',
                  background: activeTool?.id === tool.id ? `${cat.color}18` : 'transparent',
                  borderLeft: activeTool?.id === tool.id ? `3px solid ${cat.color}` : '3px solid transparent',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => { if (activeTool?.id !== tool.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                onMouseLeave={e => { if (activeTool?.id !== tool.id) e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14 }}>{tool.icon}</span>
                  <span style={{ color: 'var(--text-primary)', fontSize: 12 }}>{tool.name}</span>
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 10, marginLeft: 20 }}>{tool.desc}</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Config + Output */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!activeTool ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚙</div>
              <div>Select a tool from the left panel</div>
            </div>
          </div>
        ) : (
          <>
            {/* Tool config */}
            <div style={{ padding: 20, borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{activeTool.icon}</span>
                  <div>
                    <div style={{ color: 'var(--accent-cyan)', fontSize: 14, fontWeight: 700 }}>{activeTool.name}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{activeTool.desc}</div>
                  </div>
                </div>
                <button
                  className="cyber-btn-green cyber-btn"
                  onClick={runSelectedTool}
                  disabled={running}
                  style={{ minWidth: 100 }}
                >
                  {running ? '◉ RUNNING...' : '▶ RUN'}
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
                {activeTool.params.map(p => (
                  <div key={p.key}>
                    <label style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }}>
                      {p.label} {p.required && <span style={{ color: 'var(--accent-red)' }}>*</span>}
                    </label>
                    <input
                      className="cyber-input"
                      placeholder={p.placeholder}
                      value={params[p.key] || ''}
                      onChange={e => setParams({ ...params, [p.key]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Output terminal */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '8px 16px', background: '#050508', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: running ? 'var(--accent-green)' : 'var(--text-muted)' }} className={running ? 'pulse' : ''} />
                <span style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: 2 }}>OUTPUT</span>
                {activeScanId && <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>— {activeScanId}</span>}
              </div>
              <div ref={outputRef} style={{ flex: 1, overflow: 'auto', padding: 16, background: '#050508', fontFamily: 'JetBrains Mono, monospace' }}>
                {output ? (
                  <pre className="terminal-text" style={{ margin: 0 }}>{output}</pre>
                ) : (
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    <span style={{ color: 'var(--accent-green)' }}>nexus@ultra</span>
                    <span style={{ color: 'var(--text-muted)' }}>:~$ </span>
                    <span className="cursor-blink" style={{ color: 'var(--accent-cyan)' }}>█</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
