import type { Request, Response } from 'express'
import { prisma } from '../../lib/prisma'
import { createSeasonSchema, updateSeasonSchema } from './seasons.schemas'

export async function listSeasons(req: Request, res: Response) {
  const { teamId } = req.auth!

  const seasons = await prisma.season.findMany({
    where: { teamId },
    orderBy: [{ createdAt: 'desc' }],
  })

  return res.json({ seasons })
}

export async function getActiveSeason(req: Request, res: Response) {
  const { teamId } = req.auth!

  const season = await prisma.season.findFirst({
    where: { teamId, isActive: true },
  })

  if (!season) {
    return res.status(404).json({ error: 'NO_ACTIVE_SEASON' })
  }

  return res.json({ season })
}

export async function createSeason(req: Request, res: Response) {
  const { teamId } = req.auth!
  const body = createSeasonSchema.parse(req.body)

  const alreadyExists = await prisma.season.findFirst({
    where: { teamId, year: body.year },
  })

  if (alreadyExists) {
    return res.status(409).json({ error: 'SEASON_ALREADY_EXISTS' })
  }

  const season = await prisma.season.create({
    data: {
      teamId,
      year: body.year,
      name: body.name,
      isActive: body.isActive ?? false,
    },
  })

  const { invalidateCache } = require('../../middlewares/cache')
  invalidateCache(teamId)

  return res.status(201).json({ season })
}

export async function updateSeason(req: Request, res: Response) {
  const { teamId } = req.auth!
  const seasonId = req.params.id as string
  const body = updateSeasonSchema.parse(req.body)

  const season = await prisma.season.findFirst({
    where: { id: seasonId, teamId },
  })

  if (!season) {
    return res.status(404).json({ error: 'SEASON_NOT_FOUND' })
  }

  const updated = await prisma.season.update({
    where: { id: seasonId },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    },
  })

  const { invalidateCache } = require('../../middlewares/cache')
  invalidateCache(teamId)

  return res.json({ season: updated })
}

export async function activateSeason(req: Request, res: Response) {
  const { teamId } = req.auth!
  const seasonId = req.params.id as string

  const season = await prisma.season.findFirst({
    where: { id: seasonId, teamId },
  })

  if (!season) {
    return res.status(404).json({ error: 'SEASON_NOT_FOUND' })
  }

  const activated = await prisma.$transaction(async (tx) => {
    await tx.season.updateMany({
      where: { teamId },
      data: { isActive: false },
    })

    return tx.season.update({
      where: { id: seasonId },
      data: { isActive: true },
    })
  })

  const { invalidateCache } = require('../../middlewares/cache')
  invalidateCache(teamId)

  return res.json({ season: activated })
}

export async function deleteSeason(req: Request, res: Response) {
  const { teamId } = req.auth!
  const seasonId = req.params.id as string

  const season = await prisma.season.findFirst({
    where: { id: seasonId, teamId },
  })

  if (!season) {
    return res.status(404).json({ error: 'SEASON_NOT_FOUND' })
  }

  const matchesCount = await prisma.match.count({
    where: { seasonId, teamId },
  })

  if (matchesCount > 0) {
    return res.status(400).json({ error: 'SEASON_HAS_MATCHES' })
  }

  await prisma.season.delete({
    where: { id: seasonId },
  })

  const { invalidateCache } = require('../../middlewares/cache')
  invalidateCache(teamId)

  return res.status(204).send()
}
