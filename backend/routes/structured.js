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

    try {
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

      // Extract JSON from nested response structure
      const textContent = response.output?.[0]?.content?.[0]?.text;
      if (!textContent) {
        console.error('[/tasks] No text content in response:', response);
        return res.status(500).json({ error: 'No text content in API response' });
      }

      const parsed = JSON.parse(textContent);
      res.json({ response_id: response.id, tasks: parsed.tasks });
    } catch (e) {
      console.error('[/tasks] Error:', e.message, e.stack);
      res.status(500).json({ error: e.message });
    }
  }),
);

export default router;
