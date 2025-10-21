/**
 * Request Validation Middleware
 * 
 * Validates request body, params, and query against Zod schemas.
 * Returns clear, user-friendly error messages for invalid input.
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

/**
 * Validation target (what part of the request to validate)
 */
type ValidationTarget = 'body' | 'params' | 'query';

/**
 * Format Zod validation errors into user-friendly messages
 */
function formatZodError(error: ZodError): { field: string; message: string }[] {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}

/**
 * Create a validation middleware for a given schema
 * 
 * @param schema - Zod schema to validate against
 * @param target - Which part of request to validate (body, params, query)
 * @returns Express middleware
 * 
 * @example
 * router.post('/api/docs', 
 *   validate(generateDocsSchema, 'body'), 
 *   handler
 * );
 */
export function validate<T extends z.ZodTypeAny>(
  schema: T,
  target: ValidationTarget = 'body'
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[target];
      const validated = await schema.parseAsync(data);
      
      req[target] = validated;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = formatZodError(error);
        return res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
      }
      
      return res.status(500).json({
        error: 'Validation error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Validate multiple targets (body + params + query)
 * 
 * @example
 * router.put('/api/docs/:id', 
 *   validateMultiple({
 *     params: idParamSchema,
 *     body: updateDocsSchema,
 *   }), 
 *   handler
 * );
 */
export function validateMultiple(schemas: {
  body?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const allErrors: { target: string; field: string; message: string }[] = [];

    try {
      if (schemas.params) {
        try {
          req.params = await schemas.params.parseAsync(req.params);
        } catch (error) {
          if (error instanceof ZodError) {
            allErrors.push(
              ...formatZodError(error).map((e) => ({
                target: 'params',
                ...e,
              }))
            );
          }
        }
      }

      if (schemas.query) {
        try {
          req.query = await schemas.query.parseAsync(req.query);
        } catch (error) {
          if (error instanceof ZodError) {
            allErrors.push(
              ...formatZodError(error).map((e) => ({
                target: 'query',
                ...e,
              }))
            );
          }
        }
      }

      if (schemas.body) {
        try {
          req.body = await schemas.body.parseAsync(req.body);
        } catch (error) {
          if (error instanceof ZodError) {
            allErrors.push(
              ...formatZodError(error).map((e) => ({
                target: 'body',
                ...e,
              }))
            );
          }
        }
      }

      if (allErrors.length > 0) {
        return res.status(400).json({
          error: 'Validation failed',
          details: allErrors,
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({
        error: 'Validation error',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };
}

/**
 * Optional validation - validates only if data exists
 * Useful for PATCH endpoints where fields are optional
 */
export function validateOptional<T extends z.ZodTypeAny>(
  schema: T,
  target: ValidationTarget = 'body'
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const data = req[target];
    
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
      return next();
    }

    return validate(schema, target)(req, res, next);
  };
}

/**
 * Sanitize request data before validation
 * Trims strings, removes null values, etc.
 */
export function sanitizeRequest(target: ValidationTarget = 'body') {
  return (req: Request, res: Response, next: NextFunction) => {
    const data = req[target];

    if (typeof data === 'object' && data !== null) {
      req[target] = sanitizeObject(data);
    }

    next();
  };
}

function sanitizeObject(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === 'object' && obj !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        continue;
      }
      
      if (typeof value === 'string') {
        sanitized[key] = value.trim();
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  return obj;
}
