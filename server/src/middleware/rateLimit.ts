import { Request, Response, NextFunction } from 'express'

interface RateLimitRecord {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitRecord>()

/**
 * Creates an in-memory sliding window rate limiter middleware.
 * Tracks by user ID (if authenticated) or client IP.
 */
export function rateLimiter(options: {
  windowMs: number // Window in milliseconds
  maxRequests: number // Max requests per window
  message?: string
  keyPrefix?: string
}) {
  const { windowMs, maxRequests, message, keyPrefix = 'rl' } = options

  return (req: Request, res: Response, next: NextFunction): void => {
    // Exclude test environment from rate limiting unless specifically testing rate limits
    if (process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit']) {
      next()
      return
    }

    const identifier = req.user?.id || req.ip || 'anonymous'
    const key = `${keyPrefix}:${identifier}`
    const now = Date.now()

    const record = rateLimitStore.get(key)

    if (!record || now > record.resetTime) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      })
      res.setHeader('X-RateLimit-Limit', maxRequests)
      res.setHeader('X-RateLimit-Remaining', maxRequests - 1)
      next()
      return
    }

    if (record.count >= maxRequests) {
      const retryAfterSec = Math.ceil((record.resetTime - now) / 1000)
      res.setHeader('Retry-After', retryAfterSec)
      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: message || `Too many requests. Please wait ${retryAfterSec} seconds before retrying.`,
        retryAfterSec,
      })
      return
    }

    record.count += 1
    res.setHeader('X-RateLimit-Limit', maxRequests)
    res.setHeader('X-RateLimit-Remaining', maxRequests - record.count)
    next()
  }
}

export function clearRateLimitStore(): void {
  rateLimitStore.clear()
}
