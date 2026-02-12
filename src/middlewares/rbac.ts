import type { NextFunction, Request, Response } from 'express'

export function adminMiddleware(req: Request, res: Response, next: NextFunction) {
    const role = req.auth?.role

    if (role !== 'OWNER' && role !== 'ADMIN') {
        return res.status(403).json({ error: 'FORBIDDEN_ONLY_ADMINS_CAN_MUTATE' })
    }

    return next()
}
