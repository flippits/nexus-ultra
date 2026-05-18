import { useEffect, useState } from 'react'
import { useStore } from '../store'
import { getTargets, createTarget, deleteTarget } from '../utils/api'

export default function TargetManager() {
  const { targets, setTargets, setActiveTarget, setActiveView, addNotification, activeTarget } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', ip: '', domain: '', description: '', type: 'host' })
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    getTargets().then(r => setTargets(r.data)).catch(console.error)
  }, [])

  const handleCreate = async () => {
    if (!form.name) return
    setLoading(true)
    try {
      const r = await createTarget(form)
      setTargets([...targets, r.data])
      setForm({ name: '', ip: '', domain: '', description: '', type: 'host' })
      setShowForm(false)
      addNotification({ type: 'success', title: 'Target Added', message: `${r.data.name} added to target list` })
    } catch (e) {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to create target' })
    }
    setLoading(false)
  }

  const handleDelete = async (id, name) => {
    try {
      await deleteTarget(id)
      setTargets(targets.filter(t => t.id !== id))
      addNotification({ type: 'info', title: 'Target Removed', message: `${name} removed` })
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to delete target' })
    }
  }

  const filtered = targets.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.ip || '').includes(search) ||
    (t.domain || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ color: 'var(--accent-cyan)', fontSize: 18, fontWeight: 700, letterSpacing: 3 }}>TARGETS</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{targets.length} TARGETS IN DATABASE</div>
        </div>
        <button className="cyber-btn" onClick={() => setShowForm(!showForm)}>+ ADD TARGET</button>
      </div>

      {showForm && (
        <div className="cyber-card fade-in" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ color: 'var(--accent-cyan)', fontSize: 12, letterSpacing: 2, marginBottom: 16, textTransform: 'uppercase' }}>New Target</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Name *</label>
              <input className="cyber-input" placeholder="Target name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Type</label>
              <select className="cyber-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="host">Host</option>
                <option value="network">Network</option>
                <option value="domain">Domain</option>
                <option value="webapp">Web App</option>
                <option value="organization">Organization</option>
              </select>
            </div>
            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>IP / Range</label>
              <input className="cyber-input" placeholder="192.168.1.1 or 10.0.0.0/24" value={form.ip} onChange={e => setForm({ ...form, ip: e.target.value })} />
            </div>
            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Domain</label>
              <input className="cyber-input" placeholder="example.com" value={form.domain} onChange={e => setForm({ ...form, domain: e.target.value })} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ color: 'var(--text-muted)', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Description</label>
              <textarea className="cyber-input" placeholder="Notes about this target..." rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ resize: 'vertical' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="cyber-btn-green cyber-btn" onClick={handleCreate} disabled={loading}>
              {loading ? 'ADDING...' : 'ADD TARGET'}
            </button>
            <button className="cyber-btn" onClick={() => setShowForm(false)}>CANCEL</button>
          </div>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <input className="cyber-input" placeholder="Search targets..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
        {filtered.map(t => (
          <TargetCard
            key={t.id}
            target={t}
            isActive={activeTarget?.id === t.id}
            onSetActive={() => setActiveTarget(t)}
            onGraph={() => { setActiveTarget(t); setActiveView('graph') }}
            onDelete={() => handleDelete(t.id, t.name)}
          />
        ))}
      </div>
      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 60 }}>
          {search ? 'No targets match your search' : 'No targets yet. Add your first target above.'}
        </div>
      )}
    </div>
  )
}

function TargetCard({ target, isActive, onSetActive, onGraph, onDelete }) {
  const TYPE_COLOR = {
    host: 'var(--accent-cyan)',
    network: 'var(--accent-green)',
    domain: 'var(--accent-orange)',
    webapp: 'var(--accent-purple)',
    organization: 'var(--accent-yellow)',
  }
  const color = TYPE_COLOR[target.type] || 'var(--accent-cyan)'

  return (
    <div className="cyber-card" style={{ padding: 16 }}
      onMouseEnter={e => e.currentTarget.style.borderColor = color + '88'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>{target.name}</div>
          <span className="tag" style={{ color, marginTop: 4 }}>{target.type}</span>
        </div>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: target.status === 'active' ? 'var(--accent-green)' : 'var(--text-muted)',
          marginTop: 4
        }} className={target.status === 'active' ? 'pulse' : ''} />
      </div>
      {target.ip && <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>IP: <span style={{ color: 'var(--text-secondary)' }}>{target.ip}</span></div>}
      {target.domain && <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 4 }}>Domain: <span style={{ color: 'var(--text-secondary)' }}>{target.domain}</span></div>}
      {target.description && <div style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 10, borderTop: '1px solid var(--border)', paddingTop: 8 }}>{target.description}</div>}
      <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
        <button
          className="cyber-btn"
          style={{ flex: 1, borderColor: isActive ? 'var(--accent-orange)' : undefined, color: isActive ? 'var(--accent-orange)' : undefined, background: isActive ? 'var(--accent-orange)11' : undefined }}
          onClick={onSetActive}
        >{isActive ? '● ACTIVE' : 'SET ACTIVE'}</button>
        <button className="cyber-btn" style={{ fontSize: 11 }} onClick={onGraph} title="Open in graph">🕸</button>
        <button className="cyber-btn-red cyber-btn" onClick={onDelete}>✕</button>
      </div>
    </div>
  )
}
