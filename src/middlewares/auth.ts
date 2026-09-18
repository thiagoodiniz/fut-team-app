import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import process from 'process'
import { prisma } from '../lib/prisma'

type JwtPayload = {
  userId: string
  teamId?: string
  role?: 'ADMIN' | 'MEMBER'
  isManager?: boolean
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'UNAUTHORIZED' })
  }

  const token = header.replace('Bearer ', '').trim()

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
    req.auth = decoded

    // Dynamic Team Context Switching via Header
    const requestedSlug = req.headers['x-team-slug'] as string
    if (requestedSlug) {
      const requestedTeam = await prisma.team.findUnique({
        where: { slug: requestedSlug },
        select: { id: true }
      })

      if (requestedTeam) {
        if (decoded.teamId === requestedTeam.id) {
          // JWT already matches the requested team
          return next()
        }

        // Check user's access to the requested team
        const userTeam = await prisma.userTeam.findUnique({
          where: { userId_teamId: { userId: decoded.userId, teamId: requestedTeam.id } }
        })

        if (userTeam) {
          req.auth.teamId = requestedTeam.id
          req.auth.role = userTeam.role as 'ADMIN' | 'MEMBER'
        } else if (decoded.isManager) {
          req.auth.teamId = requestedTeam.id
          req.auth.role = 'ADMIN'
        } else {
          // User is authenticated but NOT part of the team they are trying to act upon
          return res.status(403).json({ error: 'FORBIDDEN_TEAM_ACCESS' })
        }
      }
    }

    return next()
  } catch {
    return res.status(401).json({ error: 'UNAUTHORIZED' })
  }
}
