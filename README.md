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
[![AI](https://img.shields.io/badge/AI-Groq%20%7C%20Gemini%20%7C%20Ollama%20%7C%20Claude-00f5ff?style=flat-square)]()
[![MCP](https://img.shields.io/badge/MCP-Claude%20Code%20integration-00f5ff?style=flat-square)]()

</div>

---

## What is NEXUS ULTRA?

NEXUS ULTRA is a desktop cybersecurity platform that puts 12 specialized AI agents at your fingertips — all running locally via Electron, powered by free-tier AI engines (Groq, Gemini) or your own local Ollama models. No cloud subscriptions required.

It was built for penetration testers, red team operators, CTF competitors, and security researchers who want a single unified workspace for reconnaissance, exploitation, OSINT, vulnerability analysis, and reporting.

It also ships a built-in **MCP server** so Claude Code CLI can connect directly to your engagement data — read targets, query findings, and add vulnerabilities from your terminal without leaving your workflow.

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

### AI Engines — Mix and Match
| Engine | Models | Cost |
|--------|--------|------|
| **Groq** | Llama 3.3 70B, DeepSeek R1 | Free — 800+ tok/s |
| **Gemini** | Gemini 2.0 Flash | Free — 1M tokens/day |
| **Ollama** | Any local model | Free — fully offline |
| **Anthropic** | Claude Opus 4.7, Sonnet 4.6, Haiku 4.5 | Paid — best quality |
| **OpenAI** | GPT-4o, GPT-4o Mini | Paid |

### Platform Capabilities
- **Kali Linux Docker** — Full Kali environment with 100+ tools, accessible from the app
- **Live Terminal** — Interactive shell with xterm.js
- **Target Management** — Track hosts, domains, findings per engagement
- **Knowledge Graph** — Visual network topology with Cytoscape.js
- **Vulnerability Database** — Findings with severity scoring and CVE links
- **Report Generation** — AI-generated engagement reports
- **OSINT Suite** — Subdomain, port, email, and social enumeration
- **Command Palette** — `⌘K` / `Ctrl+K` instant navigation across the entire app
- **Claude Code MCP** — Connect Claude Code CLI to your live engagement data

---

## Download

Get the latest installer for your platform from the [**Releases page**](https://github.com/flippits/nexus-ultra/releases).

| Platform | File |
|----------|------|
| macOS (Apple Silicon + Intel) | `NEXUS ULTRA-*-mac.dmg` |
| Windows 10/11 | `NEXUS ULTRA Setup *.exe` |
| Linux | `NEXUS ULTRA-*.AppImage` |

### macOS — first launch

macOS will show a security warning because the app isn't signed with an Apple Developer certificate. To open it:

**Option 1 — right-click method (easiest):**
1. Right-click (or Control-click) `NEXUS ULTRA.app` → **Open**
2. Click **Open** in the dialog — you only need to do this once

**Option 2 — Terminal (one command):**
```bash
xattr -cr "/Applications/NEXUS ULTRA.app"
```
Then double-click to open normally.

**Option 3 — System Settings:**
System Settings → Privacy & Security → scroll down → **Open Anyway**

### Requirements

No prerequisites for the basic app — Python is bundled inside the installer.

Optional integrations:
- **Docker** — Kali Linux environment
- **Ollama** — local AI models — [ollama.com](https://ollama.com)
- **Groq API key** (free) — [console.groq.com](https://console.groq.com)
- **Gemini API key** (free) — [aistudio.google.com](https://aistudio.google.com/app/apikey)
- **Anthropic API key** — Claude Opus/Sonnet — [console.anthropic.com](https://console.anthropic.com)
- **Claude Code CLI** — terminal integration via MCP — `npm install -g @anthropic-ai/claude-code`

---

## Getting Started

1. **Download** the installer for your platform from Releases
2. **Install** and launch NEXUS ULTRA
3. **Onboarding wizard** will guide you through AI engine setup
4. Enter your free Groq or Gemini API key (or skip to use Ollama locally)
5. Select a target and choose an agent — start hacking

---

## Claude Code Integration

NEXUS ULTRA runs a built-in **MCP (Model Context Protocol) server** on `http://localhost:8765/mcp`. When the app is open, Claude Code CLI can connect to it and interact with your live engagement data directly from the terminal.

### What Claude Code can do

| Tool | Description |
|------|-------------|
| `list_targets` | List all tracked engagement targets |
| `get_target(id)` | Get full details for a target |
| `list_findings(target_id?, severity?)` | Query findings — filter by target and/or severity |
| `add_finding(target_id, title, severity, ...)` | Add a vulnerability finding from the terminal |
| `list_scans(target_id)` | View scan history and tool output |
| `get_report(target_id)` | Pull the AI-generated pentest report |

### Setup

**1. Install Claude Code** (if you haven't already):
```bash
npm install -g @anthropic-ai/claude-code
```

**2. Open NEXUS ULTRA** — the backend must be running for Claude Code to connect.

**3. Add the MCP server to your Claude Code config.**

Open (or create) `~/.claude.json` and add:

```json
{
  "mcpServers": {
    "nexus-ultra": {
      "type": "http",
      "url": "http://localhost:8765/mcp"
    }
  }
}
```

On Windows the file is at `%USERPROFILE%\.claude.json`.

> **Tip:** Settings → Claude Code Integration in the app shows this exact block with a one-click copy button and auto-fills your configured port.

**4. Start Claude Code:**
```bash
claude
```

### Example prompts

```
list my NEXUS targets
show all critical and high findings for target 2
add a finding: SQL injection on /login, severity high, target 1
summarize the report for target 3
what scans have been run against example.com?
```

Claude Code will call the MCP tools automatically and present the results inline.

### Notes

- NEXUS ULTRA must be open while you use the integration — the MCP server only runs while the app is running.
- The server binds to `localhost` only and is not accessible from other machines.
- `run_tool` (triggering nmap, gobuster, etc. from Claude Code) is not exposed intentionally — use the app's Tools page or terminal for active scanning.

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
- **MCP**: Python `mcp` SDK — streamable HTTP transport, FastMCP server
- **Visualization**: Three.js, Cytoscape.js, Recharts, xterm.js

---

## Project Structure

```
nexus-ultra/
├── backend/              # FastAPI backend
│   ├── routers/
│   │   ├── ai.py         # 12 AI agents + model routing
│   │   ├── targets.py    # Engagement target CRUD
│   │   ├── findings.py   # Vulnerability findings
│   │   ├── scans.py      # Scan history
│   │   ├── reports.py    # AI report generation
│   │   ├── osint.py      # OSINT tools
│   │   ├── tools.py      # nmap, gobuster, ffuf wrappers
│   │   ├── network.py    # Network discovery
│   │   ├── mcp_router.py # MCP server (Claude Code integration)
│   │   └── ...
│   ├── main.py           # App entry point + MCP mount
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
