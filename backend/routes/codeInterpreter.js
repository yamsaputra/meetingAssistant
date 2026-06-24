/**
 * Code interpreter: let the model run Python in a sandboxed container.
 *
 * Typical demo: upload `team_kapazitaeten.csv` via /files/upload, then post the
 * returned file_id here with a prompt like "Wer ist überlastet? Erstelle ein Diagramm."
 */
import { Router } from 'express';
import { config } from '../config.js';
import { createResponse, downloadContainerFile, listContainerFiles } from '../openaiClient.js';
import { extractText } from '../utils.js';
import { asyncHandler } from '../middleware.js';

const router = Router();

router.post(
  '/run',
  asyncHandler(async (req, res) => {
    const { prompt, file_ids = [] } = req.body ?? {};
    console.log('[codeInterpreter.js] Received request with prompt:', prompt?.substring(0, 100) + (prompt?.length > 100 ? '...' : ''));
    console.log('[codeInterpreter.js] File IDs provided:', file_ids.length);
    
    if (!prompt) {
      console.error('[codeInterpreter.js] ERROR: prompt is required');
      return res.status(400).json({ error: 'prompt is required' });
    }

    const container = { type: 'auto' };
    if (Array.isArray(file_ids) && file_ids.length > 0) {
      container.file_ids = file_ids;
      console.log('[codeInterpreter.js] Container created with', file_ids.length, 'files:', file_ids);
    } else {
      console.log('[codeInterpreter.js] Container created with no files (auto mode)');
    }

    console.log('[codeInterpreter.js] Sending code interpreter request to model:', config.defaultModel);
    
    try {
      const response = await createResponse({
        model: config.defaultModel,
        input: prompt,
        instructions:
          'When generating plots or charts with Python (matplotlib, seaborn, pandas, etc.), ' +
          'always save the figure to a file using plt.savefig("chart.png", bbox_inches="tight") ' +
          'before closing. Never use plt.show() — the environment is headless.',
        tools: [{ type: 'code_interpreter', container }],
      });

      const ciItems = response.output?.filter(i => i.type === 'code_interpreter_call') ?? [];
      console.log('[codeInterpreter.js] Full code_interpreter_call items:', JSON.stringify(ciItems, null, 2));

      // Collect unique container IDs from all code interpreter calls
      const containerIds = [...new Set(ciItems.filter(i => i.container_id).map(i => i.container_id))];

      const generatedFiles = [];
      for (const containerId of containerIds) {
        let listing;
        try {
          listing = await listContainerFiles(containerId);
        } catch (err) {
          console.error('[codeInterpreter.js] Failed to list container files:', containerId, err.message);
          continue;
        }
        for (const entry of listing.data ?? []) {
          // Input files are mounted as /mnt/data/file-{fileId}-{name} — skip them
          const isInputFile = file_ids.some(id => entry.path?.includes(id));
          if (isInputFile) continue;

          try {
            const { buffer, mimeType } = await downloadContainerFile(containerId, entry.id);
            generatedFiles.push({ kind: 'code_interpreter_file', mime_type: mimeType, data: buffer.toString('base64') });
            console.log('[codeInterpreter.js] Downloaded generated file:', entry.path, mimeType, buffer.length, 'bytes');
          } catch (err) {
            console.error('[codeInterpreter.js] Failed to download generated file:', entry.path, err.message);
          }
        }
      }

      console.log('[codeInterpreter.js] Response received successfully:', {
        id: response.id,
        hasOutput: !!response.output,
        generatedFilesCount: generatedFiles.length,
      });

      res.json({
        response_id: response.id,
        output_text: extractText(response),
        generated_files: generatedFiles,
      });
    } catch (error) {
      console.error('[codeInterpreter.js] ERROR calling createResponse:', error.message);
      throw error;
    }
  }),
);

router.get(
  '/file/:containerId/:fileId',
  asyncHandler(async (req, res) => {
    const { containerId, fileId } = req.params;
    console.log('[codeInterpreter.js] Downloading file:', { containerId, fileId });

    try {
      const { buffer } = await downloadContainerFile(containerId, fileId);
      console.log('[codeInterpreter.js] File downloaded successfully:', {
        fileId,
        sizeBytes: buffer.length,
      });
      res.json({ file_id: fileId, base64: buffer.toString('base64') });
    } catch (error) {
      console.error('[codeInterpreter.js] ERROR downloading file:', error.message);
      throw error;
    }
  }),
);

export default router;
