import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useGameStore } from '../store/gameStore'

export const useSocket = () => {
  const store = useGameStore()
  const socketRef = useRef<Socket | null>(null)
  
  useEffect(() => {
    // Prevent multiple socket creation
    if (socketRef.current) {
      console.log('🔌 Socket already exists, reusing...')
      return
    }
    
    const serverUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001'
    console.log('🔌 Creating new socket connection to:', serverUrl)
    
    // If using relative path, configure Socket.IO properly
    const socket = serverUrl.startsWith('/') 
      ? io({ path: serverUrl })
      : io(serverUrl)
    socketRef.current = socket
    store.setSocket(socket)
    
    // Connection events
    socket.on('connect', () => {
      console.log('✅ Connected to server:', socket.id)
      store.setConnected(true)
    })
    
    socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected:', reason)
      store.setConnected(false)
    })
    
    socket.on('connect_error', (error) => {
      console.error('❌ Connection error:', error)
      store.setConnected(false)
    })
    
    // Game events
    socket.on('game_created', (data) => {
      console.log('🎮 Game created:', data.gameCode)
      store.updateGameState({ gameCode: data.gameCode })
    })
    
    socket.on('joined_game', (data) => {
      console.log('👥 Joined game:', data)
      store.updateGameState({ 
        teamId: data.teamId,
        gameCode: data.gameCode 
      })
    })
    
    socket.on('game_state_updated', (data) => {
      console.log('📊 Game state updated')
      store.updateGameState({ 
        teams: data.teams,
        gameStatus: data.status,
        questionGrid: data.questionGrid || []
      })
    })
    
    socket.on('question_selected', (data) => {
      console.log('❓ Question selected')
      store.updateGameState({ 
        currentQuestion: data.question,
        questionGrid: data.questionGrid,
        selectedAnswer: null,
        showResults: false,
        timeRemaining: data.question.timeLimit || 30
      })
    })
    
    socket.on('answer_result', (data) => {
      console.log('💯 Answer result')
      store.updateGameState({ 
        teams: data.teams,
        showResults: true
      })
    })
    
    socket.on('error', (data) => {
      console.error('❌ Server error:', data.message)
      alert('Fehler: ' + data.message)
    })
    
    // Cleanup function
    return () => {
      console.log('🔌 Cleaning up socket connection')
      socket.disconnect()
      socketRef.current = null
    }
  }, []) // EMPTY dependency array!
}
