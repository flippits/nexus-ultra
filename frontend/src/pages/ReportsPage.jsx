import { useState, useRef } from 'react'
import { useStore } from '../store'
import { streamReport, getReport, deleteReport } from '../utils/api'
import ReactMarkdown from 'react-markdown'

export default function ReportsPage() {
  const { targets, activeTarget, addNotification } = useStore()
  const [report, setReport] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [selectedTargetId, setSelectedTargetId] = useState(activeTarget?.id || '')
  const reportContent = useRef('')

  const handleGenerate = () => {
    if (!selectedTargetId) return
    setGenerating(true)
    setReport(null)
    reportContent.current = ''

    streamReport(
      selectedTargetId,
      (token) => {
        reportContent.current += token
        setReport({ content: reportContent.current })
      },
      () => {
        setGenerating(false)
        addNotification({ type: 'success', title: 'Report Generated', message: 'AI pentest report ready' })
      },
      (err) => {
        setGenerating(false)
        addNotification({ type: 'error', title: 'Report Error', message: String(err) })
      }
    )
  }

  const handleLoad = async () => {
    if (!selectedTargetId) return
    try {
      const r = await getReport(selectedTargetId)
      setReport(r.data)
    } catch {
      addNotification({ type: 'warning', title: 'No Report', message: 'No saved report for this target' })
    }
  }

  const handleDelete = async () => {
    if (!selectedTargetId) return
    try {
      await deleteReport(selectedTargetId)
      setReport(null)
      addNotification({ type: 'success', title: 'Deleted', message: 'Report deleted' })
    } catch {
      addNotification({ type: 'error', title: 'Error', message: 'Could not delete report' })
    }
  }

  const handleCopy = () => {
    if (!report?.content) return
    navigator.clipboard.writeText(report.content)
    addNotification({ type: 'success', title: 'Copied', message: 'Report copied to clipboard' })
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ color: 'var(--accent-yellow)', fontSize: 14, fontWeight: 700, letterSpacing: 3 }}>REPORTS</div>
          <div style={{ flex: 1 }}>
            <select
              className="cyber-input"
              style={{ maxWidth: 260 }}
              value={selectedTargetId}
              onChange={e => setSelectedTargetId(e.target.value)}
            >
              <option value="">Select target...</option>
              {targets.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <button className="cyber-btn" onClick={handleLoad} disabled={!selectedTargetId || generating}>LOAD</button>
          <button
            className="cyber-btn-green cyber-btn"
            onClick={handleGenerate}
            disabled={generating || !selectedTargetId}
          >
            {generating ? '● WRITING...' : '🤖 AI GENERATE'}
          </button>
          {report && (
            <>
              <button className="cyber-btn" onClick={handleCopy} style={{ fontSize: 11 }}>⎘ COPY</button>
              <button
                className="cyber-btn"
                onClick={handleDelete}
                style={{ fontSize: 11, borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
              >
                ✕ DELETE
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {!generating && !report && (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 60 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <div>Select a target and generate or load a report</div>
          </div>
        )}
        {report && (
          <div className="fade-in" style={{
            maxWidth: 860,
            margin: '0 auto',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            padding: 32,
          }}>
            <div style={{ color: 'var(--text-primary)', lineHeight: 1.7, fontSize: 13 }}>
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h1 style={{ color: 'var(--accent-cyan)', fontSize: 22, fontWeight: 900, marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--accent-cyan)44' }}>{children}</h1>,
                  h2: ({ children }) => <h2 style={{ color: 'var(--accent-cyan)', fontSize: 16, fontWeight: 700, margin: '20px 0 8px', letterSpacing: 1 }}>{children}</h2>,
                  h3: ({ children }) => <h3 style={{ color: 'var(--accent-orange)', fontSize: 14, fontWeight: 700, margin: '14px 0 6px' }}>{children}</h3>,
                  p: ({ children }) => <p style={{ margin: '6px 0', color: 'var(--text-secondary)' }}>{children}</p>,
                  code: ({ children }) => <code style={{ background: 'var(--bg-secondary)', padding: '1px 5px', color: 'var(--accent-green)', fontSize: 11 }}>{children}</code>,
                  pre: ({ children }) => <pre style={{ background: '#050508', padding: 12, overflow: 'auto', margin: '10px 0', border: '1px solid var(--border)', color: 'var(--accent-green)', fontSize: 11 }}>{children}</pre>,
                  ul: ({ children }) => <ul style={{ paddingLeft: 20, margin: '6px 0' }}>{children}</ul>,
                  li: ({ children }) => <li style={{ margin: '3px 0', color: 'var(--text-secondary)' }}>{children}</li>,
                  table: ({ children }) => <table style={{ width: '100%', borderCollapse: 'collapse', margin: '10px 0' }}>{children}</table>,
                  th: ({ children }) => <th style={{ background: 'var(--bg-secondary)', padding: '6px 10px', borderBottom: '1px solid var(--accent-cyan)44', color: 'var(--accent-cyan)', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>{children}</th>,
                  td: ({ children }) => <td style={{ padding: '5px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 12 }}>{children}</td>,
                  blockquote: ({ children }) => <blockquote style={{ borderLeft: '3px solid var(--accent-orange)', paddingLeft: 12, margin: '10px 0', color: 'var(--text-muted)' }}>{children}</blockquote>,
                  hr: () => <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' }} />,
                }}
              >
                {report.content || ''}
              </ReactMarkdown>
              {generating && <span className="cursor-blink" style={{ color: 'var(--accent-cyan)' }}>█</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
