import 'server-only'
import { createClient } from '@supabase/supabase-js'

// Cliente con permisos totales. SOLO en el servidor y SOLO después de verificar que es el admin.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
