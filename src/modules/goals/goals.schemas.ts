import { z } from "zod"

export const createGoalSchema = z.object({
  playerId: z.string().uuid(),
  minute: z.number().int().min(0).max(130).optional()
})
