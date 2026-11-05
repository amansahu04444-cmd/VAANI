import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { config } from './config/env.js'
import { checkSupabaseHealth } from './db/supabase.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { voiceRouter } from './modules/voice/voice.routes.js'
import { audioRouter } from './modules/audio/audio.routes.js'
import { speechRouter } from './modules/speech/speech.routes.js'

export const app = express()

// Security and parser middleware
app.use(helmet())
app.use(
  cors({
    origin: config.CLIENT_ORIGIN,
    credentials: true,
  })
)
app.use(express.json({ limit: '2mb' }))

// Health check endpoints (GET /health and GET /api/health)
const healthHandler = async (_req: Request, res: Response) => {
  const supabase = await checkSupabaseHealth()
  const isHealthy = supabase.status === 'healthy'
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    service: 'VAANI Speech Studio API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    supabase,
  })
}

app.get('/health', healthHandler)
app.get('/api/health', healthHandler)

// Feature routes
app.use('/api/auth', authRouter)
app.use('/api/voice', voiceRouter)
app.use('/api/audio', audioRouter)
app.use('/api/speech', speechRouter)

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: 'The requested route does not exist.',
  })
})

// Centralized error handler (Sanitizes errors, never leaks internal stack/secrets)
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[VAANI API ERROR]:', err?.message || err)
  res.status(err.status || 500).json({
    error: err.code || 'INTERNAL_SERVER_ERROR',
    message: config.NODE_ENV === 'production' ? 'An unexpected error occurred.' : err.message,
  })
})

