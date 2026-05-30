/**
 * File upload, vector-store management, and file_search tool calls.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import { config } from '../config.js';
import {
  addFileToVectorStore,
  createResponse,
  createVectorStore,
  getVectorStoreFile,
  uploadFile,
} from '../openaiClient.js';
import { extractFileSearchCitations, extractText } from '../utils.js';
import { asyncHandler } from '../middleware.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Persist the vector store ID to disk so it survives server restarts.
// Priority: VECTOR_STORE_ID env var → saved file → create new
const VS_ID_PATH = join(process.cwd(), '.vector_store_id');

function readSavedVsId() {
  try {
    return readFileSync(VS_ID_PATH, 'utf8').trim() || null;
  } catch {
    return null;
  }
}

function saveVsId(id) {
  try {
    writeFileSync(VS_ID_PATH, id, 'utf8');
    console.log(`[files] vector store ID saved → ${VS_ID_PATH}`);
  } catch (e) {
    console.warn('[files] could not persist vector_store_id:', e.message);
  }
}

let cachedVectorStoreId = readSavedVsId();
if (cachedVectorStoreId) {
  console.log(`[files] reusing vector store: ${cachedVectorStoreId}`);
}

/** Poll until the file's indexing status is 'completed' or 'failed'. */
async function waitForIndexing(vsId, fileId, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const vsFile = await getVectorStoreFile(vsId, fileId);
    console.log(`[files] indexing status for ${fileId}: ${vsFile.status}`);
    if (vsFile.status === 'completed') return;
    if (vsFile.status === 'failed') {
      throw new Error(`File indexing failed: ${vsFile.last_error?.message ?? 'unknown error'}`);
    }
    // in_progress — wait 2 s before next check
    await new Promise(r => setTimeout(r, 2_000));
  }
  console.warn(`[files] indexing timed out for ${fileId} — search may return empty results`);
}

async function ensureVectorStore(name = 'meeting-assistant-store') {
  if (config.vectorStoreId) return config.vectorStoreId;
  if (cachedVectorStoreId) return cachedVectorStoreId;

  console.log('[files] creating new vector store…');
  const vs = await createVectorStore(name);
  cachedVectorStoreId = vs.id;
  saveVsId(vs.id);
  return vs.id;
}

router.post(
  '/upload',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'file is required (multipart field "file")' });

    const uploaded = await uploadFile({
      buffer: req.file.buffer,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
    });
    const vsId = await ensureVectorStore();
    await addFileToVectorStore(vsId, uploaded.id);
    await waitForIndexing(vsId, uploaded.id);   // wait until searchable

    console.log(`[files] indexed ${req.file.originalname} → ${uploaded.id} (vs: ${vsId})`);

    res.json({
      file_id: uploaded.id,
      filename: req.file.originalname,
      vector_store_id: vsId,
    });
  }),
);

router.get(
  '/vector-store',
  asyncHandler(async (_req, res) => {
    res.json({ vector_store_id: await ensureVectorStore() });
  }),
);

router.post(
  '/search',
  asyncHandler(async (req, res) => {
    const { query, vector_store_id, max_num_results = 10 } = req.body ?? {};
    if (!query) return res.status(400).json({ error: 'query is required' });

    const vsId = vector_store_id || (await ensureVectorStore());

    const response = await createResponse({
      model: config.defaultModel,
      instructions:
        'You are a document analyst. The user has uploaded one or more documents ' +
        'into a vector store. Use the file_search tool to retrieve relevant passages ' +
        'and answer questions based strictly on what the documents contain.\n\n' +
        'Important rules:\n' +
        '- When the user asks for a "summary" or "overview", search for terms like ' +
        '"abstract", "introduction", "conclusion", "findings", "results", "objective" ' +
        'and synthesise all retrieved passages into a clear, structured summary.\n' +
        '- Never say you could not find information without first trying several ' +
        'different search queries (e.g. topic keywords, section names).\n' +
        '- Base every answer solely on retrieved document content. ' +
        'Cite the source file wherever citations are available.\n' +
        '- If no relevant chunks are found after multiple attempts, say so clearly ' +
        'and suggest a more specific question the user could ask.',
      input: query,
      tools: [
        {
          type: 'file_search',
          vector_store_ids: [vsId],
          max_num_results,
        },
      ],
      include: ['file_search_call.results'],
    });

    res.json({
      response_id: response.id,
      answer: extractText(response),
      citations: extractFileSearchCitations(response),
    });
  }),
);

export default router;
