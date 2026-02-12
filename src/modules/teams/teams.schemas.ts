import { z } from 'zod'

export const updateTeamSchema = z.object({
  me: z.string().min(2).optional(),
  go: z.string().optional().nullable(),
  imaryColor: z

    .string()

    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .optional()
    .nullable(),
  secondaryColor: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .optional()
    .nullable(),
})
