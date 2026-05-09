import React, { createContext, useContext, useRef, useEffect } from 'react'

const WSContext = createContext(null)

const WS_URL = 'ws://localhost:8000/api/ws/interview'
const RECONNECT_DELAY_MS = 3000

export function WSProvider({ children }) {
  const wsRef             = useRef(null)
  const handlersRef       = useRef(new Set())   // registered message handlers
  const reconnectTimer    = useRef(null)
  const shouldReconnect   = useRef(true)        // false only on explicit unmount

  function connect() {
    if (!shouldReconnect.current) return
    try {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('[HR Copilot WS] Connected to', WS_URL)
        clearTimeout(reconnectTimer.current)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('[HR Copilot WS] Received:', data)
          handlersRef.current.forEach(fn => fn(data))
        } catch {
          console.warn('[HR Copilot WS] Non-JSON message:', event.data)
        }
      }

      ws.onerror = (err) => {
        console.error('[HR Copilot WS] Error:', err)
      }

      ws.onclose = (event) => {
        console.log(`[HR Copilot WS] Closed (code: ${event.code}). Reconnecting in ${RECONNECT_DELAY_MS}ms...`)
        if (shouldReconnect.current) {
          reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS)
        }
      }
    } catch (err) {
      console.error('[HR Copilot WS] Failed to create connection:', err)
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS)
    }
  }

  useEffect(() => {
    shouldReconnect.current = true
    connect()
    return () => {
      shouldReconnect.current = false
      clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
    }
  }, [])

  // Send a JSON payload. Returns true if sent, false if socket not ready.
  function sendMessage(payload) {
    const ws = wsRef.current
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.warn('[HR Copilot WS] Cannot send — socket not open. State:', ws?.readyState)
      return false
    }
    const raw = JSON.stringify(payload)
    ws.send(raw)
    console.log('[HR Copilot WS] Sent:', payload)
    return true
  }

  // Register a handler that receives every incoming message object.
  // Remember to call removeMessageHandler when done to avoid memory leaks.
  function addMessageHandler(fn) {
    handlersRef.current.add(fn)
  }

  function removeMessageHandler(fn) {
    handlersRef.current.delete(fn)
  }

  return (
    <WSContext.Provider value={{ sendMessage, addMessageHandler, removeMessageHandler }}>
      {children}
    </WSContext.Provider>
  )
}

export function useWS() {
  return useContext(WSContext)
}
