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
  let isManager = false
  const header = req.headers.authorization
  if (header?.startsWith('Bearer ')) {
    const token = header.replace('Bearer ', '').trim()
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      if (decoded && decoded.userId) {
        isManager = !!decoded.isManager
        loggedInUserId = decoded.userId
      }
    } catch {}
  }

  let isMember = false
  let userRole = 'MEMBER'

  if (loggedInUserId) {
    const existingUserTeam = await prisma.userTeam.findUnique({
      where: {
        userId_teamId: {
          userId: loggedInUserId,
          teamId: team.id,
        },
      },
    })
    
    if (existingUserTeam) {
      isMember = true
      userRole = existingUserTeam.role
    }
  }

  if (team.visibility === 'ADMIN') {
    if (!isManager && (!isMember || (userRole !== 'ADMIN' && userRole !== 'OWNER'))) {
      return res.status(403).json({ error: 'FORBIDDEN' })
    }
  } else if (team.visibility === 'MEMBERS') {
    if (!isManager && !isMember) {
      return res.status(403).json({ error: 'FORBIDDEN' })
    }
  } else {
    if (loggedInUserId && !isMember) {
      try {
        await prisma.userTeam.create({
          data: {
            userId: loggedInUserId,
            teamId: team.id,
            role: 'MEMBER',
          },
        })
        isMember = true
        invalidateCache(team.id)
      } catch (err) {}
    }
  }

  req.auth = {
    userId: loggedInUserId || 'public',
    teamId: team.id,
    role: userRole as any,
    isManager,
  }

  if (loggedInUserId && isMember) {
    prisma.userTeam.update({
      where: { userId_teamId: { userId: loggedInUserId, teamId: team.id } },
      data: { lastAccessedAt: new Date() }
    }).catch(() => {})
  }

  return next()
}




