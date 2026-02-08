import type { Request, Response, NextFunction } from 'express'
import { logger } from '../lib/logger'

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  logger.error(
    {
      err,
      method: req.method,
      path: req.originalUrl,
    },
    'Unhandled error',
  )

  return res.status(500).json({
    message: 'Erro interno no servidor',
  })
}
