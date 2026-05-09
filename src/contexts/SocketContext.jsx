import { createContext, useContext, useEffect, useState, useRef } from 'react'

const SocketContext = createContext(null)

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const reconnectTimeoutRef = useRef(null)

  useEffect(() => {
    const WS_URL = 'ws://localhost:8000/api/ws/interview'

    function connect() {
      console.log(`[WebSocket] Connecting to ${WS_URL}...`)
      const ws = new WebSocket(WS_URL)

      ws.onopen = () => {
        console.log('[WebSocket] Connected successfully')
        setSocket(ws)
        setIsConnected(true)
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current)
          reconnectTimeoutRef.current = null
        }
      }

      ws.onmessage = (event) => {
        console.log('[WebSocket] Message received:', event.data)
      }

      ws.onclose = () => {
        console.log('[WebSocket] Connection closed')
        setSocket(null)
        setIsConnected(false)
        reconnectTimeoutRef.current = setTimeout(connect, 5000)
      }

      ws.onerror = (error) => {
        console.error('[WebSocket] Error occurred:', error)
        ws.close()
      }
    }

    connect()

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [])

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => useContext(SocketContext)
