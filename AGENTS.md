# Repository Guidelines

## Project Structure & Module Organization
This repository is a small monorepo with three apps:
- `backend/`: FastAPI API (`app/main.py`) with modules for AI fallback (`ai.py`), ToS;DR integration (`tosdr.py`), schemas, and SQLite persistence (`db.py`).
- `frontend/`: Vite + React + Tailwind dashboard (`src/App.jsx`, `src/api.js`).
- `extension/`: Chrome Extension Manifest v3 (`manifest.json`, `content.js`, `service-worker.js`).
- Root docs: `README.md` (setup and usage), `AGENTS.md` (this guide).

## Build, Test, and Development Commands
Run from project root unless noted.
- Backend setup/run:
  - `cd backend && python3 -m venv .venv && source .venv/bin/activate`
  - `pip install -r requirements.txt`
  - `uvicorn main:app --reload --port 8000`
- Frontend setup/run:
  - `cd frontend && npm install`
  - `npm run dev` (local UI)
  - `npm run build` (production build check)
- Extension load:
  - Chrome -> `chrome://extensions` -> Developer mode -> Load unpacked -> `extension/`.

## Coding Style & Naming Conventions
- JavaScript/React: 2-space indentation, semicolons optional (follow existing files), `camelCase` for variables/functions, `PascalCase` for React components.
- Python: PEP 8, 4-space indentation, type hints for public functions.
- Keep files modular by responsibility (API transport, parsing, storage, UI rendering separated).
- Prefer small, explicit functions over large monoliths.

## Testing Guidelines
No full automated suite is enforced yet.
Minimum checks before PR:
- `node --check extension/content.js extension/service-worker.js`
- `cd frontend && npm run build`
- `python3 -m compileall backend/app`
Add tests when introducing complex logic (especially auth-action blocking heuristics and backend parsing).

## Commit & Pull Request Guidelines
- Use clear, scoped commits, e.g. `extension: fix overlay acknowledge click guard`.
- Keep commits focused (avoid mixing backend/frontend/extension refactors in one commit unless required).
- PRs should include:
  - What changed and why
  - How to test locally (commands + target pages)
  - Screenshots/GIFs for UI or extension behavior changes
  - Any env/config changes (`.env.example`, ports, API URLs)

## Security & Configuration Tips
- Never commit real API keys; use `.env` files from examples.
- Validate CORS/host permissions carefully when changing extension/backend communication.
- For demos, verify backend is running at `http://localhost:8000` and extension host permissions match.
