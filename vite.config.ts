import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { existsSync } from 'fs'
import { join } from 'path'

/**
 * Dev-only plugin that emulates Vercel Functions for /api/* paths.
 * In production, Vercel handles these natively. Locally, this lets
 * `npm run dev` serve the same endpoints.
 */
function devApiPlugin(): Plugin {
  return {
    name: 'talush-dev-api',
    configureServer(server) {
      // Load .env files into process.env for server-side handlers
      const env = loadEnv('development', process.cwd(), '')
      for (const [key, value] of Object.entries(env)) {
        if (process.env[key] === undefined) process.env[key] = value
      }

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()
        try {
          const pathname = req.url.split('?')[0]
          const fileBase = pathname.replace(/^\/api\//, '')
          const candidates = [
            join(process.cwd(), 'api', `${fileBase}.ts`),
            join(process.cwd(), 'api', fileBase, 'index.ts'),
          ]
          const file = candidates.find(existsSync)
          if (!file) return next()

          const mod = await server.ssrLoadModule(file)
          const handler = mod.default
          if (typeof handler !== 'function') return next()

          // Build minimal Vercel-compatible req/res shims
          const url = new URL(req.url!, `http://${req.headers.host || 'localhost'}`)
          const query: Record<string, string> = {}
          url.searchParams.forEach((v, k) => { query[k] = v })

          let body: unknown = undefined
          if (req.method && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
            const chunks: Buffer[] = []
            for await (const chunk of req) chunks.push(chunk as Buffer)
            const raw = Buffer.concat(chunks).toString('utf8')
            try { body = raw ? JSON.parse(raw) : {} } catch { body = raw }
          }

          const shimReq = {
            method: req.method || 'GET',
            headers: req.headers,
            query,
            body,
          }

          let statusCode = 200
          const shimRes = {
            status(code: number) { statusCode = code; return this },
            setHeader(name: string, value: string) { res.setHeader(name, value); return this },
            json(data: unknown) {
              res.statusCode = statusCode
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify(data))
            },
          }

          await handler(shimReq, shimRes)
        } catch (err) {
          console.error('[dev-api] handler error:', err)
          res.statusCode = 500
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'unknown' }))
        }
      })
    },
  }
}

const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': [
    "default-src 'self'",
    // CDNs needed by marketing landing page (GSAP, Tailwind, Lucide, Lenis)
    "script-src 'self' 'unsafe-inline' https://vercel.live https://cdn.tailwindcss.com https://unpkg.com https://cdnjs.cloudflare.com https://esm.sh",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' https://*.supabase.co https://accounts.google.com https://ipapi.co",
    "frame-src https://vercel.live https://accounts.google.com",
    "worker-src 'self' blob:",
    "media-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self' https://accounts.google.com https://*.supabase.co",
  ].join('; '),
}

export default defineConfig({
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  plugins: [
    react(),
    devApiPlugin(),
    // Build-only: emits dist/stats.html so we can spot bundle bloat.
    // gzipSize: true gives a realistic over-the-wire size.
    visualizer({
      filename: 'dist/stats.html',
      template: 'treemap',
      gzipSize: true,
      brotliSize: true,
      sourcemap: true,
    }) as Plugin,
  ],
  server: {
    host: '127.0.0.1',
    headers: securityHeaders,
  },
  preview: {
    host: '127.0.0.1',
    headers: securityHeaders,
  },
})
