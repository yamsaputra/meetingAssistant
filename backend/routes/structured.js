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
    console.log('[structured.js] Task extraction request received');
    console.log('[structured.js] Input:', input?.substring(0, 100) + (input?.length > 100 ? '...' : ''));
    
    if (!input) {
      console.error('[structured.js] ERROR: input is required');
      return res.status(400).json({ error: 'input is required' });
    }

    console.log('[structured.js] Sending structured output request to model:', config.defaultModel);

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

      console.log('[structured.js] Response received:', { id: response.id, hasOutput: !!response.output });

      // Extract JSON from nested response structure
      const textContent = response.output?.[0]?.content?.[0]?.text;
      if (!textContent) {
        console.error('[structured.js] ERROR: No text content in response');
        return res.status(500).json({ error: 'No text content in API response' });
      }

      console.log('[structured.js] Parsing JSON response');
      const parsed = JSON.parse(textContent);
      console.log('[structured.js] Successfully extracted tasks:', {
        taskCount: parsed.tasks?.length || 0,
      });
      res.json({ response_id: response.id, tasks: parsed.tasks });
    } catch (e) {
      console.error('[structured.js] ERROR:', {
        message: e.message,
        type: e.constructor.name,
      });
      res.status(500).json({ error: e.message });
    }
  }),
);

export default router;
