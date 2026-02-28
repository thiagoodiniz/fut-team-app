import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import process from 'process'

type JwtPayload = {
  userId: string
  teamId?: string
  role?: 'ADMIN' | 'MEMBER'
  isManager?: boolean
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'UNAUTHORIZED' })
  }

  const token = header.replace('Bearer ', '').trim()

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
    req.auth = decoded
    return next()
  } catch {
    return res.status(401).json({ error: 'UNAUTHORIZED' })
  }
}
