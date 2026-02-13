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
import { swaggerUi, swaggerSpec } from './lib/swagger'

export const app = express()

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

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

const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || []
app.use(
    cors({
        origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
            // Allow requests with no origin (like mobile apps or curl)
            if (!origin) return callback(null, true)

            if (
                process.env.NODE_ENV === 'development' ||
                allowedOrigins.indexOf(origin) !== -1 ||
                allowedOrigins.includes('*')
            ) {
                callback(null, true)
            } else {
                callback(new Error('Not allowed by CORS'))
            }
        },
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
        credentials: true,
    })
)

app.use(express.json())

if (process.env.SENTRY_DSN) {
    // Sentry request handler must be first
    Sentry.setupExpressErrorHandler(app)
}

app.use(requestId)

app.use(requestLogger)

app.use(routes)

app.use(errorMiddleware)
