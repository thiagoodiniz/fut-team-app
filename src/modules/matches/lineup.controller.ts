import { Request, Response } from 'express'
import { prisma } from '../../lib/prisma'

export type LineupData = {
  formation: string
  slots: Record<string, { playerId?: string; loanedPlayerName?: string } | null>
}

export async function getMatchLineup(req: Request, res: Response) {
  const matchId = req.params.id as string
  const teamId = (req as any).teamId as string

  const match = await prisma.match.findFirst({
    where: { id: matchId, teamId },
    select: { lineup: true },
  })

  if (!match) {
    return res.status(404).json({ error: 'Match not found' })
  }

  return res.json({ lineup: (match.lineup as LineupData | null) ?? null })
}

export async function saveMatchLineup(req: Request, res: Response) {
  const matchId = req.params.id as string
  const teamId = (req as any).teamId as string
  const { formation, slots } = req.body as LineupData

  if (!formation || typeof formation !== 'string') {
    return res.status(400).json({ error: 'formation is required' })
  }

  if (!slots || typeof slots !== 'object') {
    return res.status(400).json({ error: 'slots is required' })
  }

  const match = await prisma.match.findFirst({
    where: { id: matchId, teamId },
    select: { id: true },
  })

  if (!match) {
    return res.status(404).json({ error: 'Match not found' })
  }

  const updated = await prisma.match.update({
    where: { id: matchId },
    data: { lineup: { formation, slots } as any },
    select: { lineup: true },
  })

  return res.json({ lineup: updated.lineup })
}
