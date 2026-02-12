import type { Request, Response } from 'express'
import { prisma } from '../../lib/prisma'
import { updateTeamSchema } from './teams.schemas'

export async function getTeam(req: Request, res: Response) {
  //... (existing getTeam content)
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

  const { invalidateCache } = require('../../middlewares/cache')
  invalidateCache(teamId)

  return res.json({ team })
}
