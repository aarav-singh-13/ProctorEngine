export function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Route not found' });
}

export function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const payload = {
    error: err.message || 'Internal server error',
  };

  if (err.details) {
    payload.details = err.details;
  }

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json(payload);
}
