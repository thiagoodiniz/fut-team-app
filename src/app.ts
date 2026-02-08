import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { routes } from './routes'
import { requestLogger } from './middlewares/requestLogger'
import { requestId } from './middlewares/requestId'
import { errorMiddleware } from './middlewares/error'

export const app = express()

app.use(helmet())
app.use(cors())
app.use(express.json())

app.use(requestId)

app.use(requestLogger)

app.use(routes)

app.use(errorMiddleware)
