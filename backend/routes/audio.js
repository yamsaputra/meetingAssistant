/**
 * Audio routes: transcription (speech-to-text) and speech synthesis (TTS).
 */
import { Router } from 'express';
import multer from 'multer';
import { synthesizeSpeech, transcribeAudio } from '../openaiClient.js';
import { asyncHandler } from '../middleware.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post(
  '/transcribe',
  upload.single('audio'),
  asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'An audio file upload is required' });

    const result = await transcribeAudio({
      buffer: req.file.buffer,
      filename: req.file.originalname,
      mimeType: req.file.mimetype,
    });

    res.json({ text: result.text });
  }),
);

router.post(
  '/speak',
  asyncHandler(async (req, res) => {
    const { text, voice = 'alloy' } = req.body ?? {};
    if (!text) return res.status(400).json({ error: 'text is required' });

    const buf = await synthesizeSpeech({ text, voice });
    res.set('Content-Type', 'audio/mpeg').send(buf);
  }),
);

export default router;
