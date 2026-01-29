import type { VercelRequest, VercelResponse } from '@vercel/node'

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || ''

// Allowed origins
const ALLOWED_ORIGINS = [
  'https://church-finder.vercel.app',
  'https://church-finder-keprojects.vercel.app',
  'http://localhost:5173',
  'http://localhost:4173',
  'capacitor://localhost',
  'http://localhost'
]

// Rate limiting (simple in-memory)
const requestCounts = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 30 // requests per minute
const RATE_WINDOW = 60 * 1000 // 1 minute

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = requestCounts.get(ip)

  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW })
    return false
  }

  if (record.count >= RATE_LIMIT) {
    return true
  }

  record.count++
  return false
}

function getAllowedOrigin(origin: string | undefined): string | null {
  if (!origin) return null
  
  // Check exact match or wildcard subdomain match
  for (const allowed of ALLOWED_ORIGINS) {
    if (origin === allowed) return origin
  }
  
  // Allow all vercel.app subdomains for preview deployments
  if (origin.endsWith('.vercel.app')) return origin
  
  return null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers - restrict to allowed origins
  const origin = req.headers.origin as string | undefined
  const allowedOrigin = getAllowedOrigin(origin)
  
  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' })
  }

  // Rate limiting
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 'unknown'
  if (isRateLimited(ip)) {
    return res.status(429).json({ 
      error: 'Too many requests. Please try again later.', 
      code: 'RATE_LIMITED',
      retryAfter: 60
    })
  }

  const { address } = req.query

  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Address parameter required', code: 'MISSING_ADDRESS' })
  }

  // Input validation
  const trimmedAddress = address.trim()
  if (trimmedAddress.length < 2 || trimmedAddress.length > 200) {
    return res.status(400).json({ error: 'Invalid address length (2-200 characters)', code: 'INVALID_LENGTH' })
  }

  // Basic sanitization - remove potential injection patterns
  const sanitizedAddress = trimmedAddress.replace(/[<>{}]/g, '')

  if (!GOOGLE_API_KEY) {
    console.error('GOOGLE_API_KEY not configured')
    return res.status(500).json({ error: 'Server configuration error', code: 'CONFIG_ERROR' })
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(sanitizedAddress + ' 대한민국')}&key=${GOOGLE_API_KEY}&language=ko&region=kr`,
      { 
        signal: AbortSignal.timeout(10000) // 10 second timeout
      }
    )

    if (!response.ok) {
      console.error(`Google API error: ${response.status}`)
      return res.status(502).json({ error: 'Upstream API error', code: 'UPSTREAM_ERROR' })
    }

    const data = await response.json()

    // Only return necessary data
    if (data.status === 'OK' && data.results) {
      const results = data.results.slice(0, 5).map((result: any) => ({
        formatted_address: result.formatted_address,
        geometry: {
          location: result.geometry.location
        }
      }))
      return res.status(200).json({ status: 'OK', results })
    }

    // Handle Google API specific errors
    if (data.status === 'ZERO_RESULTS') {
      return res.status(200).json({ status: 'ZERO_RESULTS', results: [], message: 'No results found' })
    }

    if (data.status === 'OVER_QUERY_LIMIT') {
      console.error('Google API quota exceeded')
      return res.status(503).json({ error: 'Service temporarily unavailable', code: 'QUOTA_EXCEEDED' })
    }

    return res.status(200).json({ status: data.status, results: [] })
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        console.error('Geocoding timeout')
        return res.status(504).json({ error: 'Request timeout', code: 'TIMEOUT' })
      }
      console.error('Geocoding error:', error.message)
    } else {
      console.error('Geocoding error:', error)
    }
    return res.status(500).json({ error: 'Geocoding failed', code: 'GEOCODING_ERROR' })
  }
}
