import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';

import { AppError } from '@/errors/AppError.js';

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      error: 'Dados invalidos.',
      details: error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      })),
    });
    return;
  }

  if (error instanceof AppError) {
    response.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error(error);
  response.status(500).json({ error: 'Erro interno do servidor.' });
};

export { errorHandler };
