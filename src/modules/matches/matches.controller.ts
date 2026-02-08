import type { Request, Response } from 'express'
import { prisma } from '../../lib/prisma'
import { createMatchSchema, updateMatchSchema } from './matches.schemas'

export async function listMatches(req: Request, res: Response) {
  const { teamId } = req.auth!

  const matches = await prisma.match.findMany({
    where: { teamId },
    orderBy: [{ date: 'desc' }],
  })

  return res.json({ matches })
}

export async function getMatchById(req: Request, res: Response) {
  const { teamId } = req.auth!
  const matchId = req.params.id as string

  const match = await prisma.match.findFirst({
    where: { id: matchId, teamId },
  })

  if (!match) {
    return res.status(404).json({ error: 'MATCH_NOT_FOUND' })
  }

  return res.json({ match })
}

export async function createMatch(req: Request, res: Response) {
  const { teamId } = req.auth!
  const body = createMatchSchema.parse(req.body)

  const match = await prisma.match.create({
    data: {
      teamId,
      date: new Date(body.date),
      location: body.location,
      opponent: body.opponent,
      notes: body.notes,
      ourScore: body.ourScore ?? 0,
      theirScore: body.theirScore ?? 0,
    },
  })

  return res.status(201).json({ match })
}

export async function updateMatch(req: Request, res: Response) {
  const { teamId } = req.auth!
  const matchId = req.params.id as string
  const body = updateMatchSchema.parse(req.body)

  const exists = await prisma.match.findFirst({
    where: { id: matchId, teamId },
  })

  if (!exists) {
    return res.status(404).json({ error: 'MATCH_NOT_FOUND' })
  }

  const match = await prisma.match.update({
    where: { id: matchId },
    data: {
      ...(body.date !== undefined ? { date: new Date(body.date) } : {}),
      ...(body.location !== undefined ? { location: body.location } : {}),
      ...(body.opponent !== undefined ? { opponent: body.opponent } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
      ...(body.ourScore !== undefined ? { ourScore: body.ourScore } : {}),
      ...(body.theirScore !== undefined ? { theirScore: body.theirScore } : {}),
    },
  })

  return res.json({ match })
}

export async function deleteMatch(req: Request, res: Response) {
  const { teamId } = req.auth!
  const matchId = req.params.id as string

  const exists = await prisma.match.findFirst({
    where: { id: matchId, teamId },
  })

  if (!exists) {
    return res.status(404).json({ error: 'MATCH_NOT_FOUND' })
  }

  await prisma.match.delete({
    where: { id: matchId },
  })

  return res.status(204).send()
}
