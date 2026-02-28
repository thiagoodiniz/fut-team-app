import type { NextFunction, Request, Response } from 'express'

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
    const { role, isManager } = req.auth ?? {}

    if (isManager || role === 'ADMIN') {
        return next()
    }

    return res.status(403).json({ error: 'FORBIDDEN_ONLY_ADMINS_CAN_MUTATE' })
}

export function managerMiddleware(req: Request, res: Response, next: NextFunction) {
    if (req.auth?.isManager) {
        return next()
    }

    return res.status(403).json({ error: 'FORBIDDEN_ONLY_MANAGERS' })
}
