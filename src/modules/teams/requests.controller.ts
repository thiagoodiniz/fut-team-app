import type { Request, Response } from 'express'
import { prisma } from '../../lib/prisma'
import { z } from 'zod'

export async function searchTeams(req: Request, res: Response) {
    const query = req.query.q as string

    if (!query || query.length < 2) {
        return res.json({ teams: [] })
    }

    const teams = await prisma.team.findMany({
        where: {
            OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { slug: { contains: query, mode: 'insensitive' } },
            ],
            isActive: true,
        },
        select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
        },
        take: 10,
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
                role: role as any,
            },
        }),
    ])

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
    role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
})

export async function updateMemberRole(req: Request, res: Response) {
    const { teamId } = req.auth!
    const { userId } = req.params
    const { role } = updateMemberSchema.parse(req.body)

    // Ensure we don't leave the team without an owner if possible
    // (Simplification: just allow owners/admins to change roles)

    await prisma.userTeam.update({
        where: { userId_teamId: { userId, teamId } },
        data: { role },
    })

    return res.json({ success: true })
}

export async function removeMember(req: Request, res: Response) {
    const { teamId } = req.auth!
    const { userId } = req.params

    await prisma.userTeam.delete({
        where: { userId_teamId: { userId, teamId } },
    })

    return res.json({ success: true })
}
