import type { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../../lib/prisma'
import { devLoginSchema } from './auth.schemas'
import process from 'process'

export async function devLogin(req: Request, res: Response) {
  const body = devLoginSchema.parse(req.body)

  const user = await prisma.user.findUnique({
    where: { email: body.email },
    include: {
      teams: {
        include: {
          team: true,
        },
      },
    },
  })

  if (!user) {
    return res.status(404).json({
      error: 'USER_NOT_FOUND',
    })
  }

  const firstTeam = user.teams[0]?.team

  if (!firstTeam) {
    return res.status(400).json({
      error: 'USER_HAS_NO_TEAM',
    })
  }

  const token = jwt.sign({ userId: user.id, teamId: firstTeam.id }, process.env.JWT_SECRET!, {
    expiresIn: '7d',
  })

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
    },
    team: {
      id: firstTeam.id,
      name: firstTeam.name,
      slug: firstTeam.slug,
    },
  })
}
