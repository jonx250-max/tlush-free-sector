/**
 * GET /api/public-config
 * Returns Supabase URL + public anon key for client-side use.
 * These are designed-public credentials (RLS gates real access).
 */

interface VercelRequest {
  method: string
}

interface VercelResponse {
  status: (code: number) => VercelResponse
  setHeader: (name: string, value: string) => void
  json: (data: unknown) => void
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Public config not set' })
  }

  res.setHeader('Cache-Control', 'public, max-age=300')
  return res.status(200).json({ supabaseUrl, supabaseAnonKey })
}
