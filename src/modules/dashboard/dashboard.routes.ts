import { Router } from 'express'
import {
  getDashboardStats,
  getDashboardSummary,
  getDashboardLastMatches,
  getDashboardTopScorers,
  getDashboardAttendance,
} from './dashboard.controller'

export const dashboardRoutes = Router()

dashboardRoutes.get('/', getDashboardStats)
dashboardRoutes.get('/summary', getDashboardSummary)
dashboardRoutes.get('/last-matches', getDashboardLastMatches)
dashboardRoutes.get('/top-scorers', getDashboardTopScorers)
dashboardRoutes.get('/attendance', getDashboardAttendance)
