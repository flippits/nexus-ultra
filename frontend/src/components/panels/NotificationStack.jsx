import { useStore } from '../../store'

const COLORS = {
  success: 'var(--accent-green)',
  error: 'var(--accent-red)',
  warning: 'var(--accent-orange)',
  info: 'var(--accent-cyan)',
}

export default function NotificationStack() {
  const { notifications, removeNotification } = useStore()

  return (
    <div style={{
      position: 'fixed',
      bottom: 20, right: 20,
      display: 'flex', flexDirection: 'column', gap: 8,
      zIndex: 9999, maxWidth: 360
    }}>
      {notifications.map(n => (
        <div
          key={n.id}
          className="fade-in"
          style={{
            background: 'var(--bg-card)',
            border: `1px solid ${COLORS[n.type] || COLORS.info}`,
            boxShadow: `0 0 16px ${COLORS[n.type] || COLORS.info}33`,
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            cursor: 'pointer',
          }}
          onClick={() => removeNotification(n.id)}
        >
          <span style={{ fontSize: 14 }}>
            {n.type === 'success' ? '✓' : n.type === 'error' ? '✗' : n.type === 'warning' ? '⚠' : 'ℹ'}
          </span>
          <div style={{ flex: 1 }}>
            {n.title && <div style={{ color: COLORS[n.type] || COLORS.info, fontSize: 11, fontWeight: 700, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 1 }}>{n.title}</div>}
            <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{n.message}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
