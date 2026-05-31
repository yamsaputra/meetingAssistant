export function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

export function errorMiddleware(err, _req, res, _next) {
  const status = err.status ?? 500;
  const message = err.message ?? 'Internal server error';

  console.error(`[error] ${status}`, message);
  if (err.body) console.error('[error] OpenAI response:', JSON.stringify(err.body, null, 2));

  // Guard: if headers already sent (e.g. client disconnected) don't try to write again
  if (res.headersSent) return;

  try {
    res.status(status).json({
      error: message,
      ...(err.body ? { details: err.body } : {}),
    });
  } catch (writeErr) {
    console.error('[error] could not write error response:', writeErr.message);
  }
}
