import { z } from 'zod'

export const createSeasonSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  name: z.string().min(2),
  isActive: z.boolean().optional(),
})

export const updateSeasonSchema = z.object({
  name: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
})
