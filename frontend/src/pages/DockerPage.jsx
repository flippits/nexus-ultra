import { useEffect, useState, useRef } from 'react'
import { useStore } from '../store'
import axios from 'axios'

const API = 'http://127.0.0.1:8765'

export default function DockerPage() {
  const { addNotification } = useStore()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [building, setBuilding] = useState(false)
  const [buildLog, setBuildLog] = useState([])
  const [imageExists, setImageExists] = useState(false)
  const [tools, setTools] = useState([])
  const [cmd, setCmd] = useState('')
  const [execOutput, setExecOutput] = useState('')
  const [execHistory, setExecHistory] = useState([])
  const buildLogRef = useRef(null)
  const outputRef = useRef(null)

  const fetchStatus = async () => {
    try {
      const r = await axios.get(`${API}/docker/status`)
      setStatus(r.data)
    } catch { setStatus(null) }
  }

  const checkImage = async () => {
    try {
      const r = await axios.get(`${API}/docker/image/exists`)
      setImageExists(r.data.exists)
    } catch {}
  }

  useEffect(() => {
    fetchStatus()
    checkImage()
    const iv = setInterval(fetchStatus, 5000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    if (buildLogRef.current) buildLogRef.current.scrollTop = buildLogRef.current.scrollHeight
  }, [buildLog])

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight
  }, [execOutput])

  const handleBuild = async () => {
    setBuilding(true)
    setBuildLog(['[NEXUS] Starting Kali Linux image build...', '[NEXUS] This will take 5-15 minutes. Grab a coffee ☕'])
    try {
      const response = await fetch(`${API}/docker/build/stream`)
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const text = decoder.decode(value)
        text.split('\n').filter(l => l.trim()).forEach(line => {
          setBuildLog(prev => [...prev, line])
        })
      }
      addNotification({ type: 'success', title: 'Kali Built', message: 'Docker image ready' })
      setImageExists(true)
    } catch (e) {
      addNotification({ type: 'error', title: 'Build Failed', message: e.message })
    }
    setBuilding(false)
  }

  const handleStart = async () => {
    setLoading(true)
    try {
      const r = await axios.post(`${API}/docker/start`)
      if (r.data.status === 'needs_build') {
        addNotification({ type: 'warning', title: 'Build First', message: 'Build the image before starting' })
      } else {
        addNotification({ type: 'success', title: 'Kali Started', message: 'Container is running' })
        await fetchStatus()
      }
    } catch (e) {
      addNotification({ type: 'error', title: 'Start Failed', message: e.response?.data?.detail || e.message })
    }
    setLoading(false)
  }

  const handleStop = async () => {
    setLoading(true)
    try {
      await axios.post(`${API}/docker/stop`)
      addNotification({ type: 'info', title: 'Kali Stopped', message: 'Container stopped' })
      await fetchStatus()
    } catch {}
    setLoading(false)
  }

  const handleExec = async () => {
    if (!cmd.trim()) return
    const command = cmd.trim()
    setCmd('')
    setExecHistory(h => [...h, command])
    setExecOutput(prev => prev + `\n\x1b[36mnexus@kali\x1b[0m:\x1b[32m~\x1b[0m# ${command}\n`)
    try {
      const response = await fetch(`${API}/docker/exec/stream?command=${encodeURIComponent(command)}`)
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        setExecOutput(prev => prev + decoder.decode(value))
      }
    } catch (e) {
      setExecOutput(prev => prev + `[ERROR] ${e.message}\n`)
    }
  }

  const loadTools = async () => {
    try {
      const r = await axios.get(`${API}/docker/tools`)
      setTools(r.data.tools)
    } catch {}
  }

  const isRunning = status?.container?.running
  const dockerAvailable = status?.docker_available

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ color: 'var(--accent-red)', fontSize: 14, fontWeight: 700, letterSpacing: 3 }}>KALI LINUX</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>Docker Container Engine</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusPill available={dockerAvailable} running={isRunning} />
          </div>
          <div style={{ flex: 1 }} />
          {!imageExists && !building && (
            <button className="cyber-btn-orange cyber-btn" onClick={handleBuild}>
              🔨 BUILD KALI IMAGE
            </button>
          )}
          {imageExists && !isRunning && (
            <button className="cyber-btn-green cyber-btn" onClick={handleStart} disabled={loading}>
              {loading ? 'STARTING...' : '▶ START KALI'}
            </button>
          )}
          {isRunning && (
            <>
              <button className="cyber-btn" onClick={loadTools}>LIST TOOLS</button>
              <button className="cyber-btn-red cyber-btn" onClick={handleStop} disabled={loading}>
                ■ STOP
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: Status + Stats */}
        <div style={{ width: 240, background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)', padding: 16, overflow: 'auto', flexShrink: 0 }}>
          <Section title="Container" color="var(--accent-cyan)">
            <Stat label="Status" value={status?.container?.status || 'unknown'} color={isRunning ? 'var(--accent-green)' : 'var(--text-muted)'} />
            <Stat label="ID" value={status?.container?.id || '—'} />
            {status?.container?.started_at && (
              <Stat label="Started" value={new Date(status.container.started_at).toLocaleTimeString()} />
            )}
          </Section>

          {status?.stats && Object.keys(status.stats).length > 0 && (
            <Section title="Resources" color="var(--accent-orange)">
              <Stat label="CPU" value={status.stats.cpu} color="var(--accent-orange)" />
              <Stat label="Memory" value={status.stats.mem_usage} color="var(--accent-yellow)" />
              <Stat label="Mem %" value={status.stats.mem_perc} />
              <Stat label="Net I/O" value={status.stats.net_io} />
            </Section>
          )}

          <Section title="Ports Exposed" color="var(--accent-purple)">
            <Stat label="4444" value="MSF Handler" color="var(--accent-red)" />
            <Stat label="8080" value="HTTP Server" color="var(--accent-cyan)" />
            <Stat label="9090" value="Listener" color="var(--accent-green)" />
          </Section>

          {tools.length > 0 && (
            <Section title={`Tools (${tools.length})`} color="var(--accent-green)">
              {tools.map(t => (
                <div key={t} style={{ color: 'var(--accent-green)', fontSize: 10, marginBottom: 3 }}>✅ {t}</div>
              ))}
            </Section>
          )}

          <Section title="Volumes" color="var(--accent-yellow)">
            <div style={{ color: 'var(--text-muted)', fontSize: 10, lineHeight: 1.6 }}>
              <div>Host: <span style={{ color: 'var(--text-secondary)' }}>~/nexus-ultra/data</span></div>
              <div>→ Container: <span style={{ color: 'var(--accent-cyan)' }}>/nexus/data</span></div>
              <div style={{ marginTop: 6 }}>Wordlists, findings, and output are shared between macOS and Kali.</div>
            </div>
          </Section>
        </div>

        {/* Right: Terminal or Build Log */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {building ? (
            /* Build log */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '8px 16px', background: '#050508', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-orange)' }} className="pulse" />
                <span style={{ color: 'var(--accent-orange)', fontSize: 11, letterSpacing: 2 }}>BUILDING KALI IMAGE</span>
              </div>
              <div ref={buildLogRef} style={{ flex: 1, overflow: 'auto', padding: 16, background: '#050508' }}>
                {buildLog.map((line, i) => (
                  <div key={i} style={{ color: line.includes('[NEXUS]') ? 'var(--accent-cyan)' : line.includes('ERROR') ? 'var(--accent-red)' : 'var(--accent-green)', fontSize: 11, marginBottom: 2, fontFamily: 'monospace' }}>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          ) : isRunning ? (
            /* Live terminal */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '8px 16px', background: '#050508', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-green)' }} className="pulse" />
                <span style={{ color: 'var(--accent-green)', fontSize: 11, letterSpacing: 2 }}>KALI TERMINAL</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>— nexus@kali</span>
                <div style={{ flex: 1 }} />
                <button className="cyber-btn" style={{ fontSize: 9, padding: '2px 8px' }} onClick={() => setExecOutput('')}>CLEAR</button>
              </div>
              <div ref={outputRef} style={{ flex: 1, overflow: 'auto', padding: 16, background: '#050508' }}>
                {!execOutput && (
                  <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                    <div style={{ color: 'var(--accent-green)', marginBottom: 8 }}>
                      {'                         _   _\n  _ __   _____  ___   _ | | | |\n | \'_ \\ / _ \\ \\/ / | | | | | | |\n | | | |  __/>  <| |_| |_|_|_|\n |_| |_|\\___/_/\\_\\\\___/ (_|_|_)'.split('\n').map((l, i) => <div key={i}>{l}</div>)}
                    </div>
                    <div>Kali Linux container ready. Type a command below.</div>
                    <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>Try: <span style={{ color: 'var(--accent-cyan)' }}>nmap --version</span> | <span style={{ color: 'var(--accent-cyan)' }}>msfconsole -v</span> | <span style={{ color: 'var(--accent-cyan)' }}>searchsploit apache</span></div>
                  </div>
                )}
                <pre style={{ color: 'var(--accent-green)', fontSize: 11, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {execOutput}
                </pre>
              </div>
              <div style={{ padding: '10px 16px', background: '#050508', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: 'var(--accent-cyan)', fontSize: 11, whiteSpace: 'nowrap' }}>nexus@kali:~#</span>
                <input
                  className="cyber-input"
                  placeholder="Enter command..."
                  value={cmd}
                  onChange={e => setCmd(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleExec()
                    if (e.key === 'ArrowUp' && execHistory.length > 0) setCmd(execHistory[execHistory.length - 1])
                  }}
                  style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', padding: '4px 0' }}
                  autoFocus
                />
                <button className="cyber-btn-green cyber-btn" onClick={handleExec} disabled={!cmd.trim()}>RUN</button>
              </div>
            </div>
          ) : (
            /* Not running state */
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', maxWidth: 480 }}>
                <div style={{ fontSize: 60, marginBottom: 16 }}>🐉</div>
                <div style={{ color: 'var(--accent-red)', fontSize: 20, fontWeight: 700, letterSpacing: 3, marginBottom: 8 }}>KALI LINUX</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
                  Run a full Kali Linux environment inside NEXUS ULTRA.<br />
                  Metasploit, all Linux tools, and a live terminal — all integrated.
                </div>
                {!imageExists ? (
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 16 }}>Image not built yet. Build it first (~3GB, takes 5–15 min).</div>
                    <button className="cyber-btn-orange cyber-btn" onClick={handleBuild} style={{ fontSize: 12 }}>
                      🔨 BUILD KALI IMAGE
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ color: 'var(--accent-green)', fontSize: 12, marginBottom: 16 }}>✅ Image ready. Start the container to begin.</div>
                    <button className="cyber-btn-green cyber-btn" onClick={handleStart} disabled={loading} style={{ fontSize: 12 }}>
                      {loading ? 'STARTING...' : '▶ START KALI'}
                    </button>
                  </div>
                )}
                <div style={{ marginTop: 32, padding: 16, background: 'var(--bg-card)', border: '1px solid var(--border)', textAlign: 'left' }}>
                  <div style={{ color: 'var(--accent-cyan)', fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>WHAT YOU GET</div>
                  {[
                    '✅ Metasploit Framework (full)',
                    '✅ All Kali Linux tools',
                    '✅ Shared wordlists & data',
                    '✅ Live terminal inside NEXUS',
                    '✅ Auto-route tools via Docker mode',
                    '✅ Ports 4444, 8080, 9090 exposed',
                  ].map((f, i) => (
                    <div key={i} style={{ color: 'var(--text-secondary)', fontSize: 11, marginBottom: 4 }}>{f}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatusPill({ available, running }) {
  if (!available) return <span style={{ color: 'var(--accent-red)', fontSize: 11, border: '1px solid var(--accent-red)', padding: '2px 10px' }}>DOCKER OFFLINE</span>
  if (!running) return <span style={{ color: 'var(--text-muted)', fontSize: 11, border: '1px solid var(--border)', padding: '2px 10px' }}>CONTAINER STOPPED</span>
  return (
    <span style={{ color: 'var(--accent-green)', fontSize: 11, border: '1px solid var(--accent-green)', padding: '2px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
      <span className="pulse">●</span> KALI RUNNING
    </span>
  )
}

function Section({ title, color, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ color, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, paddingBottom: 4, borderBottom: `1px solid ${color}33` }}>{title}</div>
      {children}
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{label}</span>
      <span style={{ color: color || 'var(--text-secondary)', fontSize: 10 }}>{value}</span>
    </div>
  )
}
