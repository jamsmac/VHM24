import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

interface WebSocketEvent {
  event: string
  data: any
}

interface UseWebSocketOptions {
  autoConnect?: boolean
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Error) => void
}

/**
 * Custom hook for WebSocket connection using Socket.IO
 *
 * Usage:
 * ```tsx
 * const { socket, isConnected, subscribe, unsubscribe } = useWebSocket({
 *   autoConnect: true,
 *   onConnect: () => console.log('Connected!'),
 * })
 *
 * // Subscribe to events
 * useEffect(() => {
 *   if (!socket) return
 *
 *   socket.on('commission:calculated', (data) => {
 *     console.log('New commission:', data)
 *   })
 *
 *   return () => {
 *     socket.off('commission:calculated')
 *   }
 * }, [socket])
 * ```
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    autoConnect = true,
    onConnect,
    onDisconnect,
    onError,
  } = options

  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!autoConnect) {return}

    // Connect to WebSocket server
    const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000', {
      path: '/realtime',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    socketRef.current = socket

    // Connection event handlers
    socket.on('connect', () => {
      setIsConnected(true)
      setError(null)
      onConnect?.()
    })

    socket.on('disconnect', () => {
      setIsConnected(false)
      onDisconnect?.()
    })

    socket.on('connect_error', (err) => {
      setError(err as Error)
      onError?.(err as Error)
    })

    socket.on('connection:success', () => {
      // WebSocket connection successful
    })

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [autoConnect, onConnect, onDisconnect, onError])

  /**
   * Subscribe to a room (dashboard, queue, or contract)
   */
  const subscribe = (room: 'dashboard' | 'queue' | string) => {
    if (!socketRef.current) {return}

    const event = room.startsWith('contract:')
      ? 'subscribe:contract'
      : `subscribe:${room}`

    const contractId = room.startsWith('contract:')
      ? room.replace('contract:', '')
      : undefined

    socketRef.current.emit(event, contractId)
  }

  /**
   * Unsubscribe from a room
   */
  const unsubscribe = (room: 'dashboard' | 'queue' | string) => {
    if (!socketRef.current) {return}

    const event = room.startsWith('contract:')
      ? 'unsubscribe:contract'
      : `unsubscribe:${room}`

    const contractId = room.startsWith('contract:')
      ? room.replace('contract:', '')
      : undefined

    socketRef.current.emit(event, contractId)
  }

  /**
   * Emit a custom event to the server
   */
  const emit = (event: string, data?: any) => {
    if (!socketRef.current) {return}
    socketRef.current.emit(event, data)
  }

  /**
   * Listen to a specific event
   */
  const on = (event: string, callback: (data: any) => void) => {
    if (!socketRef.current) {return}
    socketRef.current.on(event, callback)
  }

  /**
   * Remove event listener
   */
  const off = (event: string, callback?: (data: any) => void) => {
    if (!socketRef.current) {return}
    if (callback) {
      socketRef.current.off(event, callback)
    } else {
      socketRef.current.off(event)
    }
  }

  return {
    socket: socketRef.current,
    isConnected,
    error,
    subscribe,
    unsubscribe,
    emit,
    on,
    off,
  }
}
