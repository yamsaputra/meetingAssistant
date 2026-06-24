/**
 * Vision: send an image (uploaded file or URL) to the model.
 */
import { Router } from 'express';
import multer from 'multer';
import { config } from '../config.js';
import { createResponse } from '../openaiClient.js';
import { extractText } from '../utils.js';
import { asyncHandler } from '../middleware.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  '/analyze',
  upload.single('image'),
  asyncHandler(async (req, res) => {
    const prompt = req.body.prompt || 'Describe what you see in this picture.';
    const imageUrl = req.body.image_url;

    console.log('[vision.js] Image analysis request received');
    console.log('[vision.js] Prompt:', prompt?.substring(0, 100) + (prompt?.length > 100 ? '...' : ''));
    console.log('[vision.js] Image source:', req.file ? 'file upload' : (imageUrl ? 'URL' : 'none'));

    if (!req.file && !imageUrl) {
      console.error('[vision.js] ERROR: Neither image file nor image_url provided');
      return res.status(400).json({ error: 'Provide either an "image" upload or "image_url"' });
    }

    let imagePart;
    if (req.file) {
      const b64 = req.file.buffer.toString('base64');
      const mime = req.file.mimetype || 'image/png';
      imagePart = { type: 'input_image', image_url: `data:${mime};base64,${b64}` };
      console.log('[vision.js] File upload prepared:', {
        filename: req.file.originalname,
        mimeType: mime,
        sizeBytes: req.file.size,
      });
    } else {
      imagePart = { type: 'input_image', image_url: imageUrl };
      console.log('[vision.js] Using image URL:', imageUrl?.substring(0, 100) + '...');
    }

    console.log('[vision.js] Sending vision request to model:', config.visionModel);

    try {
      const response = await createResponse({
        model: config.visionModel,
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: prompt },
              imagePart,
            ],
          },
        ],
      });

      console.log('[vision.js] Response received successfully:', {
        id: response.id,
        hasOutput: !!response.output,
      });

      res.json({ response_id: response.id, output_text: extractText(response) });
    } catch (error) {
      console.error('[vision.js] ERROR analyzing image:', error.message);
      throw error;
    }
  }),
);

export default router;
