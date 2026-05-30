# Meeting & Project Assistant — Boilerplate Server (Node/Express)

Express server that wraps the **OpenAI Responses API** for a project/meeting
assistant demo. Uses raw `node-fetch` calls against `https://api.openai.com/v1`
— no SDK — so the wire format is fully visible.

## Features

| Demo step                  | Endpoint                | Responses API tool        |
| -------------------------- | ----------------------- | ------------------------- |
| Plain chat / summary       | `POST /chat`            | (none)                    |
| Document Q&A + Zitate      | `POST /files/search`    | `file_search`             |
| Whiteboard-Foto analysieren| `POST /vision/analyze`  | vision (image input)      |
| Aufgaben extrahieren       | `POST /structured/tasks`| `json_schema` text format |
| Jira/Slack-Tickets anlegen | `POST /functions/run`   | function calling          |
| `team_kapazitaeten.csv` analysieren | `POST /code/run` | `code_interpreter`        |
| Bildausgabe                | `POST /images/generate` | `image_generation`        |
| Audio (zukünftig)          | `POST /audio/*` (501)   | `audio.*`                 |

## Setup

Requires Node **18.17+** (uses global `FormData`/`Blob`) — Node 20+ recommended.

```bash
cd meeting-assistant
npm install
cp .env.example .env   # fill in OPENAI_API_KEY
npm run dev            # starts with --watch
```

Server: `http://localhost:8000`

## Demo walkthrough

1. **Upload deine Demo-Dateien**
   ```bash
   curl -F file=@sample_data/meeting_protokoll.pdf      http://localhost:8000/files/upload
   curl -F file=@sample_data/Projektbriefing.txt        http://localhost:8000/files/upload
   curl -F file=@sample_data/wissenschaftlicher-Artikel.pdf http://localhost:8000/files/upload
   ```

2. **Projektstand zusammenfassen mit Zitaten**
   ```bash
   curl -X POST http://localhost:8000/files/search \
     -H 'Content-Type: application/json' \
     -d '{"query":"Fasse den aktuellen Projektstand zusammen und zitiere die Quellen."}'
   ```

3. **Whiteboard-Bild analysieren**
   ```bash
   curl -X POST http://localhost:8000/vision/analyze \
     -F image=@sample_data/whiteboard.png \
     -F prompt="Welche Prozessschritte zeigt dieses Whiteboard?"
   ```

4. **Aufgaben strukturiert extrahieren**
   ```bash
   curl -X POST http://localhost:8000/structured/tasks \
     -H 'Content-Type: application/json' \
     -d '{"input":"<Meeting-Protokoll als Text>"}'
   ```

5. **Aufgaben in Jira pushen (Function Calling)**
   ```bash
   curl -X POST http://localhost:8000/functions/run \
     -H 'Content-Type: application/json' \
     -d '{"input":"Erstelle Jira-Tickets für alle offenen Aufgaben aus dem Meeting."}'
   ```

6. **CSV analysieren (Code Interpreter)**
   ```bash
   FID=$(curl -s -F file=@sample_data/team_kapazitaeten.csv \
            http://localhost:8000/files/upload | jq -r .file_id)

   curl -X POST http://localhost:8000/code/run \
     -H 'Content-Type: application/json' \
     -d "{\"prompt\":\"Wer ist überlastet? Erstelle ein Balkendiagramm der Auslastung.\",
          \"file_ids\":[\"$FID\"]}"
   ```

7. **Bild generieren**
   ```bash
   curl -X POST http://localhost:8000/images/generate \
     -H 'Content-Type: application/json' \
     -d '{"prompt":"Cartoon-Maskottchen für unser Projektteam, freundlich, mit Laptop."}'
   ```

## Project layout

```
src/
  server.js              # Express app + router registration
  config.js              # env loader
  openaiClient.js        # node-fetch wrapper for /v1 endpoints
  utils.js               # response-parsing helpers
  tools.js               # mock create_jira_ticket / send_slack_message
  middleware.js          # asyncHandler + central error handler
  routes/
    chat.js
    files.js             # upload, vector store, file_search
    vision.js
    structured.js        # JSON-schema task extraction
    functions.js         # full tool-call agent loop
    codeInterpreter.js
    images.js
    audio.js             # stubbed until audio is GA
sample_data/             # drop your demo files here
```

## Notes

- The vector store is created lazily on first upload. Set `VECTOR_STORE_ID`
  in `.env` to reuse one across restarts.
- `tools.js` is where you swap mock Jira/Slack calls for real ones.
- The function-calling loop caps at 5 turns — bump `MAX_TURNS` in
  `routes/functions.js` if your demo needs more chained calls.
- Switch models per-feature via `DEFAULT_MODEL`, `VISION_MODEL`, `IMAGE_MODEL`.
- Audio: the wiring (`transcribeAudio`, `synthesizeSpeech` in `openaiClient.js`,
  routes in `routes/audio.js`) is already in place — just flip
  `AUDIO_ENABLED = true` when you're ready.
