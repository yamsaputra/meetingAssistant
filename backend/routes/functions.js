/**
 * Function calling: model proposes a tool call, server executes it, model continues.
 *
 * Standard Responses API agent loop:
 *   1. send user input + tool definitions
 *   2. while response contains function_call items: execute, append outputs, resend
 *   3. return final text
 */
import { Router } from 'express';
import { config } from '../config.js';
import { createResponse } from '../openaiClient.js';
import { TOOL_DEFINITIONS, TOOL_REGISTRY } from '../tools.js';
import { extractFunctionCalls, extractText } from '../utils.js';
import { asyncHandler } from '../middleware.js';

const router = Router();
const MAX_TURNS = 5;

router.post(
  '/run',
  asyncHandler(async (req, res) => {
    const { input, auto_execute = true } = req.body ?? {};
    if (!input) return res.status(400).json({ error: 'input is required' });

    /** @type {Array<object>} conversation as a list of input items */
    const conversation = [{ role: 'user', content: input }];
    const executed = [];

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const response = await createResponse({
        model: config.defaultModel,
        input: conversation,
        tools: TOOL_DEFINITIONS,
        instructions:
          'Du bist ein Projekt-Assistent. Wenn der Nutzer Aufgaben in ein ' +
          'Ticket-System eintragen oder das Team benachrichtigen möchte, ' +
          'rufe die passenden Funktionen auf.',
      });

      const calls = extractFunctionCalls(response);
      if (calls.length === 0) {
        return res.json({
          response_id: response.id,
          output_text: extractText(response),
          executed_calls: executed,
        });
      }

      // 1) Echo the model's function_call items into conversation history.
      for (const item of response.output ?? []) {
        if (item.type === 'function_call') {
          conversation.push({
            type: 'function_call',
            call_id: item.call_id,
            name: item.name,
            arguments: item.arguments,
          });
        }
      }

      // 2) Execute each call and append its function_call_output.
      for (const call of calls) {
        const fn = TOOL_REGISTRY[call.name];
        const args = JSON.parse(call.arguments);
        let result;
        if (!fn) {
          result = { error: `Unknown tool: ${call.name}` };
        } else if (auto_execute) {
          result = await fn(args);
        } else {
          result = { status: 'skipped (auto_execute=false)', args };
        }
        executed.push({ name: call.name, arguments: args, result });
        conversation.push({
          type: 'function_call_output',
          call_id: call.call_id,
          output: JSON.stringify(result),
        });
      }
    }

    res.status(500).json({ error: `Tool loop exceeded ${MAX_TURNS} turns.` });
  }),
);

export default router;
