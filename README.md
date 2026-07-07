# Meeting & Project Assistant (Node & Express JS + Vue 3)

Express backend + Vue 3 frontend that wraps the **OpenAI Responses API** for a project/meeting
assistant demo. Uses raw `node-fetch` calls against `https://api.openai.com/v1`
— no SDK — so the wire format is fully visible.

---

## Version History

| Version | Date       | Area     | Change |
| ------- | ---------- | -------- | ------ |
| 0.33.1  | 2026-07-07 | Security | Removed hardcoded Atlassian API token from `node_test.mjs`; credentials now read from `JIRA_URL` / `JIRA_EMAIL` / `JIRA_API_TOKEN` env vars |
| 0.33    | 2026-06-14 | Frontend | TasksView now properly collects and persists extracted tasks via Pinia `tasksStore` |
| 0.33    | 2026-06-14 | Frontend | ChatView renders assistant replies as Markdown (via `utils/markdown.js`) |
| 0.33    | 2026-06-14 | Frontend | ChatView passes ongoing tasks and uploaded file list as context to the chat API |
| 0.33    | 2026-06-14 | Backend  | `chat.js` injects session tasks + uploaded files into system instructions |
| 0.33    | 2026-06-14 | Backend  | `structured.js` updated task extraction schema and response handling |
| 0.31    | 2026-05-31 | Repo     | Repository restructured: `src/` → `backend/`; Vue 3 + Vite frontend scaffolded |
| 0.30    | 2026-05-31 | Backend  | `.env` configuration file added |
| 0.20    | 2026-05-30 | Backend  | Initial Express server with all 8 OpenAI route handlers |

---

## Features

| Feature                          | Backend endpoint         | Frontend view | OpenAI tool          |
| -------------------------------- | ------------------------ | ------------- | -------------------- |
| Plain chat / summary             | `POST /chat`             | Chat          | —                    |
| Document Q&A + citations         | `POST /files/search`     | Files         | `file_search`        |
| Whiteboard image analysis        | `POST /vision/analyze`   | Vision        | vision (image input) |
| Task extraction                  | `POST /structured/tasks` | Tasks         | `json_schema`        |
| Jira / Slack automation          | `POST /functions/run`    | Functions     | function calling     |
| CSV analysis / chart generation  | `POST /code/run`         | Code          | `code_interpreter`   |
| Image generation                 | `POST /images/generate`  | —             | `image_generation`   |
| Audio (planned)                  | `POST /audio/*` (501)    | —             | `audio.*`            |

---

## Setup

Requires Node **18.17+** (uses global `FormData`/`Blob`) — Node 20+ recommended.

```bash
npm install
cp .env.example .env   # fill in OPENAI_API_KEY and Jira credentials
npm run dev            # starts both backend (port 8000) and frontend (port 5173)
npm run dev:frontend   # frontend only
npm run dev:backend    # backend only
```

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:5173`

---

## Frontend

Built with **Vue 3 + Vite**, **Tailwind CSS**, and **Pinia** for state management.

| View          | Description |
| ------------- | ----------- |
| **Chat**      | Markdown-rendered conversational chat; automatically includes current session tasks and uploaded files as context |
| **Files**     | Drag-and-drop file upload with vector store indexing; semantic search with source citations |
| **Code**      | Attach uploaded files and run natural-language prompts through the code interpreter; displays generated charts and files inline |
| **Vision**    | Upload an image or paste a URL; enter a custom prompt to get a natural-language analysis |
| **Tasks**     | Paste meeting notes to extract structured task cards (title, assignee, priority, due date); tasks persist across tab switches |
| **Functions** | Issue natural-language instructions to trigger Jira ticket creation or Slack messages via function calling |

State is shared across views via two Pinia stores:
- `filesStore` — uploaded file list and current vector store ID
- `tasksStore` — extracted tasks from the Tasks view, consumed by Chat as context

---

## Demo walkthrough

1. **Upload your demo files**
   ```bash
   curl -F file=@sample_data/meeting_protokoll.pdf      http://localhost:8000/files/upload
   curl -F file=@sample_data/Projektbriefing.txt        http://localhost:8000/files/upload
   curl -F file=@sample_data/wissenschaftlicher-Artikel.pdf http://localhost:8000/files/upload
   ```

2. **Summarize project status with citations**
   ```bash
   curl -X POST http://localhost:8000/files/search \
     -H 'Content-Type: application/json' \
     -d '{"query":"Fasse den aktuellen Projektstand zusammen und zitiere die Quellen."}'
   ```

3. **Analyze a whiteboard image**
   ```bash
   curl -X POST http://localhost:8000/vision/analyze \
     -F image=@sample_data/whiteboard.png \
     -F prompt="Welche Prozessschritte zeigt dieses Whiteboard?"
   ```

4. **Extract tasks from meeting notes**
   ```bash
   curl -X POST http://localhost:8000/structured/tasks \
     -H 'Content-Type: application/json' \
     -d '{"input":"<Meeting-Protokoll als Text>"}'
   ```

5. **Push tasks to Jira via function calling**
   ```bash
   curl -X POST http://localhost:8000/functions/run \
     -H 'Content-Type: application/json' \
     -d '{"input":"Erstelle Jira-Tickets für alle offenen Aufgaben aus dem Meeting."}'
   ```

6. **Analyze a CSV with code interpreter**
   ```bash
   FID=$(curl -s -F file=@sample_data/team_kapazitaeten.csv \
            http://localhost:8000/files/upload | jq -r .file_id)

   curl -X POST http://localhost:8000/code/run \
     -H 'Content-Type: application/json' \
     -d "{\"prompt\":\"Wer ist überlastet? Erstelle ein Balkendiagramm der Auslastung.\",
          \"file_ids\":[\"$FID\"]}"
   ```

7. **Generate an image**
   ```bash
   curl -X POST http://localhost:8000/images/generate \
     -H 'Content-Type: application/json' \
     -d '{"prompt":"Cartoon-Maskottchen für unser Projektteam, freundlich, mit Laptop."}'
   ```

---

## Project layout

```
backend/
  server.js              # Express app + router registration
  config.js              # env loader (OpenAI, Jira, server settings)
  openaiClient.js        # node-fetch wrapper for /v1 endpoints
  utils.js               # response-parsing helpers
  tools.js               # Jira + Slack integration (TOOL_REGISTRY / TOOL_DEFINITIONS)
  middleware.js          # asyncHandler + central error handler
  routes/
    chat.js              # context-aware chat (injects tasks & files into system prompt)
    files.js             # upload, vector store, file_search
    vision.js
    structured.js        # JSON-schema task extraction
    functions.js         # full tool-call agent loop (max 5 turns)
    codeInterpreter.js   # code execution + container file download
    images.js
    audio.js             # stubbed until audio is GA

frontend/
  src/
    App.vue              # tab shell (Alpha v0.33), KeepAlive wrapper
    api.js               # fetch wrappers for all backend routes
    style.css            # global Tailwind base styles
    utils/
      markdown.js        # Markdown → HTML renderer used by ChatView
    stores/
      filesStore.js      # Pinia: uploaded files + vector store ID
      tasksStore.js      # Pinia: extracted tasks, persisted across tab switches
    views/
      ChatView.vue       # Markdown-rendered chat with task + file context injection
      FilesView.vue      # drag-and-drop upload; semantic search with citations
      CodeView.vue       # code interpreter prompt + inline generated file output
      VisionView.vue     # image upload/URL + custom analysis prompt
      TasksView.vue      # meeting notes → structured task cards
      FunctionsView.vue  # natural-language → Jira/Slack tool calls
    components/
      TabNav.vue
      LoadingSpinner.vue
      ErrorAlert.vue
      JsonBlock.vue

processes/
  TASK_FLOW.md           # internal process documentation

sample_data/             # drop your demo files here
```

---

## Notes

- The vector store is created lazily on first upload. Set `VECTOR_STORE_ID` in `.env` to reuse one across restarts.
- `tools.js` contains a working Jira integration (`createJiraTicket`). Configure it via `JIRA_URL`, `JIRA_EMAIL`, `JIRA_TOKEN`, and `JIRA_PROJECT_KEY` in `.env`. Slack (`sendSlackMessage`) is currently mocked.
- The function-calling loop caps at 5 turns — bump `MAX_TURNS` in `routes/functions.js` if your demo needs more chained calls.
- Switch models per-feature via `DEFAULT_MODEL`, `VISION_MODEL`, `IMAGE_MODEL` in `.env`.
- Audio: the wiring (`transcribeAudio`, `synthesizeSpeech` in `openaiClient.js`, routes in `routes/audio.js`) is already in place — just flip `AUDIO_ENABLED = true` when you're ready.
