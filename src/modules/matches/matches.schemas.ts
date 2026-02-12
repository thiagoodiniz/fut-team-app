import { z } from 'zod'

export const createMatchSchema = z.object({
  date: z.string().datetime(),
  location: z.string().min(2).optional(),
  opponent: z.string().min(2).optional(),
  notes: z.string().optional().nullable(),
  ourScore: z.number().int().min(0).max(99).optional(),
  theirScore: z.number().int().min(0).max(99).optional(),
})

export const updateMatchSchema = z.object({
  date: z.string().datetime().optional(),
  location: z.string().min(2).nullable().optional(),
  opponent: z.string().min(2).nullable().optional(),
  notes: z.string().nullable().optional(),
  ourScore: z.number().int().min(0).max(99).optional(),
  theirScore: z.number().int().min(0).max(99).optional(),
})
