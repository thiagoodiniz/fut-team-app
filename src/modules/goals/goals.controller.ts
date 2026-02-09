import type { Request, Response } from 'express'
import { prisma } from '../../lib/prisma'
import { createGoalSchema } from './goals.schemas'

async function getActiveSeasonId(teamId: string) {
  const season = await prisma.season.findFirst({
    where: { teamId, isActive: true },
    select: { id: true },
  })

  return season?.id ?? null
}

export async function listMatchGoals(req: Request, res: Response) {
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

  const goals = await prisma.goal.findMany({
    where: { matchId },
    include: { player: true },
    orderBy: [{ createdAt: 'asc' }],
  })

  return res.json({ goals })
}

export async function createMatchGoal(req: Request, res: Response) {
  const { teamId } = req.auth!
  const matchId = req.params.id as string
  const body = createGoalSchema.parse(req.body)

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

  const player = await prisma.player.findFirst({
    where: { id: body.playerId, teamId },
    select: { id: true },
  })

  if (!player) {
    return res.status(400).json({ error: 'PLAYER_NOT_FOUND_FOR_TEAM' })
  }

  const goal = await prisma.goal.create({
    data: {
      matchId,
      playerId: body.playerId,
      minute: body.minute,
    },
    include: {
      player: true,
    },
  })

  return res.status(201).json({ goal })
}

export async function deleteGoal(req: Request, res: Response) {
  const { teamId } = req.auth!
  const goalId = req.params.id as string

  const seasonId = await getActiveSeasonId(teamId)
  if (!seasonId) {
    return res.status(400).json({ error: 'NO_ACTIVE_SEASON' })
  }

  const goal = await prisma.goal.findFirst({
    where: { id: goalId },
    include: {
      match: {
        select: {
          id: true,
          teamId: true,
          seasonId: true,
        },
      },
    },
  })

  if (!goal) {
    return res.status(404).json({ error: 'GOAL_NOT_FOUND' })
  }

  if (goal.match.teamId !== teamId) {
    return res.status(403).json({ error: 'FORBIDDEN' })
  }

  if (goal.match.seasonId !== seasonId) {
    return res.status(403).json({ error: 'MATCH_NOT_IN_ACTIVE_SEASON' })
  }

  await prisma.goal.delete({
    where: { id: goalId },
  })

  return res.status(204).send()
}
