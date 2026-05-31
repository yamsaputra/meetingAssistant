/**
 * File management: upload to OpenAI Files API (optionally index into a vector store),
 * and search over indexed files using the file_search tool.
 */
import { Router } from 'express';
import multer from 'multer';
import { config } from '../config.js';
import { addFileToVectorStore, createResponse, uploadFile } from '../openaiClient.js';
import { asyncHandler } from '../middleware.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  '/upload',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'A file upload is required' });

    const uploaded = await uploadFile({
      buffer: req.file.buffer,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
    });

    if (config.vectorStoreId) {
      await addFileToVectorStore(config.vectorStoreId, uploaded.id);
    }

    res.json({
      file_id: uploaded.id,
      filename: uploaded.filename,
      vector_store_id: config.vectorStoreId ?? null,
    });
  }),
);

router.post(
  '/search',
  asyncHandler(async (req, res) => {
    const { query, vector_store_id } = req.body ?? {};
    if (!query) return res.status(400).json({ error: 'query is required' });

    const vsId = vector_store_id ?? config.vectorStoreId;
    if (!vsId) return res.status(400).json({ error: 'No vector store configured' });

    const response = await createResponse({
      model: config.defaultModel,
      input: query,
      tools: [{ type: 'file_search', vector_store_ids: [vsId] }],
    });

    let outputText = '';
    const citations = [];
    for (const item of response?.output ?? []) {
      if (item.type !== 'message') continue;
      for (const c of item.content ?? []) {
        if (c.type === 'output_text' || c.type === 'text') outputText += c.text ?? '';
        for (const ann of c.annotations ?? []) {
          if (ann.type === 'file_citation') {
            citations.push({ file_id: ann.file_id ?? null, filename: ann.filename ?? null, quote: ann.quote ?? null });
          }
        }
      }
    }

    res.json({ response_id: response.id, output_text: outputText, citations });
  }),
);

export default router;
