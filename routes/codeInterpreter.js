/**
 * Code interpreter: let the model run Python in a sandboxed container.
 *
 * Typical demo: upload `team_kapazitaeten.csv` via /files/upload, then post the
 * returned file_id here with a prompt like "Wer ist überlastet? Erstelle ein Diagramm."
 */
import { Router } from 'express';
import { config } from '../config.js';
import { createResponse, downloadContainerFile } from '../openaiClient.js';
import { extractGeneratedFiles, extractText } from '../utils.js';
import { asyncHandler } from '../middleware.js';

const router = Router();

router.post(
  '/run',
  asyncHandler(async (req, res) => {
    const { prompt, file_ids = [] } = req.body ?? {};
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const container = { type: 'auto' };
    if (Array.isArray(file_ids) && file_ids.length > 0) container.file_ids = file_ids;

    const response = await createResponse({
      model: config.defaultModel,
      input: prompt,
      tools: [{ type: 'code_interpreter', container }],
    });

    res.json({
      response_id: response.id,
      output_text: extractText(response),
      generated_files: extractGeneratedFiles(response),
    });
  }),
);

router.get(
  '/file/:containerId/:fileId',
  asyncHandler(async (req, res) => {
    const { containerId, fileId } = req.params;
    const buf = await downloadContainerFile(containerId, fileId);
    res.json({ file_id: fileId, base64: buf.toString('base64') });
  }),
);

export default router;
