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
    console.log('[files.js] Upload request received');
    
    if (!req.file) {
      console.error('[files.js] ERROR: No file provided in upload');
      return res.status(400).json({ error: 'A file upload is required' });
    }

    console.log('[files.js] File details:', {
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      bufferLength: req.file.buffer.length,
    });

    try {
      const uploaded = await uploadFile({
        buffer: req.file.buffer,
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
      });

      console.log('[files.js] File uploaded successfully:', {
        file_id: uploaded.id,
        filename: uploaded.filename,
      });

      if (config.vectorStoreId) {
        console.log('[files.js] Adding file to vector store:', config.vectorStoreId);
        await addFileToVectorStore(config.vectorStoreId, uploaded.id);
        console.log('[files.js] File added to vector store successfully');
      } else {
        console.log('[files.js] No vector store configured, skipping indexing');
      }

      res.json({
        file_id: uploaded.id,
        filename: uploaded.filename,
        vector_store_id: config.vectorStoreId ?? null,
      });
    } catch (error) {
      console.error('[files.js] ERROR uploading file:', error.message);
      throw error;
    }
  }),
);

router.post(
  '/search',
  asyncHandler(async (req, res) => {
    const { query, vector_store_id } = req.body ?? {};
    console.log('[files.js] Search request received');
    console.log('[files.js] Query:', query?.substring(0, 100) + (query?.length > 100 ? '...' : ''));
    console.log('[files.js] Provided vector_store_id:', vector_store_id || 'none');
    
    if (!query) {
      console.error('[files.js] ERROR: query is required');
      return res.status(400).json({ error: 'query is required' });
    }

    const vsId = vector_store_id ?? config.vectorStoreId;
    if (!vsId) {
      console.error('[files.js] ERROR: No vector store configured');
      return res.status(400).json({ error: 'No vector store configured' });
    }

    console.log('[files.js] Using vector store:', vsId);
    console.log('[files.js] Sending file_search request to model:', config.defaultModel);

    try {
      const response = await createResponse({
        model: config.defaultModel,
        input: query,
        tools: [{ type: 'file_search', vector_store_ids: [vsId] }],
      });

      console.log('[files.js] Response received:', { id: response.id, hasOutput: !!response.output });

      let outputText = '';
      const citations = [];
      let citationCount = 0;
      
      for (const item of response?.output ?? []) {
        if (item.type !== 'message') continue;
        for (const c of item.content ?? []) {
          if (c.type === 'output_text' || c.type === 'text') outputText += c.text ?? '';
          for (const ann of c.annotations ?? []) {
            if (ann.type === 'file_citation') {
              citationCount++;
              citations.push({ file_id: ann.file_id ?? null, filename: ann.filename ?? null, quote: ann.quote ?? null });
            }
          }
        }
      }

      console.log('[files.js] Search completed:', {
        outputLength: outputText.length,
        citationCount,
      });

      res.json({ response_id: response.id, answer: outputText, citations });
    } catch (error) {
      console.error('[files.js] ERROR during file search:', error.message);
      throw error;
    }
  }),
);

export default router;
