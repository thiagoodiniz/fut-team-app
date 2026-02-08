import { z } from 'zod'

export const upsertPresencesSchema = z.object({
  presences: z
    .array(
      z.object({
        playerId: z.string().uuid(),
        present: z.boolean(),
      }),
    )
    .min(1),
})
