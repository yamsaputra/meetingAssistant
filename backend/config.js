import { config as loadEnv } from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env') });

export const config = {
  openaiApiKey: process.env.OPENAI_API_KEY ?? '',
  port: Number(process.env.PORT ?? 8000),
  host: process.env.HOST ?? 'localhost',
  defaultModel: process.env.DEFAULT_MODEL ?? 'gpt-4o',
  visionModel: process.env.VISION_MODEL ?? 'gpt-4o',
  imageModel: process.env.IMAGE_MODEL ?? 'gpt-4o',
  vectorStoreId: process.env.VECTOR_STORE_ID ?? null,
};
