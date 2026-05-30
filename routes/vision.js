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
    const prompt = req.body.prompt || 'Beschreibe was du auf diesem Bild siehst.';
    const imageUrl = req.body.image_url;

    if (!req.file && !imageUrl) {
      return res.status(400).json({ error: 'Provide either an "image" upload or "image_url"' });
    }

    let imagePart;
    if (req.file) {
      const b64 = req.file.buffer.toString('base64');
      const mime = req.file.mimetype || 'image/png';
      imagePart = { type: 'input_image', image_url: `data:${mime};base64,${b64}` };
    } else {
      imagePart = { type: 'input_image', image_url: imageUrl };
    }

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

    res.json({ response_id: response.id, output_text: extractText(response) });
  }),
);

export default router;
