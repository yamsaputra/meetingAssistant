/**
 * Helpers for walking the Responses API output shape.
 */

export function extractText(response) {
  if (response?.output_text) return response.output_text;
  const chunks = [];
  for (const item of response?.output ?? []) {
    if (item.type === 'message') {
      for (const c of item.content ?? []) {
        if (c.type === 'output_text' || c.type === 'text') {
          chunks.push(c.text ?? '');
        }
      }
    }
  }
  return chunks.join('');
}

export function extractFunctionCalls(response) {
  const calls = [];
  for (const item of response?.output ?? []) {
    if (item.type === 'function_call') {
      calls.push({
        call_id: item.call_id,
        name: item.name,
        arguments: item.arguments, // JSON-encoded string
      });
    }
  }
  return calls;
}

export function extractFileSearchCitations(response) {
  const cites = [];
  for (const item of response?.output ?? []) {
    if (item.type !== 'message') continue;
    for (const c of item.content ?? []) {
      for (const ann of c.annotations ?? []) {
        if (ann.type === 'file_citation') {
          cites.push({
            file_id: ann.file_id ?? null,
            filename: ann.filename ?? null,
            quote: ann.quote ?? null,
          });
        }
      }
    }
  }
  return cites;
}

export function extractGeneratedFiles(response) {
  const files = [];
  for (const item of response?.output ?? []) {
    if (item.type === 'code_interpreter_call') {
      for (const out of item.outputs ?? []) {
        if (out.type === 'files') {
          for (const f of out.files ?? []) {
            files.push({
              kind: 'code_interpreter_file',
              file_id: f.file_id ?? null,
              mime_type: f.mime_type ?? null,
            });
          }
        }
      }
    }
    if (item.type === 'image_generation_call') {
      files.push({
        kind: 'generated_image',
        result: item.result ?? null,
        revised_prompt: item.revised_prompt ?? null,
      });
    }
  }
  return files;
}
