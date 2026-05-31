/**
 * Basic chat endpoint — single-turn request via the Responses API.
 */
import { Router } from 'express';
import { config } from '../config.js';
import { createResponse } from '../openaiClient.js';
import { extractText } from '../utils.js';
import { asyncHandler } from '../middleware.js';

const router = Router();

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { input, instructions } = req.body ?? {};
    if (!input) return res.status(400).json({ error: 'input is required' });

    const response = await createResponse({
      model: config.defaultModel,
      input,
      ...(instructions ? { instructions } : {}),
    });

    res.json({ response_id: response.id, output_text: extractText(response) });
  }),
);

export default router;
