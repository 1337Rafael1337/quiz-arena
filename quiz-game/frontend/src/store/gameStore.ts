import { create } from 'zustand'
import { Socket } from 'socket.io-client'

interface Team {
  id: string
  name: string
  color: string
  score: number
  jokersRemaining: number
}

interface Question {
  id: number
  text: string
  category: string
  points: number
  isRisiko: boolean
  timeLimit: number
  options: Array<{ id: number; text: string }>
}

interface QuestionCell {
  id: string
  category: string
  points: number
  used: boolean
  isRisiko: boolean
}

interface GameStore {
  // Connection
  socket: Socket | null
  connected: boolean
  
  // Game state
  gameCode: string | null
  teamId: string | null
  teams: Team[]
  currentQuestion: Question | null
  gameStatus: 'waiting' | 'active' | 'finished'
  questionGrid: QuestionCell[][]
  
  // UI state
  selectedAnswer: number | null
  timeRemaining: number
  showResults: boolean
  
  // Actions
  setSocket: (socket: Socket) => void
  setConnected: (connected: boolean) => void
  setGameCode: (code: string) => void
  setTeamId: (id: string) => void
  updateGameState: (state: Partial<GameStore>) => void
  resetGame: () => void
}

export const useGameStore = create<GameStore>((set) => ({
  // Initial state
  socket: null,
  connected: false,
  gameCode: null,
  teamId: null,
  teams: [],
  currentQuestion: null,
  gameStatus: 'waiting',
  questionGrid: [],
  selectedAnswer: null,
  timeRemaining: 30,
  showResults: false,
  
  // Actions
  setSocket: (socket) => set({ socket }),
  setConnected: (connected) => set({ connected }),
  setGameCode: (code) => set({ gameCode: code }),
  setTeamId: (id) => set({ teamId: id }),
  updateGameState: (state) => set((prevState) => ({ ...prevState, ...state })),
  resetGame: () => set({
    gameCode: null,
    teamId: null,
    teams: [],
    currentQuestion: null,
    gameStatus: 'waiting',
    questionGrid: [],
    selectedAnswer: null,
    timeRemaining: 30,
    showResults: false
  })
}))
