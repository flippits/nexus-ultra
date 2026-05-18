import { useEffect, useState } from 'react'
import { useStore } from './store'
import { healthCheck } from './utils/api'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import NotificationStack from './components/panels/NotificationStack'
import ErrorBoundary from './components/ErrorBoundary'
import OnboardingWizard from './components/OnboardingWizard'
import CommandPalette from './components/CommandPalette'
import WarRoom from './pages/WarRoom'
import TargetManager from './pages/TargetManager'
import GraphView from './pages/GraphView'
import ToolsPage from './pages/ToolsPage'
import AIPage from './pages/AIPage'
import FindingsPage from './pages/FindingsPage'
import ReportsPage from './pages/ReportsPage'
import OsintPage from './pages/OsintPage'
import CTFPage from './pages/CTFPage'
import SettingsPage from './pages/SettingsPage'
import DockerPage from './pages/DockerPage'
import FlipperPage from './pages/FlipperPage'
import UtilitiesPage from './pages/UtilitiesPage'
import NetworkPage from './pages/NetworkPage'

const PAGES = {
  warroom:   WarRoom,
  targets:   TargetManager,
  graph:     GraphView,
  tools:     ToolsPage,
  ai:        AIPage,
  findings:  FindingsPage,
  osint:     OsintPage,
  reports:   ReportsPage,
  ctf:       CTFPage,
  docker:    DockerPage,
  flipper:   FlipperPage,
  utilities: UtilitiesPage,
  network:   NetworkPage,
  settings:  SettingsPage,
}

export default function App() {
  const { activeView, setBackendOnline } = useStore()
  const [booting, setBooting] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)

  useEffect(() => {
    const check = async () => {
      try {
        await healthCheck()
        setBackendOnline(true)
        setBooting(false)
        // Show onboarding on first launch
        if (!localStorage.getItem('nexus_onboarded')) {
          setShowOnboarding(true)
        }
      } catch {
        setBackendOnline(false)
        setTimeout(check, 2000)
      }
    }
    check()
  }, [])

  const PageComponent = PAGES[activeView] || WarRoom

  if (booting) return <BootScreen />

  if (showOnboarding) return <OnboardingWizard onComplete={() => setShowOnboarding(false)} />

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-primary)' }}>
      <TopBar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <ErrorBoundary key={activeView}>
            <PageComponent />
          </ErrorBoundary>
        </main>
      </div>
      <NotificationStack />
      <CommandPalette />
    </div>
  )
}

function BootScreen() {
  const [progress, setProgress] = useState(0)
  const [lines, setLines] = useState(['NEXUS ULTRA v1.0.0', 'Initializing systems...'])

  useEffect(() => {
    const msgs = [
      'Loading threat intelligence engine...',
      'Connecting to AI subsystem...',
      'Initializing tool executors...',
      'Loading OSINT modules...',
      'Connecting to backend...',
    ]
    let i = 0
    const iv = setInterval(() => {
      if (i < msgs.length) {
        setLines(l => [...l, msgs[i]])
        setProgress((i + 1) / msgs.length * 85)
        i++
      } else clearInterval(iv)
    }, 380)
    return () => clearInterval(iv)
  }, [])

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 32,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 64, fontWeight: 900, color: 'var(--accent-cyan)',
          letterSpacing: 16, textShadow: '0 0 60px rgba(0,245,255,0.7)',
        }}>NEXUS</div>
        <div style={{ fontSize: 13, color: 'var(--accent-green)', letterSpacing: 24, marginTop: 6 }}>
          U L T R A
        </div>
      </div>
      <div style={{ width: 460 }}>
        {lines.map((l, i) => (
          <div key={i} style={{
            color: i === 0 ? 'var(--accent-cyan)' : 'var(--accent-green)',
            fontSize: 12, marginBottom: 5,
            opacity: i === lines.length - 1 ? 1 : 0.6,
          }}>
            {i === 0 ? '' : <span style={{ color: 'var(--accent-cyan)', marginRight: 8 }}>{'>'}</span>}{l}
          </div>
        ))}
        <span className="cursor-blink" style={{ color: 'var(--accent-cyan)' }}>█</span>
      </div>
      <div style={{ width: 460, height: 2, background: 'var(--border)', borderRadius: 1, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${progress}%`,
          background: 'linear-gradient(to right, var(--accent-cyan), var(--accent-green))',
          boxShadow: '0 0 14px rgba(0,245,255,0.7)',
          transition: 'width 0.4s ease',
        }} />
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: 11, letterSpacing: 3 }}>
        WAITING FOR ENGINE...
      </div>
    </div>
  )
}
