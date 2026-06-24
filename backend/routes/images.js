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
    console.log('[images.js] Image generation request received');
    console.log('[images.js] Prompt:', prompt?.substring(0, 100) + (prompt?.length > 100 ? '...' : ''));
    console.log('[images.js] Parameters:', { size, quality });
    
    if (!prompt) {
      console.error('[images.js] ERROR: prompt is required');
      return res.status(400).json({ error: 'prompt is required' });
    }

    console.log('[images.js] Sending image generation request to model:', config.defaultModel);

    try {
      const response = await createResponse({
        model: config.defaultModel,
        input: prompt,
        tools: [{ type: 'image_generation', size, quality }],
      });

      console.log('[images.js] Response received:', { id: response.id, hasOutput: !!response.output });

      for (const item of response.output ?? []) {
        if (item.type === 'image_generation_call') {
          console.log('[images.js] Image generated successfully:', {
            hasImage: !!item.result,
            hasRevisedPrompt: !!item.revised_prompt,
          });
          return res.json({
            image_base64: item.result,
            revised_prompt: item.revised_prompt ?? null,
          });
        }
      }

      console.error('[images.js] ERROR: No image generation call found in response');
      res.status(500).json({ error: 'No image was returned by the model.' });
    } catch (error) {
      console.error('[images.js] ERROR generating image:', error.message);
      throw error;
    }
  }),
);

export default router;
