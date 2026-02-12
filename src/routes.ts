import { Router } from 'express'
import { authMiddleware } from './middlewares/auth'
import { devLogin } from './modules/auth/auth.controller'
import {
  createPlayer,
  deletePlayer,
  getPlayerStats,
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

import {
  activateSeason,
  createSeason,
  deleteSeason,
  getActiveSeason,
  listSeasons,
  updateSeason,
} from './modules/seasons/seasons.controllers'

import {
  addSeasonPlayer,
  listSeasonPlayers,
  removeSeasonPlayer,
  replaceSeasonPlayers,
} from './modules/seasonPlayers/seasonPlayers.controllers'

import { dashboardRoutes } from './modules/dashboard/dashboard.routes'
import { getTeam, updateTeam } from './modules/teams/teams.controller'

export const routes = Router()

routes.use('/dashboard', authMiddleware, dashboardRoutes)

// Teams
routes.get('/teams/active', authMiddleware, getTeam)
routes.patch('/teams/active', authMiddleware, updateTeam)

routes.get('/health', (req, res) => {
  return res.json({ ok: true })
})

routes.post('/auth/dev-login', devLogin)

routes.get('/me', authMiddleware, async (req, res) => {
  return res.json({ auth: req.auth })
})

// Players
routes.get('/players', authMiddleware, listPlayers)
routes.get('/players/:id/stats', authMiddleware, getPlayerStats)
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

// Seasons
routes.get('/seasons', authMiddleware, listSeasons)
routes.get('/seasons/active', authMiddleware, getActiveSeason)
routes.post('/seasons', authMiddleware, createSeason)
routes.patch('/seasons/:id', authMiddleware, updateSeason)
routes.post('/seasons/:id/activate', authMiddleware, activateSeason)
routes.delete('/seasons/:id', authMiddleware, deleteSeason)

// Season Players
routes.get('/seasons/:id/players', authMiddleware, listSeasonPlayers)
routes.post('/seasons/:id/players', authMiddleware, addSeasonPlayer)
routes.put('/seasons/:id/players', authMiddleware, replaceSeasonPlayers)
routes.delete('/seasons/:id/players/:playerId', authMiddleware, removeSeasonPlayer)
