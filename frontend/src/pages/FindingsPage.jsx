import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { getFindings, addFinding, updateFinding, deleteFinding } from '../utils/api'

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info']
const SEV_COLOR = {
  critical: '#ff0040', high: '#ff3366', medium: '#ff6b35', low: '#ffd700', info: '#00f5ff'
}

export default function FindingsPage() {
  const { findings, setFindings, activeTarget, targets, addNotification } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ title: '', severity: 'medium', description: '', evidence: '', cve: '', target_id: '' })

  const handleDelete = async (id) => {
    try {
      await deleteFinding(id)
      setFindings(findings.filter(f => f.id !== id))
      if (selected?.id === id) setSelected(null)
      addNotification({ type: 'success', title: 'Deleted', message: 'Finding removed' })
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to delete finding' })
    }
  }

  useEffect(() => {
    const id = activeTarget?.id || null
    getFindings(id).then(r => setFindings(r.data)).catch(console.error)
  }, [activeTarget])

  useEffect(() => {
    if (activeTarget) setForm(f => ({ ...f, target_id: activeTarget.id }))
  }, [activeTarget])

  const handleAdd = async () => {
    if (!form.title) return
    try {
      const r = await addFinding(form)
      setFindings([r.data, ...findings])
      setShowForm(false)
      setForm({ title: '', severity: 'medium', description: '', evidence: '', cve: '', target_id: activeTarget?.id || '' })
      addNotification({ type: 'success', title: 'Finding Added', message: form.title })
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to add finding' })
    }
  }

  const filtered = findings
    .filter(f => filter === 'all' || f.severity === filter)
    .filter(f => !search || f.title.toLowerCase().includes(search.toLowerCase()) || (f.description || '').toLowerCase().includes(search.toLowerCase()))

  const counts = SEVERITIES.reduce((acc, s) => ({ ...acc, [s]: findings.filter(f => f.severity === s).length }), {})

  return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden' }}>
      {/* List */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ color: 'var(--accent-cyan)', fontSize: 14, fontWeight: 700, letterSpacing: 3 }}>FINDINGS</div>
              <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{findings.length} TOTAL</div>
            </div>
            <button className="cyber-btn" onClick={() => setShowForm(!showForm)}>+ ADD FINDING</button>
          </div>
          {/* Severity filter */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <FilterBtn label="ALL" count={findings.length} active={filter === 'all'} color="var(--accent-cyan)" onClick={() => setFilter('all')} />
            {SEVERITIES.map(s => (
              <FilterBtn key={s} label={s.toUpperCase()} count={counts[s]} active={filter === s} color={SEV_COLOR[s]} onClick={() => setFilter(s)} />
            ))}
          </div>
          <input className="cyber-input" placeholder="Search findings..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Add form */}
        {showForm && (
          <div style={{ padding: 16, borderBottom: '1px solid var(--border)', background: 'var(--bg-card)' }} className="fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }}>Title *</label>
                <input className="cyber-input" placeholder="Finding title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }}>Severity</label>
                <select className="cyber-input" value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })}>
                  {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }}>CVE</label>
                <input className="cyber-input" placeholder="CVE-2024-XXXX" value={form.cve} onChange={e => setForm({ ...form, cve: e.target.value })} />
              </div>
              <div>
                <label style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }}>Target</label>
                <select className="cyber-input" value={form.target_id} onChange={e => setForm({ ...form, target_id: e.target.value })}>
                  <option value="">Select target...</option>
                  {targets.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }}>Description</label>
                <textarea className="cyber-input" rows={3} placeholder="Describe the vulnerability..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }}>Evidence</label>
                <textarea className="cyber-input" rows={2} placeholder="Paste command output, screenshots paths, etc..." value={form.evidence} onChange={e => setForm({ ...form, evidence: e.target.value })} style={{ resize: 'vertical', fontFamily: 'monospace' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="cyber-btn-green cyber-btn" onClick={handleAdd}>SAVE FINDING</button>
              <button className="cyber-btn" onClick={() => setShowForm(false)}>CANCEL</button>
            </div>
          </div>
        )}

        {/* Findings list */}
        <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(f => (
            <FindingCard key={f.id} finding={f} active={selected?.id === f.id} onClick={() => setSelected(selected?.id === f.id ? null : f)} onDelete={handleDelete} />
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 60 }}>
              {search || filter !== 'all' ? 'No findings match your filters' : 'No findings yet.'}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div style={{
          width: 360,
          background: 'var(--bg-secondary)',
          borderLeft: '1px solid var(--border)',
          padding: 20,
          overflow: 'auto',
          flexShrink: 0
        }} className="slide-in">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ color: SEV_COLOR[selected.severity], fontSize: 11, textTransform: 'uppercase', letterSpacing: 2 }}>{selected.severity}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="cyber-btn"
                style={{ fontSize: 10, padding: '3px 10px', borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
                onClick={() => handleDelete(selected.id)}
              >✕ DELETE</button>
              <button className="cyber-btn" style={{ fontSize: 10, padding: '3px 10px' }} onClick={() => setSelected(null)}>CLOSE</button>
            </div>
          </div>
          <div style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 700, marginBottom: 12 }}>{selected.title}</div>
          {selected.cve && <div style={{ marginBottom: 10 }}><span className="tag" style={{ color: 'var(--accent-orange)' }}>{selected.cve}</span></div>}
          {selected.description && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Description</div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.6 }}>{selected.description}</div>
            </div>
          )}
          {selected.evidence && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Evidence</div>
              <pre style={{ background: '#050508', padding: 10, color: 'var(--accent-green)', fontSize: 11, overflow: 'auto', border: '1px solid var(--border)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {selected.evidence}
              </pre>
            </div>
          )}
          <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>
            Added: {new Date(selected.created_at).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  )
}

function FilterBtn({ label, count, active, color, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? `${color}22` : 'transparent',
        border: `1px solid ${active ? color : 'var(--border)'}`,
        color: active ? color : 'var(--text-muted)',
        padding: '3px 10px', cursor: 'pointer',
        fontSize: 10, fontFamily: 'inherit', letterSpacing: 1
      }}
    >
      {label} {count > 0 && <span>({count})</span>}
    </button>
  )
}

function FindingCard({ finding, active, onClick, onDelete }) {
  const color = SEV_COLOR[finding.severity] || 'var(--accent-cyan)'
  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 16px',
        background: active ? 'var(--bg-hover)' : 'var(--bg-card)',
        border: `1px solid ${active ? color : 'var(--border)'}`,
        borderLeft: `4px solid ${color}`,
        cursor: 'pointer',
        transition: 'all 0.15s',
        position: 'relative'
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.borderColor = color + '88' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.borderColor = 'var(--border)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, flex: 1, marginRight: 8 }}>{finding.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 }}>{finding.severity}</span>
          <button
            onClick={e => { e.stopPropagation(); onDelete(finding.id) }}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, padding: '0 4px', lineHeight: 1 }}
            title="Delete finding"
          >✕</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
        {finding.cve && <span style={{ color: 'var(--accent-orange)', fontSize: 10 }}>{finding.cve}</span>}
        {finding.target_name && <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>→ {finding.target_name}</span>}
        <span style={{ color: 'var(--text-muted)', fontSize: 10, marginLeft: 'auto' }}>{new Date(finding.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  )
}
