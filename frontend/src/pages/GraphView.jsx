import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store'
import { getGraph, addNode, addEdge, deleteNode } from '../utils/api'
import CytoscapeComponent from 'react-cytoscapejs'
import cytoscape from 'cytoscape'

const NODE_COLORS = {
  host: '#00f5ff',
  domain: '#00ff9d',
  ip: '#7c3aed',
  port: '#ff6b35',
  service: '#ffd700',
  vulnerability: '#ff3366',
  credential: '#ff0040',
  person: '#00f5ff',
  organization: '#00ff9d',
  url: '#ff6b35',
  email: '#ffd700',
  hash: '#7c3aed',
}

const CY_STYLE = [
  {
    selector: 'node',
    style: {
      'background-color': 'ele => NODE_COLORS[ele.data("type")] || "#00f5ff"',
      'border-width': 2,
      'border-color': '#00f5ff',
      'color': '#e2e8f0',
      'label': 'data(label)',
      'font-size': 10,
      'font-family': 'JetBrains Mono, monospace',
      'text-valign': 'bottom',
      'text-margin-y': 4,
      'width': 36,
      'height': 36,
      'text-background-color': '#0a0a0f',
      'text-background-opacity': 0.7,
      'text-background-padding': 2,
      'overlay-padding': 4,
    }
  },
  {
    selector: 'node[type="host"]',
    style: { 'background-color': '#00f5ff', 'border-color': '#00f5ff', 'shape': 'round-rectangle' }
  },
  {
    selector: 'node[type="domain"]',
    style: { 'background-color': '#00ff9d', 'border-color': '#00ff9d', 'shape': 'ellipse' }
  },
  {
    selector: 'node[type="ip"]',
    style: { 'background-color': '#7c3aed', 'border-color': '#7c3aed', 'shape': 'diamond' }
  },
  {
    selector: 'node[type="vulnerability"]',
    style: { 'background-color': '#ff3366', 'border-color': '#ff3366', 'shape': 'star', 'width': 28, 'height': 28 }
  },
  {
    selector: 'node[type="credential"]',
    style: { 'background-color': '#ff0040', 'border-color': '#ff0040', 'shape': 'triangle' }
  },
  {
    selector: 'node[type="port"]',
    style: { 'background-color': '#ff6b35', 'border-color': '#ff6b35', 'shape': 'round-rectangle', 'width': 24, 'height': 24 }
  },
  {
    selector: 'node[type="service"]',
    style: { 'background-color': '#ffd700', 'border-color': '#ffd700', 'shape': 'hexagon', 'width': 30, 'height': 30 }
  },
  {
    selector: 'node:selected',
    style: { 'border-width': 3, 'border-color': '#ffffff', 'box-shadow': '0 0 20px #ffffff' }
  },
  {
    selector: 'edge',
    style: {
      'width': 1.5,
      'line-color': '#1e2a3a',
      'target-arrow-color': '#1e2a3a',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'label': 'data(label)',
      'font-size': 9,
      'color': '#475569',
      'font-family': 'JetBrains Mono, monospace',
      'text-background-color': '#0a0a0f',
      'text-background-opacity': 0.7,
      'text-background-padding': 2,
    }
  },
  {
    selector: 'edge:selected',
    style: { 'line-color': '#00f5ff', 'target-arrow-color': '#00f5ff', 'width': 2 }
  }
]

export default function GraphView() {
  const { activeTarget, graphNodes, graphEdges, setGraphData, addNotification } = useStore()
  const [cyRef, setCyRef] = useState(null)
  const [selected, setSelected] = useState(null)
  const [addNodeForm, setAddNodeForm] = useState(false)
  const [nodeForm, setNodeForm] = useState({ label: '', type: 'host', value: '' })
  const [layout, setLayout] = useState('cose')

  useEffect(() => {
    if (!activeTarget) return
    getGraph(activeTarget.id).then(r => {
      setGraphData(r.data.nodes || [], r.data.edges || [])
    }).catch(console.error)
  }, [activeTarget])

  const elements = [
    ...graphNodes.map(n => ({
      data: { id: n.id, label: n.label || n.value || n.id, type: n.type, ...n }
    })),
    ...graphEdges.map(e => ({
      data: { id: e.id, source: e.source_id, target: e.target_id, label: e.label || '' }
    }))
  ]

  const handleAddNode = async () => {
    if (!nodeForm.label || !activeTarget) return
    try {
      const r = await addNode(activeTarget.id, nodeForm)
      const node = r.data
      // Refresh graph
      const gr = await getGraph(activeTarget.id)
      setGraphData(gr.data.nodes, gr.data.edges)
      setAddNodeForm(false)
      setNodeForm({ label: '', type: 'host', value: '' })
      addNotification({ type: 'success', title: 'Node Added', message: `${node.label} added to graph` })
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'Failed to add node' })
    }
  }

  const handleLayout = (name) => {
    setLayout(name)
    if (cyRef) {
      cyRef.layout({ name, animate: true, animationDuration: 500 }).run()
    }
  }

  const handleFit = () => cyRef?.fit(undefined, 40)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {/* Toolbar */}
      <div style={{
        padding: '10px 16px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0
      }}>
        <span style={{ color: 'var(--accent-cyan)', fontSize: 12, letterSpacing: 2, fontWeight: 700 }}>GRAPH</span>
        {activeTarget && <span style={{ color: 'var(--accent-orange)', fontSize: 11 }}>{activeTarget.name}</span>}
        <div style={{ flex: 1 }} />
        <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>Layout:</span>
        {['cose', 'circle', 'grid', 'breadthfirst'].map(l => (
          <button
            key={l}
            className="cyber-btn"
            style={{ fontSize: 9, padding: '3px 8px', opacity: layout === l ? 1 : 0.5 }}
            onClick={() => handleLayout(l)}
          >{l}</button>
        ))}
        <button className="cyber-btn" style={{ fontSize: 9 }} onClick={handleFit}>FIT</button>
        <button className="cyber-btn-green cyber-btn" onClick={() => setAddNodeForm(true)}>+ NODE</button>
      </div>

      {!activeTarget ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
          Select a target to view its graph
        </div>
      ) : (
        <div style={{ flex: 1, position: 'relative' }}>
          <CytoscapeComponent
            elements={elements}
            style={{ width: '100%', height: '100%', background: 'var(--bg-primary)' }}
            stylesheet={CY_STYLE}
            layout={{ name: layout, animate: true }}
            cy={(cy) => {
              setCyRef(cy)
              cy.removeAllListeners()
              cy.on('tap', 'node', (e) => setSelected(e.target.data()))
              cy.on('tap', (e) => { if (e.target === cy) setSelected(null) })
            }}
          />
          {elements.length === 0 && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', pointerEvents: 'none'
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🕸</div>
              <div>No nodes yet. Add nodes to build your target map.</div>
            </div>
          )}
        </div>
      )}

      {/* Node inspector */}
      {selected && (
        <div style={{
          position: 'absolute', right: 16, top: 60,
          width: 240,
          background: 'var(--bg-card)',
          border: '1px solid var(--accent-cyan)',
          padding: 16,
          boxShadow: 'var(--glow-cyan)'
        }} className="fade-in">
          <div style={{ color: 'var(--accent-cyan)', fontSize: 11, letterSpacing: 2, marginBottom: 10 }}>NODE INFO</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Object.entries(selected).filter(([k]) => !['id', 'source', 'target'].includes(k)).map(([k, v]) => (
              <div key={k}>
                <span style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase' }}>{k}: </span>
                <span style={{ color: 'var(--text-primary)', fontSize: 11 }}>{String(v)}</span>
              </div>
            ))}
          </div>
          <button className="cyber-btn-red cyber-btn" style={{ marginTop: 10, width: '100%', fontSize: 10 }} onClick={() => setSelected(null)}>CLOSE</button>
        </div>
      )}

      {/* Add node form */}
      {addNodeForm && (
        <div style={{
          position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
          background: 'var(--bg-card)',
          border: '1px solid var(--accent-cyan)',
          padding: 24, width: 360,
          boxShadow: 'var(--glow-cyan)',
          zIndex: 100
        }} className="fade-in">
          <div style={{ color: 'var(--accent-cyan)', fontSize: 13, letterSpacing: 2, marginBottom: 16 }}>ADD NODE</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }}>Type</label>
              <select className="cyber-input" value={nodeForm.type} onChange={e => setNodeForm({ ...nodeForm, type: e.target.value })}>
                {Object.keys(NODE_COLORS).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }}>Label</label>
              <input className="cyber-input" placeholder="Display name" value={nodeForm.label} onChange={e => setNodeForm({ ...nodeForm, label: e.target.value })} />
            </div>
            <div>
              <label style={{ color: 'var(--text-muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }}>Value</label>
              <input className="cyber-input" placeholder="IP, domain, port, etc." value={nodeForm.value} onChange={e => setNodeForm({ ...nodeForm, value: e.target.value })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button className="cyber-btn-green cyber-btn" style={{ flex: 1 }} onClick={handleAddNode}>ADD</button>
            <button className="cyber-btn" onClick={() => setAddNodeForm(false)}>CANCEL</button>
          </div>
        </div>
      )}
    </div>
  )
}
