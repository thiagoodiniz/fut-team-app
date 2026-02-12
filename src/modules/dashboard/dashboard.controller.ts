import type { Request, Response } from 'express'
import { prisma } from '../../lib/prisma'

export async function getDashboardStats(req: Request, res: Response) {
  const { teamId } = req.auth!
  const querySeasonId = req.query.seasonId as string | undefined

  let seasonId = querySeasonId

  // If no season provided, try to find active one
  if (!seasonId) {
    const activeSeason = await prisma.season.findFirst({
      where: { teamId, isActive: true },
    })
    seasonId = activeSeason?.id
  }

  if (!seasonId) {
    // If absolutely no season found, return empty stats
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
      lastMatches: [],
      attendance: [],
      topScorers: [],
    })
  }

  // 1. Fetch matches for summary and last matches list
  const matches = await prisma.match.findMany({
    where: { teamId, seasonId },
    orderBy: { date: 'desc' },
    include: {
      goals: {
        include: { player: true },
      },
    },
  })

  // 2. Calculate Summary
  let wins = 0
  let draws = 0
  let losses = 0
  let goalsFor = 0
  let goalsAgainst = 0

  for (const m of matches) {
    goalsFor += m.ourScore
    goalsAgainst += m.theirScore

    if (m.ourScore > m.theirScore) wins++
    else if (m.ourScore < m.theirScore) losses++
    else draws++
  }

  const totalGames = matches.length
  // Win rate = (Wins / Total) * 100
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0

  // 3. Last Matches (take 5)
  const lastMatches = matches.slice(0, 5).map((m) => ({
    id: m.id,
    date: m.date,
    location: m.location,
    opponent: m.opponent ?? 'Sem adversário',
    ourScore: m.ourScore,
    theirScore: m.theirScore,
    result: m.ourScore > m.theirScore ? 'WIN' : m.ourScore < m.theirScore ? 'LOSS' : 'DRAW',
    scorers: m.goals.map((g) => g.player.nickname || g.player.name),
  }))

  // 4. Detailed Data Retrieval
  const matchIds = matches.map((m) => m.id)

  if (matchIds.length === 0) {
    return res.json({
      summary: { totalGames, wins, draws, losses, goalsFor, goalsAgainst, winRate },
      lastMatches,
      attendance: [],
      topScorers: [],
    })
  }

  // Fetch all goals and presences for the season to calculate complex stats
  const allGoals = await prisma.goal.findMany({
    where: { matchId: { in: matchIds } },
    include: { match: true },
  })

  const allPresences = await prisma.presence.findMany({
    where: { matchId: { in: matchIds }, present: true },
    include: { match: true },
  })

  const allSeasonPlayers = await prisma.seasonPlayer.findMany({
    where: { seasonId },
    include: { player: true },
  })

  const sortedMatchesAsc = [...matches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )

  // 5. Scorer and Attendance processing
  const topScorers = allSeasonPlayers
    .map((sp) => {
      const playerGoals = allGoals.filter((g) => g.playerId === sp.playerId)
      const totalGoals = playerGoals.length

      if (totalGoals === 0) return null

      let hatTricks = 0
      let doubles = 0
      let currentStreak = 0
      let maxStreak = 0
      let lastGoalMatch: any = null

      // Group goals by match for hat-tricks/doubles
      const goalsByMatch = new Map<string, number>()
      playerGoals.forEach((g) => {
        goalsByMatch.set(g.matchId, (goalsByMatch.get(g.matchId) || 0) + 1)
      })

      goalsByMatch.forEach((count) => {
        if (count >= 3) hatTricks++
        else if (count === 2) doubles++
      })

      // Streak and last goal
      sortedMatchesAsc.forEach((m) => {
        const matchGoals = playerGoals.filter((g) => g.matchId === m.id)
        if (matchGoals.length > 0) {
          currentStreak++
          lastGoalMatch = m
        } else {
          currentStreak = 0
        }
        if (currentStreak > maxStreak) maxStreak = currentStreak
      })

      return {
        id: sp.playerId,
        name: sp.player.name,
        nickname: sp.player.nickname,
        photo: sp.player.photo,
        goals: totalGoals,
        hatTricks,
        doubles,
        maxStreak,
        currentStreak,
        lastGoal: lastGoalMatch
          ? {
            date: lastGoalMatch.date,
            opponent: lastGoalMatch.opponent,
          }
          : null,
      }
    })
    .filter(Boolean)
    .sort((a, b) => b!.goals - a!.goals)

  const attendanceList = allSeasonPlayers
    .map((sp) => {
      const playerPresences = allPresences.filter((p) => p.playerId === sp.playerId)
      const presentCount = playerPresences.length

      if (presentCount === 0) return null

      const percentage = totalGames > 0 ? Math.round((presentCount / totalGames) * 100) : 0

      // Find last match
      let lastMatch = null
      if (playerPresences.length > 0) {
        const sortedPresences = [...playerPresences].sort(
          (a, b) => new Date(b.match.date).getTime() - new Date(a.match.date).getTime(),
        )
        lastMatch = {
          date: sortedPresences[0].match.date,
          opponent: sortedPresences[0].match.opponent,
        }
      }

      return {
        id: sp.playerId,
        name: sp.player.name,
        nickname: sp.player.nickname,
        photo: sp.player.photo,
        presentCount,
        percentage,
        lastMatch,
      }
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b!.percentage !== a!.percentage) return b!.percentage - a!.percentage
      return a!.name.localeCompare(b!.name)
    })

  const result = {
    summary: { totalGames, wins, draws, losses, goalsFor, goalsAgainst, winRate },
    lastMatches,
    attendance: attendanceList,
    topScorers,
  }

  return res.json(result)
}
