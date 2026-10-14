import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// Aquí llegan los enlaces de invitación y de "olvidé mi contraseña".
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/crear-clave'
  const seguro = next.startsWith('/') && !next.startsWith('//') ? next : '/crear-clave'

  const supabase = await createClient()
  let ok = false
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    ok = !error
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    ok = !error
  }
  return NextResponse.redirect(`${origin}${ok ? seguro : '/login?error=enlace'}`)
}
