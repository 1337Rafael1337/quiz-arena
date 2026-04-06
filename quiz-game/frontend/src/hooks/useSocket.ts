import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useGameStore } from '../store/gameStore'

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const connect = () => {
      const store = useGameStore.getState()

      // Disconnect existing socket before reconnecting
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }

      const socketUrl = import.meta.env.VITE_API_URL || window.location.origin

      const socket = io(socketUrl, {
        path: '/socket.io/',
        withCredentials: true, // send httpOnly auth cookie with upgrade request
      })
      socketRef.current = socket
      store.setSocket(socket)

      socket.on('connect', () => {
        useGameStore.getState().setConnected(true)
      })

      socket.on('disconnect', () => {
        useGameStore.getState().setConnected(false)
      })

      socket.on('connect_error', () => {
        useGameStore.getState().setConnected(false)
      })

      socket.on('joined_game', (data) => {
        useGameStore.getState().updateGameState({
          teamId: data.teamId,
          gameCode: data.gameCode
        })
      })

      socket.on('game_state_updated', (data) => {
        useGameStore.getState().updateGameState({
          teams: data.teams,
          gameStatus: data.status,
          questionGrid: data.questionGrid || [],
          gameMode: data.gameMode
        })
      })

      socket.on('game_started', (data) => {
        useGameStore.getState().updateGameState({
          gameStatus: 'active',
          teams: data.teams,
          questionGrid: data.questionGrid || [],
          gameMode: data.gameMode
        })
      })

      socket.on('question_selected', (data) => {
        useGameStore.getState().updateGameState({
          currentQuestion: data.question,
          questionGrid: data.questionGrid,
          selectedAnswer: null,
          showResults: false,
          timeRemaining: data.question.timeLimit || 30
        })
      })

      socket.on('answer_result', (data) => {
        useGameStore.getState().updateGameState({
          teams: data.teams,
          showResults: true
        })
      })

      socket.on('time_up', () => {
        useGameStore.getState().updateGameState({
          timeRemaining: 0
        })
      })

      socket.on('game_finished', (data) => {
        useGameStore.getState().updateGameState({
          gameStatus: 'finished',
          rankings: data.rankings
        })
      })

      socket.on('error', (data) => {
        console.error('Server error:', data.message)
        alert('Fehler: ' + data.message)
      })
    }

    connect()

    // Reconnect when auth state changes (login/logout)
    const handleAuthChange = () => connect()
    window.addEventListener('auth-changed', handleAuthChange)

    return () => {
      window.removeEventListener('auth-changed', handleAuthChange)
      socketRef.current?.disconnect()
      socketRef.current = null
    }
  }, [])
}

// Call this after login/logout to trigger socket reconnection
export function notifyAuthChange() {
  window.dispatchEvent(new Event('auth-changed'))
}
