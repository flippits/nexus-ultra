# Contributing to NEXUS ULTRA

Thanks for your interest in contributing. Here's everything you need to know.

---

## Ways to Contribute

- **Bug reports** — open an issue with steps to reproduce
- **Feature requests** — open an issue describing the feature and use case
- **Code** — fork, implement, submit a PR
- **Documentation** — improve the README, add inline docs, write guides
- **Agent prompts** — improve the AI agent system prompts in `backend/routers/ai.py`

---

## Development Setup

```bash
git clone https://github.com/flippits/nexus-ultra.git
cd nexus-ultra

# Frontend
cd frontend && npm install

# Backend
cd ../backend && python3 -m pip install -r requirements.txt

# Copy env template and fill in your keys
cp backend/.env.example backend/.env

# Start everything
cd frontend && npm start
```

The `npm start` command launches Vite dev server + FastAPI backend + Electron all at once via `concurrently`.

---

## Branch Naming

```
feat/short-description       # new feature
fix/short-description        # bug fix
agent/agent-name             # new or improved AI agent
docs/short-description       # documentation only
refactor/short-description   # refactor, no behaviour change
```

---

## Making a Pull Request

1. Fork the repo and create your branch from `main`
2. Make your changes with clear, focused commits
3. Test that the app starts and your change works end-to-end
4. Open a PR against `main` with:
   - A clear title describing what changed
   - A short description of why
   - Steps to test it

Keep PRs focused — one feature or fix per PR. Large PRs are hard to review and slow to merge.

---

## Code Style

- **Frontend**: React functional components, hooks, no class components
- **Backend**: async FastAPI routes, type-annotated, Pydantic models
- **Comments**: only when the _why_ is non-obvious — code should be self-documenting
- **No unused imports or dead code**

---

## Adding a New AI Agent

Agents are defined in two places:

1. **Backend system prompt** — add an entry to the `AGENTS` dict in `backend/routers/ai.py`
2. **Frontend UI card** — add an entry to the `AGENTS` array in `frontend/src/pages/AIPage.jsx`

Both must use the same `id` string. The `system` field in the backend is the full prompt that shapes the agent's personality and capabilities.

---

## Sensitive Data Rules

- **Never commit** `backend/.env`, `*.db`, `*.pyc`, `data/wordlists/`
- **Never include** personal names, real IP addresses, or real target data in commits
- These are all covered by `.gitignore` — double-check before committing

---

## Issues and Discussions

- Search existing issues before opening a new one
- Use issue templates if available
- For questions, open a Discussion rather than an issue

---

## Code of Conduct

Be respectful. This project is for authorized security research and education. Do not use it as a platform to discuss illegal activity.
