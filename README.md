# AI-Powered Terms of Service Analyzer (MVP)

Hackathon-ready full-stack prototype with:

- Chrome Extension (Manifest v3)
- FastAPI backend (`/analyze`, `/history`)
- React + Vite + Tailwind dashboard (landing analytics + search)

## Features

- Detects ToS/privacy/cookie language on pages.
- Auto-detects signup/login pages and shows risk summary overlay.
- Temporarily blocks auth actions (`continue`, `sign in`, `sign in with Google/Facebook/Apple`, etc.) until user acknowledgment.
- Backend checks ToS;DR first; falls back to Gemini if needed.
- Common-site preset summaries for fast demo behavior.
- Dashboard to view history and run manual domain analysis.

## Architecture

```text
extension (content script + service worker)
  -> POST /analyze
backend (FastAPI)
  -> ToS;DR API (search/service)
  -> Gemini API fallback
  -> SQLite persistence
frontend (Vite React dashboard)
  -> GET /history
  -> POST /analyze
```

## Project Structure

```text
.
├── backend/
│   ├── app/
│   │   ├── ai.py
│   │   ├── db.py
│   │   ├── main.py
│   │   ├── schemas.py
│   │   └── tosdr.py
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
├── extension/
│   ├── manifest.json
│   ├── service-worker.js
│   └── content.js
└── frontend/
    ├── src/
    ├── package.json
    └── .env.example
```

## Prerequisites

- Python `3.10+` (recommended: `3.12`)
- Node.js `18+` and npm
- Google Chrome
- Optional: Gemini API key for AI fallback

## Environment Variables

### Backend (`backend/.env`)

Copy from `.env.example`.

```env
PORT=8000
ALLOWED_ORIGINS=http://localhost:5173,chrome-extension://*
DATABASE_PATH=./tos_analyzer.db
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

### Frontend (`frontend/.env`)

```env
VITE_API_BASE=http://localhost:8000
```

## Local Startup (Linux/macOS)

### 1) Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# add GEMINI_API_KEY in .env if you want AI fallback
uvicorn main:app --reload --port 8000
```

Backend should be available at `http://localhost:8000`.

### 2) Frontend

Open a new terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Dashboard runs at `http://localhost:5173`.

### 3) Chrome Extension (Detailed Setup)

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode** (top-right toggle).
3. Click **Load unpacked**.
4. Select the `extension/` folder from this repo.
5. Confirm **AI ToS Analyzer** appears and is enabled.
6. Click the extension card's **Reload** button after any local code change.
7. Click the puzzle icon (Extensions) in Chrome.
8. Pin **AI ToS Analyzer** to keep the icon visible in toolbar.
9. On `chrome://extensions`, open **Service worker** / **Inspect views** for debug logs.
10. Open any `http/https` site and click extension icon for a manual scan.
11. Open a signup/login page to verify auto overlay + temporary auth-action blocking.
12. If it does not react, hard refresh tab (`Ctrl+Shift+R` or `Cmd+Shift+R`) and reload extension.

## Local Startup (Windows - PowerShell)

### 1) Backend

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
# add GEMINI_API_KEY in .env if needed
uvicorn main:app --reload --port 8000
```

If `py -3.12` is not installed, use `py -3`.

### 2) Frontend

Open a new PowerShell terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

### 3) Chrome Extension (Detailed Setup)

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked** and choose `extension/`.
4. Pin **AI ToS Analyzer** from Chrome extensions menu.
5. Use **Reload** on the extension card after code changes.
6. Use **Service worker / Inspect views** for debugging logs.

## API Endpoints

- `GET /health`
- `POST /analyze`
- `GET /history?limit=50`

### Sample `/analyze` payload

```json
{
  "domain": "example.com",
  "url": "https://example.com/privacy",
  "text": "Visible terms/privacy/signup popup text..."
}
```

## Extension Behavior (Prototype)

- Auto-detects likely auth pages using URL + input + action/button signals.
- Blocks likely auth actions until user clicks **I understand, continue** in overlay.
- Uses common-site presets first for quick demo.
- For non-common sites, sends extracted text to backend (`ToS;DR` first, then AI fallback).
- Extension icon click still triggers a manual scan.

## Demo Flow

1. Start backend (`:8000`) and frontend (`:5173`).
2. Load extension in Chrome.
3. Visit a signup/login page.
4. Observe overlay + temporary action blocking.
5. Acknowledge summary to unlock actions.
6. Open dashboard and review analysis history.

## Troubleshooting

### `Error loading ASGI app. Could not import module "main"`

Run from `backend/` and use:

```bash
uvicorn main:app --reload --port 8000
```

### `Unexpected token 'I' ... is not valid JSON`

Usually means backend returned plain text error (like `Internal Server Error`).

- Check backend terminal logs for stack trace.
- Ensure backend is running on `http://localhost:8000`.

### Extension appears but nothing happens

- Reload extension in `chrome://extensions`.
- Hard refresh the target page.
- Verify backend is running.
- Open extension service worker console from `chrome://extensions` to inspect errors.

### Python venv issues on latest Python versions

Use Python `3.12` if possible.

### CORS issues

Make sure backend `.env` includes:

```env
ALLOWED_ORIGINS=http://localhost:5173,chrome-extension://*
```

## Notes

- This is a prototype; selectors/heuristics are intentionally pragmatic and not universal.
- Blocking logic can be bypassed on highly custom/auth-obfuscated flows; tune site-specific selectors as needed.
