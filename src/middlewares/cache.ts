import type { Request, Response, NextFunction } from 'express'
import { cache } from '../lib/cache'

export function cacheMiddleware(ttlSeconds = 60) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (req.method !== 'GET') {
            return next()
        }

        const { teamId } = req.auth || {}
        if (!teamId) {
            return next()
        }

        // Generate cache key based on path, teamId and query params
        const queryStr = JSON.stringify(req.query)
        const cacheKey = `cache:${teamId}:${req.baseUrl}${req.path}:${queryStr}`

        const cachedBody = cache.get(cacheKey)
        if (cachedBody) {
            return res.json(cachedBody)
        }

        // Override res.json to capture the response and cache it
        const originalJson = res.json
        res.json = function (body: any) {
            cache.set(cacheKey, body, ttlSeconds)
            return originalJson.call(this, body)
        }

        next()
    }
}

export function invalidateCache(teamId: string) {
    cache.delStartWith(`cache:${teamId}:`)
    // Also invalidate dashboard cache specifically if it uses a different prefix
    cache.delStartWith(`dashboard:${teamId}:`)
}
