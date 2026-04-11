import { securityLogger } from '../lib/logger.js';

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      securityLogger.inputRejected(
        req.ip,
        req.path,
        result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ')
      );
      return res.status(400).json({
        error: 'Datos inválidos',
        issues: result.error.issues.map(i => ({
          field: i.path.join('.'),
          message: i.message,
        })),
      });
    }
    req[source] = result.data;
    next();
  };
}
