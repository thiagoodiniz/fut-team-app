import type { NextFunction, Request, Response } from 'express'
import { prisma } from '../lib/prisma'

/**
 * Garante que a gestão financeira esteja habilitada para o time atual.
 * Deve ser usado DEPOIS de authMiddleware e adminMiddleware.
 * Respostas financeiras nunca devem ser cacheadas.
 */
export async function financeMiddleware(req: Request, res: Response, next: NextFunction) {
  const teamId = req.auth?.teamId

  if (!teamId) {
    return res.status(403).json({ error: 'FINANCE_DISABLED' })
  }

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { financeEnabled: true },
  })

  if (!team?.financeEnabled) {
    return res.status(403).json({ error: 'FINANCE_DISABLED' })
  }

  res.setHeader('Cache-Control', 'no-store')
  return next()
}
