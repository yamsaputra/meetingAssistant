/**
 * Structured output: extract a typed list of tasks from meeting notes
 * using the json_schema text format with strict mode.
 */
import { Router } from 'express';
import { config } from '../config.js';
import { createResponse } from '../openaiClient.js';
import { asyncHandler } from '../middleware.js';

const router = Router();

const TASK_SCHEMA = {
  type: 'object',
  properties: {
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          assignee: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high'] },
          due_date: { type: ['string', 'null'] },
        },
        required: ['title', 'description', 'assignee', 'priority', 'due_date'],
        additionalProperties: false,
      },
    },
  },
  required: ['tasks'],
  additionalProperties: false,
};

router.post(
  '/tasks',
  asyncHandler(async (req, res) => {
    const { input } = req.body ?? {};
    if (!input) return res.status(400).json({ error: 'input is required' });

    const response = await createResponse({
      model: config.defaultModel,
      input,
      instructions:
        'Du extrahierst Aufgaben aus Meeting-Protokollen. ' +
        'Erkenne pro Aufgabe Titel, Beschreibung, verantwortliche Person, ' +
        'Priorität und (falls genannt) Fälligkeitsdatum im Format YYYY-MM-DD.',
      text: {
        format: {
          type: 'json_schema',
          name: 'task_list',
          schema: TASK_SCHEMA,
          strict: true,
        },
      },
    });

    const parsed = JSON.parse(response.output_text);
    res.json({ response_id: response.id, tasks: parsed.tasks });
  }),
);

export default router;
