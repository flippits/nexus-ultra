import { useState, useEffect, useCallback } from 'react'
import { getNetworkInfo, getArpTable, scanNetwork } from '../utils/api'
import { useStore } from '../store'

export default function NetworkPage() {
  const { addNotification } = useStore()
  const [wifi, setWifi]           = useState(null)
  const [interfaces, setIfaces]   = useState([])
  const [hosts, setHosts]         = useState([])
  const [loading, setLoading]     = useState(false)
  const [scanning, setScanning]   = useState(false)
  const [cidr, setCidr]           = useState('')
  const [filter, setFilter]       = useState('')
  const [sortCol, setSortCol]     = useState('ip')
  const [sortDir, setSortDir]     = useState('asc')
  const [lastScan, setLastScan]   = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const loadInfo = useCallback(async () => {
    setLoading(true)
    try {
      const r = await getNetworkInfo()
      setWifi(r.data.wifi || null)
      setIfaces(r.data.interfaces || [])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }, [])

  const loadArp = useCallback(async () => {
    try {
      const r = await getArpTable()
      setHosts(r.data.hosts || [])
      setLastScan(new Date())
    } catch (e) {
      console.error(e)
    }
  }, [])

  useEffect(() => { loadInfo(); loadArp() }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const iv = setInterval(loadArp, 15000)
    return () => clearInterval(iv)
  }, [autoRefresh, loadArp])

  const runScan = async () => {
    setScanning(true)
    try {
      const r = await scanNetwork(cidr)
      setHosts(r.data.hosts || [])
      setLastScan(new Date())
      addNotification({ type: 'success', title: 'Network Scan Complete', message: `Found ${r.data.count} hosts on ${r.data.cidr}` })
    } catch (e) {
      addNotification({ type: 'error', title: 'Scan Failed', message: String(e) })
    }
    setScanning(false)
  }

  const sort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  const filtered = hosts.filter(h =>
    !filter ||
    h.ip.includes(filter) ||
    h.mac.includes(filter.toLowerCase()) ||
    (h.hostname || '').toLowerCase().includes(filter.toLowerCase()) ||
    (h.vendor || '').toLowerCase().includes(filter.toLowerCase())
  )

  const sorted = [...filtered].sort((a, b) => {
    let va = a[sortCol] || '', vb = b[sortCol] || ''
    if (sortCol === 'ip') {
      va = a.ip.split('.').map(n => n.padStart(3, '0')).join('')
      vb = b.ip.split('.').map(n => n.padStart(3, '0')).join('')
    }
    const r = va < vb ? -1 : va > vb ? 1 : 0
    return sortDir === 'asc' ? r : -r
  })

  const rssiBar = (rssi) => {
    const v = parseInt(rssi) || -100
    const pct = Math.max(0, Math.min(100, ((v + 100) / 70) * 100))
    const color = pct > 66 ? 'var(--accent-green)' : pct > 33 ? 'var(--accent-yellow)' : 'var(--accent-red)'
    return { pct, color }
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ color: 'var(--accent-cyan)', fontSize: 14, fontWeight: 700, letterSpacing: 3 }}>NETWORK</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 10 }}>
            {lastScan ? `Last scan: ${lastScan.toLocaleTimeString()}` : 'ARP table + active host discovery'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div
            onClick={() => setAutoRefresh(v => !v)}
            title="Auto-refresh ARP every 15s"
            style={{
              padding: '4px 10px', fontSize: 10, cursor: 'pointer',
              border: `1px solid ${autoRefresh ? 'var(--accent-green)' : 'var(--border)'}`,
              color: autoRefresh ? 'var(--accent-green)' : 'var(--text-muted)',
              background: autoRefresh ? 'rgba(0,255,65,0.08)' : 'transparent',
              letterSpacing: 1,
            }}
          >
            {autoRefresh ? '⟳ AUTO ON' : '⟳ AUTO OFF'}
          </div>
          <button className="cyber-btn" onClick={loadArp} disabled={loading}>REFRESH ARP</button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Top info row */}
        <div style={{ display: 'grid', gridTemplateColumns: wifi?.ssid ? '1fr 1fr' : '1fr', gap: 14 }}>

          {/* WiFi card */}
          {wifi && (
            <div className="cyber-card" style={{ padding: 14 }}>
              <div style={{ color: 'var(--accent-cyan)', fontSize: 10, letterSpacing: 2, marginBottom: 10 }}>WIFI</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700 }}>{wifi.ssid || '—'}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 2, fontFamily: 'monospace' }}>{wifi.bssid}</div>
                </div>
                {wifi.rssi && (() => {
                  const { pct, color } = rssiBar(wifi.rssi)
                  return (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color, fontSize: 20, fontWeight: 900 }}>{wifi.rssi} dBm</div>
                      <div style={{ width: 80, height: 4, background: 'var(--border)', borderRadius: 2, marginTop: 4 }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  )
                })()}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 10 }}>
                {[
                  ['Channel', wifi.channel],
                  ['Rate', wifi.rate ? `${wifi.rate} Mbps` : '—'],
                  ['Security', wifi.security || '—'],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: 'var(--bg-secondary)', padding: '6px 8px' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: 9, letterSpacing: 1 }}>{k}</div>
                    <div style={{ color: 'var(--accent-yellow)', fontSize: 12, fontFamily: 'monospace', marginTop: 2 }}>{v || '—'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interfaces */}
          <div className="cyber-card" style={{ padding: 14 }}>
            <div style={{ color: 'var(--accent-green)', fontSize: 10, letterSpacing: 2, marginBottom: 10 }}>
              INTERFACES ({interfaces.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {interfaces.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>No interfaces detected</div>}
              {interfaces.map(iface => (
                <div key={iface.name} style={{
                  padding: '8px 10px', background: 'var(--bg-secondary)',
                  border: `1px solid ${iface.status === 'up' ? 'var(--accent-green)33' : 'var(--border)'}`,
                  display: 'grid', gridTemplateColumns: '70px 1fr 1fr auto', gap: 10, alignItems: 'center'
                }}>
                  <div>
                    <div style={{ color: 'var(--accent-cyan)', fontSize: 12, fontWeight: 700 }}>{iface.name}</div>
                    <div style={{ fontSize: 9, color: iface.status === 'up' ? 'var(--accent-green)' : 'var(--text-muted)', letterSpacing: 1 }}>{iface.status.toUpperCase()}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-primary)', fontSize: 12, fontFamily: 'monospace' }}>{iface.ip}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 10, fontFamily: 'monospace' }}>{iface.cidr}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 10, fontFamily: 'monospace' }}>{iface.mac}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: 9 }}>{iface.vendor}</div>
                  </div>
                  <button
                    className="cyber-btn"
                    style={{ fontSize: 9, padding: '3px 8px' }}
                    onClick={() => { setCidr(iface.cidr); runScan() }}
                  >
                    SCAN
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Active scan controls */}
        <div className="cyber-card" style={{ padding: 14 }}>
          <div style={{ color: 'var(--accent-purple)', fontSize: 10, letterSpacing: 2, marginBottom: 10 }}>
            ACTIVE HOST DISCOVERY (nmap -sn)
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="cyber-input"
              placeholder="CIDR range (e.g. 192.168.1.0/24) — leave blank to auto-detect"
              value={cidr}
              onChange={e => setCidr(e.target.value)}
              style={{ flex: 1, fontFamily: 'monospace', fontSize: 12 }}
            />
            <button
              className="cyber-btn-green cyber-btn"
              onClick={runScan}
              disabled={scanning}
              style={{ whiteSpace: 'nowrap', minWidth: 120 }}
            >
              {scanning ? 'SCANNING...' : 'SCAN NETWORK'}
            </button>
          </div>
          {scanning && (
            <div style={{ marginTop: 8, color: 'var(--accent-green)', fontSize: 11 }}>
              Running nmap ping scan — this may take up to 60 seconds...
            </div>
          )}
        </div>

        {/* Host table */}
        <div className="cyber-card" style={{ padding: 14, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ color: 'var(--accent-orange)', fontSize: 10, letterSpacing: 2 }}>
              DISCOVERED HOSTS ({sorted.length}{filter ? ` of ${hosts.length}` : ''})
            </div>
            <input
              className="cyber-input"
              placeholder="Filter IP, MAC, hostname, vendor..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{ width: 260, fontSize: 11 }}
            />
          </div>

          <div style={{ overflow: 'auto', flex: 1 }}>
            {hosts.length === 0 && !scanning && (
              <div style={{ color: 'var(--text-muted)', fontSize: 12, padding: '24px 0', textAlign: 'center' }}>
                No hosts in ARP table yet. Click REFRESH ARP or SCAN NETWORK.
              </div>
            )}
            {sorted.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 1 }}>
                  <tr>
                    {[
                      ['ip', 'IP Address'],
                      ['mac', 'MAC Address'],
                      ['hostname', 'Hostname'],
                      ['vendor', 'Vendor / Manufacturer'],
                      ['interface', 'Interface'],
                      ['source', 'Source'],
                    ].map(([col, label]) => (
                      <th
                        key={col}
                        onClick={() => sort(col)}
                        style={{
                          color: sortCol === col ? 'var(--accent-cyan)' : 'var(--text-muted)',
                          textAlign: 'left', padding: '5px 10px',
                          borderBottom: '1px solid var(--border)',
                          fontSize: 9, letterSpacing: 1, cursor: 'pointer',
                          userSelect: 'none', whiteSpace: 'nowrap',
                        }}
                      >
                        {label} {sortCol === col ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                      </th>
                    ))}
                    <th style={{ padding: '5px 10px', borderBottom: '1px solid var(--border)' }} />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(h => (
                    <HostRow key={h.ip} host={h} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function HostRow({ host }) {
  const { setActiveView, setActiveTarget } = useStore()
  const [copied, setCopied] = useState(null)

  const copy = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1200)
  }

  const sourceColor = {
    'arp': 'var(--accent-yellow)',
    'nmap': 'var(--accent-green)',
    'arp+nmap': 'var(--accent-cyan)',
  }[host.source] || 'var(--text-muted)'

  return (
    <tr
      style={{ borderBottom: '1px solid var(--border)22', transition: 'background 0.1s' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* IP */}
      <td style={{ padding: '7px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-green)', flexShrink: 0 }} />
          <span
            style={{ color: 'var(--accent-cyan)', fontFamily: 'monospace', fontWeight: 700, cursor: 'pointer' }}
            onClick={() => copy(host.ip, 'ip')}
            title="Click to copy"
          >
            {host.ip}
          </span>
          {copied === 'ip' && <span style={{ color: 'var(--accent-green)', fontSize: 9 }}>✓</span>}
        </div>
      </td>

      {/* MAC */}
      <td style={{ padding: '7px 10px' }}>
        <span
          style={{ color: 'var(--text-secondary)', fontFamily: 'monospace', fontSize: 11, cursor: 'pointer' }}
          onClick={() => copy(host.mac, 'mac')}
          title="Click to copy"
        >
          {host.mac || '—'}
        </span>
        {copied === 'mac' && <span style={{ color: 'var(--accent-green)', fontSize: 9, marginLeft: 4 }}>✓</span>}
      </td>

      {/* Hostname */}
      <td style={{ padding: '7px 10px' }}>
        <span style={{ color: host.hostname ? 'var(--accent-yellow)' : 'var(--text-muted)', fontFamily: 'monospace', fontSize: 11 }}>
          {host.hostname || '—'}
        </span>
      </td>

      {/* Vendor */}
      <td style={{ padding: '7px 10px' }}>
        <span style={{ color: host.vendor && host.vendor !== 'Unknown' ? 'var(--accent-purple)' : 'var(--text-muted)', fontSize: 11 }}>
          {host.vendor || '—'}
        </span>
      </td>

      {/* Interface */}
      <td style={{ padding: '7px 10px' }}>
        <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace', fontSize: 10 }}>{host.interface || '—'}</span>
      </td>

      {/* Source */}
      <td style={{ padding: '7px 10px' }}>
        <span style={{ color: sourceColor, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase' }}>{host.source || '—'}</span>
      </td>

      {/* Actions */}
      <td style={{ padding: '7px 10px' }}>
        <button
          title="Add as target"
          onClick={() => {
            // Navigate to targets page with IP pre-filled
            setActiveView('targets')
          }}
          style={{
            background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)',
            padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 9,
            letterSpacing: 1, transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-cyan)'; e.currentTarget.style.color = 'var(--accent-cyan)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          + TARGET
        </button>
      </td>
    </tr>
  )
}
