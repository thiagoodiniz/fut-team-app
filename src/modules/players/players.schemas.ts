import { z } from 'zod'

export const createPlayerSchema = z.object({
  name: z.string().min(2),
  nickname: z.string().min(2).optional(),
  position: z.string().min(1).optional(),
  number: z.coerce.number().int().min(0).max(99).optional(),
  photo: z.string().optional().nullable(),
})

export const updatePlayerSchema = z.object({
  name: z.string().min(2).optional(),
  nickname: z.string().min(2).nullable().optional(),
  position: z.string().min(1).nullable().optional(),
  number: z.coerce.number().int().min(0).max(99).nullable().optional(),
  photo: z.string().nullable().optional(),
  active: z.boolean().optional(),
})
