import type { Request, Response } from 'express'
import { prisma } from '../../lib/prisma'
import { addSeasonPlayerSchema, replaceSeasonPlayersSchema } from './seasonPlayers.schemas'

export async function listSeasonPlayers(req: Request, res: Response) {
  const { teamId } = req.auth!
  const seasonId = req.params.id as string

  const season = await prisma.season.findFirst({
    where: { id: seasonId, teamId },
    select: { id: true },
  })

  if (!season) {
    return res.status(404).json({ error: 'SEASON_NOT_FOUND' })
  }

  const seasonPlayers = await prisma.seasonPlayer.findMany({
    where: { seasonId },
    include: {
      player: true,
    },
    orderBy: [{ player: { name: 'asc' } }],
  })

  return res.json({ seasonPlayers })
}

export async function addSeasonPlayer(req: Request, res: Response) {
  const { teamId } = req.auth!
  const seasonId = req.params.id as string
  const body = addSeasonPlayerSchema.parse(req.body)

  const season = await prisma.season.findFirst({
    where: { id: seasonId, teamId },
    select: { id: true },
  })

  if (!season) {
    return res.status(404).json({ error: 'SEASON_NOT_FOUND' })
  }

  const player = await prisma.player.findFirst({
    where: { id: body.playerId, teamId },
    select: { id: true },
  })

  if (!player) {
    return res.status(400).json({ error: 'PLAYER_NOT_FOUND_FOR_TEAM' })
  }

  const exists = await prisma.seasonPlayer.findUnique({
    where: {
      seasonId_playerId: {
        seasonId,
        playerId: body.playerId,
      },
    },
  })

  if (exists) {
    return res.status(409).json({ error: 'PLAYER_ALREADY_IN_SEASON' })
  }

  const seasonPlayer = await prisma.seasonPlayer.create({
    data: {
      seasonId,
      playerId: body.playerId,
    },
    include: {
      player: true,
    },
  })

  const { invalidateCache } = require('../../middlewares/cache')
  invalidateCache(teamId)

  return res.status(201).json({ seasonPlayer })
}

export async function removeSeasonPlayer(req: Request, res: Response) {
  const { teamId } = req.auth!
  const seasonId = req.params.id as string
  const playerId = req.params.playerId as string

  const season = await prisma.season.findFirst({
    where: { id: seasonId, teamId },
    select: { id: true },
  })

  if (!season) {
    return res.status(404).json({ error: 'SEASON_NOT_FOUND' })
  }

  const exists = await prisma.seasonPlayer.findUnique({
    where: {
      seasonId_playerId: {
        seasonId,
        playerId,
      },
    },
  })

  if (!exists) {
    return res.status(404).json({ error: 'PLAYER_NOT_IN_SEASON' })
  }

  await prisma.seasonPlayer.delete({
    where: {
      seasonId_playerId: {
        seasonId,
        playerId,
      },
    },
  })

  const { invalidateCache } = require('../../middlewares/cache')
  invalidateCache(teamId)

  return res.status(204).send()
}

export async function replaceSeasonPlayers(req: Request, res: Response) {
  const { teamId } = req.auth!
  const seasonId = req.params.id as string
  const body = replaceSeasonPlayersSchema.parse(req.body)

  const season = await prisma.season.findFirst({
    where: { id: seasonId, teamId },
    select: { id: true },
  })

  if (!season) {
    return res.status(404).json({ error: 'SEASON_NOT_FOUND' })
  }

  const uniquePlayerIds = [...new Set(body.playerIds)]

  const count = await prisma.player.count({
    where: {
      id: { in: uniquePlayerIds },
      teamId,
    },
  })

  if (count !== uniquePlayerIds.length) {
    return res.status(400).json({ error: 'INVALID_PLAYERS_FOR_TEAM' })
  }

  await prisma.$transaction(async (tx) => {
    await tx.seasonPlayer.deleteMany({
      where: { seasonId },
    })

    if (uniquePlayerIds.length > 0) {
      await tx.seasonPlayer.createMany({
        data: uniquePlayerIds.map((playerId) => ({
          seasonId,
          playerId,
        })),
        skipDuplicates: true,
      })
    }
  })

  const seasonPlayers = await prisma.seasonPlayer.findMany({
    where: { seasonId },
    include: { player: true },
    orderBy: [{ player: { name: 'asc' } }],
  })

  return res.json({ seasonPlayers })
}
