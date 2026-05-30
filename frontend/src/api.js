async function request(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  return res.json();
}

export function postChat(message) {
  return request('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: message }),
  });
}

export function uploadFile(file) {
  const form = new FormData();
  form.append('file', file);
  return request('/files/upload', { method: 'POST', body: form });
}

export function searchFiles(query) {
  return request('/files/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
}

export function analyzeVision(imageFile, imageUrl, prompt) {
  if (imageFile) {
    const form = new FormData();
    form.append('image', imageFile);
    if (prompt) form.append('prompt', prompt);
    return request('/vision/analyze', { method: 'POST', body: form });
  }
  return request('/vision/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl, prompt }),
  });
}

export function extractTasks(input) {
  return request('/structured/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
  });
}

export function runFunctions(input) {
  return request('/functions/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input }),
  });
}

export function runCode(prompt, fileIds = []) {
  return request('/code/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, file_ids: fileIds }),
  });
}

export function generateImage(prompt, size, quality) {
  return request('/images/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, size, quality }),
  });
}
