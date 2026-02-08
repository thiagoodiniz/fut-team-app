import type { Request, Response, NextFunction } from "express"
import { logger } from "../lib/logger"

function sanitizeBody(body: any) {
  if (!body || typeof body !== "object") return body

  const copy = { ...body }

  if ("password" in copy) copy.password = "[REDACTED]"
  if ("token" in copy) copy.token = "[REDACTED]"
  if ("accessToken" in copy) copy.accessToken = "[REDACTED]"
  if ("refreshToken" in copy) copy.refreshToken = "[REDACTED]"

  return copy
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()

  res.on("finish", () => {
    const durationMs = Date.now() - start

    const isProd = process.env.NODE_ENV === "production"
    const shouldLogBody =
      !isProd && ["POST", "PUT", "PATCH"].includes(req.method)

    logger.info(
      {
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs,

        auth: req.auth
          ? {
              userId: req.auth.userId,
              teamId: req.auth.teamId
            }
          : undefined,

        params: Object.keys(req.params ?? {}).length ? req.params : undefined,
        query: Object.keys(req.query ?? {}).length ? req.query : undefined,
        body: shouldLogBody ? sanitizeBody(req.body) : undefined
      },
      "HTTP request"
    )
  })

  next()
}
