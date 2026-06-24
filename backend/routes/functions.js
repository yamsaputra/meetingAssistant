/**
 * Function calling: model proposes a tool call, server executes it, model continues.
 *
 * Standard Responses API agent loop:
 *   1. send user input + tool definitions
 *   2. while response contains function_call items: execute, append outputs, resend
 *   3. return final text
 */
import { Router } from "express";
import { config } from "../config.js";
import { createResponse } from "../openaiClient.js";
import { TOOL_DEFINITIONS, TOOL_REGISTRY } from "../tools.js";
import { extractFunctionCalls, extractText } from "../utils.js";
import { asyncHandler } from "../middleware.js";

const router = Router();
const MAX_TURNS = 5;
const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

router.post(
  "/run",
  asyncHandler(async (req, res) => {
    const { input, auto_execute = true } = req.body ?? {};
    console.log(
      `[functions.js] Received request with input: ${input} and auto_execute: ${auto_execute}`,
    );

    if (!input) return res.status(400).json({ error: "input is required" });

    /** @type {Array<object>} conversation as a list of input items */
    const conversation = [{ role: "user", content: input }];
    const executed = [];

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      console.log(
        `[functions.js] Turn ${turn + 1}/${MAX_TURNS} - Sending request to model...`,
      );
      const response = await createResponse({
        model: config.defaultModel,
        input: conversation,
        tools: TOOL_DEFINITIONS,
        instructions: `You turn natural-language requests into Jira tickets. Today is ${today}; resolve
relative dates ("tomorrow", "next Friday", "in two weeks", "end of month") to an
absolute YYYY-MM-DD. Call create_jira_ticket once per distinct task. Copy names and
emails exactly as written — do not guess accounts. Put deadlines in due_date and the
planned start in start_date (never the creation date — Jira sets that). Infer priority
and issue_type from wording. Use null for anything not stated, [] for empty labels.`,
      });

      console.log(`[functions.js] Turn ${turn + 1} - Response received:`, {
        id: response.id,
        hasOutput: !!response.output,
      });
      const calls = extractFunctionCalls(response);
      console.log(
        `[functions.js] Turn ${turn + 1} - Extracted ${calls.length} function calls`,
      );
      if (calls.length === 0) {
        console.log(
          `[functions.js] No function calls found, returning final response`,
        );
        return res.json({
          response_id: response.id,
          output_text: extractText(response),
          executed_calls: executed,
        });
      }

      // 1) Echo the model's function_call items into conversation history.
      for (const item of response.output ?? []) {
        if (item.type === "function_call") {
          conversation.push({
            type: "function_call",
            call_id: item.call_id,
            name: item.name,
            arguments: item.arguments,
          });
        }
      }

      // 2) Execute each call and append its function_call_output.
      for (const call of calls) {
        console.log(`[functions.js] Executing function call:`, {
          name: call.name,
          call_id: call.call_id,
        });
        const fn = TOOL_REGISTRY[call.name];
        const args = JSON.parse(call.arguments);
        console.log(`[functions.js] Function arguments:`, args);
        let result;
        if (!fn) {
          result = { error: `Unknown tool: ${call.name}` };
          console.error(`[functions.js] ERROR: Unknown tool "${call.name}"`);
        } else if (auto_execute) {
          try {
            result = await fn(args);
            console.log(`[functions.js] Function executed successfully:`, {
              name: call.name,
              hasResult: !!result,
            });
          } catch (error) {
            console.error(
              `[functions.js] ERROR executing function "${call.name}":`,
              error.message,
            );
            result = { error: error.message };
          }
        } else {
          result = { status: "skipped (auto_execute=false)", args };
          console.log(
            `[functions.js] Function skipped (auto_execute=false):`,
            call.name,
          );
        }
        executed.push({ name: call.name, arguments: args, result });
        conversation.push({
          type: "function_call_output",
          call_id: call.call_id,
          output: JSON.stringify(result),
        });
      }
    }

    console.error(
      `[functions.js] ERROR: Tool loop exceeded ${MAX_TURNS} turns`,
    );
    res.status(500).json({ error: `Tool loop exceeded ${MAX_TURNS} turns.` });
  }),
);

export default router;
