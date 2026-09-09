import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

import { AppError } from '@/errors/AppError.js';

const authenticate: RequestHandler = (request, _response, next) => {
  const authorization = request.headers.authorization;

  if (!authorization) {
    return next(new AppError(401, 'Token de autenticacao nao informado.'));
  }

  const [scheme, token] = authorization.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new AppError(401, 'Token de autenticacao invalido.'));
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    return next(new Error('JWT_SECRET nao foi definida.'));
  }

  try {
    const payload = jwt.verify(token, secret);

    if (typeof payload === 'string' || typeof payload.sub !== 'string') {
      return next(new AppError(401, 'Token de autenticacao invalido.'));
    }

    request.authenticatedUserId = payload.sub;
    next();
  } catch {
    next(new AppError(401, 'Token de autenticacao invalido.'));
}
};

export { authenticate };
