import { useState } from 'react'

const STEPS = ['WELCOME', 'AI ENGINE', 'USE CASE', 'READY']

export default function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(0)
  const [groqKey, setGroqKey] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [useCase, setUseCase] = useState(null)

  const finish = () => {
    const existing = JSON.parse(localStorage.getItem('nexus_config') || '{}')
    localStorage.setItem('nexus_config', JSON.stringify({
      ...existing,
      groqKey: groqKey || existing.groqKey || '',
      geminiKey: geminiKey || existing.geminiKey || '',
      useCase: useCase || 'general',
    }))
    localStorage.setItem('nexus_onboarded', '1')
    onComplete()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0a0a0f',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', zIndex: 9999, padding: 40
    }}>
      {/* Progress */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 48 }}>
        {STEPS.map((s, i) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              border: `2px solid ${i <= step ? 'var(--accent-cyan)' : 'var(--border)'}`,
              background: i < step ? 'var(--accent-cyan)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, color: i < step ? '#000' : i === step ? 'var(--accent-cyan)' : 'var(--text-muted)',
              fontWeight: 700, transition: 'all 0.3s',
            }}>
              {i < step ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: 10, letterSpacing: 2, color: i === step ? 'var(--accent-cyan)' : 'var(--text-muted)' }}>
              {s}
            </span>
            {i < STEPS.length - 1 && (
              <div style={{ width: 40, height: 1, background: i < step ? 'var(--accent-cyan)' : 'var(--border)', marginRight: 4 }} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div style={{ width: '100%', maxWidth: 560 }} className="fade-in">
        {step === 0 && <StepWelcome />}
        {step === 1 && <StepAI groqKey={groqKey} setGroqKey={setGroqKey} geminiKey={geminiKey} setGeminiKey={setGeminiKey} />}
        {step === 2 && <StepUseCase useCase={useCase} setUseCase={setUseCase} />}
        {step === 3 && <StepReady useCase={useCase} hasKey={!!(groqKey || geminiKey)} />}
      </div>

      {/* Nav */}
      <div style={{ display: 'flex', gap: 12, marginTop: 40 }}>
        {step > 0 && (
          <button className="cyber-btn" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
            onClick={() => setStep(s => s - 1)}>
            ← BACK
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button className="cyber-btn" style={{ background: 'var(--accent-cyan)22', borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}
            onClick={() => setStep(s => s + 1)}>
            CONTINUE →
          </button>
        ) : (
          <button className="cyber-btn" style={{ background: 'var(--accent-green)22', borderColor: 'var(--accent-green)', color: 'var(--accent-green)' }}
            onClick={finish}>
            LAUNCH NEXUS ULTRA ▶
          </button>
        )}
        {step < 3 && (
          <button onClick={finish}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
            skip setup
          </button>
        )}
      </div>
    </div>
  )
}

function StepWelcome() {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontSize: 64, fontWeight: 900, color: 'var(--accent-cyan)',
        letterSpacing: 16, textShadow: '0 0 60px rgba(0,245,255,0.6)',
        marginBottom: 8
      }}>NEXUS</div>
      <div style={{ fontSize: 14, letterSpacing: 24, color: 'var(--accent-green)', marginBottom: 40 }}>U L T R A</div>
      <div style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.8, marginBottom: 32 }}>
        The most advanced AI-powered cybersecurity platform.<br />
        Reconnaissance · Exploitation · OSINT · Reporting — all in one.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { icon: '🧠', label: 'AI Agents', desc: '12 specialized elite agents' },
          { icon: '⚡', label: 'Groq Speed', desc: '1000 tok/s with Llama 3.3 70B' },
          { icon: '🐉', label: 'Kali Linux', desc: 'Full Docker integration' },
        ].map(f => (
          <div key={f.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '16px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{f.icon}</div>
            <div style={{ color: 'var(--accent-cyan)', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{f.label}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function StepAI({ groqKey, setGroqKey, geminiKey, setGeminiKey }) {
  return (
    <div>
      <div style={{ color: 'var(--accent-cyan)', fontSize: 16, fontWeight: 700, letterSpacing: 3, marginBottom: 8 }}>
        AI ENGINE SETUP
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 28, lineHeight: 1.6 }}>
        NEXUS works with local Ollama models out of the box. For elite cloud AI with native tool use, add free API keys below.
      </div>

      <div style={{ background: 'var(--accent-green)11', border: '1px solid var(--accent-green)44', padding: '12px 16px', marginBottom: 24 }}>
        <div style={{ color: 'var(--accent-green)', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>★ RECOMMENDED — GROQ (FREE)</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 12 }}>
          Llama 3.3 70B + DeepSeek R1 with native tool calling at 1000 tok/s. Get a free key in 60 seconds at console.groq.com
        </div>
        <input
          className="cyber-input"
          type="password"
          placeholder="gsk_..."
          value={groqKey}
          onChange={e => setGroqKey(e.target.value)}
          style={{ borderColor: groqKey ? 'var(--accent-green)' : 'var(--border)' }}
        />
      </div>

      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '12px 16px', marginBottom: 16 }}>
        <div style={{ color: 'var(--accent-purple)', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>GOOGLE GEMINI (FREE — 1M tokens/day)</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 12 }}>
          Gemini 2.0 Flash. Free at aistudio.google.com/apikey
        </div>
        <input
          className="cyber-input"
          type="password"
          placeholder="AIza..."
          value={geminiKey}
          onChange={e => setGeminiKey(e.target.value)}
          style={{ borderColor: geminiKey ? 'var(--accent-purple)' : 'var(--border)' }}
        />
      </div>

      <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>
        No keys? No problem — NEXUS uses your local Ollama models automatically.
      </div>
    </div>
  )
}

function StepUseCase({ useCase, setUseCase }) {
  const cases = [
    { id: 'ctf',   icon: '🏴', title: 'CTF Competitor',    desc: 'Capture The Flag challenges, puzzle solving, binary exploitation' },
    { id: 'pentest', icon: '💥', title: 'Penetration Tester', desc: 'Professional red team engagements, client assessments' },
    { id: 'osint',  icon: '🌐', title: 'OSINT Researcher',   desc: 'Open-source intelligence, threat research, investigations' },
    { id: 'general', icon: '⚡', title: 'All of the above',   desc: 'Full-spectrum offensive security operations' },
  ]
  return (
    <div>
      <div style={{ color: 'var(--accent-cyan)', fontSize: 16, fontWeight: 700, letterSpacing: 3, marginBottom: 8 }}>
        YOUR PRIMARY USE CASE
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 24 }}>
        NEXUS will optimize the AI agent defaults for your workflow.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {cases.map(c => (
          <div
            key={c.id}
            onClick={() => setUseCase(c.id)}
            style={{
              padding: '14px 16px',
              background: useCase === c.id ? 'var(--accent-cyan)15' : 'var(--bg-card)',
              border: `1px solid ${useCase === c.id ? 'var(--accent-cyan)' : 'var(--border)'}`,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
              transition: 'all 0.15s',
            }}
          >
            <span style={{ fontSize: 24 }}>{c.icon}</span>
            <div>
              <div style={{ color: useCase === c.id ? 'var(--accent-cyan)' : 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>{c.title}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>{c.desc}</div>
            </div>
            {useCase === c.id && <span style={{ marginLeft: 'auto', color: 'var(--accent-cyan)', fontSize: 16 }}>✓</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function StepReady({ useCase, hasKey }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🚀</div>
      <div style={{ color: 'var(--accent-green)', fontSize: 18, fontWeight: 700, letterSpacing: 3, marginBottom: 16 }}>
        ALL SYSTEMS GO
      </div>
      <div style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.8, marginBottom: 32 }}>
        NEXUS ULTRA is configured and ready to deploy.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, textAlign: 'left', maxWidth: 360, margin: '0 auto' }}>
        {[
          { ok: true,   label: 'Backend engine',     value: 'Online' },
          { ok: hasKey, label: 'Cloud AI (free)',     value: hasKey ? 'Configured' : 'Using local Ollama' },
          { ok: true,   label: 'Local AI (Ollama)',   value: 'Ready' },
          { ok: !!useCase, label: 'Workflow profile', value: useCase || 'General' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <span style={{ color: item.ok ? 'var(--accent-green)' : 'var(--accent-yellow)', fontSize: 14 }}>
              {item.ok ? '✓' : '⚠'}
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: 12, flex: 1 }}>{item.label}</span>
            <span style={{ color: item.ok ? 'var(--accent-green)' : 'var(--accent-yellow)', fontSize: 11 }}>{item.value}</span>
          </div>
        ))}
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 24 }}>
        Press <kbd style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '2px 6px', borderRadius: 3 }}>⌘K</kbd> anytime to open the command palette
      </div>
    </div>
  )
}
