/**
 * Thin wrapper around the OpenAI REST API using the Node 18.17+ native fetch.
 *
 * No SDK — every call is a plain HTTPS request so the wire format is visible.
 * FormData and Blob are picked up from the Node 18+ globals.
 */
import { config } from './config.js';

const BASE_URL = 'https://api.openai.com/v1';
const REQUEST_TIMEOUT_MS = 120_000; // 2 minutes

class OpenAIError extends Error {
  constructor(status, body) {
    super(`OpenAI ${status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`);
    this.status = status;
    this.body = body;
  }
}

async function request(path, { method = 'POST', body, headers = {}, raw = false } = {}) {
  if (!config.openaiApiKey) throw new Error('OPENAI_API_KEY is not set.');

  const isForm = body instanceof FormData;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const init = {
    method,
    signal: controller.signal,
    headers: {
      Authorization: `Bearer ${config.openaiApiKey}`,
      ...(isForm || body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
  };
  if (body !== undefined) init.body = isForm ? body : JSON.stringify(body);

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, init);
  } catch (err) {
    // Re-throw with a clearer message so it surfaces in the error log
    const reason = err?.cause?.message ?? err?.message ?? String(err);
    throw new Error(`Network error calling OpenAI (${method} ${path}): ${reason}`);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    let errBody;
    try {
      errBody = await res.json();
    } catch {
      try { errBody = await res.text(); } catch { errBody = `HTTP ${res.status}`; }
    }
    throw new OpenAIError(res.status, errBody);
  }

  return raw ? res : res.json();
}

/** POST /v1/responses */
export function createResponse(payload) {
  return request('/responses', { body: payload });
}

/** POST /v1/files (multipart) */
export async function uploadFile({ buffer, filename, mimeType, purpose = 'assistants' }) {
  const form = new FormData();
  form.append('purpose', purpose);
  form.append(
    'file',
    new Blob([buffer], { type: mimeType || 'application/octet-stream' }),
    filename,
  );
  return request('/files', { body: form });
}

/** POST /v1/vector_stores */
export function createVectorStore(name) {
  return request('/vector_stores', { body: { name } });
}

/** POST /v1/vector_stores/{id}/files */
export function addFileToVectorStore(vectorStoreId, fileId) {
  return request(`/vector_stores/${vectorStoreId}/files`, { body: { file_id: fileId } });
}

/** GET /v1/vector_stores/{id}/files/{fileId} — returns indexing status */
export function getVectorStoreFile(vectorStoreId, fileId) {
  return request(`/vector_stores/${vectorStoreId}/files/${fileId}`, { method: 'GET' });
}

/** GET /v1/containers/{cid}/files/{fid}/content — returns Buffer */
export async function downloadContainerFile(containerId, fileId) {
  const res = await request(
    `/containers/${containerId}/files/${fileId}/content`,
    { method: 'GET', raw: true },
  );
  return Buffer.from(await res.arrayBuffer());
}

/** POST /v1/audio/transcriptions */
export async function transcribeAudio({ buffer, filename, mimeType, model = 'gpt-4o-transcribe' }) {
  const form = new FormData();
  form.append('model', model);
  form.append('file', new Blob([buffer], { type: mimeType || 'audio/wav' }), filename);
  return request('/audio/transcriptions', { body: form });
}

/** POST /v1/audio/speech — returns Buffer */
export async function synthesizeSpeech({ text, model = 'gpt-4o-mini-tts', voice = 'alloy' }) {
  const res = await request('/audio/speech', {
    body: { model, voice, input: text },
    raw: true,
  });
  return Buffer.from(await res.arrayBuffer());
}
