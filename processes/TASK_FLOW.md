# Task Generation, Storage & Chat Context Flow

## Data Flow Diagram

```
User Input (Meeting Notes)
    ↓
[TasksView.vue] → extractTasks() API call
    ↓
[backend/routes/structured.js] → /structured/tasks endpoint
    ↓
Structured output (task array)
    ↓
[tasksStore] → Pinia store (persistent across app)
    ↓
[ChatView.vue] reads from tasksStore
    ↓
[api.js] postChat() sends tasks as context
    ↓
[backend/routes/chat.js] receives context
    ↓
Builds context into instructions
    ↓
AI model responds with task awareness
```

---

## Frontend Scripts

### 1. Pinia Store: `frontend/src/stores/tasksStore.js`
Persistent storage for extracted tasks across all components.

```javascript
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useTasksStore = defineStore('tasks', () => {
  const tasks = ref([]);

  function setTasks(newTasks) {
    tasks.value = newTasks;
    console.log('[TasksStore] setTasks:', newTasks);
    newTasks.forEach((task, idx) => {
      console.log(`  [${idx}]`, task);
    });
  }

  function addTask(task) {
    tasks.value.push(task);
    console.log('[TasksStore] addTask:', task);
  }

  function clearTasks() {
    console.log('[TasksStore] clearTasks - removed', tasks.value.length, 'tasks');
    tasks.value = [];
  }

  return { tasks, setTasks, addTask, clearTasks };
});
```

---

### 2. Task Extraction: `frontend/src/views/TasksView.vue`
Extracts tasks from user input and stores in Pinia.

**Key parts:**
```javascript
// Import store
import { useTasksStore } from '../stores/tasksStore.js';
const tasksStore = useTasksStore();

// Extract and store
async function extract() {
  error.value = '';
  tasksStore.clearTasks();
  loading.value = true;
  try {
    const data = await extractTasks(input.value.trim());
    tasksStore.setTasks(data.tasks ?? []);
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

// Display from store
// v-for="(task, i) in tasksStore.tasks"
```

---

### 3. Chat with Context: `frontend/src/views/ChatView.vue`
Reads tasks from store and sends as context to chat API.

**Key parts:**
```javascript
// Import both stores
import { useTasksStore } from '../stores/tasksStore.js';
import { useFilesStore } from '../stores/filesStore.js';

const tasksStore = useTasksStore();
const filesStore = useFilesStore();

// Build context from stores
async function send() {
  const context = {
    tasks: tasksStore.tasks,
    uploadedFiles: filesStore.uploadedFiles,
  };
  console.log('[ChatView] Sending context:', context);
  const data = await postChat(text, context);
  // ...
}
```

---

### 4. API Helper: `frontend/src/api.js`
HTTP layer for chat requests with optional context.

**Key function:**
```javascript
export function postChat(message, context) {
  return request('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: message, ...(context && { context }) }),
  });
}
```

---

## Backend Scripts

### 5. Task Extraction Endpoint: `backend/routes/structured.js`
Extracts structured tasks using AI.

```javascript
router.post('/tasks', asyncHandler(async (req, res) => {
  const { input } = req.body ?? {};
  if (!input) return res.status(400).json({ error: 'input is required' });

  try {
    const response = await createResponse({
      model: config.defaultModel,
      input,
      instructions: 'Extract tasks with title, description, assignee, priority, due_date...',
      text: {
        format: {
          type: 'json_schema',
          name: 'task_list',
          schema: TASK_SCHEMA,
          strict: true,
        },
      },
    });

    const textContent = response.output?.[0]?.content?.[0]?.text;
    const parsed = JSON.parse(textContent);
    res.json({ response_id: response.id, tasks: parsed.tasks });
  } catch (e) {
    console.error('[/tasks] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
}));
```

---

### 6. Chat Endpoint with Context: `backend/routes/chat.js`
Chat that receives and uses task context in model instructions.

```javascript
router.post('/', asyncHandler(async (req, res) => {
  const { input, instructions, context } = req.body ?? {};
  if (!input) return res.status(400).json({ error: 'input is required' });

  console.log('[/chat] Received context:', context);

  // Build context-aware instructions
  let contextAware = instructions || '';
  if (context?.tasks?.length) {
    const tasksList = context.tasks
      .map(t => `- [${t.priority}] ${t.title} (Assignee: ${t.assignee}, Due: ${t.due_date || 'N/A'})`)
      .join('\n');
    contextAware += (contextAware ? '\n\n' : '') + 'Session Tasks:\n' + tasksList;
    console.log('[/chat] Added', context.tasks.length, 'tasks to context');
  }

  if (context?.uploadedFiles?.length) {
    const filesList = context.uploadedFiles
      .map(f => `- ${f.filename} (ID: ${f.file_id})`)
      .join('\n');
    contextAware += (contextAware ? '\n\n' : '') + 'Uploaded Files:\n' + filesList;
    console.log('[/chat] Added', context.uploadedFiles.length, 'files to context');
  }

  const response = await createResponse({
    model: config.defaultModel,
    input,
    ...(contextAware ? { instructions: contextAware } : {}),
  });

  res.json({ response_id: response.id, output_text: extractText(response) });
}));
```

---

## Data Schema

### Task Object (from AI extraction)
```javascript
{
  title: string,           // "Unit-Tests für Login-Modul"
  description: string,     // "Schreiben aller Unit-Tests für das Login-Modul."
  assignee: string,        // "Bob"
  priority: enum,          // "low" | "medium" | "high"
  due_date: string | null  // "2025-06-13" or null
}
```

---

## Debugging & Logs

Check browser console for:
- `[TasksStore] setTasks:` — Tasks being stored
- `[ChatView] Sending context:` — Context being sent to backend

Check backend console for:
- `[/chat] Received context:` — Context received by server
- `[/chat] Added X tasks to context` — Tasks included in AI instructions

---

## File Locations Summary

| Component | Path |
|-----------|------|
| Tasks Store | `frontend/src/stores/tasksStore.js` |
| Tasks View | `frontend/src/views/TasksView.vue` |
| Chat View | `frontend/src/views/ChatView.vue` |
| API Helper | `frontend/src/api.js` |
| Task Extraction | `backend/routes/structured.js` |
| Chat Endpoint | `backend/routes/chat.js` |
