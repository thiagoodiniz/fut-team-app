import { Router } from 'express'
import { getDashboardStats } from './dashboard.controller'

export const dashboardRoutes = Router()

dashboardRoutes.get('/', getDashboardStats)
