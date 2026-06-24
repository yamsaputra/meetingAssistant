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
    console.log('[chat.js] Received request with input:', input?.substring(0, 100) + (input?.length > 100 ? '...' : ''));
    console.log('[chat.js] Has instructions:', !!instructions, 'Has context:', !!context);
    
    if (!input) {
      console.error('[chat.js] ERROR: input is required');
      return res.status(400).json({ error: 'input is required' });
    }

    console.log('[chat.js] Received context:', { 
      hasContext: !!context, 
      tasksCount: context?.tasks?.length || 0,
      filesCount: context?.uploadedFiles?.length || 0 
    });

    // Build context-aware instructions
    let contextAware = instructions || '';
    if (context?.tasks?.length) {
      const tasksList = context.tasks
        .map(t => `- [${t.priority}] ${t.title} (Assignee: ${t.assignee}, Due: ${t.due_date || 'N/A'})`)
        .join('\n');
      contextAware += (contextAware ? '\n\n' : '') + 'Session Tasks:\n' + tasksList;
      console.log('[chat.js] Added', context.tasks.length, 'tasks to context');
    }

    if (context?.uploadedFiles?.length) {
      const filesList = context.uploadedFiles
        .map(f => `- ${f.filename} (ID: ${f.file_id})`)
        .join('\n');
      contextAware += (contextAware ? '\n\n' : '') + 'Uploaded Files:\n' + filesList;
      console.log('[chat.js] Added', context.uploadedFiles.length, 'files to context');
    }

    console.log('[chat.js] Sending request to model:', { 
      model: config.defaultModel,
      hasInstructions: !!contextAware,
      inputLength: input.length
    });

    try {
      const response = await createResponse({
        model: config.defaultModel,
        input,
        ...(contextAware ? { instructions: contextAware } : {}),
      });

      console.log('[chat.js] Response received successfully:', { 
        id: response.id, 
        hasOutput: !!response.output 
      });
      res.json({ response_id: response.id, output_text: extractText(response) });
    } catch (error) {
      console.error('[chat.js] ERROR calling createResponse:', error.message);
      throw error;
    }
  }),
);

export default router;
