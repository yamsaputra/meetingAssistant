import { Router } from 'express';

const router = Router();

router.all('*', (_req, res) => {
  res.status(501).json({
    error: 'Audio routes are not yet enabled. Set AUDIO_ENABLED=true in .env when ready.',
  });
});

export default router;
