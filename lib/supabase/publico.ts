import { createClient } from '@supabase/supabase-js'

// Cliente sin sesión para las tiendas públicas (permite que Next.js guarde la página en caché)
export function createPublicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
