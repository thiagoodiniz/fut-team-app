import type { Request, Response } from 'express'
import { prisma } from '../../lib/prisma'

export async function getAdminDashboardStats(req: Request, res: Response) {
  // Somente manager (Owner do sistema)
  
  const totalUsers = await prisma.user.count()
  const totalTeams = await prisma.team.count({ where: { deletedAt: null } })
  const pendingRequests = await prisma.teamCreationRequest.count({ where: { status: 'PENDING' } })
  
  // Como as ligações de usuários a times estão em UserTeam
  const totalAccesses = await prisma.userTeam.count()
  
  // List newest accesses (recently joined)
  const recentAccesses = await prisma.userTeam.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true, email: true } },
      team: { select: { name: true, slug: true } }
    }
  })
  
  return res.json({
    totalUsers,
    totalTeams,
    pendingRequests,
    totalAccesses,
    recentAccesses
  })
}

export async function listAdminTeams(req: Request, res: Response) {
  const teams = await prisma.team.findMany({
    where: { deletedAt: null },
    include: {
      _count: {
        select: { users: true, matches: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
  
  return res.json({ teams })
}

export async function updateAdminTeam(req: Request, res: Response) {
  const id = req.params.id as string
  const { name, slug } = req.body
  
  if (!name || !slug) {
    return res.status(400).json({ error: 'INVALID_DATA' })
  }

  // Check slug conflict
  const existing = await prisma.team.findFirst({
    where: { slug, id: { not: id } }
  })

  if (existing) {
    return res.status(400).json({ error: 'SLUG_ALREADY_EXISTS' })
  }
  
  const team = await prisma.team.update({
    where: { id },
    data: { name, slug }
  })
  
  return res.json(team)
}

export async function deleteAdminTeam(req: Request, res: Response) {
  const id = req.params.id as string
  
  // Soft delete
  const team = await prisma.team.update({
    where: { id },
    data: { deletedAt: new Date() }
  })
  
  return res.json({ message: 'Team softly deleted', team })
}
