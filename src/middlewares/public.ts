import type { NextFunction, Request, Response } from 'express'
import { prisma } from '../lib/prisma'

export async function publicMiddleware(req: Request, res: Response, next: NextFunction) {
  const slug = req.params.slug

  if (!slug) {
    return res.status(400).json({ error: 'SLUG_REQUIRED' })
  }

  const team = await prisma.team.findUnique({
    where: { slug },
  })

  if (!team) {
    return res.status(404).json({ error: 'TEAM_NOT_FOUND' })
  }

  req.auth = {
    userId: 'public',
    teamId: team.id,
    role: 'MEMBER',
    isManager: false,
  }

  return next()
}

