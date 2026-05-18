import { useState, useEffect, useRef } from 'react'
import {
  flipperStatus, flipperConnect, flipperDisconnect, flipperInfo,
  flipperCommand, flipperSubGHzRx, flipperSubGHzTx, flipperSubGHzFiles,
  flipperSubGHzFreqAnalyzer, flipperNFCDetect, flipperNFCFiles,
  flipperRFIDRead, flipperRFIDFiles, flipperIRRx, flipperIRTx, flipperIRFiles,
  flipperBadUSBRun, flipperBadUSBFiles, flipperGPIOMode, flipperGPIOWrite,
  flipperGPIORead, flipperStorageList, flipperStorageRead, flipperLED, flipperVibro
} from '../utils/api'

const TABS = ['Sub-GHz', 'NFC', 'RFID', 'Infrared', 'Bad USB', 'GPIO', 'Storage', 'Terminal']
const GPIO_PINS = ['PA4','PA5','PA6','PA7','PB2','PB3','PC0','PC1','PC3']

const S = {
  page: { display:'flex', flexDirection:'column', height:'100%', background:'var(--bg-primary)', color:'var(--text-primary)', fontFamily:'monospace' },
  header: { padding:'16px 24px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:16 },
  title: { fontSize:18, fontWeight:700, color:'var(--accent-cyan)', letterSpacing:2 },
  badge: (on) => ({ padding:'2px 10px', borderRadius:12, fontSize:11, fontWeight:700, letterSpacing:1, background: on ? 'rgba(0,255,136,0.15)' : 'rgba(255,59,59,0.15)', color: on ? 'var(--accent-green)' : 'var(--accent-red)', border: `1px solid ${on ? 'rgba(0,255,136,0.3)' : 'rgba(255,59,59,0.3)'}` }),
  btn: (variant='primary') => ({
    padding:'6px 16px', borderRadius:4, border:'none', cursor:'pointer', fontSize:12, fontWeight:600, letterSpacing:1,
    background: variant==='primary' ? 'var(--accent-cyan)' : variant==='danger' ? 'var(--accent-red)' : variant==='green' ? 'var(--accent-green)' : 'rgba(255,255,255,0.08)',
    color: variant==='secondary' ? 'var(--text-primary)' : '#000',
    transition:'all 0.15s',
  }),
  body: { display:'flex', flex:1, overflow:'hidden' },
  sidebar: { width:180, borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', padding:'12px 0' },
  tabBtn: (active) => ({ padding:'10px 20px', textAlign:'left', background: active ? 'rgba(0,245,255,0.1)' : 'transparent', border:'none', borderLeft: active ? '2px solid var(--accent-cyan)' : '2px solid transparent', color: active ? 'var(--accent-cyan)' : 'var(--text-muted)', cursor:'pointer', fontSize:12, letterSpacing:1, fontFamily:'monospace', transition:'all 0.15s' }),
  content: { flex:1, overflow:'auto', padding:24 },
  section: { marginBottom:24 },
  label: { fontSize:11, color:'var(--text-muted)', letterSpacing:1, marginBottom:6, textTransform:'uppercase' },
  input: { width:'100%', padding:'8px 12px', background:'var(--bg-tertiary)', border:'1px solid var(--border)', borderRadius:4, color:'var(--text-primary)', fontSize:12, fontFamily:'monospace', boxSizing:'border-box' },
  output: { background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:4, padding:12, fontSize:11, color:'var(--accent-green)', whiteSpace:'pre-wrap', minHeight:80, maxHeight:280, overflow:'auto', fontFamily:'monospace', lineHeight:1.6 },
  row: { display:'flex', gap:8, alignItems:'center' },
  grid2: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 },
  infoBox: { background:'rgba(0,245,255,0.05)', border:'1px solid rgba(0,245,255,0.2)', borderRadius:6, padding:12, fontSize:11, color:'var(--text-secondary)', whiteSpace:'pre-wrap', lineHeight:1.7 },
  select: { padding:'8px 12px', background:'var(--bg-tertiary)', border:'1px solid var(--border)', borderRadius:4, color:'var(--text-primary)', fontSize:12, fontFamily:'monospace' },
}

function Output({ text, loading }) {
  const ref = useRef()
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight }, [text])
  return (
    <div ref={ref} style={S.output}>
      {loading ? <span style={{color:'var(--accent-cyan)'}}>Running...</span> : text || <span style={{opacity:0.4}}>Output will appear here</span>}
    </div>
  )
}

function SubGHzTab({ connected }) {
  const [freq, setFreq] = useState('433920000')
  const [filePath, setFilePath] = useState('')
  const [files, setFiles] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)

  const run = async (fn) => {
    setLoading(true); setOutput('')
    try { const r = await fn(); setOutput(r.data.output || 'Done') }
    catch (e) { setOutput(`Error: ${e.response?.data?.detail || e.message}`) }
    finally { setLoading(false) }
  }

  return (
    <div>
      <div style={S.section}>
        <div style={S.label}>Frequency (Hz)</div>
        <div style={S.row}>
          <input style={{...S.input, flex:1}} value={freq} onChange={e=>setFreq(e.target.value)} placeholder="433920000" />
          <button style={S.btn()} disabled={!connected||loading} onClick={()=>run(()=>flipperSubGHzRx(freq))}>RX Scan</button>
          <button style={S.btn('secondary')} disabled={!connected||loading} onClick={()=>run(flipperSubGHzFreqAnalyzer)}>Freq Analyzer</button>
        </div>
      </div>
      <div style={S.section}>
        <div style={S.label}>Transmit File (SD card path)</div>
        <div style={S.row}>
          <input style={{...S.input, flex:1}} value={filePath} onChange={e=>setFilePath(e.target.value)} placeholder="/ext/subghz/signal.sub" />
          <button style={S.btn('green')} disabled={!connected||loading||!filePath} onClick={()=>run(()=>flipperSubGHzTx(filePath))}>TX</button>
          <button style={S.btn('secondary')} disabled={!connected||loading} onClick={()=>run(flipperSubGHzFiles).then(r=>setFiles(r?.data?.output||''))}>List Files</button>
        </div>
        {files && <div style={{...S.infoBox, marginTop:8}}>{files}</div>}
      </div>
      <div style={S.label}>Output</div>
      <Output text={output} loading={loading} />
    </div>
  )
}

function NFCTab({ connected }) {
  const [output, setOutput] = useState('')
  const [files, setFiles] = useState('')
  const [loading, setLoading] = useState(false)

  const run = async (fn) => {
    setLoading(true); setOutput('')
    try { const r = await fn(); setOutput(r.data.output || 'Done') }
    catch (e) { setOutput(`Error: ${e.response?.data?.detail || e.message}`) }
    finally { setLoading(false) }
  }

  return (
    <div>
      <div style={S.section}>
        <div style={{...S.row, marginBottom:12}}>
          <button style={S.btn()} disabled={!connected||loading} onClick={()=>run(flipperNFCDetect)}>Detect NFC Card</button>
          <button style={S.btn('secondary')} disabled={!connected||loading} onClick={async()=>{
            setLoading(true)
            try { const r = await flipperNFCFiles(); setFiles(r.data.output) } catch {}
            finally { setLoading(false) }
          }}>List Saved Cards</button>
        </div>
        {files && <div style={S.infoBox}>{files}</div>}
      </div>
      <div style={S.label}>Output</div>
      <Output text={output} loading={loading} />
      <div style={{marginTop:12, fontSize:11, color:'var(--text-muted)'}}>
        Hold NFC card near Flipper before scanning.
      </div>
    </div>
  )
}

function RFIDTab({ connected }) {
  const [output, setOutput] = useState('')
  const [files, setFiles] = useState('')
  const [loading, setLoading] = useState(false)

  const run = async (fn) => {
    setLoading(true); setOutput('')
    try { const r = await fn(); setOutput(r.data.output || 'Done') }
    catch (e) { setOutput(`Error: ${e.response?.data?.detail || e.message}`) }
    finally { setLoading(false) }
  }

  return (
    <div>
      <div style={S.section}>
        <div style={{...S.row, marginBottom:12}}>
          <button style={S.btn()} disabled={!connected||loading} onClick={()=>run(flipperRFIDRead)}>Read RFID (125kHz)</button>
          <button style={S.btn('secondary')} disabled={!connected||loading} onClick={async()=>{
            setLoading(true)
            try { const r = await flipperRFIDFiles(); setFiles(r.data.output) } catch {}
            finally { setLoading(false) }
          }}>List Saved Keys</button>
        </div>
        {files && <div style={S.infoBox}>{files}</div>}
      </div>
      <div style={S.label}>Output</div>
      <Output text={output} loading={loading} />
    </div>
  )
}

function InfraredTab({ connected }) {
  const [filePath, setFilePath] = useState('')
  const [sigName, setSigName] = useState('')
  const [files, setFiles] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)

  const run = async (fn) => {
    setLoading(true); setOutput('')
    try { const r = await fn(); setOutput(r.data.output || 'Done') }
    catch (e) { setOutput(`Error: ${e.response?.data?.detail || e.message}`) }
    finally { setLoading(false) }
  }

  return (
    <div>
      <div style={S.section}>
        <button style={S.btn()} disabled={!connected||loading} onClick={()=>run(flipperIRRx)}>Receive IR Signal</button>
      </div>
      <div style={S.section}>
        <div style={S.label}>Transmit IR File</div>
        <div style={{...S.row, marginBottom:8}}>
          <input style={{...S.input, flex:1}} value={filePath} onChange={e=>setFilePath(e.target.value)} placeholder="/ext/infrared/remote.ir" />
          <button style={S.btn('secondary')} disabled={!connected||loading} onClick={async()=>{
            setLoading(true)
            try { const r = await flipperIRFiles(); setFiles(r.data.output) } catch {}
            finally { setLoading(false) }
          }}>List Files</button>
        </div>
        <div style={S.row}>
          <input style={{...S.input, flex:1}} value={sigName} onChange={e=>setSigName(e.target.value)} placeholder="Signal name (optional)" />
          <button style={S.btn('green')} disabled={!connected||loading||!filePath} onClick={()=>run(()=>flipperIRTx(filePath, sigName||null))}>TX</button>
        </div>
        {files && <div style={{...S.infoBox, marginTop:8}}>{files}</div>}
      </div>
      <div style={S.label}>Output</div>
      <Output text={output} loading={loading} />
    </div>
  )
}

function BadUSBTab({ connected }) {
  const [filePath, setFilePath] = useState('')
  const [files, setFiles] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)

  return (
    <div>
      <div style={{...S.infoBox, marginBottom:16, color:'var(--accent-red)', borderColor:'rgba(255,59,59,0.3)', background:'rgba(255,59,59,0.05)'}}>
        Only run Bad USB scripts on systems you own or have explicit authorization to test.
      </div>
      <div style={S.section}>
        <div style={S.label}>Script File (SD card path)</div>
        <div style={S.row}>
          <input style={{...S.input, flex:1}} value={filePath} onChange={e=>setFilePath(e.target.value)} placeholder="/ext/badusb/script.txt" />
          <button style={S.btn('secondary')} disabled={!connected||loading} onClick={async()=>{
            setLoading(true)
            try { const r = await flipperBadUSBFiles(); setFiles(r.data.output) } catch {}
            finally { setLoading(false) }
          }}>List Scripts</button>
          <button style={S.btn('danger')} disabled={!connected||loading||!filePath} onClick={async()=>{
            setLoading(true); setOutput('')
            try { const r = await flipperBadUSBRun(filePath); setOutput(r.data.output || 'Done') }
            catch (e) { setOutput(`Error: ${e.response?.data?.detail || e.message}`) }
            finally { setLoading(false) }
          }}>RUN</button>
        </div>
        {files && <div style={{...S.infoBox, marginTop:8}}>{files}</div>}
      </div>
      <div style={S.label}>Output</div>
      <Output text={output} loading={loading} />
    </div>
  )
}

function GPIOTab({ connected }) {
  const [pin, setPin] = useState('PA4')
  const [mode, setMode] = useState('INPUT')
  const [writeVal, setWriteVal] = useState(0)
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)

  const run = async (fn) => {
    setLoading(true); setOutput('')
    try { const r = await fn(); setOutput(r.data.output || 'Done') }
    catch (e) { setOutput(`Error: ${e.response?.data?.detail || e.message}`) }
    finally { setLoading(false) }
  }

  return (
    <div>
      <div style={S.section}>
        <div style={S.label}>Pin</div>
        <div style={S.row}>
          <select style={S.select} value={pin} onChange={e=>setPin(e.target.value)}>
            {GPIO_PINS.map(p=><option key={p}>{p}</option>)}
          </select>
          <select style={S.select} value={mode} onChange={e=>setMode(e.target.value)}>
            <option>INPUT</option>
            <option>OUTPUT</option>
          </select>
          <button style={S.btn()} disabled={!connected||loading} onClick={()=>run(()=>flipperGPIOMode(pin,mode))}>Set Mode</button>
        </div>
      </div>
      <div style={S.section}>
        <div style={S.grid2}>
          <div>
            <div style={S.label}>Read</div>
            <button style={{...S.btn('secondary'), width:'100%'}} disabled={!connected||loading} onClick={()=>run(()=>flipperGPIORead(pin))}>Read {pin}</button>
          </div>
          <div>
            <div style={S.label}>Write</div>
            <div style={S.row}>
              <select style={S.select} value={writeVal} onChange={e=>setWriteVal(Number(e.target.value))}>
                <option value={0}>LOW (0)</option>
                <option value={1}>HIGH (1)</option>
              </select>
              <button style={S.btn('green')} disabled={!connected||loading} onClick={()=>run(()=>flipperGPIOWrite(pin,writeVal))}>Write</button>
            </div>
          </div>
        </div>
      </div>
      <div style={S.label}>Output</div>
      <Output text={output} loading={loading} />
    </div>
  )
}

function StorageTab({ connected }) {
  const [path, setPath] = useState('/ext')
  const [readPath, setReadPath] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)

  const run = async (fn) => {
    setLoading(true); setOutput('')
    try { const r = await fn(); setOutput(r.data.output || 'Empty') }
    catch (e) { setOutput(`Error: ${e.response?.data?.detail || e.message}`) }
    finally { setLoading(false) }
  }

  return (
    <div>
      <div style={S.section}>
        <div style={S.label}>List Directory</div>
        <div style={S.row}>
          <input style={{...S.input, flex:1}} value={path} onChange={e=>setPath(e.target.value)} placeholder="/ext" />
          <button style={S.btn()} disabled={!connected||loading} onClick={()=>run(()=>flipperStorageList(path))}>List</button>
        </div>
      </div>
      <div style={S.section}>
        <div style={S.label}>Read File</div>
        <div style={S.row}>
          <input style={{...S.input, flex:1}} value={readPath} onChange={e=>setReadPath(e.target.value)} placeholder="/ext/subghz/file.sub" />
          <button style={S.btn('secondary')} disabled={!connected||loading||!readPath} onClick={()=>run(()=>flipperStorageRead(readPath))}>Read</button>
        </div>
      </div>
      <div style={S.label}>Output</div>
      <Output text={output} loading={loading} />
    </div>
  )
}

function TerminalTab({ connected }) {
  const [cmd, setCmd] = useState('')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const histRef = useRef()

  useEffect(() => { if (histRef.current) histRef.current.scrollTop = histRef.current.scrollHeight }, [history])

  const send = async () => {
    if (!cmd.trim()) return
    const c = cmd.trim()
    setCmd('')
    setHistory(h => [...h, { type:'cmd', text: `> ${c}` }])
    setLoading(true)
    try {
      const r = await flipperCommand(c, 10)
      setHistory(h => [...h, { type:'out', text: r.data.output || '(no output)' }])
    } catch (e) {
      setHistory(h => [...h, { type:'err', text: `Error: ${e.response?.data?.detail || e.message}` }])
    } finally { setLoading(false) }
  }

  return (
    <div>
      <div ref={histRef} style={{...S.output, minHeight:320, maxHeight:440, marginBottom:12}}>
        {history.length === 0 && <span style={{opacity:0.4}}>Flipper Zero CLI — type a command below</span>}
        {history.map((h,i) => (
          <div key={i} style={{color: h.type==='cmd' ? 'var(--accent-cyan)' : h.type==='err' ? 'var(--accent-red)' : 'var(--accent-green)', marginBottom:4}}>
            {h.text}
          </div>
        ))}
        {loading && <span style={{color:'var(--accent-cyan)'}}>...</span>}
      </div>
      <div style={S.row}>
        <span style={{color:'var(--accent-cyan)', fontSize:12}}>{'>'}</span>
        <input
          style={{...S.input, flex:1}}
          value={cmd}
          onChange={e=>setCmd(e.target.value)}
          onKeyDown={e=>e.key==='Enter' && !loading && connected && send()}
          placeholder="info / subghz rx / nfc detect / gpio read PA4 ..."
          disabled={!connected||loading}
        />
        <button style={S.btn()} disabled={!connected||loading||!cmd.trim()} onClick={send}>Send</button>
        <button style={S.btn('secondary')} onClick={()=>setHistory([])}>Clear</button>
      </div>
    </div>
  )
}

export default function FlipperPage() {
  const [tab, setTab] = useState('Sub-GHz')
  const [status, setStatus] = useState({ connected: false, port: null, detected: null, ports: [] })
  const [info, setInfo] = useState('')
  const [connecting, setConnecting] = useState(false)
  const [ledColor, setLedColor] = useState('r')

  const refreshStatus = async () => {
    try { const r = await flipperStatus(); setStatus(r.data) } catch {}
  }

  useEffect(() => {
    refreshStatus()
    const iv = setInterval(refreshStatus, 4000)
    return () => clearInterval(iv)
  }, [])

  const connect = async () => {
    setConnecting(true)
    try {
      const r = await flipperConnect(status.detected || null)
      setInfo(r.data.info || '')
      await refreshStatus()
    } catch (e) {
      alert(e.response?.data?.detail || 'Connection failed')
    } finally { setConnecting(false) }
  }

  const disconnect = async () => {
    await flipperDisconnect()
    setInfo('')
    await refreshStatus()
  }

  const ping = async (color) => {
    try { await flipperLED(color, 255); setTimeout(()=>flipperLED(color,0), 500) } catch {}
  }

  const tabProps = { connected: status.connected }

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div style={{ fontSize: 22 }}>🐬</div>
        <div style={S.title}>FLIPPER ZERO</div>
        <div style={S.badge(status.connected)}>{status.connected ? 'CONNECTED' : 'DISCONNECTED'}</div>
        {status.connected && <div style={{fontSize:11, color:'var(--text-muted)'}}>{status.port}</div>}
        {!status.connected && status.detected && (
          <div style={{fontSize:11, color:'var(--accent-cyan)'}}>Detected: {status.detected}</div>
        )}
        <div style={{flex:1}} />
        {status.connected ? (
          <>
            <div style={{display:'flex', gap:4}}>
              {['r','g','b'].map(c=>(
                <button key={c} style={{...S.btn('secondary'), padding:'4px 10px', background:`rgba(${c==='r'?'255,59,59':c==='g'?'0,255,136':'0,136,255'},0.2)`}} onClick={()=>ping(c)}>
                  LED {c.toUpperCase()}
                </button>
              ))}
            </div>
            <button style={S.btn()} onClick={()=>flipperVibro(1).then(()=>setTimeout(()=>flipperVibro(0),300))}>Buzz</button>
            <button style={S.btn('danger')} onClick={disconnect}>Disconnect</button>
          </>
        ) : (
          <button style={S.btn()} disabled={connecting} onClick={connect}>
            {connecting ? 'Connecting...' : status.detected ? 'Connect' : 'Auto-Detect & Connect'}
          </button>
        )}
      </div>

      {/* Device info */}
      {info && (
        <div style={{padding:'8px 24px', borderBottom:'1px solid var(--border)'}}>
          <div style={S.infoBox}>{info}</div>
        </div>
      )}

      <div style={S.body}>
        {/* Tab sidebar */}
        <div style={S.sidebar}>
          {TABS.map(t => (
            <button key={t} style={S.tabBtn(tab===t)} onClick={()=>setTab(t)}>{t}</button>
          ))}
        </div>

        {/* Tab content */}
        <div style={S.content}>
          {!status.connected && (
            <div style={{...S.infoBox, marginBottom:20, color:'var(--accent-cyan)'}}>
              Plug in your Flipper Zero via USB and click Connect. It will be auto-detected.
            </div>
          )}
          {tab === 'Sub-GHz'  && <SubGHzTab   {...tabProps} />}
          {tab === 'NFC'      && <NFCTab       {...tabProps} />}
          {tab === 'RFID'     && <RFIDTab      {...tabProps} />}
          {tab === 'Infrared' && <InfraredTab  {...tabProps} />}
          {tab === 'Bad USB'  && <BadUSBTab    {...tabProps} />}
          {tab === 'GPIO'     && <GPIOTab      {...tabProps} />}
          {tab === 'Storage'  && <StorageTab   {...tabProps} />}
          {tab === 'Terminal' && <TerminalTab  {...tabProps} />}
        </div>
      </div>
    </div>
  )
}
