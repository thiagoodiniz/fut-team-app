import type { Request, Response } from 'express'
import { prisma } from '../../lib/prisma'
import { z } from 'zod'
import { TeamRole } from '@prisma/client'

export async function searchTeams(req: Request, res: Response) {
    const query = req.query.q as string

    const teams = await prisma.team.findMany({
        where: query && query.length >= 2 ? {
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { slug: { contains: query, mode: 'insensitive' } },
            ],
            isActive: true,
        } : { isActive: true },
        select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
        },
        take: 20,
        orderBy: { name: 'asc' }
    })

    return res.json({ teams })
}

export async function createJoinRequest(req: Request, res: Response) {
    const { userId } = req.auth!
    const { teamId } = req.body

    if (!teamId) {
        return res.status(400).json({ error: 'TEAM_ID_REQUIRED' })
    }

    // Check if already in the team
    const existingMembership = await prisma.userTeam.findUnique({
        where: { userId_teamId: { userId, teamId } },
    })

    if (existingMembership) {
        return res.status(400).json({ error: 'ALREADY_IN_TEAM' })
    }

    // Check if there is already a pending request
    const existingRequest = await prisma.joinRequest.findUnique({
        where: { userId_teamId: { userId, teamId } },
    })

    if (existingRequest && existingRequest.status === 'PENDING') {
        return res.status(400).json({ error: 'REQUEST_ALREADY_PENDING' })
    }

    const joinRequest = await prisma.joinRequest.upsert({
        where: { userId_teamId: { userId, teamId } },
        update: { status: 'PENDING' },
        create: {
            userId,
            teamId,
            status: 'PENDING',
        },
    })

    const { invalidateCache } = require('../../middlewares/cache')
    invalidateCache(teamId)

    return res.json({ joinRequest })
}

export async function listTeamRequests(req: Request, res: Response) {
    const { teamId } = req.auth!

    const requests = await prisma.joinRequest.findMany({
        where: { teamId, status: 'PENDING' },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatarUrl: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    })

    return res.json({ requests })
}

const respondSchema = z.object({
    requestId: z.string().uuid(),
    action: z.enum(['APPROVE', 'REJECT']),
    role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
})

export async function respondToRequest(req: Request, res: Response) {
    const { teamId } = req.auth!
    const { requestId, action, role } = respondSchema.parse(req.body)

    const joinRequest = await prisma.joinRequest.findUnique({
        where: { id: requestId },
    })

    if (!joinRequest || joinRequest.teamId !== teamId) {
        return res.status(404).json({ error: 'REQUEST_NOT_FOUND' })
    }

    if (action === 'REJECT') {
        await prisma.joinRequest.update({
            where: { id: requestId },
            data: { status: 'REJECTED' },
        })
        return res.json({ success: true })
    }

    // APPROVE
    await prisma.$transaction([
        prisma.joinRequest.update({
            where: { id: requestId },
            data: { status: 'APPROVED' },
        }),
        prisma.userTeam.create({
            data: {
                userId: joinRequest.userId,
                teamId: joinRequest.teamId,
                role: role as TeamRole,
            },
        }),
    ])

    const { invalidateCache } = require('../../middlewares/cache')
    invalidateCache(teamId)

    return res.json({ success: true })
}

export async function listTeamMembers(req: Request, res: Response) {
    const { teamId } = req.auth!

    const members = await prisma.userTeam.findMany({
        where: { teamId },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    avatarUrl: true,
                },
            },
        },
        orderBy: { user: { name: 'asc' } },
    })

    return res.json({ members })
}

const updateMemberSchema = z.object({
    role: z.enum(['ADMIN', 'MEMBER']),
})

export async function updateMemberRole(req: Request, res: Response) {
    const { teamId } = req.auth!
    const { userId } = req.params
    const { role } = updateMemberSchema.parse(req.body)

    await prisma.userTeam.update({
        where: { userId_teamId: { userId: userId as string, teamId: teamId as string } },
        data: { role },
    })

    const { invalidateCache } = require('../../middlewares/cache')
    invalidateCache(teamId)

    return res.json({ success: true })
}

export async function removeMember(req: Request, res: Response) {
    const { teamId } = req.auth!
    const { userId } = req.params

    await prisma.userTeam.delete({
        where: { userId_teamId: { userId: userId as string, teamId: teamId as string } },
    })

    const { invalidateCache } = require('../../middlewares/cache')
    invalidateCache(teamId)

    return res.json({ success: true })
}

export async function joinTeamDirectly(req: Request, res: Response) {
    const { userId } = req.auth!
    const { teamId } = req.body

    if (!teamId) {
        return res.status(400).json({ error: 'TEAM_ID_REQUIRED' })
    }

    // Check if already in the team
    const existingMembership = await prisma.userTeam.findUnique({
        where: { userId_teamId: { userId, teamId } },
    })

    const jwt = require('jsonwebtoken')
    const process = require('process')

    if (existingMembership) {
        // Already a member — just update lastTeamId and return a fresh token
        await (prisma.user.update as any)({
            where: { id: userId },
            data: { lastTeamId: teamId }
        })

        const user = await prisma.user.findUnique({ where: { id: userId } })
        const team = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true, name: true, slug: true } })

        const token = jwt.sign(
            { userId, teamId, role: existingMembership.role, isManager: (user as any)?.isManager ?? false },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        )

        return res.json({
            success: true,
            token,
            teamId,
            team,
            role: existingMembership.role,
            userId,
            isManager: (user as any)?.isManager ?? false
        })
    }

    // New membership — direct join as MEMBER
    await prisma.$transaction([
        prisma.userTeam.create({
            data: {
                userId,
                teamId,
                role: 'MEMBER',
            }
        }),
        (prisma.user.update as any)({
            where: { id: userId },
            data: { lastTeamId: teamId }
        })
    ])

    // Fetch user to get isManager
    const user = await prisma.user.findUnique({ where: { id: userId } })
    const team = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true, name: true, slug: true } })

    const token = jwt.sign(
        { userId, teamId, role: 'MEMBER', isManager: (user as any)?.isManager ?? false },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    )

    return res.json({
        success: true,
        token,
        teamId,
        team,
        role: 'MEMBER',
        userId,
        isManager: (user as any)?.isManager ?? false
    })
}

export async function selectTeam(req: Request, res: Response) {
    const { userId } = req.auth!
    const { teamId } = req.body

    if (!teamId) {
        return res.status(400).json({ error: 'TEAM_ID_REQUIRED' })
    }

    const membership = await prisma.userTeam.findUnique({
        where: { userId_teamId: { userId, teamId } }
    })

    if (!membership) {
        return res.status(403).json({ error: 'NOT_A_MEMBER' })
    }

    await prisma.user.update({
        where: { id: userId },
        data: { lastTeamId: teamId }
    })

    return res.json({ success: true })
}

const createTeamSchema = z.object({
    name: z.string().min(2),
    slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
})

export async function createTeam(req: Request, res: Response) {
    const { userId } = req.auth!
    const { name, slug } = createTeamSchema.parse(req.body)

    const existing = await prisma.team.findUnique({ where: { slug } })
    if (existing) {
        return res.status(400).json({ error: 'SLUG_ALREADY_EXISTS' })
    }

    const currentYear = new Date().getFullYear()

    const team = await prisma.$transaction(async (tx) => {
        // 1. Create Team and Admin User
        const newTeam = await tx.team.create({
            data: {
                name,
                slug,
                users: {
                    create: {
                        userId,
                        role: 'ADMIN',
                    }
                }
            },
        })

        // 2. Create Initial Season
        await tx.season.create({
            data: {
                teamId: newTeam.id,
                year: currentYear,
                name: `Temporada ${currentYear}`,
                isActive: true,
            }
        })

        // 3. Update lastTeamId for the manager
        await (tx.user.update as any)({
            where: { id: userId },
            data: { lastTeamId: newTeam.id },
        })

        return newTeam
    })

    const jwt = require('jsonwebtoken')
    const process = require('process')

    // Fetch user to get isManager status
    const user = await prisma.user.findUnique({ where: { id: userId } })

    const token = jwt.sign(
        {
            userId,
            teamId: team.id,
            role: 'ADMIN',
            isManager: (user as any)?.isManager ?? false
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    )

    return res.status(201).json({
        success: true,
        token,
        teamId: team.id,
        team: {
            id: team.id,
            name: team.name,
            slug: team.slug,
            role: 'ADMIN'
        },
        userId,
        isManager: (user as any)?.isManager ?? false
    })
}
