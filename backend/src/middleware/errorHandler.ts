import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import { AppError } from '../types/errors';

export interface ErrorResponse {
  detail: string;
  error_code?: string | undefined;
  stack?: string | undefined;
}

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error(`${req.method} ${req.path} - ${error.message}`, {
    stack: error.stack,
    body: req.body,
    query: req.query,
    params: req.params,
    ip: req.ip
  });

  // Se response já foi enviado, delega para o handler padrão do Express
  if (res.headersSent) {
    return next(error);
  }

  // Erro customizado da aplicação
  if (error instanceof AppError) {
    const response: ErrorResponse = {
      detail: error.message,
      error_code: error.errorCode
    };

    res.status(error.statusCode).json(response);
    return;
  }

  // Erro de validação Joi
  if (error.name === 'ValidationError') {
    const response: ErrorResponse = {
      detail: error.message,
      error_code: 'VALIDATION_ERROR'
    };

    res.status(400).json(response);
    return;
  }

  // Erro de parse do JSON
  if (error.name === 'SyntaxError' && 'body' in error) {
    const response: ErrorResponse = {
      detail: 'Invalid JSON format',
      error_code: 'INVALID_JSON'
    };

    res.status(400).json(response);
    return;
  }

  // Erro genérico
  const response: ErrorResponse = {
    detail: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message,
    error_code: 'INTERNAL_SERVER_ERROR'
  };

  // Adiciona stack trace apenas em desenvolvimento
  if (process.env.NODE_ENV === 'development') {
    response.stack = error.stack;
  }

  res.status(500).json(response);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  const response: ErrorResponse = {
    detail: `Route ${req.method} ${req.path} not found`,
    error_code: 'NOT_FOUND'
  };

  res.status(404).json(response);
};

export const asyncErrorHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}; 