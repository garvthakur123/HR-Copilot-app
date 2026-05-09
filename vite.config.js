import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const SESSION_MAP_PATH = path.resolve(__dirname, 'src/data/sessionMap.json')

// Dev-only plugin: exposes POST /dev/write-session so the browser can ask
// Node.js to write the email→session_id mapping to disk.
function sessionMapWriterPlugin() {
  return {
    name: 'session-map-writer',
    configureServer(server) {
      server.middlewares.use('/dev/write-session', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }

        let body = ''
        req.on('data', chunk => { body += chunk })
        req.on('end', () => {
          try {
            const { email, sessionId } = JSON.parse(body)
            if (!email || !sessionId) throw new Error('Missing email or sessionId')

            // Read existing map, update it, write back
            const existing = JSON.parse(fs.readFileSync(SESSION_MAP_PATH, 'utf-8') || '{}')
            existing[email] = sessionId
            fs.writeFileSync(SESSION_MAP_PATH, JSON.stringify(existing, null, 2))

            console.log(`[sessionMap] Saved: ${email} → ${sessionId}`)
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
          } catch (err) {
            console.error('[sessionMap] Write failed:', err.message)
            res.statusCode = 400
            res.end(JSON.stringify({ ok: false, error: err.message }))
          }
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), sessionMapWriterPlugin()],
})
