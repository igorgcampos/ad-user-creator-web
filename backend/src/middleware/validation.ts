import { Request, Response, NextFunction } from 'express';
import { Schema } from 'joi';
import { ValidationError } from '../types/errors';

export interface ValidationTargets {
  body?: Schema;
  query?: Schema;
  params?: Schema;
}

export const validate = (schemas: ValidationTargets) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    // Valida body
    if (schemas.body) {
      const { error } = schemas.body.validate(req.body);
      if (error) {
        errors.push(error.details[0]?.message || 'Validation error');
      }
    }

    // Valida query
    if (schemas.query) {
      const { error } = schemas.query.validate(req.query);
      if (error) {
        errors.push(error.details[0]?.message || 'Validation error');
      }
    }

    // Valida params
    if (schemas.params) {
      const { error } = schemas.params.validate(req.params);
      if (error) {
        errors.push(error.details[0]?.message || 'Validation error');
      }
    }

    // Se há erros, retorna erro de validação
    if (errors.length > 0) {
      next(new ValidationError(errors.join(', ')));
      return;
    }

    next();
  };
};

// Middleware específico para validação de body
export const validateBody = (schema: Schema) => {
  return validate({ body: schema });
};

// Middleware específico para validação de parâmetros
export const validateParams = (schema: Schema) => {
  return validate({ params: schema });
};

// Middleware específico para validação de query
export const validateQuery = (schema: Schema) => {
  return validate({ query: schema });
}; 