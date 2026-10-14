import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

/*
  Un solo proyecto atiende tres tipos de dirección:
    admin.edaisoftware.com      → /admin   (tu panel maestro)
    panel.edaisoftware.com      → /panel   (panel de los dueños)
    chavela.edaisoftware.com    → /t/chavela (tienda pública)
    invitaciones.edaisoftware.com/ana-y-luis → /i/ana-y-luis (invitación digital)
    www.dominiopropio.com       → /t/www.dominiopropio.com (tienda con dominio propio)
  En tu computadora entras directo: localhost:3000/admin, /panel o /t/chavela
*/

const ROOT = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'edaisoftware.com').toLowerCase()
const COMPARTIDAS = /^\/(login|crear-clave|auth|api)(\/|$)/

function destino(host: string, path: string): { ruta: string | null; esTienda: boolean } {
  const sufijo = path === '/' ? '' : path
  if (COMPARTIDAS.test(path)) return { ruta: null, esTienda: false }

  if (host === `admin.${ROOT}`) return { ruta: path.startsWith('/admin') ? null : `/admin${sufijo}`, esTienda: false }
  if (host === `panel.${ROOT}`) return { ruta: path.startsWith('/panel') ? null : `/panel${sufijo}`, esTienda: false }
  if (host === `invitaciones.${ROOT}`) return { ruta: path.startsWith('/i/') ? null : `/i${sufijo}`, esTienda: true }

  if (host.endsWith(`.${ROOT}`)) {
    const sub = host.slice(0, -(ROOT.length + 1))
    if (sub && sub !== 'www' && !sub.includes('.')) return { ruta: `/t/${sub}${sufijo}`, esTienda: true }
    return { ruta: null, esTienda: false }
  }

  const local = host === ROOT || host === 'localhost' || host === '127.0.0.1' || host.endsWith('.vercel.app')
  if (!local) return { ruta: `/t/${host}${sufijo}`, esTienda: true } // dominio propio de un cliente

  return { ruta: null, esTienda: path.startsWith('/t/') }
}

export async function middleware(request: NextRequest) {
  const host = (request.headers.get('host') || '').split(':')[0].toLowerCase()
  const { ruta, esTienda } = destino(host, request.nextUrl.pathname)

  const crear = () =>
    ruta
      ? NextResponse.rewrite(new URL(ruta + request.nextUrl.search, request.url), { request })
      : NextResponse.next({ request })

  let response = crear()

  // Las tiendas públicas no tienen sesión: no hace falta tocar Supabase.
  if (esTienda) return response

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = crear()
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )
  await supabase.auth.getUser() // refresca la sesión si hace falta

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)'],
}
