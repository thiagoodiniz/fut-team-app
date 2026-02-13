import type { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'


export function requestId(req: Request, res: Response, next: NextFunction) {
  req.requestId = randomUUID()
  res.setHeader('x-request-id', req.requestId)
  next()
}
