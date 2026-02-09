import type { Request, Response } from 'express'
import { prisma } from '../../lib/prisma'
import { upsertPresencesSchema } from './presences.schemas'

async function getActiveSeasonId(teamId: string) {
  const season = await prisma.season.findFirst({
    where: { teamId, isActive: true },
    select: { id: true },
  })

  return season?.id ?? null
}

export async function listMatchPresences(req: Request, res: Response) {
  const { teamId } = req.auth!
  const matchId = req.params.id as string

  const seasonId = await getActiveSeasonId(teamId)
  if (!seasonId) {
    return res.status(400).json({ error: 'NO_ACTIVE_SEASON' })
  }

  const match = await prisma.match.findFirst({
    where: { id: matchId, teamId, seasonId },
    select: { id: true },
  })

  if (!match) {
    return res.status(404).json({ error: 'MATCH_NOT_FOUND' })
  }

  const presences = await prisma.presence.findMany({
    where: { matchId },
    include: { player: true },
    orderBy: [{ player: { name: 'asc' } }],
  })

  return res.json({ presences })
}

export async function upsertMatchPresences(req: Request, res: Response) {
  const { teamId } = req.auth!
  const matchId = req.params.id as string
  const body = upsertPresencesSchema.parse(req.body)

  const seasonId = await getActiveSeasonId(teamId)
  if (!seasonId) {
    return res.status(400).json({ error: 'NO_ACTIVE_SEASON' })
  }

  const match = await prisma.match.findFirst({
    where: { id: matchId, teamId, seasonId },
    select: { id: true },
  })

  if (!match) {
    return res.status(404).json({ error: 'MATCH_NOT_FOUND' })
  }

  const playerIds = body.presences.map((p) => p.playerId)

  const playersCount = await prisma.player.count({
    where: {
      id: { in: playerIds },
      teamId,
    },
  })

  if (playersCount !== playerIds.length) {
    return res.status(400).json({
      error: 'INVALID_PLAYERS_FOR_TEAM',
    })
  }

  await prisma.$transaction(
    body.presences.map((p) =>
      prisma.presence.upsert({
        where: {
          matchId_playerId: {
            matchId,
            playerId: p.playerId,
          },
        },
        create: {
          matchId,
          playerId: p.playerId,
          present: p.present,
        },
        update: {
          present: p.present,
        },
      }),
    ),
  )

  const presences = await prisma.presence.findMany({
    where: { matchId },
    include: { player: true },
    orderBy: [{ player: { name: 'asc' } }],
  })

  return res.json({ presences })
}
