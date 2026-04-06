import type { Pool } from 'pg'
import type { Server } from 'socket.io'

interface Team {
  id: string
  dbId?: number
  name: string
  color: string
  score: number
  jokersRemaining: number
  activeJokers: {
    doublePoints: boolean
  }
}

interface QuestionCell {
  id: string
  dbQuestionId: number
  category: string
  points: number
  used: boolean
  isRisiko: boolean
}

interface LoadedQuestion {
  id: number
  questionText: string
  category: string
  points: number
  isRisiko: boolean
  timeLimit: number
  options: Array<{ id: number; text: string; isCorrect: boolean }>
}

interface GameState {
  gameCode: string
  dbId: number
  name: string
  teams: Map<string, Team>
  status: 'waiting' | 'active' | 'finished'
  currentQuestion: LoadedQuestion | null
  questionGrid: QuestionCell[][]
  maxTeams: number
  jokerCount: number
  risikoEnabled: boolean
  gameMode: 'quizmaster' | 'self_service'
  creatorId: number | null
  questionStartedAt: number | null
}

export class GameEngine {
  private games: Map<string, GameState> = new Map()
  private questionTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()

  constructor(
    private pool: Pool,
    private io: Server
  ) {}

  async loadActiveGames(): Promise<void> {
    const result = await this.pool.query(
      "SELECT game_code FROM game_sessions WHERE status IN ('waiting', 'active')"
    )

    for (const row of result.rows) {
      try {
        await this.loadGame(row.game_code)
      } catch (err) {
        console.error(`Failed to reload game ${row.game_code}:`, err)
      }
    }

    console.log(`Loaded ${result.rows.length} active game(s) from database`)
  }

  async loadGame(gameCode: string): Promise<GameState | null> {
    const result = await this.pool.query(
      'SELECT * FROM game_sessions WHERE game_code = $1',
      [gameCode]
    )

    if (result.rows.length === 0) return null

    const session = result.rows[0]

    // Load questions from DB grouped by category
    const questionsResult = await this.pool.query(`
      SELECT q.id, q.question_text, q.points, q.time_limit, q.is_risiko,
             c.name as category_name, c.id as category_id
      FROM questions q
      JOIN question_categories c ON q.category_id = c.id
      ORDER BY c.name, q.points
    `)

    // Build question grid from DB questions
    const questionGrid = this.buildQuestionGrid(questionsResult.rows, session.risiko_enabled)

    const game: GameState = {
      gameCode,
      dbId: session.id,
      name: session.name,
      teams: new Map(),
      status: session.status,
      currentQuestion: null,
      questionGrid,
      maxTeams: session.max_teams,
      jokerCount: session.joker_count,
      risikoEnabled: session.risiko_enabled,
      gameMode: session.game_mode || 'self_service',
      creatorId: session.creator_id,
      questionStartedAt: null,
    }

    // Load existing teams from DB
    const teamsResult = await this.pool.query(
      'SELECT * FROM teams WHERE game_session_id = $1',
      [session.id]
    )

    for (const t of teamsResult.rows) {
      game.teams.set(`team_${t.id}`, {
        id: `team_${t.id}`,
        dbId: t.id,
        name: t.name,
        color: t.color,
        score: t.current_score,
        jokersRemaining: t.jokers_remaining,
        activeJokers: { doublePoints: false },
      })
    }

    // Mark already-answered questions as used
    const answeredResult = await this.pool.query(
      'SELECT DISTINCT question_id FROM game_answers WHERE game_session_id = $1',
      [session.id]
    )
    const answeredIds = new Set(answeredResult.rows.map(r => r.question_id))

    for (const row of game.questionGrid) {
      for (const cell of row) {
        if (answeredIds.has(cell.dbQuestionId)) {
          cell.used = true
        }
      }
    }

    this.games.set(gameCode, game)
    console.log(`Game loaded: ${gameCode} - ${session.name} (${questionGrid.length} categories)`)
    return game
  }

  private buildQuestionGrid(questions: any[], risikoEnabled: boolean): QuestionCell[][] {
    // Group by category
    const categoryMap = new Map<string, any[]>()
    for (const q of questions) {
      const cat = q.category_name
      if (!categoryMap.has(cat)) categoryMap.set(cat, [])
      categoryMap.get(cat)!.push(q)
    }

    const pointTiers = [100, 200, 300, 400, 500]

    return Array.from(categoryMap.entries()).map(([category, catQuestions], catIndex) => {
      return pointTiers.map((points, pointIndex) => {
        // Find a question matching this point tier, or the closest available
        const matching = catQuestions.find(q => q.points === points)
        const question = matching || catQuestions[pointIndex]

        const isRisiko = risikoEnabled && points >= 400 && Math.random() < 0.3

        return {
          id: `${catIndex}-${pointIndex}`,
          dbQuestionId: question?.id || 0,
          category,
          points,
          used: false,
          isRisiko: question?.is_risiko || isRisiko,
        }
      })
    })
  }

  getGame(gameCode: string): GameState | undefined {
    return this.games.get(gameCode)
  }

  getAllGames(): GameState[] {
    return Array.from(this.games.values())
  }

  removeGame(gameCode: string): void {
    this.clearQuestionTimer(gameCode)
    this.games.delete(gameCode)
  }

  addTeam(gameCode: string, teamName: string, teamColor: string): string | null {
    const game = this.getGame(gameCode)
    if (!game) return null

    if (game.teams.size >= game.maxTeams) {
      throw new Error('Spiel ist voll')
    }

    if (game.status !== 'waiting') {
      throw new Error('Spiel hat bereits begonnen')
    }

    // Insert team into DB
    const teamId = 'team_' + Math.random().toString(36).substring(2, 9)

    // Insert async but don't block
    this.pool.query(
      'INSERT INTO teams (game_session_id, name, color, jokers_remaining) VALUES ($1, $2, $3, $4) RETURNING id',
      [game.dbId, teamName, teamColor, game.jokerCount]
    ).then(result => {
      const team = game.teams.get(teamId)
      if (team) team.dbId = result.rows[0].id
    }).catch(err => console.error('Error inserting team:', err))

    const team: Team = {
      id: teamId,
      name: teamName,
      color: teamColor,
      score: 0,
      jokersRemaining: game.jokerCount,
      activeJokers: { doublePoints: false },
    }

    game.teams.set(teamId, team)
    console.log(`Team joined: ${teamName} in game ${gameCode}`)
    return teamId
  }

  async startGame(gameCode: string): Promise<void> {
    const game = this.getGame(gameCode)
    if (!game) throw new Error('Spiel nicht gefunden')
    if (game.status !== 'waiting') throw new Error('Spiel kann nicht gestartet werden')
    if (game.teams.size < 1) throw new Error('Mindestens ein Team erforderlich')

    game.status = 'active'

    await this.pool.query(
      "UPDATE game_sessions SET status = 'active', started_at = NOW() WHERE game_code = $1",
      [gameCode]
    )
  }

  async selectQuestion(gameCode: string, questionId: string): Promise<LoadedQuestion | null> {
    const game = this.getGame(gameCode)
    if (!game) throw new Error('Spiel nicht gefunden')
    if (game.status !== 'active') throw new Error('Spiel ist nicht aktiv')
    if (game.currentQuestion) throw new Error('Es läuft bereits eine Frage')

    // Find the cell in the grid
    let cell: QuestionCell | null = null
    for (const row of game.questionGrid) {
      for (const c of row) {
        if (c.id === questionId && !c.used) {
          cell = c
          break
        }
      }
      if (cell) break
    }

    if (!cell) throw new Error('Frage nicht verfügbar')
    if (cell.dbQuestionId === 0) throw new Error('Keine Frage für dieses Feld verfügbar')

    // Load full question from DB
    const qResult = await this.pool.query(`
      SELECT q.*, c.name as category_name
      FROM questions q
      JOIN question_categories c ON q.category_id = c.id
      WHERE q.id = $1
    `, [cell.dbQuestionId])

    if (qResult.rows.length === 0) throw new Error('Frage nicht in der Datenbank gefunden')

    const q = qResult.rows[0]

    const optionsResult = await this.pool.query(
      'SELECT id, option_text, is_correct, sort_order FROM question_options WHERE question_id = $1 ORDER BY sort_order',
      [cell.dbQuestionId]
    )

    const question: LoadedQuestion = {
      id: q.id,
      questionText: q.question_text,
      category: q.category_name,
      points: cell.points, // Use grid points, not DB points
      isRisiko: cell.isRisiko,
      timeLimit: q.time_limit,
      options: optionsResult.rows.map(o => ({
        id: o.id,
        text: o.option_text,
        isCorrect: o.is_correct,
      })),
    }

    cell.used = true
    game.currentQuestion = question
    game.questionStartedAt = Date.now()

    return question
  }

  startQuestionTimer(gameCode: string, timeLimit: number, onTimeUp: () => void): void {
    // Clear any existing timer
    this.clearQuestionTimer(gameCode)

    const timer = setTimeout(() => {
      const game = this.getGame(gameCode)
      if (game) {
        game.currentQuestion = null
        game.questionStartedAt = null
      }
      this.questionTimers.delete(gameCode)
      onTimeUp()
    }, timeLimit * 1000)

    this.questionTimers.set(gameCode, timer)
  }

  clearQuestionTimer(gameCode: string): void {
    const existing = this.questionTimers.get(gameCode)
    if (existing) {
      clearTimeout(existing)
      this.questionTimers.delete(gameCode)
    }
  }

  async submitAnswer(
    gameCode: string,
    teamId: string,
    optionId: number,
    _timeRemaining: number
  ): Promise<{
    isCorrect: boolean
    pointsAwarded: number
    teamName: string
    wasRisiko: boolean
    wasDoublePoints: boolean
    correctOptionId: number
  } | null> {
    const game = this.getGame(gameCode)
    if (!game) throw new Error('Spiel nicht gefunden')
    if (!game.currentQuestion) throw new Error('Keine aktive Frage')

    // Server-side time validation
    const question = game.currentQuestion
    let serverTimeRemaining = 0
    if (game.questionStartedAt) {
      const elapsed = (Date.now() - game.questionStartedAt) / 1000
      serverTimeRemaining = Math.max(0, question.timeLimit - elapsed)
    }

    if (serverTimeRemaining <= 0) {
      throw new Error('Zeit abgelaufen')
    }

    const team = game.teams.get(teamId)
    if (!team) throw new Error('Team nicht gefunden')

    const selectedOption = question.options.find(o => o.id === optionId)
    if (!selectedOption) throw new Error('Ungültige Antwort')

    const correctOption = question.options.find(o => o.isCorrect)
    const isCorrect = selectedOption.isCorrect

    // Capture joker state BEFORE resetting
    const wasDoublePoints = team.activeJokers.doublePoints

    let pointsAwarded = 0
    if (isCorrect) {
      pointsAwarded = question.points
      if (wasDoublePoints) {
        pointsAwarded *= 2
      }
    } else if (question.isRisiko) {
      pointsAwarded = -question.points
    }

    team.score += pointsAwarded
    team.activeJokers.doublePoints = false

    // Update team score in DB
    if (team.dbId) {
      this.pool.query(
        'UPDATE teams SET current_score = $1 WHERE id = $2',
        [team.score, team.dbId]
      ).catch(err => console.error('Error updating team score:', err))

      // Record answer in game_answers (using captured joker state)
      const timeTaken = Math.round(question.timeLimit - serverTimeRemaining)
      this.pool.query(`
        INSERT INTO game_answers (game_session_id, team_id, question_id, selected_option_id, is_correct, points_awarded, time_taken, joker_used)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        game.dbId,
        team.dbId,
        question.id,
        optionId,
        isCorrect,
        pointsAwarded,
        timeTaken,
        wasDoublePoints ? 'double_points' : null
      ]).catch(err => console.error('Error recording answer:', err))
    }

    // Clear the question after answer
    game.currentQuestion = null
    game.questionStartedAt = null
    this.clearQuestionTimer(gameCode)

    // Check if all questions are used → auto-end
    const allUsed = game.questionGrid.every(row => row.every(cell => cell.used || cell.dbQuestionId === 0))
    if (allUsed) {
      await this.endGame(gameCode)
    }

    return {
      isCorrect,
      pointsAwarded,
      teamName: team.name,
      wasRisiko: question.isRisiko,
      wasDoublePoints,
      correctOptionId: correctOption?.id || 0,
    }
  }

  async useJoker(
    gameCode: string,
    teamId: string,
    jokerType: string
  ): Promise<{
    type: string
    globalEffect: boolean
    timeBonus?: number
    eliminatedOptions?: number[]
  } | null> {
    const game = this.getGame(gameCode)
    if (!game) throw new Error('Spiel nicht gefunden')
    if (!game.currentQuestion) throw new Error('Keine aktive Frage')

    const team = game.teams.get(teamId)
    if (!team) throw new Error('Team nicht gefunden')

    if (team.jokersRemaining <= 0) {
      throw new Error('Keine Joker mehr verfügbar')
    }

    team.jokersRemaining--

    // Update in DB
    if (team.dbId) {
      this.pool.query(
        'UPDATE teams SET jokers_remaining = $1 WHERE id = $2',
        [team.jokersRemaining, team.dbId]
      ).catch(err => console.error('Error updating joker count:', err))
    }

    switch (jokerType) {
      case 'double_points':
        team.activeJokers.doublePoints = true
        return { type: 'double_points', globalEffect: false }

      case 'extra_time':
        return { type: 'extra_time', globalEffect: true, timeBonus: 20 }

      case '50_50': {
        const question = game.currentQuestion
        const wrongOptions = question.options.filter(o => !o.isCorrect)
        // Randomly pick 2 wrong options to eliminate
        const shuffled = wrongOptions.sort(() => Math.random() - 0.5)
        const eliminated = shuffled.slice(0, 2).map(o => o.id)
        return { type: '50_50', globalEffect: true, eliminatedOptions: eliminated }
      }

      default:
        throw new Error('Ungültiger Joker-Typ')
    }
  }

  async endGame(gameCode: string): Promise<{
    status: 'finished'
    rankings: Array<{ name: string; score: number; rank: number }>
  } | null> {
    const game = this.getGame(gameCode)
    if (!game) throw new Error('Spiel nicht gefunden')

    game.status = 'finished'
    this.clearQuestionTimer(gameCode)
    game.currentQuestion = null
    game.questionStartedAt = null

    await this.pool.query(
      "UPDATE game_sessions SET status = 'finished', finished_at = NOW() WHERE game_code = $1",
      [gameCode]
    )

    // Build rankings
    const teamsArray = Array.from(game.teams.values())
      .sort((a, b) => b.score - a.score)

    const rankings = teamsArray.map((team, index) => ({
      name: team.name,
      score: team.score,
      rank: index + 1,
    }))

    return { status: 'finished', rankings }
  }
}
