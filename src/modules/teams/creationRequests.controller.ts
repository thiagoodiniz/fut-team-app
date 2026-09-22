import type { Request, Response } from 'express'
import { prisma } from '../../lib/prisma'
import { z } from 'zod'

const createRequestSchema = z.object({
  teamName: z.string().min(2, 'Nome do time muito curto'),
  userName: z.string().min(2, 'Nome de usuário muito curto'),
  phone: z.string().min(8, 'Telefone inválido'),
})

export async function createTeamRequest(req: Request, res: Response) {
  const { userId } = req.auth!

  const result = createRequestSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ error: 'INVALID_DATA', details: result.error.format() })
  }

  const { teamName, userName, phone } = result.data

  const dbUser = await prisma.user.findUnique({ where: { id: userId } })

  const teamRequest = await prisma.teamCreationRequest.create({
    data: {
      userId,
      teamName,
      userName,
      phone,
      email: dbUser?.email || '',
      status: 'PENDING',
    },
  })

  return res.status(201).json(teamRequest)
}

export async function listTeamCreationRequests(req: Request, res: Response) {
  // Somente Manager pode acessar (protegido por middleware)
  const requests = await prisma.teamCreationRequest.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { name: true, email: true } } }
  })
  return res.json({ requests })
}

export async function approveTeamRequest(req: Request, res: Response) {
  const id = req.params.id as string

  const teamRequest = await prisma.teamCreationRequest.findUnique({
    where: { id },
  })

  if (!teamRequest) {
    return res.status(404).json({ error: 'REQUEST_NOT_FOUND' })
  }

  if (teamRequest.status !== 'PENDING') {
    return res.status(400).json({ error: 'REQUEST_NOT_PENDING' })
  }

  // Generate slug
  let baseSlug = teamRequest.teamName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  
  if (!baseSlug) baseSlug = 'time'
  
  let slug = baseSlug
  let counter = 1
  while (await prisma.team.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`
    counter++
  }

  // Transaction: Create team, update request status, assign role
  const team = await prisma.$transaction(async (tx) => {
    const newTeam = await tx.team.create({
      data: {
        name: teamRequest.teamName,
        slug,
      },
    })

    await tx.userTeam.create({
      data: {
        userId: teamRequest.userId,
        teamId: newTeam.id,
        role: 'OWNER',
      },
    })

    // Create a default season
    const currentYear = new Date().getFullYear()
    await tx.season.create({
      data: {
        teamId: newTeam.id,
        name: `Temporada ${currentYear}`,
        year: currentYear,
        isActive: true,
      }
    })

    await tx.teamCreationRequest.update({
      where: { id },
      data: { status: 'APPROVED' },
    })

    // Optionally update user's lastTeamId
    await tx.user.update({
      where: { id: teamRequest.userId },
      data: { lastTeamId: newTeam.id },
    })

    return newTeam
  })

  return res.json(team)
}

export async function rejectTeamRequest(req: Request, res: Response) {
  const id = req.params.id as string

  const teamRequest = await prisma.teamCreationRequest.findUnique({
    where: { id },
  })

  if (!teamRequest) {
    return res.status(404).json({ error: 'REQUEST_NOT_FOUND' })
  }

  if (teamRequest.status !== 'PENDING') {
    return res.status(400).json({ error: 'REQUEST_NOT_PENDING' })
  }

  const updated = await prisma.teamCreationRequest.update({
    where: { id },
    data: { status: 'REJECTED' },
  })

  return res.json(updated)
}
