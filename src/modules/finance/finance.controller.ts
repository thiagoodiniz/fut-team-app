import type { Request, Response } from 'express'
import { prisma } from '../../lib/prisma'
import {
  createTransactionSchema,
  listTransactionsQuerySchema,
  playerPaymentsSchema,
  summaryQuerySchema,
  updateTransactionSchema,
} from './finance.schemas'

const transactionInclude = {
  match: { select: { id: true, opponent: true, date: true } },
  player: { select: { id: true, name: true, nickname: true } },
  createdBy: { select: { id: true, name: true, email: true } },
  updatedBy: { select: { id: true, name: true, email: true } },
} as const

function badRequest(res: Response, error: { issues: unknown }) {
  return res.status(400).json({ error: 'INVALID_DATA', issues: error.issues })
}

function isUniqueViolation(err: unknown) {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002'
}

/** Resolve a temporada: a informada (validando o time) ou a ativa. */
async function resolveSeasonId(teamId: string, seasonId?: string | null) {
  if (seasonId) {
    const season = await prisma.season.findFirst({
      where: { id: seasonId, teamId },
      select: { id: true },
    })
    return season?.id ?? null
  }

  const active = await prisma.season.findFirst({
    where: { teamId, isActive: true },
    select: { id: true },
  })
  return active?.id ?? null
}

async function getTotals(where: { teamId: string; seasonId?: string; matchId?: string }) {
  const grouped = await prisma.financialTransaction.groupBy({
    by: ['type'],
    where,
    _sum: { amountCents: true },
  })

  const incomeCents = grouped.find((g) => g.type === 'INCOME')?._sum.amountCents ?? 0
  const expenseCents = grouped.find((g) => g.type === 'EXPENSE')?._sum.amountCents ?? 0

  return { incomeCents, expenseCents, balanceCents: incomeCents - expenseCents }
}

/** Valida que o jogo e o jogador pertencem ao time. Retorna o jogo (quando informado). */
async function validateLinks(
  teamId: string,
  matchId?: string | null,
  playerId?: string | null,
): Promise<
  | { ok: true; match: { id: string; seasonId: string } | null }
  | { ok: false; status: number; error: string }
> {
  let match: { id: string; seasonId: string } | null = null

  if (matchId) {
    match = await prisma.match.findFirst({
      where: { id: matchId, teamId },
      select: { id: true, seasonId: true },
    })
    if (!match) return { ok: false, status: 404, error: 'MATCH_NOT_FOUND' }
  }

  if (playerId) {
    const player = await prisma.player.findFirst({
      where: { id: playerId, teamId },
      select: { id: true },
    })
    if (!player) return { ok: false, status: 404, error: 'PLAYER_NOT_FOUND' }
  }

  return { ok: true, match }
}

// GET /finance/summary?seasonId=
export async function getFinanceSummary(req: Request, res: Response) {
  const { teamId } = req.auth!
  const parsed = summaryQuerySchema.safeParse(req.query)
  if (!parsed.success) return badRequest(res, parsed.error)

  const seasonId = await resolveSeasonId(teamId as string, parsed.data.seasonId)
  if (!seasonId) return res.status(404).json({ error: 'SEASON_NOT_FOUND' })

  const totals = await getTotals({ teamId: teamId as string, seasonId })

  return res.json({ seasonId, ...totals })
}

// GET /finance/transactions?seasonId=&type=&matchId=&playerId=
export async function listTransactions(req: Request, res: Response) {
  const { teamId } = req.auth!
  const parsed = listTransactionsQuerySchema.safeParse(req.query)
  if (!parsed.success) return badRequest(res, parsed.error)

  const { type, matchId, playerId } = parsed.data
  const seasonId = await resolveSeasonId(teamId as string, parsed.data.seasonId)
  if (!seasonId) return res.status(404).json({ error: 'SEASON_NOT_FOUND' })

  const transactions = await prisma.financialTransaction.findMany({
    where: { teamId: teamId as string, seasonId, type, matchId, playerId },
    include: transactionInclude,
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  })

  return res.json({ seasonId, transactions })
}

// POST /finance/transactions
export async function createTransaction(req: Request, res: Response) {
  const { teamId, userId } = req.auth!
  const parsed = createTransactionSchema.safeParse(req.body)
  if (!parsed.success) return badRequest(res, parsed.error)

  const body = parsed.data

  if (body.playerId && body.type !== 'INCOME') {
    return res.status(400).json({ error: 'PLAYER_ONLY_ON_INCOME' })
  }

  const links = await validateLinks(teamId as string, body.matchId, body.playerId)
  if (!links.ok) return res.status(links.status).json({ error: links.error })

  // Com jogo vinculado, a temporada é sempre a do jogo
  const seasonId = links.match?.seasonId ?? (await resolveSeasonId(teamId as string, body.seasonId))
  if (!seasonId) return res.status(400).json({ error: 'SEASON_NOT_FOUND' })

  try {
    const transaction = await prisma.financialTransaction.create({
      data: {
        teamId: teamId as string,
        seasonId,
        type: body.type,
        amountCents: body.amountCents,
        description: body.description,
        date: body.date,
        category: body.category || null,
        matchId: body.matchId ?? null,
        playerId: body.playerId ?? null,
        createdById: userId,
        updatedById: userId,
      },
      include: transactionInclude,
    })

    return res.status(201).json({ transaction })
  } catch (err) {
    if (isUniqueViolation(err)) {
      return res.status(409).json({ error: 'PLAYER_PAYMENT_ALREADY_EXISTS' })
    }
    throw err
  }
}

// PATCH /finance/transactions/:id
export async function updateTransaction(req: Request, res: Response) {
  const { teamId, userId } = req.auth!
  const id = req.params.id as string
  const parsed = updateTransactionSchema.safeParse(req.body)
  if (!parsed.success) return badRequest(res, parsed.error)

  const body = parsed.data

  const existing = await prisma.financialTransaction.findFirst({
    where: { id, teamId: teamId as string },
  })
  if (!existing) return res.status(404).json({ error: 'TRANSACTION_NOT_FOUND' })

  const nextPlayerId = body.playerId === undefined ? existing.playerId : body.playerId
  if (nextPlayerId && existing.type !== 'INCOME') {
    return res.status(400).json({ error: 'PLAYER_ONLY_ON_INCOME' })
  }

  const links = await validateLinks(teamId as string, body.matchId, body.playerId)
  if (!links.ok) return res.status(links.status).json({ error: links.error })

  try {
    const transaction = await prisma.financialTransaction.update({
      where: { id },
      data: {
        amountCents: body.amountCents,
        description: body.description,
        date: body.date,
        category: body.category === undefined ? undefined : body.category || null,
        matchId: body.matchId,
        playerId: body.playerId,
        // Ao vincular a um jogo, a transação passa para a temporada do jogo
        seasonId: links.match?.seasonId,
        updatedById: userId,
      },
      include: transactionInclude,
    })

    return res.json({ transaction })
  } catch (err) {
    if (isUniqueViolation(err)) {
      return res.status(409).json({ error: 'PLAYER_PAYMENT_ALREADY_EXISTS' })
    }
    throw err
  }
}

// DELETE /finance/transactions/:id
export async function deleteTransaction(req: Request, res: Response) {
  const { teamId } = req.auth!
  const id = req.params.id as string

  const result = await prisma.financialTransaction.deleteMany({
    where: { id, teamId: teamId as string },
  })
  if (result.count === 0) return res.status(404).json({ error: 'TRANSACTION_NOT_FOUND' })

  return res.status(204).send()
}

// GET /matches/:id/finance
export async function getMatchFinance(req: Request, res: Response) {
  const { teamId } = req.auth!
  const matchId = req.params.id as string

  const match = await prisma.match.findFirst({
    where: { id: matchId, teamId: teamId as string },
    select: { id: true },
  })
  if (!match) return res.status(404).json({ error: 'MATCH_NOT_FOUND' })

  const [transactions, totals] = await Promise.all([
    prisma.financialTransaction.findMany({
      where: { teamId: teamId as string, matchId },
      include: transactionInclude,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    }),
    getTotals({ teamId: teamId as string, matchId }),
  ])

  return res.json({ matchId, transactions, ...totals })
}

// PUT /matches/:id/finance/player-payments
export async function upsertMatchPlayerPayments(req: Request, res: Response) {
  const { teamId, userId } = req.auth!
  const matchId = req.params.id as string
  const parsed = playerPaymentsSchema.safeParse(req.body)
  if (!parsed.success) return badRequest(res, parsed.error)

  const { payments } = parsed.data

  const playerIds = payments.map((p) => p.playerId)
  if (new Set(playerIds).size !== playerIds.length) {
    return res.status(400).json({ error: 'DUPLICATED_PLAYERS' })
  }

  const match = await prisma.match.findFirst({
    where: { id: matchId, teamId: teamId as string },
    select: { id: true, seasonId: true, date: true },
  })
  if (!match) return res.status(404).json({ error: 'MATCH_NOT_FOUND' })

  const playersCount = await prisma.player.count({
    where: { id: { in: playerIds }, teamId: teamId as string },
  })
  if (playersCount !== playerIds.length) {
    return res.status(400).json({ error: 'INVALID_PLAYERS_FOR_TEAM' })
  }

  const existing = await prisma.financialTransaction.findMany({
    where: { teamId: teamId as string, matchId, type: 'INCOME', playerId: { in: playerIds } },
    select: { id: true, playerId: true },
  })
  const existingByPlayer = new Map(existing.map((e) => [e.playerId as string, e.id]))

  const operations = payments.flatMap((p) => {
    const existingId = existingByPlayer.get(p.playerId)

    if (p.amountCents === 0) {
      return existingId ? [prisma.financialTransaction.delete({ where: { id: existingId } })] : []
    }

    if (existingId) {
      return [
        prisma.financialTransaction.update({
          where: { id: existingId },
          data: {
            amountCents: p.amountCents,
            updatedById: userId,
          },
        }),
      ]
    }

    return [
      prisma.financialTransaction.create({
        data: {
          teamId: teamId as string,
          seasonId: match.seasonId,
          type: 'INCOME',
          amountCents: p.amountCents,
          description: 'Contribuição do jogador',
          category: 'Jogador',
          date: match.date,
          matchId,
          playerId: p.playerId,
          createdById: userId,
          updatedById: userId,
        },
      }),
    ]
  })

  try {
    await prisma.$transaction(operations)
  } catch (err) {
    if (isUniqueViolation(err)) {
      // Requisição concorrente criou o mesmo pagamento
      return res.status(409).json({ error: 'PLAYER_PAYMENT_ALREADY_EXISTS' })
    }
    throw err
  }

  const transactions = await prisma.financialTransaction.findMany({
    where: { teamId: teamId as string, matchId },
    include: transactionInclude,
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
  })
  const totals = await getTotals({ teamId: teamId as string, matchId })

  return res.json({ matchId, transactions, ...totals })
}
