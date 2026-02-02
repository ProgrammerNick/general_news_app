## Personalized Morning Brief (Python API + TanStack mobile web UI)

Python-based audio news app that tailors daily news summaries to your interests and listening history. It fetches recent news (24–48h), generates a concise 5–10 minute spoken brief using Gemini, avoids repetition via a FAISS RAG store, and asks for feedback to refine future briefs. Audio is generated with gTTS by default or Google Cloud Text-to-Speech if configured.

This repo includes:
- **Backend**: FastAPI (`backend/main.py`) wrapping the existing `pmbrief/*` pipeline
- **Frontend**: React + **TanStack Router** + **TanStack Query** (`frontend/`) with a mobile-friendly UI and HTML5 audio playback

### Features
- Onboarding: enter interests once; stored in Neon Postgres (if configured) or local JSON.
- News: fetches from NewsAPI.org based on your interests.
- Personalization: Gemini summary guided by interests and your RAG history.
- RAG: FAISS vector store populated with past briefs and feedback.
- Feedback loop: rate and say what you want more/less of; influences future briefs.
- Audio: MP3 output, auto-play; Windows-friendly with fallback.
- CLI (optional): `python app.py` still works if you want a terminal workflow.

### Setup
1) Python 3.10+
2) Create and activate a venv
   - Windows (PowerShell):
     ```
     python -m venv .venv
     .venv\\Scripts\\Activate.ps1
     ```
3) Install dependencies
   ```
   pip install -r requirements.txt
   ```
4) Environment variables
   - Create `.env` in the project root and fill in values from `config_templates/ENV_TEMPLATE.txt`:
     - `GEMINI_API_KEY` (required)
     - `NEWSAPI_KEY` (required)
     - `DATABASE_URL` (optional Neon Postgres; fallback is local JSON)
     - `TTS_PROVIDER` = `gtts` or `gcloud` (optional)
     - `GOOGLE_APPLICATION_CREDENTIALS` or `GOOGLE_TTS_SERVICE_ACCOUNT_JSON` if using Google TTS

### Prevent accidental pushes (optional)
This repo includes a local git pre-push hook that can hard-block `git push`.

Enable it:
```
git config core.hooksPath .githooks
```

To allow a single push intentionally:
```
ALLOW_PUSH=1 git push
```

### Run (API + Mobile Web UI)
Start the backend API:

```
uvicorn backend.main:app --reload --port 8000
```

Start the frontend dev server in a second terminal:

```
cd frontend
npm install
npm run dev
```

Frontend talks to `http://localhost:8000` by default. If you run the API on a different host/port, set:
- `VITE_API_BASE_URL` (Vite env var) in your local environment before `npm run dev`.

### Data locations
- Vector store: `data/vectorstore`
- Summaries (text/mp3): `data/summaries`
- Local profile/feedback fallback: `data/profile.json`, `data/feedback.jsonl`

### Notes
- NewsAPI free tier returns abstracts and links (no full text). The model is prompted to stay faithful to titles/descriptions and provide brief source callouts.
- To use Neon, set `DATABASE_URL` as a SQLAlchemy URL, e.g.:\
  `postgresql+psycopg://USER:PASSWORD@HOST/DB?sslmode=require`

### Run (optional CLI mode)
```
python app.py --auto
```
Flags:
- `--auto`: non-interactive (use saved interests).
- `--no-play`: skip audio playback (still generates MP3).
- `--loop`: runs daily (simple 24h sleep loop).
