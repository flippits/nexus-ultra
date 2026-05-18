import { useState } from 'react'
import { useStore } from '../store'
import { askAI } from '../utils/api'
import ReactMarkdown from 'react-markdown'

const CATEGORIES = ['web', 'pwn', 'crypto', 'forensics', 'misc', 'reversing', 'osint', 'steg']
const CAT_ICONS = { web: '🌐', pwn: '💥', crypto: '🔐', forensics: '🔬', misc: '❓', reversing: '⚙', osint: '🌍', steg: '🖼' }
const CAT_COLORS = {
  web: 'var(--accent-cyan)', pwn: 'var(--accent-red)', crypto: 'var(--accent-yellow)',
  forensics: 'var(--accent-green)', misc: 'var(--text-muted)', reversing: 'var(--accent-orange)',
  osint: 'var(--accent-green)', steg: 'var(--accent-purple)'
}

export default function CTFPage() {
  const { addNotification } = useStore()
  const [challenges, setChallenges] = useState([])
  const [activeChallenge, setActiveChallenge] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', category: 'web', description: '', points: 100 })
  const [flags, setFlags] = useState({})
  const [notes, setNotes] = useState({})
  const [hintLoading, setHintLoading] = useState(false)
  const [hint, setHint] = useState(null)
  const [filterCat, setFilterCat] = useState('all')

  const addChallenge = () => {
    if (!form.name) return
    const ch = { ...form, id: Date.now(), status: 'unsolved', created: Date.now() }
    setChallenges(c => [...c, ch])
    setForm({ name: '', category: 'web', description: '', points: 100 })
    setShowForm(false)
  }

  const submitFlag = (id, flag) => {
    if (!flag.trim()) return
    setChallenges(cs => cs.map(c => c.id === id ? { ...c, status: 'solved', flag: flag.trim() } : c))
    addNotification({ type: 'success', title: '🏴 FLAG CAPTURED!', message: flag.trim() })
  }

  const getHint = async (challenge) => {
    setHintLoading(true)
    setHint(null)
    try {
      const r = await askAI({
        message: `I'm solving a CTF challenge. Category: ${challenge.category}. Name: ${challenge.name}. Description: ${challenge.description || 'No description'}. Give me a hint without spoiling the solution. Start with the category-specific approach.`,
        agent: 'ctf'
      })
      setHint(r.data.response)
    } catch {
      setHint('Could not get hint. Make sure AI is running.')
    }
    setHintLoading(false)
  }

  const solved = challenges.filter(c => c.status === 'solved')
  const totalPoints = solved.reduce((acc, c) => acc + (parseInt(c.points) || 0), 0)
  const filtered = challenges.filter(c => filterCat === 'all' || c.category === filterCat)

  return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden' }}>
      {/* Challenge list */}
      <div style={{ width: 320, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--bg-secondary)' }}>
        <div style={{ padding: 12, borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ color: 'var(--accent-red)', fontSize: 14, fontWeight: 700, letterSpacing: 3 }}>CTF MODE</div>
              <div style={{ color: 'var(--accent-yellow)', fontSize: 11 }}>
                {solved.length}/{challenges.length} solved — {totalPoints} pts
              </div>
            </div>
            <button className="cyber-btn" onClick={() => setShowForm(!showForm)}>+ ADD</button>
          </div>
          {/* Category filter */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            <button
              style={{ background: filterCat === 'all' ? 'rgba(0,245,255,0.15)' : 'transparent', border: `1px solid ${filterCat === 'all' ? 'var(--accent-cyan)' : 'var(--border)'}`, color: filterCat === 'all' ? 'var(--accent-cyan)' : 'var(--text-muted)', padding: '2px 8px', cursor: 'pointer', fontSize: 9, fontFamily: 'inherit', textTransform: 'uppercase', letterSpacing: 1 }}
              onClick={() => setFilterCat('all')}
            >ALL</button>
            {CATEGORIES.map(c => (
              <button
                key={c}
                style={{ background: filterCat === c ? `${CAT_COLORS[c]}22` : 'transparent', border: `1px solid ${filterCat === c ? CAT_COLORS[c] : 'var(--border)'}`, color: filterCat === c ? CAT_COLORS[c] : 'var(--text-muted)', padding: '2px 8px', cursor: 'pointer', fontSize: 9, fontFamily: 'inherit', textTransform: 'uppercase', letterSpacing: 1 }}
                onClick={() => setFilterCat(c)}
              >{CAT_ICONS[c]}</button>
            ))}
          </div>
        </div>

        {showForm && (
          <div style={{ padding: 12, borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            <input className="cyber-input" placeholder="Challenge name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ marginBottom: 6 }} />
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <select className="cyber-input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ flex: 2 }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
              </select>
              <input className="cyber-input" placeholder="Points" type="number" value={form.points} onChange={e => setForm({ ...form, points: e.target.value })} style={{ flex: 1 }} />
            </div>
            <textarea className="cyber-input" placeholder="Description (optional)" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ marginBottom: 6, resize: 'none' }} />
            <button className="cyber-btn-green cyber-btn" onClick={addChallenge} style={{ width: '100%' }}>ADD CHALLENGE</button>
          </div>
        )}

        <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
          {filtered.map(ch => (
            <div
              key={ch.id}
              onClick={() => { setActiveChallenge(ch); setHint(null) }}
              style={{
                padding: '8px 10px',
                background: activeChallenge?.id === ch.id ? `${CAT_COLORS[ch.category]}18` : 'transparent',
                border: `1px solid ${activeChallenge?.id === ch.id ? CAT_COLORS[ch.category] : 'var(--border)'}`,
                cursor: 'pointer',
                marginBottom: 4,
                borderLeft: `3px solid ${ch.status === 'solved' ? 'var(--accent-green)' : CAT_COLORS[ch.category]}`,
                opacity: ch.status === 'solved' ? 0.7 : 1,
                transition: 'all 0.15s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{CAT_ICONS[ch.category]}</span>
                  <span style={{ color: ch.status === 'solved' ? 'var(--accent-green)' : 'var(--text-primary)', fontSize: 12, textDecoration: ch.status === 'solved' ? 'line-through' : 'none' }}>
                    {ch.name}
                  </span>
                </div>
                <span style={{ color: 'var(--accent-yellow)', fontSize: 10 }}>{ch.points}pts</span>
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, marginLeft: 20 }}>{ch.category}</div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center', padding: 30 }}>
              No challenges yet. Add your first!
            </div>
          )}
        </div>
      </div>

      {/* Challenge workspace */}
      {activeChallenge ? (
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>{CAT_ICONS[activeChallenge.category]}</span>
                <div>
                  <div style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700 }}>{activeChallenge.name}</div>
                  <span className="tag" style={{ color: CAT_COLORS[activeChallenge.category] }}>{activeChallenge.category}</span>
                  <span style={{ color: 'var(--accent-yellow)', fontSize: 11, marginLeft: 8 }}>{activeChallenge.points} points</span>
                </div>
              </div>
              {activeChallenge.status === 'solved' && (
                <div style={{ marginTop: 8, padding: '4px 12px', background: 'rgba(0,255,157,0.1)', border: '1px solid var(--accent-green)', color: 'var(--accent-green)', fontSize: 11, display: 'inline-block' }}>
                  ✓ SOLVED — {activeChallenge.flag}
                </div>
              )}
            </div>
          </div>

          {activeChallenge.description && (
            <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Description</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.6 }}>{activeChallenge.description}</div>
            </div>
          )}

          {/* Notes */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Notes</div>
            <textarea
              className="cyber-input"
              rows={6}
              placeholder="Your notes, attempts, findings..."
              value={notes[activeChallenge.id] || ''}
              onChange={e => setNotes(n => ({ ...n, [activeChallenge.id]: e.target.value }))}
              style={{ resize: 'vertical', fontFamily: 'JetBrains Mono, monospace' }}
            />
          </div>

          {/* Flag submit */}
          {activeChallenge.status !== 'solved' && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Submit Flag</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="cyber-input"
                  placeholder="flag{...}"
                  value={flags[activeChallenge.id] || ''}
                  onChange={e => setFlags(f => ({ ...f, [activeChallenge.id]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && submitFlag(activeChallenge.id, flags[activeChallenge.id] || '')}
                  style={{ flex: 1 }}
                />
                <button
                  className="cyber-btn-green cyber-btn"
                  onClick={() => submitFlag(activeChallenge.id, flags[activeChallenge.id] || '')}
                >
                  SUBMIT
                </button>
              </div>
            </div>
          )}

          {/* AI Hint */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>AI Hint</div>
              <button
                className="cyber-btn"
                style={{ fontSize: 10, padding: '3px 10px', borderColor: 'var(--accent-purple)', color: 'var(--accent-purple)' }}
                onClick={() => getHint(activeChallenge)}
                disabled={hintLoading}
              >
                {hintLoading ? 'THINKING...' : '🧠 GET HINT'}
              </button>
            </div>
            {hint && (
              <div style={{ padding: 14, background: 'var(--bg-card)', border: '1px solid var(--accent-purple)44', color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.6 }} className="fade-in">
                <ReactMarkdown>{hint}</ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏴</div>
            <div>Select or add a challenge to start</div>
          </div>
        </div>
      )}
    </div>
  )
}
