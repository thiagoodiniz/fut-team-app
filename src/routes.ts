import { Router } from 'express'
import { authMiddleware } from './middlewares/auth'
import { devLogin } from './modules/auth/auth.controller'
import {
  createPlayer,
  deletePlayer,
  listPlayers,
  updatePlayer,
} from './modules/players/players.controller'

import {
  createMatch,
  deleteMatch,
  getMatchById,
  listMatches,
  updateMatch,
} from './modules/matches/matches.controller'

import { listMatchPresences, upsertMatchPresences } from './modules/presences/presences.controller'

import { createMatchGoal, deleteGoal, listMatchGoals } from './modules/goals/goals.controller'

export const routes = Router()

routes.get('/health', (req, res) => {
  return res.json({ ok: true })
})

routes.post('/auth/dev-login', devLogin)

routes.get('/me', authMiddleware, async (req, res) => {
  return res.json({ auth: req.auth })
})

// Players
routes.get('/players', authMiddleware, listPlayers)
routes.post('/players', authMiddleware, createPlayer)
routes.patch('/players/:id', authMiddleware, updatePlayer)
routes.delete('/players/:id', authMiddleware, deletePlayer)

// Matches
routes.get('/matches', authMiddleware, listMatches)
routes.get('/matches/:id', authMiddleware, getMatchById)
routes.post('/matches', authMiddleware, createMatch)
routes.patch('/matches/:id', authMiddleware, updateMatch)
routes.delete('/matches/:id', authMiddleware, deleteMatch)

// Presences
routes.get('/matches/:id/presences', authMiddleware, listMatchPresences)
routes.post('/matches/:id/presences', authMiddleware, upsertMatchPresences)

// Goals
routes.get('/matches/:id/goals', authMiddleware, listMatchGoals)
routes.post('/matches/:id/goals', authMiddleware, createMatchGoal)
routes.delete('/goals/:id', authMiddleware, deleteGoal)
