import { z } from 'zod'

const MAX_AMOUNT_CENTS = 100_000_000 // R$ 1.000.000,00

const amountCents = z.number().int().positive().max(MAX_AMOUNT_CENTS)

export const transactionTypeSchema = z.enum(['INCOME', 'EXPENSE'])

export const listTransactionsQuerySchema = z.object({
  seasonId: z.string().min(1).optional(),
  type: transactionTypeSchema.optional(),
  matchId: z.string().uuid().optional(),
  playerId: z.string().uuid().optional(),
})

export const summaryQuerySchema = z.object({
  seasonId: z.string().min(1).optional(),
})

export const createTransactionSchema = z.object({
  type: transactionTypeSchema,
  amountCents,
  description: z.string().trim().min(1).max(200),
  date: z.coerce.date(),
  category: z.string().trim().max(60).nullish(),
  matchId: z.string().uuid().nullish(),
  playerId: z.string().uuid().nullish(),
  // Usado apenas quando não há matchId (com matchId, a temporada é a do jogo)
  seasonId: z.string().min(1).nullish(),
})

export const updateTransactionSchema = z.object({
  amountCents: amountCents.optional(),
  description: z.string().trim().min(1).max(200).optional(),
  date: z.coerce.date().optional(),
  category: z.string().trim().max(60).nullish(),
  matchId: z.string().uuid().nullish(),
  playerId: z.string().uuid().nullish(),
})

export const playerPaymentsSchema = z.object({
  payments: z
    .array(
      z.object({
        playerId: z.string().uuid(),
        // 0 remove o lançamento do jogador neste jogo
        amountCents: z.number().int().min(0).max(MAX_AMOUNT_CENTS),
      }),
    )
    .min(1),
})
