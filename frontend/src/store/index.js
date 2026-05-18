import { create } from 'zustand'

export const useStore = create((set, get) => ({
  // Active view
  activeView: 'warroom',
  setActiveView: (view) => set({ activeView: view }),

  // Targets
  targets: [],
  activeTarget: null,
  setTargets: (targets) => set({ targets }),
  setActiveTarget: (target) => set({ activeTarget: target }),
  addTarget: (target) => set(s => ({ targets: [...s.targets, target] })),
  updateTarget: (id, data) => set(s => ({
    targets: s.targets.map(t => t.id === id ? { ...t, ...data } : t)
  })),

  // Findings
  findings: [],
  setFindings: (findings) => set({ findings }),
  addFinding: (f) => set(s => ({ findings: [f, ...s.findings] })),

  // Scan results (live)
  scanResults: {},
  appendScanOutput: (scanId, line) => set(s => ({
    scanResults: {
      ...s.scanResults,
      [scanId]: [...(s.scanResults[scanId] || []), line]
    }
  })),
  clearScan: (scanId) => set(s => {
    const r = { ...s.scanResults }; delete r[scanId]; return { scanResults: r }
  }),

  // AI messages — capped at 200 to prevent memory growth
  aiMessages: [],
  addAiMessage: (msg) => set(s => ({ aiMessages: [...s.aiMessages, msg].slice(-200) })),
  clearAiMessages: () => set({ aiMessages: [] }),
  aiThinking: false,
  setAiThinking: (v) => set({ aiThinking: v }),

  // Active agent (selected in AI page — also settable from command palette)
  selectedAgent: 'recon',
  setSelectedAgent: (agent) => set({ selectedAgent: agent }),

  // Active running agents
  activeAgents: [],
  setActiveAgents: (agents) => set({ activeAgents: agents }),

  // Notifications
  notifications: [],
  addNotification: (n) => {
    const id = Date.now()
    set(s => ({ notifications: [...s.notifications, { ...n, id }] }))
    setTimeout(() => set(s => ({ notifications: s.notifications.filter(x => x.id !== id) })), 5000)
  },
  removeNotification: (id) => set(s => ({ notifications: s.notifications.filter(n => n.id !== id) })),

  // Voice
  voiceActive: false,
  setVoiceActive: (v) => set({ voiceActive: v }),
  voiceListening: false,
  setVoiceListening: (v) => set({ voiceListening: v }),

  // Graph nodes/edges for active target
  graphNodes: [],
  graphEdges: [],
  setGraphData: (nodes, edges) => set({ graphNodes: nodes, graphEdges: edges }),
  addGraphNode: (node) => set(s => ({ graphNodes: [...s.graphNodes, node] })),
  addGraphEdge: (edge) => set(s => ({ graphEdges: [...s.graphEdges, edge] })),

  // Backend status
  backendOnline: false,
  setBackendOnline: (v) => set({ backendOnline: v }),
}))
