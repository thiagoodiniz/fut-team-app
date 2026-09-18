import type { NextFunction, Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import jwt from 'jsonwebtoken'
import process from 'process'
import { invalidateCache } from './cache'

export async function publicMiddleware(req: Request, res: Response, next: NextFunction) {
  const slug = req.params.slug as string

  if (!slug || typeof slug !== 'string') {
    return res.status(400).json({ error: 'SLUG_REQUIRED' })
  }

  const team = await prisma.team.findUnique({
    where: { slug },
  })

  if (!team) {
    return res.status(404).json({ error: 'TEAM_NOT_FOUND' })
  }

  let loggedInUserId: string | null = null
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    const token = header.replace('Bearer ', '').trim()
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      if (decoded && decoded.userId) {
        loggedInUserId = decoded.userId
      }
    } catch {}
  }

  if (loggedInUserId) {
    try {
      const existingUserTeam = await prisma.userTeam.findUnique({
        where: {
          userId_teamId: {
            userId: loggedInUserId,
            teamId: team.id,
          },
        },
      })

      if (!existingUserTeam) {
        await prisma.userTeam.create({
          data: {
            userId: loggedInUserId,
            teamId: team.id,
            role: 'MEMBER',
          },
        })
        invalidateCache(team.id)
      }
    } catch (err) {
      // Ignorar erros de concorrência caso várias requisições públicas ocorram ao mesmo tempo
    }
  }

  req.auth = {
    userId: loggedInUserId || 'public',
    teamId: team.id,
    role: 'MEMBER',
    isManager: false,
  }

  return next()
}

