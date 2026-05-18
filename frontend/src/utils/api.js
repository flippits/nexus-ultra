import axios from 'axios'

const BASE = 'http://127.0.0.1:8765'

const api = axios.create({ baseURL: BASE, timeout: 60000 })

// Targets
export const getTargets = () => api.get('/targets')
export const createTarget = (data) => api.post('/targets', data)
export const updateTarget = (id, data) => api.put(`/targets/${id}`, data)
export const deleteTarget = (id) => api.delete(`/targets/${id}`)
export const getTarget = (id) => api.get(`/targets/${id}`)

// Graph
export const getGraph = (targetId) => api.get(`/graph/${targetId}`)
export const addNode = (targetId, node) => api.post(`/graph/${targetId}/node`, node)
export const addEdge = (targetId, edge) => api.post(`/graph/${targetId}/edge`, edge)
export const deleteNode = (nodeId) => api.delete(`/graph/node/${nodeId}`)

// Findings
export const getFindings = (targetId) => targetId ? api.get(`/findings/${targetId}`) : api.get('/findings')
export const addFinding = (data) => api.post('/findings', data)
export const updateFinding = (id, data) => api.put(`/findings/${id}`, data)
export const deleteFinding = (id) => api.delete(`/findings/${id}`)

// AI
export const askAI = (data) => api.post('/ai/chat', data, { timeout: 120000 })
export const getAgentStatus = () => api.get('/ai/agents')
export const getAIModels = () => api.get('/ai/models')
export const runAgent = (agent, data) => api.post(`/ai/agent/${agent}`, data, { timeout: 300000 })

function _sseStream(url, body, onToken, onDone, onError) {
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(res => {
    if (!res.ok) { onError(`HTTP ${res.status}`); return }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    const pump = () => reader.read().then(({ done, value }) => {
      if (done) { onDone(); return }
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6)
        if (raw === '[DONE]') { onDone(); return }
        try {
          const parsed = JSON.parse(raw)
          if (parsed.error) { onError(parsed.error); return }
          if (parsed.token) onToken(parsed.token, parsed.agent)
        } catch {}
      }
      pump()
    }).catch(onError)
    pump()
  }).catch(onError)
}

export const streamAI = (data, onToken, onDone, onError) =>
  _sseStream(`${BASE}/ai/chat/stream`, data, onToken, onDone, onError)

export const streamAgent = (agentId, data, onToken, onDone, onError) => {
  fetch(`${BASE}/ai/agent/${agentId}/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(res => {
    if (!res.ok) { onError(`HTTP ${res.status}`); return }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    const pump = () => reader.read().then(({ done, value }) => {
      if (done) { onDone(); return }
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6)
        if (raw === '[DONE]') { onDone(); return }
        try {
          const parsed = JSON.parse(raw)
          if (parsed.error) { onError(parsed.error); return }
          if (parsed.token) { onToken(parsed.token, parsed.agent); continue }
          if (parsed.tool_start) onToken(`\n\`\`\`\n[TOOL: ${parsed.tool_start.tool}]\n`, agentId)
          else if (parsed.tool_output != null) onToken(parsed.tool_output, agentId)
          else if (parsed.tool_done) onToken('\n```\n', agentId)
        } catch {}
      }
      pump()
    }).catch(onError)
    pump()
  }).catch(onError)
}

// Agentic mode — AI can call real tools
export const streamExecute = (data, onEvent, onDone, onError) => {
  fetch(`${BASE}/ai/execute/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(res => {
    if (!res.ok) { onError(`HTTP ${res.status}`); return }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    const pump = () => reader.read().then(({ done, value }) => {
      if (done) { onDone(); return }
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6)
        if (raw === '[DONE]') { onDone(); return }
        try {
          const parsed = JSON.parse(raw)
          if (parsed.error) { onError(parsed.error); return }
          onEvent(parsed)
        } catch {}
      }
      pump()
    }).catch(onError)
    pump()
  }).catch(onError)
}

export const streamReport = (targetId, onToken, onDone, onError) =>
  _sseStream(`${BASE}/reports/generate/${targetId}/stream`, {}, onToken, onDone, onError)

// Tools
export const runTool = (data) => api.post('/tools/run', data)
export const getScans = (targetId) => api.get(`/tools/scans/${targetId}`)
export const getScanOutput = (scanId) => api.get(`/tools/scan/${scanId}`)
export const getScanCount = () => api.get('/tools/count')

// OSINT
export const runOsint = (data) => api.post('/osint/run', data)

// Reports
export const generateReport = (targetId) => api.post(`/reports/generate/${targetId}`, {}, { timeout: 300000 })
export const getReport = (targetId) => api.get(`/reports/${targetId}`)
export const deleteReport = (targetId) => api.delete(`/reports/${targetId}`)

// Docker
export const getDockerStatus = () => api.get('/docker/status')
export const startContainer = () => api.post('/docker/start')
export const stopContainer = () => api.post('/docker/stop')
export const execInContainer = (command, timeout = 300) => api.post('/docker/exec', { command, timeout })
export const getDockerTools = () => api.get('/docker/tools')
export const checkDockerImage = () => api.get('/docker/image/exists')

// Flipper Zero
export const flipperStatus = () => api.get('/flipper/status')
export const flipperConnect = (port = null) => api.post('/flipper/connect', { port })
export const flipperDisconnect = () => api.post('/flipper/disconnect')
export const flipperInfo = () => api.get('/flipper/info')
export const flipperCommand = (command, timeout = 8) => api.post('/flipper/command', { command, timeout })
export const flipperSubGHzRx = (frequency = '433920000') => api.post(`/flipper/subghz/rx?frequency=${frequency}`, {}, { timeout: 15000 })
export const flipperSubGHzTx = (file_path) => api.post('/flipper/subghz/tx', { file_path }, { timeout: 20000 })
export const flipperSubGHzFiles = () => api.get('/flipper/subghz/files')
export const flipperSubGHzFreqAnalyzer = () => api.post('/flipper/subghz/freq_analyzer', {}, { timeout: 20000 })
export const flipperNFCDetect = () => api.post('/flipper/nfc/detect', {}, { timeout: 15000 })
export const flipperNFCFiles = () => api.get('/flipper/nfc/files')
export const flipperRFIDRead = () => api.post('/flipper/rfid/read', {}, { timeout: 15000 })
export const flipperRFIDFiles = () => api.get('/flipper/rfid/files')
export const flipperIRRx = () => api.post('/flipper/ir/rx', {}, { timeout: 15000 })
export const flipperIRTx = (file_path, signal_name = null) => api.post('/flipper/ir/tx', { file_path, signal_name }, { timeout: 15000 })
export const flipperIRFiles = () => api.get('/flipper/ir/files')
export const flipperBadUSBRun = (file_path) => api.post('/flipper/badusb/run', { file_path }, { timeout: 35000 })
export const flipperBadUSBFiles = () => api.get('/flipper/badusb/files')
export const flipperGPIOMode = (pin, mode) => api.post('/flipper/gpio/mode', { pin, mode })
export const flipperGPIOWrite = (pin, value) => api.post('/flipper/gpio/write', { pin, value })
export const flipperGPIORead = (pin) => api.get(`/flipper/gpio/read?pin=${pin}`)
export const flipperStorageList = (path = '/ext') => api.get(`/flipper/storage/list?path=${encodeURIComponent(path)}`)
export const flipperStorageRead = (path) => api.get(`/flipper/storage/read?path=${encodeURIComponent(path)}`)
export const flipperLED = (color, value) => api.post('/flipper/led', { color, value })
export const flipperVibro = (state) => api.post(`/flipper/vibro?state=${state}`)

// Network
export const getNetworkInfo = () => api.get('/network/info')
export const getArpTable = () => api.get('/network/arp')
export const scanNetwork = (cidr = '') => api.post('/network/scan', { cidr }, { timeout: 90000 })

// Health
export const healthCheck = () => api.get('/health')

export default api
