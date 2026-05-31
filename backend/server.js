/**
 * Express entry point for the Meeting & Project Assistant demo server.
 */
import cors from 'cors';
import express from 'express';

import { config } from './config.js';
import { errorMiddleware } from './middleware.js';

import audioRouter from './routes/audio.js';
import chatRouter from './routes/chat.js';
import codeRouter from './routes/codeInterpreter.js';
import filesRouter from './routes/files.js';
import functionsRouter from './routes/functions.js';
import imagesRouter from './routes/images.js';
import structuredRouter from './routes/structured.js';
import visionRouter from './routes/vision.js';

// Log every unhandled error but keep the process alive so the Vite proxy
// connection is not reset mid-request.
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err.message, err.stack);
});

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.get('/', (_req, res) => {
  res.json({
    service: 'meeting-assistant',
    status: 'ok',
    endpoints: [
      'POST /chat',
      'POST /files/upload',
      'POST /files/search',
      'POST /vision/analyze',
      'POST /structured/tasks',
      'POST /functions/run',
      'POST /code/run',
      'POST /images/generate',
      'POST /audio/transcribe (501 until enabled)',
    ],
  });
});

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/chat', chatRouter);
app.use('/files', filesRouter);
app.use('/vision', visionRouter);
app.use('/structured', structuredRouter);
app.use('/functions', functionsRouter);
app.use('/code', codeRouter);
app.use('/images', imagesRouter);
app.use('/audio', audioRouter);

app.use(errorMiddleware);

app.listen(config.port, config.host, () => {
  console.log(`[server.mjs -  DEV] listening on http://${config.host}:${config.port}`);
  console.log(`[server.mjs -  DEV] config data: ${JSON.stringify(config)}`);
  if (!config.openaiApiKey) {
    console.warn('[warn] OPENAI_API_KEY is not set — API calls will fail');
  }
});
