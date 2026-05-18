import { useState, useEffect, useCallback } from 'react'

const platform = typeof window !== 'undefined' ? (window.electronAPI?.platform ?? '') : ''
const configPath = platform === 'win32'
  ? '%USERPROFILE%\\.claude.json'
  : '~/.claude.json'

const DEFAULT = {
  groqKey: '',
  geminiKey: '',
  anthropicKey: '',
  openaiKey: '',
  ollamaModel: 'qwen2.5:32b',
  ollamaUrl: 'http://localhost:11434',
  backendPort: '8765',
  defaultFlags: '-sV -sC -T4',
  autoSave: true,
  theme: 'dark',
  voiceModel: 'base',
}

export default function SettingsPage() {
  const [config, setConfig] = useState(DEFAULT)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('nexus_config')
    if (stored) setConfig({ ...DEFAULT, ...JSON.parse(stored) })
  }, [])

  const save = () => {
    localStorage.setItem('nexus_config', JSON.stringify(config))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const set = (k, v) => setConfig(c => ({ ...c, [k]: v }))

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: 24, maxWidth: 720 }}>
      <div style={{ color: 'var(--accent-cyan)', fontSize: 16, fontWeight: 700, letterSpacing: 3, marginBottom: 24 }}>SETTINGS</div>

      <Section title="API KEYS — FREE TIER" color="var(--accent-green)">
        <Field label="Groq API Key" desc="FREE — Llama 3.3 70B + DeepSeek R1 at 1000 tok/s · console.groq.com">
          <input
            className="cyber-input"
            type="password"
            placeholder="gsk_..."
            value={config.groqKey}
            onChange={e => set('groqKey', e.target.value)}
            style={{ letterSpacing: config.groqKey ? 2 : 'normal' }}
          />
        </Field>
        <Field label="Gemini API Key" desc="FREE — 1M tokens/day · aistudio.google.com/apikey">
          <input
            className="cyber-input"
            type="password"
            placeholder="AIza..."
            value={config.geminiKey}
            onChange={e => set('geminiKey', e.target.value)}
            style={{ letterSpacing: config.geminiKey ? 2 : 'normal' }}
          />
        </Field>
        <div style={{ color: 'var(--accent-green)', fontSize: 10, marginTop: 2, padding: '6px 0', borderTop: '1px solid var(--accent-green)33' }}>
          ✓ Both are 100% free — no credit card. Get keys in under 60 seconds.
        </div>
      </Section>

      <Section title="API KEYS — PAID" color="var(--accent-red)">
        <Field label="Anthropic API Key" desc="Claude Opus 4.7 / Sonnet 4.6 — paid per token">
          <input
            className="cyber-input"
            type="password"
            placeholder="sk-ant-..."
            value={config.anthropicKey}
            onChange={e => set('anthropicKey', e.target.value)}
            style={{ letterSpacing: config.anthropicKey ? 2 : 'normal' }}
          />
        </Field>
        <Field label="OpenAI API Key" desc="GPT-4o / GPT-4o Mini — paid per token">
          <input
            className="cyber-input"
            type="password"
            placeholder="sk-..."
            value={config.openaiKey}
            onChange={e => set('openaiKey', e.target.value)}
            style={{ letterSpacing: config.openaiKey ? 2 : 'normal' }}
          />
        </Field>
      </Section>

      <Section title="AI ENGINE" color="var(--accent-purple)">
        <Field label="Ollama Model" desc="Model used when no cloud API key is set">
          <select className="cyber-input" value={config.ollamaModel} onChange={e => set('ollamaModel', e.target.value)}>
            <option value="qwen2.5:32b">qwen2.5:32b (Recommended — Best quality)</option>
            <option value="llama3.2:latest">llama3.2 (Fast)</option>
            <option value="mistral:latest">mistral (Balanced)</option>
          </select>
        </Field>
        <Field label="Ollama URL" desc="Local Ollama server address">
          <input className="cyber-input" value={config.ollamaUrl} onChange={e => set('ollamaUrl', e.target.value)} />
        </Field>
      </Section>

      <Section title="BACKEND" color="var(--accent-cyan)">
        <Field label="Backend Port" desc="FastAPI backend port">
          <input className="cyber-input" value={config.backendPort} onChange={e => set('backendPort', e.target.value)} />
        </Field>
      </Section>

      <Section title="TOOLS" color="var(--accent-orange)">
        <Field label="Default Nmap Flags" desc="Default flags for nmap scans">
          <input className="cyber-input" value={config.defaultFlags} onChange={e => set('defaultFlags', e.target.value)} />
        </Field>
      </Section>

      <Section title="VOICE" color="var(--accent-green)">
        <Field label="Whisper Model" desc="Larger = more accurate, slower">
          <select className="cyber-input" value={config.voiceModel} onChange={e => set('voiceModel', e.target.value)}>
            <option value="tiny">tiny (Fastest)</option>
            <option value="base">base (Recommended)</option>
            <option value="small">small (Better accuracy)</option>
            <option value="medium">medium (Best accuracy)</option>
          </select>
        </Field>
      </Section>

      <Section title="GENERAL" color="var(--accent-yellow)">
        <Field label="Auto Save" desc="Auto-save findings and notes">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              onClick={() => set('autoSave', !config.autoSave)}
              style={{
                width: 40, height: 20, borderRadius: 10,
                background: config.autoSave ? 'var(--accent-green)' : 'var(--border)',
                cursor: 'pointer', position: 'relative', transition: 'background 0.2s'
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: '50%', background: 'white',
                position: 'absolute', top: 2, left: config.autoSave ? 22 : 2,
                transition: 'left 0.2s'
              }} />
            </div>
            <span style={{ color: config.autoSave ? 'var(--accent-green)' : 'var(--text-muted)', fontSize: 11 }}>
              {config.autoSave ? 'ON' : 'OFF'}
            </span>
          </div>
        </Field>
      </Section>

      <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="cyber-btn-green cyber-btn" onClick={save}>SAVE SETTINGS</button>
        {saved && <span style={{ color: 'var(--accent-green)', fontSize: 11 }}>✓ Saved!</span>}
      </div>

      <ClaudeCodeSection port={config.backendPort} />

      <div style={{ marginTop: 32, padding: 16, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div style={{ color: 'var(--accent-cyan)', fontSize: 11, marginBottom: 10, letterSpacing: 2 }}>SYSTEM INFO</div>
        <Info label="App Version" value="1.0.0" />
        <Info label="Free Cloud" value={`${config.groqKey ? 'Groq ✓' : 'Groq ✗'}  ${config.geminiKey ? 'Gemini ✓' : 'Gemini ✗'}`} />
        <Info label="Paid Cloud" value={`${config.anthropicKey ? 'Claude ✓' : 'Claude ✗'}  ${config.openaiKey ? 'GPT-4o ✓' : 'GPT-4o ✗'}`} />
        <Info label="Local Model" value={config.ollamaModel} />
        <Info label="Backend" value={`FastAPI @ port ${config.backendPort}`} />
        <Info label="Storage" value="SQLite + ChromaDB (local)" />
      </div>
    </div>
  )
}

function Section({ title, color, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ color, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10, paddingBottom: 6, borderBottom: `1px solid ${color}33` }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </div>
  )
}

function Field({ label, desc, children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16, alignItems: 'center' }}>
      <div>
        <div style={{ color: 'var(--text-primary)', fontSize: 12 }}>{label}</div>
        {desc && <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>{desc}</div>}
      </div>
      <div>{children}</div>
    </div>
  )
}

function Info({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
      <span style={{ color: 'var(--text-muted)', fontSize: 11, minWidth: 120 }}>{label}:</span>
      <span style={{ color: 'var(--accent-cyan)', fontSize: 11 }}>{value}</span>
    </div>
  )
}

function ClaudeCodeSection({ port = '8765' }) {
  const [copied, setCopied] = useState(false)
  const config = JSON.stringify({
    mcpServers: {
      "nexus-ultra": {
        type: "http",
        url: `http://localhost:${port}/mcp`,
      }
    }
  }, null, 2)

  const copy = useCallback(() => {
    navigator.clipboard.writeText(config).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [config])

  return (
    <div style={{ marginTop: 24, marginBottom: 24 }}>
      <div style={{ color: 'var(--accent-purple)', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid var(--accent-purple)33' }}>
        CLAUDE CODE INTEGRATION
      </div>
      <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginBottom: 12, lineHeight: 1.6 }}>
        Connect Claude Code CLI to NEXUS ULTRA. Once connected, Claude Code can read your targets, findings, and reports — and add findings directly from the terminal.
      </div>
      <div style={{ marginBottom: 10 }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 6 }}>
          1. Make sure NEXUS ULTRA is open (the backend must be running)
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 6 }}>
          2. Add this to <code style={{ color: 'var(--accent-cyan)', background: 'var(--bg-card)', padding: '1px 5px' }}>{configPath}</code>:
        </div>
      </div>
      <div style={{ position: 'relative' }}>
        <pre style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--accent-purple)44',
          padding: '12px 14px',
          fontSize: 11,
          color: 'var(--accent-cyan)',
          fontFamily: 'monospace',
          margin: 0,
          overflowX: 'auto',
          lineHeight: 1.5,
        }}>
          {config}
        </pre>
        <button
          onClick={copy}
          style={{
            position: 'absolute', top: 8, right: 8,
            background: copied ? 'var(--accent-green)22' : 'var(--bg-secondary)',
            border: `1px solid ${copied ? 'var(--accent-green)' : 'var(--border)'}`,
            color: copied ? 'var(--accent-green)' : 'var(--text-muted)',
            padding: '3px 10px', fontSize: 10, cursor: 'pointer',
            fontFamily: 'inherit', letterSpacing: 1,
          }}
        >
          {copied ? '✓ COPIED' : 'COPY'}
        </button>
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 10 }}>
        3. Open a terminal and run{' '}
        <code style={{ color: 'var(--accent-cyan)', background: 'var(--bg-card)', padding: '1px 5px' }}>claude</code>{' '}
        — then try: <em style={{ color: 'var(--text-secondary)' }}>"list my NEXUS targets"</em> or <em style={{ color: 'var(--text-secondary)' }}>"show critical findings for target 1"</em>
      </div>
    </div>
  )
}
