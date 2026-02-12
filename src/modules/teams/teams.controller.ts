import type { Request, Response } from 'express'
import { prisma } from '../../lib/prisma'
import { cache } from '../../lib/cache'
import { updateTeamSchema } from './teams.schemas'

export async function getTeam(req: Request, res: Response) {
  const { teamId } = req.auth!

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      primaryColor: true,
      secondaryColor: true,
    },
  })

  if (!team) {
    return res.status(404).json({ error: 'TEAM_NOT_FOUND' })
  }

  return res.json({ team })
}

export async function updateTeam(req: Request, res: Response) {
  const { teamId } = req.auth!
  const body = updateTeamSchema.parse(req.body)

  const team = await prisma.team.update({
    where: { id: teamId },
    data: {
      name: body.name,
      logo: body.logo,
      primaryColor: body.primaryColor,
      secondaryColor: body.secondaryColor,
    },
  })

  // Invalidate cache that might depend on team data
  cache.delStartWith(`dashboard:${teamId}`)

  return res.json({ team })
}
