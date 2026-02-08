import type { Request, Response } from 'express'
import { prisma } from '../../lib/prisma'
import { createPlayerSchema, updatePlayerSchema } from './players.schemas'

export async function listPlayers(req: Request, res: Response) {
  const { teamId } = req.auth!

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
    },
  })

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
      ...(body.active !== undefined ? { active: body.active } : {}),
    },
  })

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

  // soft delete
  const player = await prisma.player.update({
    where: { id: playerId },
    data: { active: false },
  })

  return res.json({ player })
}
