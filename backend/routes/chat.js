/**
 * Basic chat endpoint — single-turn request via the Responses API.
 */
import { Router } from 'express';
import { config } from '../config.js';
import { createResponse } from '../openaiClient.js';
import { extractText } from '../utils.js';
import { asyncHandler } from '../middleware.js';

const router = Router();

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { input, instructions, context } = req.body ?? {};
    if (!input) return res.status(400).json({ error: 'input is required' });

    console.log('[/chat] Received context:', context);

    // Build context-aware instructions
    let contextAware = instructions || '';
    if (context?.tasks?.length) {
      const tasksList = context.tasks
        .map(t => `- [${t.priority}] ${t.title} (Assignee: ${t.assignee}, Due: ${t.due_date || 'N/A'})`)
        .join('\n');
      contextAware += (contextAware ? '\n\n' : '') + 'Session Tasks:\n' + tasksList;
      console.log('[/chat] Added', context.tasks.length, 'tasks to context');
    }

    if (context?.uploadedFiles?.length) {
      const filesList = context.uploadedFiles
        .map(f => `- ${f.filename} (ID: ${f.file_id})`)
        .join('\n');
      contextAware += (contextAware ? '\n\n' : '') + 'Uploaded Files:\n' + filesList;
      console.log('[/chat] Added', context.uploadedFiles.length, 'files to context');
    }

    const response = await createResponse({
      model: config.defaultModel,
      input,
      ...(contextAware ? { instructions: contextAware } : {}),
    });

    res.json({ response_id: response.id, output_text: extractText(response) });
  }),
);

export default router;
