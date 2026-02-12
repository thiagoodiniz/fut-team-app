import { z } from 'zod'

export const createGoalSchema = z.object({
  playerId: z.string().uuid(),
  goals: z
    .array(
      z.object({
        minute: z.number().int().min(0).max(130).optional().nullable(),
        ownGoal: z.boolean().optional().default(false),
      }),
    )
    .min(1)
    .max(10),
})
