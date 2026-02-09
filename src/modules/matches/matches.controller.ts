import type { Request, Response } from 'express'
import { prisma } from '../../lib/prisma'
import { createMatchSchema, updateMatchSchema } from './matches.schemas'

async function getActiveSeasonId(teamId: string) {
  const season = await prisma.season.findFirst({
    where: { teamId, isActive: true },
    select: { id: true },
  })

  return season?.id ?? null
}

export async function listMatches(req: Request, res: Response) {
  const { teamId } = req.auth!

  const seasonId = await getActiveSeasonId(teamId)
  if (!seasonId) {
    return res.status(400).json({ error: 'NO_ACTIVE_SEASON' })
  }

  const matches = await prisma.match.findMany({
    where: { teamId, seasonId },
    orderBy: [{ date: 'desc' }],
  })

  return res.json({ matches })
}

export async function getMatchById(req: Request, res: Response) {
  const { teamId } = req.auth!
  const matchId = req.params.id as string

  const seasonId = await getActiveSeasonId(teamId)
  if (!seasonId) {
    return res.status(400).json({ error: 'NO_ACTIVE_SEASON' })
  }

  const match = await prisma.match.findFirst({
    where: { id: matchId, teamId, seasonId },
  })

  if (!match) {
    return res.status(404).json({ error: 'MATCH_NOT_FOUND' })
  }

  return res.json({ match })
}

export async function createMatch(req: Request, res: Response) {
  const { teamId } = req.auth!
  const body = createMatchSchema.parse(req.body)

  const seasonId = await getActiveSeasonId(teamId)
  if (!seasonId) {
    return res.status(400).json({ error: 'NO_ACTIVE_SEASON' })
  }

  const match = await prisma.match.create({
    data: {
      teamId,
      seasonId,
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

  const seasonId = await getActiveSeasonId(teamId)
  if (!seasonId) {
    return res.status(400).json({ error: 'NO_ACTIVE_SEASON' })
  }

  const exists = await prisma.match.findFirst({
    where: { id: matchId, teamId, seasonId },
    select: { id: true },
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

  const seasonId = await getActiveSeasonId(teamId)
  if (!seasonId) {
    return res.status(400).json({ error: 'NO_ACTIVE_SEASON' })
  }

  const exists = await prisma.match.findFirst({
    where: { id: matchId, teamId, seasonId },
    select: { id: true },
  })

  if (!exists) {
    return res.status(404).json({ error: 'MATCH_NOT_FOUND' })
  }

  await prisma.match.delete({
    where: { id: matchId },
  })

  return res.status(204).send()
}
