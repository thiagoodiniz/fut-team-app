import { z } from 'zod'

export const addSeasonPlayerSchema = z.object({
  playerId: z.string().uuid(),
})

export const replaceSeasonPlayersSchema = z.object({
  playerIds: z.array(z.string().uuid()).min(0),
})
