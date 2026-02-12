import { Router } from 'express'
import { authMiddleware } from './middlewares/auth'
import { adminMiddleware } from './middlewares/rbac'
import { register, login, googleLogin } from './modules/auth/auth.controller'
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
import {
  createJoinRequest,
  listTeamRequests,
  respondToRequest,
  searchTeams,
  listTeamMembers,
  updateMemberRole,
  removeMember,
} from './modules/teams/requests.controller'

export const routes = Router()

routes.use('/dashboard', authMiddleware, dashboardRoutes)

// Teams
routes.get('/teams/active', authMiddleware, getTeam)
routes.patch('/teams/active', authMiddleware, adminMiddleware, updateTeam)

routes.get('/teams/search', authMiddleware, searchTeams)
routes.post('/teams/join', authMiddleware, createJoinRequest)
routes.get('/teams/active/requests', authMiddleware, listTeamRequests)
routes.post('/teams/active/requests/respond', authMiddleware, adminMiddleware, respondToRequest)
routes.get('/teams/active/members', authMiddleware, listTeamMembers)
routes.patch('/teams/active/members/:userId', authMiddleware, adminMiddleware, updateMemberRole)
routes.delete('/teams/active/members/:userId', authMiddleware, adminMiddleware, removeMember)

routes.get('/health', (req, res) => {
  return res.json({ ok: true })
})

routes.get('/debug-sentry', (req, res) => {
  throw new Error('Sentry Debug Error - Fut-Team API')
})

routes.get('/debug-log', (req, res) => {
  const { logger } = require('./lib/logger')
  logger.info({ test: true, timestamp: new Date() }, 'Better Stack Debug Log')
  return res.json({ message: 'Log enviado para o Better Stack!' })
})

routes.post('/auth/register', register)
routes.post('/auth/login', login)
routes.post('/auth/google', googleLogin)

routes.get('/me', authMiddleware, async (req, res) => {
  return res.json({ auth: req.auth })
})

// Players
routes.get('/players', authMiddleware, listPlayers)
routes.get('/players/:id/stats', authMiddleware, getPlayerStats)
routes.post('/players', authMiddleware, adminMiddleware, createPlayer)
routes.patch('/players/:id', authMiddleware, adminMiddleware, updatePlayer)
routes.delete('/players/:id', authMiddleware, adminMiddleware, deletePlayer)

// Matches
routes.get('/matches', authMiddleware, listMatches)
routes.get('/matches/:id', authMiddleware, getMatchById)
routes.post('/matches', authMiddleware, adminMiddleware, createMatch)
routes.patch('/matches/:id', authMiddleware, adminMiddleware, updateMatch)
routes.delete('/matches/:id', authMiddleware, adminMiddleware, deleteMatch)

// Presences
routes.get('/matches/:id/presences', authMiddleware, listMatchPresences)
routes.post('/matches/:id/presences', authMiddleware, adminMiddleware, upsertMatchPresences)

// Goals
routes.get('/matches/:id/goals', authMiddleware, listMatchGoals)
routes.post('/matches/:id/goals', authMiddleware, adminMiddleware, createMatchGoal)
routes.delete('/goals/:id', authMiddleware, adminMiddleware, deleteGoal)

// Seasons
routes.get('/seasons', authMiddleware, listSeasons)
routes.get('/seasons/active', authMiddleware, getActiveSeason)
routes.post('/seasons', authMiddleware, adminMiddleware, createSeason)
routes.patch('/seasons/:id', authMiddleware, adminMiddleware, updateSeason)
routes.post('/seasons/:id/activate', authMiddleware, adminMiddleware, activateSeason)
routes.delete('/seasons/:id', authMiddleware, adminMiddleware, deleteSeason)

// Season Players
routes.get('/seasons/:id/players', authMiddleware, listSeasonPlayers)
routes.post('/seasons/:id/players', authMiddleware, adminMiddleware, addSeasonPlayer)
routes.put('/seasons/:id/players', authMiddleware, adminMiddleware, replaceSeasonPlayers)
routes.delete('/seasons/:id/players/:playerId', authMiddleware, adminMiddleware, removeSeasonPlayer)
