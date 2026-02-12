import type { Request, Response } from 'express'
import { prisma } from '../../lib/prisma'
import { cache } from '../../lib/cache'
import { createPlayerSchema, updatePlayerSchema } from './players.schemas'

export async function listPlayers(req: Request, res: Response) {
  const { teamId } = req.auth!
  const seasonId = req.query.seasonId as string | undefined

  if (seasonId) {
    const seasonPlayers = await prisma.seasonPlayer.findMany({
      where: { seasonId },
      include: { player: true },
      orderBy: [{ player: { name: 'asc' } }],
    })

    const players = seasonPlayers.map((sp) => sp.player)
    return res.json({ players })
  }

  const players = await prisma.player.findMany({
    where: { teamId },
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
  })

  return res.json({ players })
}

export async function createPlayer(req: Request, res: Response) {
  const { teamId } = req.auth!
  const body = createPlayerSchema.parse(req.body)

  const player = await prisma.player.create({
    data: {
      teamId,
      name: body.name,
      nickname: body.nickname,
      position: body.position,
      number: body.number,
      ...(body.photo !== undefined ? { photo: body.photo } : {}),
    },
  })

  // Auto-associate to active season if exists
  const activeSeason = await prisma.season.findFirst({
    where: { teamId, isActive: true },
    select: { id: true },
  })

  if (activeSeason) {
    await prisma.seasonPlayer
      .create({
        data: {
          seasonId: activeSeason.id,
          playerId: player.id,
        },
      })
      .catch((err) => {
        // Ignore duplicate or error, just a convenience feature
        console.error('Failed to auto-associate player to season', err)
      })
  }

  const { invalidateCache } = require('../../middlewares/cache')
  invalidateCache(teamId)

  return res.status(201).json({ player })
}

export async function updatePlayer(req: Request, res: Response) {
  const { teamId } = req.auth!
  const playerId = req.params.id as string

  const body = updatePlayerSchema.parse(req.body)

  const exists = await prisma.player.findFirst({
    where: { id: playerId, teamId },
  })

  if (!exists) {
    return res.status(404).json({ error: 'PLAYER_NOT_FOUND' })
  }

  const player = await prisma.player.update({
    where: { id: playerId },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.nickname !== undefined ? { nickname: body.nickname } : {}),
      ...(body.position !== undefined ? { position: body.position } : {}),
      ...(body.number !== undefined ? { number: body.number } : {}),
      ...(body.photo !== undefined ? { photo: body.photo } : {}),
      ...(body.active !== undefined ? { active: body.active } : {}),
    },
  })

  const { invalidateCache } = require('../../middlewares/cache')
  invalidateCache(teamId)

  return res.json({ player })
}

export async function deletePlayer(req: Request, res: Response) {
  const { teamId } = req.auth!
  const playerId = req.params.id as string

  const exists = await prisma.player.findFirst({
    where: { id: playerId, teamId },
  })

  if (!exists) {
    return res.status(404).json({ error: 'PLAYER_NOT_FOUND' })
  }

  const player = await prisma.player.update({
    where: { id: playerId },
    data: { active: false },
  })

  const { invalidateCache } = require('../../middlewares/cache')
  invalidateCache(teamId)

  return res.json({ player })
}

export async function getPlayerStats(req: Request, res: Response) {
  const { teamId } = req.auth!
  const playerId = req.params.id as string
  const seasonId = req.query.seasonId as string | undefined

  const player = await prisma.player.findFirst({
    where: { id: playerId, teamId },
    select: { id: true },
  })

  if (!player) {
    return res.status(404).json({ error: 'PLAYER_NOT_FOUND' })
  }

  let resolvedSeasonId = seasonId
  if (!resolvedSeasonId) {
    const activeSeason = await prisma.season.findFirst({
      where: { teamId, isActive: true },
      select: { id: true },
    })
    resolvedSeasonId = activeSeason?.id
  }

  if (!resolvedSeasonId) {
    return res.json({ stats: { presences: 0, totalMatches: 0, goals: 0 } })
  }

  const matches = await prisma.match.findMany({
    where: { teamId, seasonId: resolvedSeasonId },
    select: { id: true },
  })
  const matchIds = matches.map((m) => m.id)

  if (matchIds.length === 0) {
    return res.json({ stats: { presences: 0, totalMatches: 0, goals: 0 } })
  }

  const [presenceCount, goalCount] = await Promise.all([
    prisma.presence.count({
      where: { playerId, matchId: { in: matchIds }, present: true },
    }),
    prisma.goal.count({
      where: { playerId, matchId: { in: matchIds } },
    }),
  ])

  return res.json({
    stats: {
      presences: presenceCount,
      totalMatches: matchIds.length,
      goals: goalCount,
    },
  })
}
