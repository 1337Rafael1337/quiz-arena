interface Team {
  id: string
  name: string
  color: string
  score: number
  jokersRemaining: number
}

interface QuestionCell {
  id: string
  category: string
  points: number
  used: boolean
  isRisiko: boolean
}

interface ActiveJokers {
  doublePoints: boolean
  extraTime: boolean
  fiftyFifty: boolean
}

interface GameState {
  gameCode: string
  name: string
  teams: Map<string, Team>
  status: 'waiting' | 'active' | 'finished'
  currentQuestion: any | null
  questionGrid: QuestionCell[][]
  maxTeams: number
  jokerCount: number
  risikoEnabled: boolean
  activeJokers: ActiveJokers
}

export class GameEngine {
  private games: Map<string, GameState> = new Map()
  
  createGame(gameName: string, settings: any): string {
    const gameCode = this.generateGameCode()
    const game: GameState = {
      gameCode,
      name: gameName,
      teams: new Map(),
      status: 'waiting',
      currentQuestion: null,
      questionGrid: this.initializeQuestionGrid(),
      maxTeams: settings.maxTeams || 4,
      jokerCount: settings.jokerCount || 3,
      risikoEnabled: settings.risikoEnabled || true,
      activeJokers: {
        doublePoints: false,
        extraTime: false,
        fiftyFifty: false
      }
    }
    
    this.games.set(gameCode, game)
    console.log(`🎮 Game created: ${gameCode} - ${gameName}`)
    return gameCode
  }
  
  getGame(gameCode: string): GameState | undefined {
    return this.games.get(gameCode)
  }
  
  addTeam(gameCode: string, teamName: string, teamColor: string): string | null {
    const game = this.getGame(gameCode)
    if (!game) return null
    
    if (game.teams.size >= game.maxTeams) {
      throw new Error('Spiel ist voll')
    }
    
    const teamId = this.generateTeamId()
    const team: Team = {
      id: teamId,
      name: teamName,
      color: teamColor,
      score: 0,
      jokersRemaining: game.jokerCount
    }
    
    game.teams.set(teamId, team)
    console.log(`👥 Team joined: ${teamName} in game ${gameCode}`)
    return teamId
  }
  
  private generateGameCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }
  
  private generateTeamId(): string {
    return 'team_' + Math.random().toString(36).substring(2, 9)
  }
  
  private initializeQuestionGrid(): QuestionCell[][] {
    const categories = ['Geographie', 'Geschichte', 'Wissenschaft', 'Sport', 'Unterhaltung', 'Allgemeinwissen']
    const points = [100, 200, 300, 400, 500]
    
    return categories.map((category, catIndex) => 
      points.map((point, pointIndex) => ({
        id: `${catIndex}-${pointIndex}`,
        category,
        points: point,
        used: false,
        isRisiko: point >= 400 && Math.random() < 0.3
      }))
    )
  }
  
  getAllGames(): GameState[] {
    return Array.from(this.games.values())
  }
}
