<div align="center">

```
███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗    ██╗   ██╗██╗  ████████╗██████╗  █████╗
████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝    ██║   ██║██║  ╚══██╔══╝██╔══██╗██╔══██╗
██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗    ██║   ██║██║     ██║   ██████╔╝███████║
██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║    ██║   ██║██║     ██║   ██╔══██╗██╔══██║
██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║    ╚██████╔╝███████╗██║   ██║  ██║██║  ██║
╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝     ╚═════╝ ╚══════╝╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝
```

**AI-powered cybersecurity platform — 12 elite agents, free cloud AI, Kali Linux Docker, full OSINT**

[![Release](https://img.shields.io/github/v/release/flippits/nexus-ultra?style=flat-square&color=00f5ff)](https://github.com/flippits/nexus-ultra/releases)
[![License](https://img.shields.io/badge/license-MIT-00f5ff?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-00f5ff?style=flat-square)]()
[![AI](https://img.shields.io/badge/AI-Groq%20%7C%20Gemini%20%7C%20Ollama-00f5ff?style=flat-square)]()

</div>

---

## What is NEXUS ULTRA?

NEXUS ULTRA is a desktop cybersecurity platform that puts 12 specialized AI agents at your fingertips — all running locally via Electron, powered by free-tier AI engines (Groq, Gemini) or your own local Ollama models. No cloud subscriptions required.

It was built for penetration testers, red team operators, CTF competitors, and security researchers who want a single unified workspace for reconnaissance, exploitation, OSINT, vulnerability analysis, and reporting.

---

## Features

### 12 Elite AI Agents
| Agent | Role |
|-------|------|
| **RECON** | Passive/active reconnaissance, subdomain enumeration |
| **EXPLOIT** | CVE analysis, exploitation guidance, PoC generation |
| **OSINT** | Open-source intelligence, social footprinting |
| **VULN** | Vulnerability assessment, risk scoring |
| **NETWORK** | Network mapping, traffic analysis |
| **WEB** | Web application security, injection, auth bypass |
| **CRYPTO** | Cryptographic analysis, hash cracking guidance |
| **FORENSICS** | Digital forensics, log analysis, artifact extraction |
| **AUTOPWN** | Automated attack path planning |
| **EVADE** | Defense evasion, AV bypass techniques |
| **LATERAL** | Lateral movement, privilege escalation |
| **CTF** | Capture The Flag specialist, challenge solver |

### Free Cloud AI — No Credit Card Needed
- **Groq** — Llama 3.3 70B at 800+ tokens/second, completely free
- **Gemini** — Google Gemini 2.0 Flash, 1M tokens/day free
- **Ollama** — Any local model, fully offline

### Platform Capabilities
- **Kali Linux Docker** — Full Kali environment with 100+ tools, accessible from the app
- **Live Terminal** — Interactive shell with xterm.js
- **Target Management** — Track hosts, domains, findings per engagement
- **Knowledge Graph** — Visual network topology with Cytoscape.js
- **Vulnerability Database** — Findings with severity scoring and CVE links
- **Report Generation** — AI-generated engagement reports
- **OSINT Suite** — Subdomain, port, email, and social enumeration
- **Command Palette** — `⌘K` instant navigation across the entire app

---

## Download

Get the latest installer for your platform from the [**Releases page**](https://github.com/flippits/nexus-ultra/releases).

| Platform | File |
|----------|------|
| macOS (Apple Silicon + Intel) | `NEXUS ULTRA-*-mac.dmg` |
| Windows 10/11 | `NEXUS ULTRA Setup *.exe` |
| Linux | `NEXUS ULTRA-*.AppImage` |

### Requirements
- **Python 3.10+** — [python.org/downloads](https://www.python.org/downloads/)
- **Docker** (optional) — for Kali Linux integration
- **Ollama** (optional) — for free local AI models — [ollama.com](https://ollama.com)
- **Groq API key** (optional, free) — [console.groq.com](https://console.groq.com)
- **Gemini API key** (optional, free) — [aistudio.google.com](https://aistudio.google.com/app/apikey)

> Python dependencies are installed automatically on first launch.

---

## Getting Started

1. **Download** the installer for your platform from Releases
2. **Install** and launch NEXUS ULTRA
3. **Onboarding wizard** will guide you through AI engine setup
4. Enter your free Groq or Gemini API key (or skip to use Ollama locally)
5. Select a target and choose an agent — start hacking

---

## Development Setup

```bash
# Clone the repo
git clone https://github.com/flippits/nexus-ultra.git
cd nexus-ultra

# Install frontend dependencies
cd frontend
npm install

# Set up Python backend
cd ../backend
python3 -m pip install -r requirements.txt

# Create your local .env (never committed)
cp backend/.env.example backend/.env
# Edit backend/.env and add your API keys

# Start the app (Electron + Vite + FastAPI in one command)
cd frontend
npm start
```

### Stack
- **Frontend**: Electron, React 19, Vite, Tailwind CSS 4, Framer Motion
- **Backend**: Python FastAPI, SQLAlchemy, uvicorn, aiosqlite
- **AI**: OpenAI SDK (routing to Groq/Gemini/Anthropic/OpenAI), Ollama
- **Visualization**: Three.js, Cytoscape.js, Recharts, xterm.js

---

## Project Structure

```
nexus-ultra/
├── backend/              # FastAPI backend
│   ├── routers/          # API route handlers (ai, targets, scans, etc.)
│   ├── main.py           # App entry point
│   ├── database.py       # SQLAlchemy models
│   └── requirements.txt
├── frontend/             # Electron + React app
│   ├── src/
│   │   ├── pages/        # Full-page views (AIPage, WarRoom, etc.)
│   │   └── components/   # Reusable UI components
│   ├── electron.cjs      # Electron main process
│   ├── preload.cjs       # Electron preload bridge
│   └── package.json
├── docker/               # Kali Linux Docker config
└── .github/workflows/    # CI/CD for automated releases
```

---

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to get involved.

---

## Security

NEXUS ULTRA is built for authorized security testing only. Do not use it against systems you do not have explicit permission to test.

If you discover a security vulnerability in NEXUS ULTRA itself, please open a private issue or email the maintainers rather than disclosing publicly.

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
Built by <a href="https://github.com/flippits">flippits</a> — contributions welcome
</div>
