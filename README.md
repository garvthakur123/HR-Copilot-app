# HR Interview Copilot

An AI-powered assistant that helps HR recruiters conduct structured, technically informed interviews — without needing deep technical expertise themselves.

> **Built at a 24-hour hackathon by a 5-person team.**

---

## What It Does

HR recruiters often interview candidates for highly technical roles but lack the domain knowledge to evaluate answers in real time. HR Interview Copilot solves this by:

1. **Analysing the Job Description and CV** before the interview to surface skill matches, gaps, and risk areas.
2. **Generating a tailored interview plan** — a set of targeted technical questions based on the JD-CV gap.
3. **Assisting HR live during the interview** via a floating overlay that listens to the candidate, transcribes speech, and instantly shows:
   - Answer quality rating
   - What was missing from the answer
   - What a strong answer should have included
   - Suggested follow-up question
   - Red flags
4. **Producing a final structured report** after the interview — candidate summary, skill-wise evaluation, strengths, weaknesses, and recommended next step.

> The AI does **not** reject candidates or make hiring decisions. It only helps HR ask better questions and evaluate answers more fairly.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Frontend (React + Vite)             │
│                                                      │
│  HR Dashboard          Electron Overlay Window       │
│  ─────────────         ──────────────────────────    │
│  Add Candidate  ──WS──▶ AI Copilot Panel (floating) │
│  Candidate List         Live Transcript              │
│  Session Analysis       Answer Insights              │
│  Interview Screen       Follow-up Suggestions        │
│                         Red Flag Alerts              │
└────────────────────────────┬────────────────────────┘
                             │  WebSocket
                             ▼
┌─────────────────────────────────────────────────────┐
│              Backend (Python + FastAPI)              │
│                                                      │
│  POST /api/ws/interview  (WebSocket)                 │
│   • create_session  → analyse JD + CV via OpenAI    │
│   • analyze_jd_cv   → load candidate context        │
│   • audio/analyze   → transcribe + evaluate answer  │
│                                                      │
│  OpenAI API  │  Deepgram STT  │  In-memory store    │
└─────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, JavaScript |
| Desktop shell | Electron 42 |
| State | React Context (Auth, Data, WebSocket) |
| Styling | CSS (custom design system, no framework) |
| Backend | Python, FastAPI |
| AI | OpenAI API (JD/CV analysis, answer evaluation) |
| Speech-to-text | Deepgram Nova-2 |
| Transport | WebSocket (persistent, full-duplex) |
| Session mapping | localStorage + `src/data/sessionMap.json` (dev) |

---

## Project Structure

```
HR-Copilot-app/
├── electron/
│   ├── main.cjs              # Electron main process (two windows: app + overlay)
│   ├── preload.cjs           # Exposes copilotAPI to the main window
│   └── overlay-preload.cjs   # Exposes overlayAPI to the transparent overlay window
│
├── src/
│   ├── components/
│   │   ├── overlay/
│   │   │   ├── InterviewCopilotOverlay.jsx   # Floating AI copilot panel
│   │   │   └── InterviewCopilotOverlay.css
│   │   ├── Sidebar.jsx
│   │   └── DateTimePicker.jsx
│   │
│   ├── contexts/
│   │   ├── AuthContext.jsx    # Login / session
│   │   ├── DataContext.jsx    # Candidate + department data
│   │   └── WSContext.jsx      # Persistent WebSocket connection (app-wide)
│   │
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx
│   │   ├── Candidates.jsx
│   │   ├── CandidateDetail.jsx   # Join Interview button → triggers analyze_jd_cv
│   │   ├── AddCandidate.jsx      # Sends create_session over WebSocket
│   │   └── Departments.jsx
│   │
│   ├── data/
│   │   └── sessionMap.json    # email → session_id mapping (written at runtime)
│   │
│   └── utils/
│       └── emailService.js    # Interview invite emails via EmailJS
│
├── extension/                 # Chrome Extension (injects overlay into Google Meet)
│   ├── manifest.json
│   ├── contentScript.js
│   └── overlay.css
│
└── vite.config.js             # Includes dev-server middleware for sessionMap writes
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.10+
- A running FastAPI backend (see Backend Setup)

### Frontend — Web Mode

```bash
npm install
npm run dev
# Opens at http://localhost:5173
```

### Frontend — Electron Mode (with floating overlay)

```bash
# Kill any leftover process on port 5173 first
lsof -ti:5173 | xargs kill -9

npm run electron:dev
```

This starts both Vite (port 5173) and Electron. Two windows open:
- **Main window** — the HR dashboard
- **Overlay window** — transparent floating copilot panel (toggle with `Cmd/Ctrl + Shift + H`)

### Backend Setup

```bash
cd backend         # your FastAPI project
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The frontend expects:
- `ws://localhost:8000/api/ws/interview` — WebSocket endpoint
- `POST http://localhost:8000/api/sessions/{session_id}/audio/analyze` — audio analysis

### Chrome Extension (Google Meet overlay)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `extension/` folder
4. Open any `https://meet.google.com` meeting — the HR Copilot overlay appears automatically

---

## WebSocket Message Protocol

### Client → Server

```json
// Step 1: Create a session with JD + CV
{ "type": "create_session", "job_description": "...", "cv_data": "<base64 PDF>" }

// Step 2: Before interview starts — load candidate context
{ "type": "analyze_jd_cv", "session_id": "..." }
```

### Server → Client

```json
// Session created
{ "type": "create_session", "session_id": "b4b3d02b-..." }

// JD/CV analysis result
{
  "type": "analyze_jd_cv",
  "session_id": "...",
  "matched_skills": [...],
  "missing_skills": [...],
  "risk_areas": [...],
  "interview_plan": [...]
}
```

### Audio Analysis (REST)

```
POST /api/sessions/{session_id}/audio/analyze
Content-Type: multipart/form-data
  file     → answer.webm
  question → "Explain how you improved backend API performance."
  topic    → "Backend API Performance"
```

Response:
```json
{
  "transcript": "I optimised the APIs by...",
  "analysis": {
    "quality_rating": "Generic",
    "score": 45,
    "summary": "...",
    "what_was_missing": ["specific metrics", "caching strategy"],
    "expected_answer_should_include": ["latency numbers", "before/after comparison"],
    "suggested_follow_up_question": "Can you describe one specific slow API...",
    "red_flag": { "is_red_flag": true, "reason": "Vague claim without technical evidence." }
  }
}
```

---

## Key Design Decisions

- **AI assists, HR decides.** Every screen and report includes a disclaimer: the AI does not make hiring decisions.
- **Persistent WebSocket.** One shared connection is opened when the app starts and auto-reconnects. All pages (AddCandidate, CandidateDetail, Overlay) share it via React Context.
- **Session mapping.** When a candidate is added, `email → session_id` is stored in both `localStorage` (runtime) and `src/data/sessionMap.json` (visible on disk). The CandidateDetail page reads from localStorage to pass the correct session to the backend when Join Interview is clicked.
- **Two-window Electron architecture.** The main window is the HR dashboard. The overlay window is a separate transparent, always-on-top, click-through Electron window that floats over video call software.
- **Chrome Extension fallback.** For teams that cannot install Electron, a Chrome Extension injects the same overlay UI directly into Google Meet pages.

---

## Keyboard Shortcuts (Electron)

| Shortcut | Action |
|---|---|
| `Cmd/Ctrl + Shift + H` | Toggle overlay window |
| `Cmd/Ctrl + Arrow Keys` | Move overlay window |
| `Cmd/Ctrl + ]` / `[` | Increase / decrease overlay opacity |
| `Cmd/Ctrl + Shift + Q` | Quit app |

---

## Team

Built in 24 hours at a hackathon by a 5-person team.

---

## Disclaimer

This tool is designed to assist HR professionals with structured, fair, and technically informed interviews. It does not replace human judgment. All final hiring decisions remain entirely with the HR team.
