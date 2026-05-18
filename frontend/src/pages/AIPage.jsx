import { useState, useRef, useEffect } from 'react'
import { useStore } from '../store'
import { streamExecute, streamAgent, getAIModels } from '../utils/api'
import ReactMarkdown from 'react-markdown'

const AGENTS = [
  { id: 'recon',    icon: '🔭', name: 'RECON',    desc: 'Recon & scan',           color: 'var(--accent-cyan)' },
  { id: 'exploit',  icon: '💥', name: 'EXPLOIT',  desc: 'Exploit analysis',        color: 'var(--accent-red)' },
  { id: 'osint',    icon: '🌐', name: 'OSINT',    desc: 'Full OSINT research',     color: 'var(--accent-green)' },
  { id: 'defender', icon: '🛡', name: 'DEFENDER', desc: 'Blue team / defense',     color: 'var(--accent-purple)' },
  { id: 'report',   icon: '📄', name: 'REPORT',   desc: 'Write report',            color: 'var(--accent-yellow)' },
  { id: 'hunt',     icon: '🎯', name: 'HUNT',     desc: 'Find missed vectors',     color: 'var(--accent-orange)' },
  { id: 'autopwn',  icon: '🤖', name: 'AUTOPWN',  desc: 'Autonomous exploit chain', color: '#ff2244' },
  { id: 'evade',    icon: '👻', name: 'EVADE',    desc: 'AV/EDR evasion & OPSEC', color: '#bf5fff' },
  { id: 'lateral',  icon: '↔',  name: 'LATERAL',  desc: 'Post-exploit movement',   color: '#ff8800' },
  { id: 'ctf',      icon: '🏴', name: 'CTF',      desc: 'CTF challenge solver',    color: '#ffd700' },
  { id: 'malware',  icon: '🦠', name: 'MALWARE',  desc: 'Malware analysis & RE',   color: '#00ff88' },
  { id: 'phish',    icon: '🎣', name: 'PHISH',    desc: 'Social engineering',      color: '#00e5ff' },
]

const QUICK_PROMPTS = [
  'Run a full port scan on the target',
  'Enumerate all web directories',
  'What services are running?',
  'Check for common vulnerabilities',
  'Find subdomains',
  'Run nikto web scan',
  'Any low-hanging fruit?',
  'What did I miss?',
]

const SPEED_COLOR = { fastest: 'var(--accent-green)', fast: 'var(--accent-cyan)', slow: 'var(--accent-yellow)' }

export default function AIPage() {
  const { aiMessages, addAiMessage, aiThinking, setAiThinking, activeTarget, addNotification, selectedAgent: activeAgent, setSelectedAgent: setActiveAgent } = useStore()
  const [input, setInput] = useState('')
  const [agentRunning, setAgentRunning] = useState(null)
  const [models, setModels] = useState([])
  const [selectedModel, setSelectedModel] = useState(null)
  const [streamingId, setStreamingId] = useState(null)
  const messagesEndRef = useRef(null)
  const streamingContent = useRef('')

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [aiMessages, aiThinking])

  useEffect(() => {
    getAIModels().then(r => {
      setModels(r.data)
      if (r.data.length > 0 && !selectedModel) setSelectedModel(r.data[0].id)
    }).catch(() => {})
  }, [])

  const getApiKey = (modelId) => {
    try {
      const cfg = JSON.parse(localStorage.getItem('nexus_config') || '{}')
      if (!modelId) return null
      if (modelId.startsWith('groq-'))   return cfg.groqKey || null
      if (modelId.startsWith('gemini'))  return cfg.geminiKey || null
      if (modelId.startsWith('claude-')) return cfg.anthropicKey || null
      if (modelId.startsWith('gpt-'))    return cfg.openaiKey || null
    } catch {}
    return null
  }

  const sendMessage = (text) => {
    const msg = text || input.trim()
    if (!msg || aiThinking) return
    setInput('')
    addAiMessage({ role: 'user', content: msg, timestamp: Date.now() })
    setAiThinking(true)

    const sid = `msg_${Date.now()}`
    setStreamingId(sid)
    streamingContent.current = ''

    // Add placeholder for AI response
    addAiMessage({ role: 'assistant', content: '', agent: activeAgent, timestamp: Date.now(), streamId: sid })

    const handleEvent = (event) => {
      if (event.token) {
        streamingContent.current += event.token
        useStore.setState(state => ({
          aiMessages: state.aiMessages.map(m =>
            m.streamId === sid ? { ...m, content: streamingContent.current } : m
          )
        }))
      } else if (event.tool_start) {
        // Add a tool execution message
        const toolId = `tool_${Date.now()}_${event.tool_start.tool}`
        useStore.setState(state => ({
          aiMessages: [...state.aiMessages, {
            role: 'tool',
            toolId,
            tool: event.tool_start.tool,
            params: event.tool_start.params,
            output: '',
            status: 'running',
            timestamp: Date.now(),
          }].slice(-200)
        }))
      } else if (event.tool_output) {
        // Append output to last tool message for this tool
        useStore.setState(state => {
          const msgs = [...state.aiMessages]
          for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].role === 'tool' && msgs[i].tool === event.tool && msgs[i].status === 'running') {
              msgs[i] = { ...msgs[i], output: msgs[i].output + event.tool_output }
              break
            }
          }
          return { aiMessages: msgs }
        })
      } else if (event.tool_done) {
        useStore.setState(state => {
          const msgs = [...state.aiMessages]
          for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].role === 'tool' && msgs[i].tool === event.tool_done.tool && msgs[i].status === 'running') {
              msgs[i] = { ...msgs[i], status: 'done' }
              break
            }
          }
          return { aiMessages: msgs }
        })
      }
    }

    streamExecute(
      {
        message: msg,
        agent: activeAgent,
        model: selectedModel,
        api_key: getApiKey(selectedModel),
        target: activeTarget ? { id: activeTarget.id, name: activeTarget.name, ip: activeTarget.ip, domain: activeTarget.domain } : null,
        history: aiMessages.slice(-10).filter(m => m.role === 'user' || m.role === 'assistant'),
      },
      handleEvent,
      () => {
        setAiThinking(false)
        setStreamingId(null)
        useStore.setState(state => ({
          aiMessages: state.aiMessages.map(m =>
            m.streamId === sid ? { ...m, streamId: undefined } : m
          )
        }))
      },
      (err) => {
        setAiThinking(false)
        setStreamingId(null)
        useStore.setState(state => ({
          aiMessages: state.aiMessages.map(m =>
            m.streamId === sid ? { ...m, content: `⚠ Error: ${err}`, streamId: undefined } : m
          )
        }))
      }
    )
  }

  const runAgentTask = (agentId) => {
    if (!activeTarget) {
      addNotification({ type: 'warning', title: 'No Target Selected', message: 'Select a target from the TopBar first' })
      return
    }
    if (agentRunning || aiThinking) return

    setAgentRunning(agentId)
    setAiThinking(true)

    const sid = `agent_${Date.now()}`
    streamingContent.current = ''
    setStreamingId(sid)

    addAiMessage({ role: 'system', content: `Running ${agentId.toUpperCase()} agent on ${activeTarget.name}...`, timestamp: Date.now() })
    addAiMessage({ role: 'assistant', content: '', agent: agentId, timestamp: Date.now(), streamId: sid })

    streamAgent(
      agentId,
      { target: { id: activeTarget.id, name: activeTarget.name, ip: activeTarget.ip, domain: activeTarget.domain }, model: selectedModel, api_key: getApiKey(selectedModel) },
      (token) => {
        streamingContent.current += token
        useStore.setState(state => ({
          aiMessages: state.aiMessages.map(m =>
            m.streamId === sid ? { ...m, content: streamingContent.current } : m
          )
        }))
      },
      () => {
        setAiThinking(false)
        setStreamingId(null)
        setAgentRunning(null)
        useStore.setState(state => ({
          aiMessages: state.aiMessages.map(m =>
            m.streamId === sid ? { ...m, streamId: undefined } : m
          )
        }))
      },
      (err) => {
        setAiThinking(false)
        setStreamingId(null)
        setAgentRunning(null)
        useStore.setState(state => ({
          aiMessages: state.aiMessages.map(m =>
            m.streamId === sid ? { ...m, content: `⚠ Agent error: ${err}`, streamId: undefined } : m
          )
        }))
      }
    )
  }

  const activeModel = models.find(m => m.id === selectedModel)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, flexWrap: 'wrap' }}>
        <span style={{ color: 'var(--accent-purple)', fontSize: 14, fontWeight: 700, letterSpacing: 3 }}>AI WAR ROOM</span>
        {activeTarget
          ? <span style={{ color: 'var(--accent-green)', fontSize: 11 }}>● TARGET: <span style={{ color: 'var(--text-primary)' }}>{activeTarget.name}</span> {activeTarget.ip && `(${activeTarget.ip})`}</span>
          : <span style={{ color: 'var(--accent-red)', fontSize: 11 }}>⚠ No target selected — use TopBar to set one</span>
        }
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>MODEL:</span>
          <select
            value={selectedModel || ''}
            onChange={e => setSelectedModel(e.target.value)}
            style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 11, padding: '4px 8px', fontFamily: 'monospace', cursor: 'pointer' }}
          >
            {models.map(m => <option key={m.id} value={m.id}>{m.name} ({m.speed})</option>)}
          </select>
          {activeModel && (
            <span style={{ fontSize: 10, color: SPEED_COLOR[activeModel.speed] || 'var(--text-muted)', letterSpacing: 1 }}>
              ● {activeModel.speed.toUpperCase()}
            </span>
          )}
          {activeModel?.requires_api_key && !getApiKey(selectedModel) && (
            <span style={{ fontSize: 10, color: 'var(--accent-red)', letterSpacing: 1 }}>
              ⚠ KEY MISSING — set in Settings
            </span>
          )}
        </div>
        <button
          style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 10, padding: '4px 10px', cursor: 'pointer', fontFamily: 'monospace', letterSpacing: 1 }}
          onClick={() => useStore.getState().clearAiMessages()}
        >CLEAR</button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Agent Panel */}
        <div style={{ width: 190, background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)', padding: 10, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'auto' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: 2, marginBottom: 4 }}>AGENTS</div>
          {AGENTS.map(a => (
            <div
              key={a.id}
              style={{ padding: '8px 10px', background: activeAgent === a.id ? `${a.color}18` : 'transparent', border: `1px solid ${activeAgent === a.id ? a.color : 'var(--border)'}`, cursor: 'pointer', transition: 'all 0.15s' }}
              onClick={() => setActiveAgent(a.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span>{a.icon}</span>
                <span style={{ color: a.color, fontSize: 11, fontWeight: 700 }}>{a.name}</span>
                {agentRunning === a.id && <span className="pulse" style={{ color: a.color, fontSize: 10 }}>●</span>}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>{a.desc}</div>
              <button
                className="cyber-btn"
                style={{ marginTop: 6, width: '100%', fontSize: 9, borderColor: a.color, color: a.color, padding: '3px 6px' }}
                onClick={e => { e.stopPropagation(); runAgentTask(a.id) }}
                disabled={agentRunning !== null || aiThinking}
              >
                {agentRunning === a.id ? 'RUNNING...' : 'AUTO RUN'}
              </button>
            </div>
          ))}

          <div style={{ marginTop: 8, padding: 8, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 6, letterSpacing: 1 }}>QUICK ACTIONS</div>
            {QUICK_PROMPTS.map(p => (
              <button
                key={p}
                onClick={() => sendMessage(p)}
                disabled={aiThinking}
                style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 10, cursor: 'pointer', padding: '4px 0', fontFamily: 'inherit', borderBottom: '1px solid var(--border)33' }}
                onMouseEnter={e => e.target.style.color = 'var(--accent-cyan)'}
                onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
              >{p}</button>
            ))}
          </div>
        </div>

        {/* Chat area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {aiMessages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 60 }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🧠</div>
                <div style={{ fontSize: 14, color: 'var(--accent-purple)', marginBottom: 6 }}>AI War Room — Autonomous Mode</div>
                <div style={{ fontSize: 12, marginBottom: 4 }}>Ask it to scan, enumerate, and attack — it will execute tools directly.</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                  Try: <span style={{ color: 'var(--accent-cyan)' }}>"Run a full port scan on the target"</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--accent-yellow)', marginTop: 4 }}>
                  ⚠ Select a target in the TopBar first
                </div>
              </div>
            )}
            {aiMessages.map((msg, i) => (
              <ChatMessage key={i} msg={msg} isStreaming={msg.streamId != null} />
            ))}
            {aiThinking && !streamingId && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 26, height: 26, border: '2px solid var(--accent-purple)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>🧠</div>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '8px 12px', display: 'flex', gap: 6, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent-purple)', animation: `pulse-glow 1.2s ${i * 0.2}s ease-in-out infinite` }} />
                  ))}
                  <span style={{ color: 'var(--text-muted)', fontSize: 11, marginLeft: 4 }}>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ padding: 12, borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', display: 'flex', gap: 8 }}>
            <input
              className="cyber-input"
              placeholder={activeTarget ? `Tell ${activeAgent.toUpperCase()} what to do... (it will execute tools automatically)` : 'Select a target first...'}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              style={{ flex: 1 }}
              disabled={aiThinking}
            />
            <button className="cyber-btn" onClick={() => sendMessage()} disabled={aiThinking || !input.trim()}
              style={{ background: aiThinking ? 'transparent' : 'var(--accent-purple)22', borderColor: 'var(--accent-purple)', color: 'var(--accent-purple)' }}>
              {aiThinking ? '...' : '▶ RUN'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ChatMessage({ msg, isStreaming }) {
  const [collapsed, setCollapsed] = useState(false)
  const isUser = msg.role === 'user'
  const isSystem = msg.role === 'system'
  const isTool = msg.role === 'tool'
  const agent = AGENTS.find(a => a.id === msg.agent)
  const color = isUser ? 'var(--accent-cyan)' : agent ? agent.color : 'var(--accent-purple)'

  if (isSystem) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 11 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span>{msg.content}</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
    )
  }

  if (isTool) {
    const isRunning = msg.status === 'running'
    const lines = (msg.output || '').split('\n')
    const preview = lines.slice(0, 6).join('\n')
    const hasMore = lines.length > 6

    return (
      <div style={{ marginLeft: 36 }} className="fade-in">
        <div
          style={{ background: '#050508', border: `1px solid ${isRunning ? 'var(--accent-yellow)' : 'var(--accent-green)'}44`, padding: 0, fontFamily: 'monospace', fontSize: 11 }}
        >
          <div
            style={{ padding: '6px 12px', background: isRunning ? 'var(--accent-yellow)11' : 'var(--accent-green)11', borderBottom: `1px solid ${isRunning ? 'var(--accent-yellow)' : 'var(--accent-green)'}33`, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
            onClick={() => setCollapsed(!collapsed)}
          >
            <span style={{ color: isRunning ? 'var(--accent-yellow)' : 'var(--accent-green)' }}>
              {isRunning ? '⚙' : '✓'}
            </span>
            <span style={{ color: isRunning ? 'var(--accent-yellow)' : 'var(--accent-green)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
              {msg.tool}
            </span>
            {msg.params?.target && <span style={{ color: 'var(--text-muted)' }}>→ {msg.params.target}</span>}
            {isRunning && <span className="pulse" style={{ color: 'var(--accent-yellow)', marginLeft: 'auto' }}>● running</span>}
            {!isRunning && <span style={{ color: 'var(--accent-green)', marginLeft: 'auto', fontSize: 10 }}>{collapsed ? '▶ show' : '▼ hide'}</span>}
          </div>
          {!collapsed && (
            <pre style={{ margin: 0, padding: '8px 12px', color: 'var(--accent-green)', overflow: 'auto', maxHeight: 300, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {collapsed ? preview : (msg.output || (isRunning ? 'Executing...' : ''))}
              {isRunning && <span className="cursor-blink">█</span>}
            </pre>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: isUser ? 'row-reverse' : 'row' }} className="fade-in">
      <div style={{ width: 26, height: 26, border: `2px solid ${color}`, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, flexShrink: 0, color }}>
        {isUser ? 'U' : agent?.icon || '🧠'}
      </div>
      <div style={{ maxWidth: '82%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexDirection: isUser ? 'row-reverse' : 'row' }}>
          <span style={{ color, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
            {isUser ? 'YOU' : agent?.name || 'AI'}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{new Date(msg.timestamp).toLocaleTimeString()}</span>
          {isStreaming && <span className="pulse" style={{ color: 'var(--accent-purple)', fontSize: 10 }}>● live</span>}
        </div>
        <div style={{ background: 'var(--bg-card)', border: `1px solid ${color}33`, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 12, lineHeight: 1.6 }}>
          {isUser ? (
            msg.content
          ) : msg.content ? (
            <div>
              <ReactMarkdown
                components={{
                  code: ({ children }) => <code style={{ background: 'var(--bg-secondary)', padding: '1px 4px', color: 'var(--accent-green)', fontSize: 11 }}>{children}</code>,
                  pre: ({ children }) => <pre style={{ background: 'var(--bg-secondary)', padding: 10, overflow: 'auto', fontSize: 11, margin: '8px 0', border: '1px solid var(--border)', color: 'var(--accent-green)' }}>{children}</pre>,
                  p: ({ children }) => <p style={{ margin: '4px 0' }}>{children}</p>,
                  ul: ({ children }) => <ul style={{ paddingLeft: 16, margin: '4px 0' }}>{children}</ul>,
                  li: ({ children }) => <li style={{ margin: '2px 0', color: 'var(--text-secondary)' }}>{children}</li>,
                  strong: ({ children }) => <strong style={{ color: 'var(--accent-cyan)' }}>{children}</strong>,
                  h1: ({ children }) => <h1 style={{ color: 'var(--accent-cyan)', fontSize: 15, margin: '8px 0 4px' }}>{children}</h1>,
                  h2: ({ children }) => <h2 style={{ color: 'var(--accent-cyan)', fontSize: 13, margin: '6px 0 4px' }}>{children}</h2>,
                  h3: ({ children }) => <h3 style={{ color: 'var(--accent-orange)', fontSize: 12, margin: '4px 0' }}>{children}</h3>,
                }}
              >
                {msg.content}
              </ReactMarkdown>
              {isStreaming && <span className="cursor-blink" style={{ color: 'var(--accent-cyan)' }}>█</span>}
            </div>
          ) : (
            <span className="pulse" style={{ color: 'var(--accent-purple)', fontSize: 11 }}>● generating...</span>
          )}
        </div>
      </div>
    </div>
  )
}
