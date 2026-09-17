import type { Request, Response, NextFunction } from 'express'
import { cache } from '../lib/cache'

// ─── Team-scoped cache (authenticated routes) ────────────────────────────────
// Key: cache:{teamId}:{baseUrl}{path}:{queryStr}
// Invalidated by: invalidateCache(teamId)
export function cacheMiddleware(ttlSeconds = 3600) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next()

    const teamId = req.auth?.teamId
    if (!teamId) return next()

    const queryStr = JSON.stringify(req.query)
    const cacheKey = `cache:${teamId}:${req.baseUrl}${req.path}:${queryStr}`

    const cached = cache.get(cacheKey)
    if (cached) return res.json(cached)

    const originalJson = res.json
    res.json = function (body: unknown) {
      cache.set(cacheKey, body, ttlSeconds)
      return originalJson.call(this, body)
    }

    next()
  }
}

// ─── Team logo cache (unauthenticated route: /teams/:id/logo) ─────────────────
// Key: logo:{teamId}
// Invalidated by: invalidateCache(teamId)  ← handles logo too
export function logoCacheMiddleware(ttlSeconds = 3600) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next()

    const teamId = req.params.id
    if (!teamId) return next()

    const cacheKey = `logo:${teamId}`

    const cached = cache.get(cacheKey)
    if (cached) return res.json(cached)

    const originalJson = res.json
    res.json = function (body: unknown) {
      cache.set(cacheKey, body, ttlSeconds)
      return originalJson.call(this, body)
    }

    next()
  }
}

// ─── Player photo cache (unauthenticated route: /players/:id/photo) ───────────
// Key: photo:{playerId}
// Invalidated by: invalidatePlayerPhoto(playerId)
export function photoCacheMiddleware(ttlSeconds = 3600) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next()

    const playerId = req.params.id
    if (!playerId) return next()

    const cacheKey = `photo:${playerId}`

    const cached = cache.get(cacheKey)
    if (cached) return res.json(cached)

    const originalJson = res.json
    res.json = function (body: unknown) {
      cache.set(cacheKey, body, ttlSeconds)
      return originalJson.call(this, body)
    }

    next()
  }
}

// ─── Invalidation helpers ──────────────────────────────────────────────────────

/**
 * Invalidates all cached data scoped to a team:
 * team info, seasons, matches, players, dashboard, presences, goals + team logo.
 */
export function invalidateCache(teamId: string) {
  cache.delStartWith(`cache:${teamId}:`)
  cache.del(`logo:${teamId}`)
}

/**
 * Invalidates the cached photo for a specific player.
 * Must be called whenever a player's photo is updated.
 */
export function invalidatePlayerPhoto(playerId: string) {
  cache.del(`photo:${playerId}`)
}

