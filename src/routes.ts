import { Router } from 'express'
import { authMiddleware } from './middlewares/auth'
import { adminMiddleware } from './middlewares/rbac'
import { cacheMiddleware } from './middlewares/cache'
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

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Authentication and Registration
 *   - name: Teams
 *     description: Team management and members
 *   - name: Players
 *     description: Player management and statistics
 *   - name: Matches
 *     description: Match discovery and management
 *   - name: Seasons
 *     description: Season management and active status
 *   - name: Dashboard
 *     description: Team statistics and overview
 */

export const routes = Router()

/**
 * @swagger
 * /dashboard:
 *   get:
 *     summary: Get team dashboard statistics
 *     tags: [Dashboard]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: seasonId
 *         schema: { type: string }
 *     responses:
 *       200: { description: Dashboard statistics }
 */
routes.use('/dashboard', authMiddleware, cacheMiddleware(300), dashboardRoutes)

// Teams
/**
 * @swagger
 * /teams/active:
 *   get:
 *     summary: Get details of the current team
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Team details }
 */
routes.get('/teams/active', authMiddleware, cacheMiddleware(600), getTeam)

/**
 * @swagger
 * /teams/active:
 *   patch:
 *     summary: Update team details (Admin only)
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               logo: { type: string }
 *     responses:
 *       200: { description: Team updated }
 */
routes.patch('/teams/active', authMiddleware, adminMiddleware, updateTeam)

/**
 * @swagger
 * /teams/search:
 *   get:
 *     summary: Search for teams
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Search results }
 */
routes.get('/teams/search', authMiddleware, searchTeams)

/**
 * @swagger
 * /teams/join:
 *   post:
 *     summary: Create a request to join a team
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [teamId]
 *             properties:
 *               teamId: { type: string }
 *     responses:
 *       201: { description: Join request created }
 */
routes.post('/teams/join', authMiddleware, createJoinRequest)

/**
 * @swagger
 * /teams/active/requests:
 *   get:
 *     summary: List pending join requests for the active team (Admin only)
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of join requests }
 */
routes.get('/teams/active/requests', authMiddleware, cacheMiddleware(60), listTeamRequests)

/**
 * @swagger
 * /teams/active/requests/respond:
 *   post:
 *     summary: Accept or reject a join request (Admin only)
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [requestId, action]
 *             properties:
 *               requestId: { type: string }
 *               action: { type: string, enum: [ACCEPT, REJECT] }
 *     responses:
 *       200: { description: Request processed }
 */
routes.post('/teams/active/requests/respond', authMiddleware, adminMiddleware, respondToRequest)

/**
 * @swagger
 * /teams/active/members:
 *   get:
 *     summary: List all members of the active team
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of team members }
 */
routes.get('/teams/active/members', authMiddleware, cacheMiddleware(300), listTeamMembers)

/**
 * @swagger
 * /teams/active/members/{userId}:
 *   patch:
 *     summary: Update a member's role (Admin only)
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [OWNER, ADMIN, MEMBER] }
 *     responses:
 *       200: { description: Role updated }
 */
routes.patch('/teams/active/members/:userId', authMiddleware, adminMiddleware, updateMemberRole)

/**
 * @swagger
 * /teams/active/members/{userId}:
 *   delete:
 *     summary: Remove a member from the team (Admin only)
 *     tags: [Teams]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Member removed }
 */
routes.delete('/teams/active/members/:userId', authMiddleware, adminMiddleware, removeMember)

routes.get('/health', (req, res) => {
  return res.json({ ok: true })
})

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       201: { description: User created }
 */
routes.post('/auth/register', register)

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200: { description: Successfully logged in }
 */
routes.post('/auth/login', login)

/**
 * @swagger
 * /auth/google:
 *   post:
 *     summary: Login with Google OAuth
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken: { type: string }
 *     responses:
 *       200: { description: Successfully logged in }
 */
routes.post('/auth/google', googleLogin)

routes.get('/me', authMiddleware, async (req, res) => {
  return res.json({ auth: req.auth })
})

// Players
/**
 * @swagger
 * /players:
 *   get:
 *     summary: List all players
 *     tags: [Players]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: seasonId
 *         schema: { type: string }
 *         description: Filter players by season
 *     responses:
 *       200: { description: List of players }
 */
routes.get('/players', authMiddleware, cacheMiddleware(300), listPlayers)

/**
 * @swagger
 * /players/{id}/stats:
 *   get:
 *     summary: Get statistics for a specific player
 *     tags: [Players]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Player statistics }
 */
routes.get('/players/:id/stats', authMiddleware, cacheMiddleware(300), getPlayerStats)

/**
 * @swagger
 * /players:
 *   post:
 *     summary: Create a new player (Admin only)
 *     tags: [Players]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               nickname: { type: string }
 *               photo: { type: string }
 *     responses:
 *       201: { description: Player created }
 */
routes.post('/players', authMiddleware, adminMiddleware, createPlayer)

/**
 * @swagger
 * /players/{id}:
 *   patch:
 *     summary: Update player details (Admin only)
 *     tags: [Players]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               nickname: { type: string }
 *               photo: { type: string }
 *     responses:
 *       200: { description: Player updated }
 */
routes.patch('/players/:id', authMiddleware, adminMiddleware, updatePlayer)

/**
 * @swagger
 * /players/{id}:
 *   delete:
 *     summary: Delete a player (Admin only)
 *     tags: [Players]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Player deleted }
 */
routes.delete('/players/:id', authMiddleware, adminMiddleware, deletePlayer)

// Matches
/**
 * @swagger
 * /matches:
 *   get:
 *     summary: List matches for the team
 *     tags: [Matches]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: seasonId
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of matches }
 */
routes.get('/matches', authMiddleware, cacheMiddleware(300), listMatches)

/**
 * @swagger
 * /matches/{id}:
 *   get:
 *     summary: Get details of a specific match
 *     tags: [Matches]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Match details }
 */
routes.get('/matches/:id', authMiddleware, cacheMiddleware(300), getMatchById)

/**
 * @swagger
 * /matches:
 *   post:
 *     summary: Create a new match (Admin only)
 *     tags: [Matches]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [date, opponent, location]
 *             properties:
 *               date: { type: string, format: date-time }
 *               opponent: { type: string }
 *               location: { type: string }
 *     responses:
 *       201: { description: Match created }
 */
routes.post('/matches', authMiddleware, adminMiddleware, createMatch)

/**
 * @swagger
 * /matches/{id}:
 *   patch:
 *     summary: Update match details (Admin only)
 *     tags: [Matches]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Match updated }
 */
routes.patch('/matches/:id', authMiddleware, adminMiddleware, updateMatch)

/**
 * @swagger
 * /matches/{id}:
 *   delete:
 *     summary: Delete a match (Admin only)
 *     tags: [Matches]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Match deleted }
 */
routes.delete('/matches/:id', authMiddleware, adminMiddleware, deleteMatch)

// Presences
/**
 * @swagger
 * /matches/{id}/presences:
 *   get:
 *     summary: List presences for a specific match
 *     tags: [Matches]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of presences }
 */
routes.get('/matches/:id/presences', authMiddleware, cacheMiddleware(60), listMatchPresences)

/**
 * @swagger
 * /matches/{id}/presences:
 *   post:
 *     summary: Update/Upsert presences for a match (Admin only)
 *     tags: [Matches]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               presences:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     playerId: { type: string }
 *                     present: { type: boolean }
 *     responses:
 *       200: { description: Presences updated }
 */
routes.post('/matches/:id/presences', authMiddleware, adminMiddleware, upsertMatchPresences)

// Goals
/**
 * @swagger
 * /matches/{id}/goals:
 *   get:
 *     summary: List goals for a specific match
 *     tags: [Matches]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of goals }
 */
routes.get('/matches/:id/goals', authMiddleware, cacheMiddleware(60), listMatchGoals)

/**
 * @swagger
 * /matches/{id}/goals:
 *   post:
 *     summary: Record goals for a match (Admin only)
 *     tags: [Matches]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               playerId: { type: string }
 *               goals:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     minute: { type: integer }
 *                     ownGoal: { type: boolean }
 *     responses:
 *       201: { description: Goals recorded }
 */
routes.post('/matches/:id/goals', authMiddleware, adminMiddleware, createMatchGoal)

/**
 * @swagger
 * /goals/{id}:
 *   delete:
 *     summary: Delete a specific goal (Admin only)
 *     tags: [Matches]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Goal deleted }
 */
routes.delete('/goals/:id', authMiddleware, adminMiddleware, deleteGoal)

// Seasons
/**
 * @swagger
 * /seasons:
 *   get:
 *     summary: List all seasons for the team
 *     tags: [Seasons]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: List of seasons }
 */
routes.get('/seasons', authMiddleware, cacheMiddleware(600), listSeasons)

/**
 * @swagger
 * /seasons/active:
 *   get:
 *     summary: Get details of the currently active season
 *     tags: [Seasons]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Active season details }
 */
routes.get('/seasons/active', authMiddleware, cacheMiddleware(600), getActiveSeason)

/**
 * @swagger
 * /seasons:
 *   post:
 *     summary: Create a new season (Admin only)
 *     tags: [Seasons]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [year, name]
 *             properties:
 *               year: { type: integer }
 *               name: { type: string }
 *               isActive: { type: boolean }
 *     responses:
 *       201: { description: Season created }
 */
routes.post('/seasons', authMiddleware, adminMiddleware, createSeason)

/**
 * @swagger
 * /seasons/{id}:
 *   patch:
 *     summary: Update season details (Admin only)
 *     tags: [Seasons]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Season updated }
 */
routes.patch('/seasons/:id', authMiddleware, adminMiddleware, updateSeason)

/**
 * @swagger
 * /seasons/{id}/activate:
 *   post:
 *     summary: Set a season as active (Admin only)
 *     tags: [Seasons]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Season activated }
 */
routes.post('/seasons/:id/activate', authMiddleware, adminMiddleware, activateSeason)

/**
 * @swagger
 * /seasons/{id}:
 *   delete:
 *     summary: Delete a season (Admin only)
 *     tags: [Seasons]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Season deleted }
 */
routes.delete('/seasons/:id', authMiddleware, adminMiddleware, deleteSeason)

// Season Players
/**
 * @swagger
 * /seasons/{id}/players:
 *   get:
 *     summary: List players in a specific season
 *     tags: [Seasons]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of season players }
 */
routes.get('/seasons/:id/players', authMiddleware, cacheMiddleware(300), listSeasonPlayers)

/**
 * @swagger
 * /seasons/{id}/players:
 *   post:
 *     summary: Add a player to a season (Admin only)
 *     tags: [Seasons]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerId]
 *             properties:
 *               playerId: { type: string }
 *     responses:
 *       201: { description: Player added to season }
 */
routes.post('/seasons/:id/players', authMiddleware, adminMiddleware, addSeasonPlayer)

/**
 * @swagger
 * /seasons/{id}/players:
 *   put:
 *     summary: Replace all players in a season (Admin only)
 *     tags: [Seasons]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [playerIds]
 *             properties:
 *               playerIds:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200: { description: Players replaced }
 */
routes.put('/seasons/:id/players', authMiddleware, adminMiddleware, replaceSeasonPlayers)

/**
 * @swagger
 * /seasons/{id}/players/{playerId}:
 *   delete:
 *     summary: Remove a player from a season (Admin only)
 *     tags: [Seasons]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: playerId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: Player removed from season }
 */
routes.delete('/seasons/:id/players/:playerId', authMiddleware, adminMiddleware, removeSeasonPlayer)
