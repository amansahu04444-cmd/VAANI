import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import crypto from 'crypto'
import { config } from './config/env.js'
import { checkSupabaseHealth } from './db/supabase.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { voiceRouter } from './modules/voice/voice.routes.js'
import { audioRouter } from './modules/audio/audio.routes.js'
import { speechRouter } from './modules/speech/speech.routes.js'
import { translationRouter } from './modules/translation/translation.routes.js'

export const app = express()

// Assign unique X-Request-Id to every inbound request for diagnostic tracing
app.use((req: Request, res: Response, next: NextFunction) => {
  const reqId = (req.headers['x-request-id'] as string) || crypto.randomUUID()
  req.headers['x-request-id'] = reqId
  res.setHeader('X-Request-Id', reqId)
  next()
})

// Normalize duplicate /api/api/ prefixes if requested by misconfigured frontend clients
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.url.startsWith('/api/api/')) {
    req.url = req.url.replace(/^\/api\/api\//, '/api/')
  }
  next()
})

// Security and parser middleware
// Helmet configured with cross-origin CORP to enable HTML5 audio streaming from Vercel to Render
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
)

// Parse allowed client origins from comma-separated configuration
const allowedOrigins = config.CLIENT_ORIGIN.split(',')
  .map((o) => o.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Supertest, server-to-server)
      if (!origin) return callback(null, true)
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true)
      }
      return callback(null, false)
    },
    credentials: true,
  })
)
app.use(express.json({ limit: '25mb' }))

// Public Root Service Identifier (resolves 404 on base domain https://vaani-n3t1.onrender.com/)
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'vaani-api',
    message: 'VAANI Speech Studio API is operational.',
    endpoints: {
      health: '/health',
      apiHealth: '/api/health',
      auth: '/api/auth',
      voice: '/api/voice',
      speech: '/api/speech',
      translation: '/api/translation',
      audio: '/api/audio',
    },
  })
})

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
app.use('/api/translation', translationRouter)

// Improved 404 Diagnostic Handler (Step 5)
app.use((req: Request, res: Response) => {
  const requestId = (req.headers['x-request-id'] as string) || 'req-unknown'
  const requestedPath = req.originalUrl || req.url
  const method = req.method

  console.warn(`[404 NOT_FOUND] ${method} ${requestedPath} (Request ID: ${requestId})`)

  res.status(404).json({
    error: 'NOT_FOUND',
    message: `The requested route '${method} ${requestedPath}' does not exist on this server.`,
    path: requestedPath,
    method,
    requestId,
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

