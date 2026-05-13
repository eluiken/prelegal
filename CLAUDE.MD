Prelegal Project
Overview
This is a SaaS product to allow users to draft legal agreements based on templates in the templates directory. The user can carry out AI chat in order to establish what document they want and how to fill in the fields. The available documents are covered in the catalog.json file in the project root, included here:

@catalog.json

The catalog contains 12 document types. See the "What's implemented" section at the bottom for current status.

Development process
When instructed to build a feature:

Use your Atlassian tools to read the feature instructions from Jira
Develop the feature - do not skip any step from the feature-dev 7 step process
Thoroughly test the feature with unit tests and integration tests and fix any issues
Submit a PR using your github tools

AI design
When writing code to make calls to LLMs, use LiteLLM via OpenRouter. The free model fallback chain is defined in `backend/chat.py` and should be reused for any new LLM calls:

1. `openrouter/openai/gpt-oss-120b:free` (primary)
2. `openrouter/openai/gpt-oss-20b:free`
3. `openrouter/google/gemma-4-31b-it:free`
4. `openrouter/google/gemma-4-26b-a4b-it:free`

Use `_completion()` from `backend/chat.py` which handles model fallback and retry logic automatically. For field extraction, use JSON-from-prompt parsing (not `response_format`) as it works across all free models.

There is an OPENROUTER_API_KEY in the .env file in the project root.

Technical design
The entire project should be packaged into a Docker container.
The backend should be in backend/ and be a uv project, using FastAPI.
The frontend should be in frontend/
The database should use SQLLite and be created from scratch each time the Docker container is brought up, allowing for a users table with sign up and sign in.
Consider statically building the frontend and serving it via FastAPI, if that will work.
There should be scripts in scripts/ for:

# Mac
scripts/start-mac.sh    # Start
scripts/stop-mac.sh     # Stop

# Linux
scripts/start-linux.sh
scripts/stop-linux.sh

# Windows
scripts/start-windows.ps1
scripts/stop-windows.ps1
Backend available at http://localhost:8000

Color Scheme
Accent Yellow: #ecad0a
Blue Primary: #209dd7
Purple Secondary: #753991 (submit buttons)
Dark Navy: #032147 (headings)
Gray Text: #888888

## What's implemented

**Infrastructure (complete)**
- Multi-stage Docker build: Node 20 builds Next.js static export, Python 3.12 + uv serves it via FastAPI
- FastAPI backend at `http://localhost:8000` with SQLite at `/data/prelegal.db` (volume-mounted)
- Static frontend served from `/app/static` via FastAPI's `StaticFiles`
- Start/stop scripts for Mac, Linux, and Windows in `scripts/`
- Health endpoint: `GET /api/health`

**Auth (partial)**
- Login page (`/login`) — form UI only; stores email to `localStorage`, no real credential validation
- Auth guard on home route — redirects to `/login` if no `localStorage` entry

**AI Chat — Mutual NDA (complete)**
- `POST /api/chat/stream` — SSE streaming endpoint; streams AI reply tokens word-by-word, then emits a `fields` event with extracted NDA values
- `backend/chat.py` — free model fallback chain with per-model retry/backoff; JSON-from-prompt field extraction compatible with all models
- `frontend/components/ChatPanel.tsx` — chat UI with streaming bubbles, loading dots, error display (not committed to history), Download PDF button
- Mutual NDA live preview updates in real-time as the AI extracts field values

**Not yet implemented**
- Real auth API endpoints (signup/signin with password hashing)
- Multi-document support — only Mutual NDA is wired up; remaining 11 catalog types have templates in `templates/` but no UI
- Document persistence (no save/load to DB)
- Users table exists in SQLite but no API routes use it yet