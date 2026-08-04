import type { Request, Response } from 'express'
import { prisma } from '../../lib/prisma'
import { cache } from '../../lib/cache'
import { Prisma } from '@prisma/client'

type MatchWithStats = Prisma.MatchGetPayload<{
  include: {
    goals: {
      include: { player: { select: { id: true; name: true; nickname: true } } }
    }
    _count: {
      select: { presences: true }
    }
  }
}>

export async function getTeamStats(req: Request, res: Response) {
  const { teamId } = req.auth!

  const cacheKey = `teamStats:${teamId}`
  const cachedData = cache.get(cacheKey)

  if (cachedData) {
    return res.json(cachedData)
  }

  // 1. Fetch ALL matches for the team
  const matches: MatchWithStats[] = await prisma.match.findMany({
    where: { teamId },
    orderBy: { date: 'desc' },
    include: {
      goals: {
        orderBy: { createdAt: 'asc' },
        include: { player: { select: { id: true, name: true, nickname: true } } },
      },
      _count: {
        select: { presences: { where: { present: true } } }, // Count only PRESENT players
      },
    },
  })

  // Filter matches that effectively happened (have at least one present player)
  const playedMatches = matches.filter((m) => m._count.presences > 0)

  // Fetch all seasons for the team to determine minYear and maxYear
  const teamSeasons = await prisma.season.findMany({
    where: { teamId },
    select: { year: true },
  })

  let minYear = new Date().getFullYear()
  let maxYear = minYear

  if (teamSeasons.length > 0) {
    const years = teamSeasons.map((s) => s.year)
    minYear = Math.min(...years)
    maxYear = Math.max(...years)
  }

  // 3. Calculate Summary
  let wins = 0
  let draws = 0
  let losses = 0
  let goalsFor = 0
  let goalsAgainst = 0

  for (const m of playedMatches) {
    goalsFor += m.ourScore
    goalsAgainst += m.theirScore

    if (m.ourScore > m.theirScore) wins++
    else if (m.ourScore < m.theirScore) losses++
    else draws++
  }

  const totalMatches = playedMatches.length
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0
  const goalDiff = goalsFor - goalsAgainst

  // Base Summary
  const summary = {
    totalMatches,
    wins,
    draws,
    losses,
    goalsScored: goalsFor,
    goalsAgainst,
    goalDiff,
    winRate,
    minYear,
    maxYear,
  }

  if (totalMatches === 0) {
    const emptyResult = {
      summary,
      topScorers: [],
      topAttendance: [],
      topOpponents: [],
      topScoringOpponents: [],
      topConcedingOpponents: [],
    }
    return res.json(emptyResult)
  }

  const matchIds = playedMatches.map((m) => m.id)

  // Fetch all presences to calculate top attendance
  const allPresences = await prisma.presence.findMany({
    where: { matchId: { in: matchIds }, present: true },
    include: { player: { select: { id: true, name: true, nickname: true } } },
  })

  // Calculate Top Scorers (only from played matches to be safe)
  const allGoals = await prisma.goal.findMany({
    where: { matchId: { in: matchIds } },
    include: { player: { select: { id: true, name: true, nickname: true } } },
  })

  const scorersMap = new Map<string, any>()

  // Real players
  for (const g of allGoals) {
    if (g.ownGoal) continue
    if (g.playerId) {
      if (!scorersMap.has(g.playerId)) {
        scorersMap.set(g.playerId, {
          id: g.playerId,
          name: g.player?.name,
          nickname: g.player?.nickname,
          goals: 0,
        })
      }
      scorersMap.get(g.playerId).goals++
    } else if (g.loanedPlayerName) {
      const name = g.loanedPlayerName
      if (!scorersMap.has(`loaned:${name}`)) {
        scorersMap.set(`loaned:${name}`, {
          id: `loaned:${name}`,
          name: name,
          nickname: name,
          goals: 0,
        })
      }
      scorersMap.get(`loaned:${name}`).goals++
    }
  }

  const topScorers = Array.from(scorersMap.values())
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 5)

  // Calculate Top Attendance
  const attendanceMap = new Map<string, any>()
  for (const p of allPresences) {
    if (!attendanceMap.has(p.playerId)) {
      attendanceMap.set(p.playerId, {
        id: p.playerId,
        name: p.player?.name,
        nickname: p.player?.nickname,
        matches: 0,
      })
    }
    attendanceMap.get(p.playerId).matches++
  }

  for (const m of playedMatches) {
    for (const name of m.loanedPlayers) {
      if (!attendanceMap.has(`loaned:${name}`)) {
        attendanceMap.set(`loaned:${name}`, {
          id: `loaned:${name}`,
          name: name,
          nickname: name,
          matches: 0,
        })
      }
      attendanceMap.get(`loaned:${name}`).matches++
    }
  }

  const topAttendance = Array.from(attendanceMap.values())
    .sort((a, b) => b.matches - a.matches)
    .slice(0, 5)

  // Calculate Opponents stats
  const opponentMap = new Map<string, any>()

  for (const m of playedMatches) {
    const opp = m.opponent || 'Desconhecido'
    if (!opponentMap.has(opp)) {
      opponentMap.set(opp, {
        opponent: opp,
        matches: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsScored: 0,
        goalsAgainst: 0,
      })
    }
    const stats = opponentMap.get(opp)
    stats.matches++
    stats.goalsScored += m.ourScore
    stats.goalsAgainst += m.theirScore
    if (m.ourScore > m.theirScore) stats.wins++
    else if (m.ourScore < m.theirScore) stats.losses++
    else stats.draws++
  }

  const opponents = Array.from(opponentMap.values())

  const topOpponents = [...opponents].sort((a, b) => b.matches - a.matches).slice(0, 5)

  const topScoringOpponents = [...opponents]
    .sort((a, b) => b.goalsScored - a.goalsScored)
    .slice(0, 5)
    .map((o) => ({ opponent: o.opponent, goalsScored: o.goalsScored }))

  const topConcedingOpponents = [...opponents]
    .sort((a, b) => b.goalsAgainst - a.goalsAgainst)
    .slice(0, 5)
    .map((o) => ({ opponent: o.opponent, goalsAgainst: o.goalsAgainst }))

  const result = {
    summary,
    topScorers,
    topAttendance,
    topOpponents,
    topScoringOpponents,
    topConcedingOpponents,
  }

  cache.set(cacheKey, result)

  return res.json(result)
}
