import type { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../../lib/prisma'
import bcrypt from 'bcryptjs'
import process from 'process'
import { OAuth2Client } from 'google-auth-library'
import { registerSchema, loginSchema, googleLoginSchema } from './auth.schemas'

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

export async function register(req: Request, res: Response) {
  const { name, email, password } = registerSchema.parse(req.body)

  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    return res.status(400).json({ error: 'USER_ALREADY_EXISTS' })
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
  })

  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' })

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    onboarding: true,
  })
}

export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body)

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      teams: { include: { team: true } },
      joinRequests: {
        where: { status: 'PENDING' },
        include: { team: true },
      },
    },
  })

  if (!user || !user.password) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS' })
  }

  const isPasswordValid = await bcrypt.compare(password, user.password)
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'INVALID_CREDENTIALS' })
  }

  const userTeam = user.teams[0]

  if (!userTeam) {
    const pendingRequest = user.joinRequests[0]

    return res.json({
      token: jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' }),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
      onboarding: true,
      pendingRequest: pendingRequest
        ? {
          teamName: pendingRequest.team.name,
          createdAt: pendingRequest.createdAt,
        }
        : null,
    })
  }

  const token = jwt.sign(
    { userId: user.id, teamId: userTeam.team.id, role: userTeam.role },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  )

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
    },
    team: {
      id: userTeam.team.id,
      name: userTeam.team.name,
      slug: userTeam.team.slug,
      role: userTeam.role,
    },
  })
}

export async function googleLogin(req: Request, res: Response) {
  const { idToken } = googleLoginSchema.parse(req.body)

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()

    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'INVALID_GOOGLE_TOKEN' })
    }

    const { email, name, picture } = payload

    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        teams: {
          include: { team: true },
        },
        joinRequests: {
          where: { status: 'PENDING' },
          include: { team: true },
        },
      },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name: name || '',
          avatarUrl: picture,
        },
        include: {
          teams: { include: { team: true } },
          joinRequests: {
            include: { team: true },
          },
        },
      })
    }

    const userTeam = user.teams[0]

    if (!userTeam) {
      // User exists but has no team. Check for pending requests.
      const pendingRequest = user.joinRequests[0] // Since we filtered by PENDING and limited to one usually

      return res.json({
        token: jwt.sign({ userId: user.id }, process.env.JWT_SECRET!, { expiresIn: '7d' }),
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatarUrl: user.avatarUrl,
        },
        onboarding: true,
        pendingRequest: pendingRequest
          ? {
            teamName: pendingRequest.team.name,
            createdAt: pendingRequest.createdAt,
          }
          : null,
      })
    }

    const token = jwt.sign(
      { userId: user.id, teamId: userTeam.team.id, role: userTeam.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
      team: {
        id: userTeam.team.id,
        name: userTeam.team.name,
        slug: userTeam.team.slug,
        role: userTeam.role,
      },
    })
  } catch (error) {
    console.error('Google verification error:', error)
    return res.status(401).json({ error: 'GOOGLE_AUTH_FAILED' })
  }
}
