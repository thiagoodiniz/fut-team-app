import { z } from 'zod'

export const createGoalSchema = z.object({
  playerId: z.string().uuid().optional().nullable(),
  loanedPlayerName: z.string().optional().nullable(),
  goals: z
    .array(
      z.object({
        minute: z.number().int().min(0).max(130).optional().nullable(),
        assistantId: z.string().uuid().optional().nullable(),
        loanedAssistantName: z.string().optional().nullable(),
        ownGoal: z.boolean().optional().default(false),
        freeKick: z.boolean().optional().default(false),
        penalty: z.boolean().optional().default(false),
      }),
    )
    .min(1)
    .max(10),
})

export const updateGoalSchema = z.object({
  minute: z.number().int().min(0).max(130).optional().nullable(),
  assistantId: z.string().uuid().optional().nullable(),
  loanedAssistantName: z.string().optional().nullable(),
  freeKick: z.boolean().optional().default(false),
  penalty: z.boolean().optional().default(false),
})
