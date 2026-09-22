import type { Request, Response } from 'express'
import { prisma } from '../../lib/prisma'
import { Prisma } from '@prisma/client'

// Legacy full dashboard (kept for backward compatibility if needed)
export { getDashboardStats } from './dashboard.legacy'

async function resolveSeasonId(teamId: string | undefined, querySeasonId?: string) {
  if (querySeasonId) return querySeasonId

  if (!teamId) return undefined

  const activeSeason = await prisma.season.findFirst({
    where: { teamId, isActive: true },
  })
  return activeSeason?.id
}

export async function getDashboardSummary(req: Request, res: Response) {
  const { teamId } = req.auth!
  const seasonId = await resolveSeasonId(teamId, req.query.seasonId as string)

  if (!seasonId) {
    return res.json({
      summary: {
        totalGames: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        winRate: 0,
      },
      nextMatch: null,
    })
  }

  // 1. Fetch ALL matches for the season to process stats
  // For summary, we only need basic counts, but we must filter by those with presences > 0
  const matches = await prisma.match.findMany({
    where: { teamId, seasonId },
    select: {
      ourScore: true,
      theirScore: true,
      _count: {
        select: { presences: { where: { present: true } } },
      },
    },
  })

  const playedMatches = matches.filter((m) => m._count.presences > 0)

  // 2. Fetch Next Match
  const nextMatch = await prisma.match.findFirst({
    where: {
      teamId,
      seasonId,
      date: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
      presences: {
        none: {
          present: true,
        },
      },
    },
    orderBy: { date: 'asc' },
    select: {
      id: true,
      date: true,
      location: true,
      opponent: true,
      competition: true,
      competitionPhase: true,
    }
  })

  // 3. Calculate Summary — only count matches that have a defined score
  let wins = 0
  let draws = 0
  let losses = 0
  let goalsFor = 0
  let goalsAgainst = 0

  for (const m of playedMatches) {
    if (m.ourScore === null || m.theirScore === null) continue
    goalsFor += m.ourScore
    goalsAgainst += m.theirScore

    if (m.ourScore > m.theirScore) wins++
    else if (m.ourScore < m.theirScore) losses++
    else draws++
  }

  const totalGames = playedMatches.filter(
    (m) => m.ourScore !== null && m.theirScore !== null
  ).length
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0

  return res.json({
    summary: { totalGames, wins, draws, losses, goalsFor, goalsAgainst, winRate },
    nextMatch,
  })
}

export async function getDashboardLastMatches(req: Request, res: Response) {
  const { teamId } = req.auth!
  const seasonId = await resolveSeasonId(teamId, req.query.seasonId as string)

  if (!seasonId) {
    return res.json({ lastMatches: [] })
  }

  // Find matches with presences > 0. Since Prisma can't easily filter by _count > 0 in where (unless we use groupBy or raw),
  // we do a quick fetch of ids
  const allMatches = await prisma.match.findMany({
    where: { teamId, seasonId },
    orderBy: { date: 'desc' },
    select: {
      id: true,
      _count: { select: { presences: { where: { present: true } } } }
    }
  })

  const playedMatchIds = allMatches.filter((m) => m._count.presences > 0).map((m) => m.id).slice(0, 5)

  if (playedMatchIds.length === 0) {
    return res.json({ lastMatches: [] })
  }

  const matches = await prisma.match.findMany({
    where: { id: { in: playedMatchIds } },
    orderBy: { date: 'desc' },
    include: {
      goals: {
        orderBy: { createdAt: 'asc' },
        include: { 
          player: { select: { id: true, name: true, nickname: true } },
          assistant: { select: { id: true, name: true, nickname: true } }
        },
      },
    },
  })

  const lastMatchesList = matches.map((m) => ({
    id: m.id,
    date: m.date,
    location: m.location,
    opponent: m.opponent ?? 'Sem adversário',
    competition: m.competition,
    competitionPhase: m.competitionPhase,
    ourScore: m.ourScore,
    theirScore: m.theirScore,
    result: m.ourScore !== null && m.theirScore !== null
      ? (m.ourScore > m.theirScore ? 'WIN' : m.ourScore < m.theirScore ? 'LOSS' : 'DRAW')
      : 'UPCOMING',
    scorers: m.goals
      .map((g) => {
        if (g.ownGoal) return 'Gol contra'
        if (!g.player && !g.loanedPlayerName) return null

        const scorerName = g.player
          ? g.player!.nickname || g.player!.name
          : g.loanedPlayerName!
        const assistantName = g.assistant
          ? g.assistant!.nickname || g.assistant!.name
          : g.loanedAssistantName
        return assistantName ? `${scorerName} (👟 ${assistantName})` : scorerName
      })
      .filter(Boolean),
  }))

  return res.json({ lastMatches: lastMatchesList })
}

export async function getDashboardTopScorers(req: Request, res: Response) {
  const { teamId } = req.auth!
  const seasonId = await resolveSeasonId(teamId, req.query.seasonId as string)

  if (!seasonId) {
    return res.json({ topScorers: [] })
  }

  const matches = await prisma.match.findMany({
    where: { teamId, seasonId },
    orderBy: { date: 'desc' },
    select: {
      id: true,
      date: true,
      opponent: true,
      competition: true,
      competitionPhase: true,
      loanedPlayers: true,
      _count: { select: { presences: { where: { present: true } } } }
    },
  })

  const playedMatches = matches.filter((m) => m._count.presences > 0)
  const matchIds = playedMatches.map((m) => m.id)

  if (matchIds.length === 0) {
    return res.json({ topScorers: [] })
  }

  const allGoals = await prisma.goal.findMany({
    where: { matchId: { in: matchIds } },
  })

  const allPresences = await prisma.presence.findMany({
    where: { matchId: { in: matchIds }, present: true },
  })

  const allSeasonPlayers = await prisma.seasonPlayer.findMany({
    where: { seasonId },
    include: { player: { select: { id: true, name: true, nickname: true } } },
  })

  const sortedMatchesAsc = [...playedMatches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )

  const topScorers = allSeasonPlayers
    .map((sp) => {
      const playerGoals = allGoals.filter((g) => g.playerId === sp.playerId && !g.ownGoal)
      const totalGoals = playerGoals.length
      const freeKickGoals = playerGoals.filter((g) => g.freeKick).length
      const penaltyGoals = playerGoals.filter((g) => g.penalty).length

      if (totalGoals === 0) return null

      let hatTricks = 0
      let doubles = 0
      let currentStreak = 0
      let maxStreak = 0
      let lastGoalMatch: any = null

      const goalsByMatch = new Map<string, number>()
      playerGoals.forEach((g) => {
        goalsByMatch.set(g.matchId, (goalsByMatch.get(g.matchId) || 0) + 1)
      })

      goalsByMatch.forEach((count) => {
        if (count >= 3) hatTricks++
        else if (count === 2) doubles++
      })

      for (const m of sortedMatchesAsc) {
        const matchGoals = playerGoals.filter((g: { matchId: string }) => g.matchId === m.id)
        if (matchGoals.length > 0) {
          currentStreak++
          lastGoalMatch = m
        } else {
          currentStreak = 0
        }
        if (currentStreak > maxStreak) maxStreak = currentStreak
      }

      return {
        id: sp.playerId,
        name: sp.player.name,
        nickname: sp.player.nickname,
        goals: totalGoals,
        freeKickGoals,
        penaltyGoals,
        hatTricks,
        doubles,
        maxStreak,
        currentStreak,
        lastGoal: lastGoalMatch
          ? {
              date: lastGoalMatch.date,
              opponent: lastGoalMatch.opponent,
              competition: lastGoalMatch.competition,
              competitionPhase: lastGoalMatch.competitionPhase,
            }
          : null,
        matchesPlayed: allPresences.filter((p) => p.playerId === sp.playerId).length,
      }
    })
    .filter(Boolean)

  const loanedGoals = allGoals.filter((g) => g.loanedPlayerName && !g.ownGoal)
  const loanedScorersMap = new Map<string, any>()

  loanedGoals.forEach((g) => {
    const name = g.loanedPlayerName!
    if (!loanedScorersMap.has(name)) {
      loanedScorersMap.set(name, {
        id: `loaned:${name}`,
        name: name,
        nickname: name,
        goals: 0,
        freeKickGoals: 0,
        penaltyGoals: 0,
        hatTricks: 0,
        doubles: 0,
        maxStreak: 0,
        currentStreak: 0,
        lastGoal: null,
        matchesPlayed: 0,
        isLoaned: true,
      })
    }
    const scorer = loanedScorersMap.get(name)
    scorer.goals++
    if (g.freeKick) scorer.freeKickGoals++
    if (g.penalty) scorer.penaltyGoals++
  })

  loanedScorersMap.forEach((scorer, name) => {
    scorer.matchesPlayed = playedMatches.filter((m) => m.loanedPlayers.includes(name)).length

    const playerLoanedGoals = loanedGoals.filter((g) => g.loanedPlayerName === name)
    if (playerLoanedGoals.length > 0) {
      const lastG = playerLoanedGoals[playerLoanedGoals.length - 1]
      const match = matches.find((m) => m.id === lastG.matchId)
      if (match) {
        scorer.lastGoal = {
          date: match.date,
          opponent: match.opponent,
          competition: match.competition,
          competitionPhase: match.competitionPhase,
        }
      }
    }
  })

  const allTopScorers = [...topScorers, ...Array.from(loanedScorersMap.values())].sort(
    (a, b) => b!.goals - a!.goals,
  )

  return res.json({ topScorers: allTopScorers })
}

export async function getDashboardTopAssistants(req: Request, res: Response) {
  const { teamId } = req.auth!
  const seasonId = await resolveSeasonId(teamId, req.query.seasonId as string)

  if (!seasonId) {
    return res.json({ topAssistants: [] })
  }

  const matches = await prisma.match.findMany({
    where: { teamId, seasonId },
    select: {
      id: true,
      date: true,
      loanedPlayers: true,
      _count: { select: { presences: { where: { present: true } } } },
    },
  })

  const playedMatches = matches.filter((m) => m._count.presences > 0)
  const matchIds = playedMatches.map((m) => m.id)

  if (matchIds.length === 0) {
    return res.json({ topAssistants: [] })
  }

  const allGoals = await prisma.goal.findMany({
    where: {
      matchId: { in: matchIds },
      OR: [
        { assistantId: { not: null } },
        { loanedAssistantName: { not: null } },
      ],
    },
  })

  const allPresences = await prisma.presence.findMany({
    where: { matchId: { in: matchIds }, present: true },
  })

  const allSeasonPlayers = await prisma.seasonPlayer.findMany({
    where: { seasonId },
    include: { player: { select: { id: true, name: true, nickname: true } } },
  })

  const topAssistants = allSeasonPlayers
    .map((sp) => {
      const playerAssists = allGoals.filter((g) => g.assistantId === sp.playerId)
      const totalAssists = playerAssists.length

      if (totalAssists === 0) return null

      return {
        id: sp.playerId,
        name: sp.player.name,
        nickname: sp.player.nickname,
        assists: totalAssists,
        matchesPlayed: allPresences.filter((p) => p.playerId === sp.playerId).length,
      }
    })
    .filter(Boolean)

  const loanedAssists = allGoals.filter((g) => g.loanedAssistantName && !g.ownGoal)
  const loanedAssistantsMap = new Map<string, any>()

  loanedAssists.forEach((g) => {
    const name = g.loanedAssistantName!
    if (!loanedAssistantsMap.has(name)) {
      loanedAssistantsMap.set(name, {
        id: `loaned:${name}`,
        name: name,
        nickname: name,
        assists: 0,
        matchesPlayed: 0,
        isLoaned: true,
      })
    }
    const assistant = loanedAssistantsMap.get(name)
    assistant.assists++
  })

  loanedAssistantsMap.forEach((assistant, name) => {
    assistant.matchesPlayed = playedMatches.filter((m) => m.loanedPlayers.includes(name)).length
  })

  const allTopAssistants = [...topAssistants, ...Array.from(loanedAssistantsMap.values())].sort(
    (a, b) => b!.assists - a!.assists,
  )

  return res.json({ topAssistants: allTopAssistants })
}

export async function getDashboardAttendance(req: Request, res: Response) {
  const { teamId } = req.auth!
  const seasonId = await resolveSeasonId(teamId, req.query.seasonId as string)

  if (!seasonId) {
    return res.json({ attendance: [] })
  }

  const matches = await prisma.match.findMany({
    where: { teamId, seasonId },
    select: {
      id: true,
      date: true,
      opponent: true,
      loanedPlayers: true,
      _count: { select: { presences: { where: { present: true } } } }
    },
  })

  const playedMatches = matches.filter((m) => m._count.presences > 0)
  const totalGames = playedMatches.length

  if (totalGames === 0) {
    return res.json({ attendance: [] })
  }

  const matchIds = playedMatches.map((m) => m.id)

  const allPresences = await prisma.presence.findMany({
    where: { matchId: { in: matchIds }, present: true },
  })

  const allSeasonPlayers = await prisma.seasonPlayer.findMany({
    where: { seasonId },
    include: { player: { select: { id: true, name: true, nickname: true } } },
  })

  const attendanceList = allSeasonPlayers
    .map((sp) => {
      const playerPresences = allPresences.filter((p) => p.playerId === sp.playerId)
      const presentCount = playerPresences.length

      if (presentCount === 0) return null

      const percentage = totalGames > 0 ? Math.round((presentCount / totalGames) * 100) : 0

      let lastMatch = null
      if (playerPresences.length > 0) {
        const presencesMatches = playerPresences
          .map((p) => playedMatches.find((m) => m.id === p.matchId))
          .filter(Boolean) as typeof playedMatches

        if (presencesMatches.length > 0) {
          const sorted = [...presencesMatches].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          )
          lastMatch = {
            date: sorted[0].date,
            opponent: sorted[0].opponent,
          }
        }
      }

      return {
        id: sp.playerId,
        name: sp.player.name,
        nickname: sp.player.nickname,
        presentCount,
        percentage,
        lastMatch,
      }
    })
    .filter(Boolean)

  const loanedAttendanceMap = new Map<string, any>()
  playedMatches.forEach((m) => {
    m.loanedPlayers.forEach((name) => {
      if (!loanedAttendanceMap.has(name)) {
        loanedAttendanceMap.set(name, {
          id: `loaned:${name}`,
          name: name,
          nickname: name,
          presentCount: 0,
          percentage: 0,
          lastMatch: null,
          isLoaned: true,
        })
      }
      const att = loanedAttendanceMap.get(name)
      att.presentCount++

      if (!att.lastMatch || new Date(m.date) > new Date(att.lastMatch.date)) {
        att.lastMatch = {
          date: m.date,
          opponent: m.opponent,
        }
      }
    })
  })

  loanedAttendanceMap.forEach((att) => {
    att.percentage = totalGames > 0 ? Math.round((att.presentCount / totalGames) * 100) : 0
  })

  const allAttendance = [...attendanceList, ...Array.from(loanedAttendanceMap.values())].sort(
    (a, b) => {
      if (b!.percentage !== a!.percentage) return b!.percentage - a!.percentage
      return a!.name.localeCompare(b!.name)
    },
  )

  return res.json({ attendance: allAttendance })
}
