import 'dotenv/config'
import * as Sentry from '@sentry/node'
import { nodeProfilingIntegration } from '@sentry/profiling-node'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { routes } from './routes'
import { requestLogger } from './middlewares/requestLogger'
import { requestId } from './middlewares/requestId'
import { errorMiddleware } from './middlewares/error'

export const app = express()

if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        integrations: [
            nodeProfilingIntegration(),
        ],
        tracesSampleRate: 1.0,
        profilesSampleRate: 1.0,
    })
}

app.use(helmet())
app.use(cors())
app.use(express.json())

if (process.env.SENTRY_DSN) {
    // Sentry request handler must be first
    Sentry.setupExpressErrorHandler(app)
}

app.use(requestId)

app.use(requestLogger)

app.use(routes)

app.use(errorMiddleware)
