/**
 * Image generation via the built-in `image_generation` tool of the Responses API.
 */
import { Router } from 'express';
import { config } from '../config.js';
import { createResponse } from '../openaiClient.js';
import { asyncHandler } from '../middleware.js';

const router = Router();

router.post(
  '/generate',
  asyncHandler(async (req, res) => {
    const { prompt, size = '1024x1024', quality = 'high' } = req.body ?? {};
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const response = await createResponse({
      model: config.defaultModel,
      input: prompt,
      tools: [{ type: 'image_generation', size, quality }],
    });

    for (const item of response.output ?? []) {
      if (item.type === 'image_generation_call') {
        return res.json({
          image_base64: item.result,
          revised_prompt: item.revised_prompt ?? null,
        });
      }
    }

    res.status(500).json({ error: 'No image was returned by the model.' });
  }),
);

export default router;
