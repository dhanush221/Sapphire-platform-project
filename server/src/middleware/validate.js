import { z } from 'zod';

function respondValidation(res, result) {
  const issue = result.error?.issues?.[0];
  const message = issue?.message || 'Invalid request';
  return res.status(400).json({ error: message });
}

export function validateBody(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) return respondValidation(res, parsed);
    req.validatedBody = parsed.data;
    return next();
  };
}

export function validateParams(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.params || {});
    if (!parsed.success) return respondValidation(res, parsed);
    req.validatedParams = parsed.data;
    return next();
  };
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.query || {});
    if (!parsed.success) return respondValidation(res, parsed);
    req.validatedQuery = parsed.data;
    return next();
  };
}

export const taskStatusEnum = z.enum(['pending', 'in_progress', 'completed']);
export const priorityEnum = z.enum(['low', 'medium', 'high']);
export const resourceTypeEnum = z.enum(['Routine', 'Template', 'Sensory Tool', 'Communication Aid', 'Document', 'Other']);
