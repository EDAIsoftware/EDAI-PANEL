import { createAdminClient } from '@/lib/supabase/admin'

// Sirve las páginas modelo (demos) que subes desde tu panel, sin tener que publicarlas en Vercel.
// Se muestran en demos.edaisoftware.com, aisladas del panel: no pueden leer sesiones ni cookies.
export const dynamic = 'force-dynamic'

const noEncontrada = () => new Response('<!doctype html><meta charset="utf-8"><title>Demo no disponible</title><p style="font-family:system-ui;padding:40px;text-align:center">Esta demo no está disponible.</p>',
  { status: 404, headers: { 'content-type': 'text/html; charset=utf-8' } })

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const admin = createAdminClient()
  const { data: demo } = await admin.from('demos').select('id, archivo, visitas, activo').eq('slug', slug.toLowerCase()).maybeSingle()
  if (!demo || !demo.activo) return noEncontrada()
  const { data: archivo } = await admin.storage.from('demos').download(demo.archivo)
  if (!archivo) return noEncontrada()
  await admin.from('demos').update({ visitas: (demo.visitas ?? 0) + 1 }).eq('id', demo.id)
  // Enlace personal (?e=código): registra que esa persona abrió la demo
  const codigoEnvio = new URL(req.url).searchParams.get('e')
  if (codigoEnvio && /^[a-z0-9]{6,12}$/.test(codigoEnvio)) {
    const { data: env } = await admin.from('demo_envios').select('id, aperturas, primera_apertura').eq('codigo', codigoEnvio).eq('demo_id', demo.id).maybeSingle()
    if (env) {
      const ahora = new Date().toISOString()
      await admin.from('demo_envios').update({ aperturas: (env.aperturas ?? 0) + 1, ultima_apertura: ahora, primera_apertura: env.primera_apertura ?? ahora }).eq('id', env.id)
    }
  }
  return new Response(await archivo.text(), {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      // Aísla la demo: puede usar sus scripts y abrir WhatsApp, pero no accede a nada de la plataforma
      'content-security-policy': 'sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals',
      'x-robots-tag': 'noindex',
    },
  })
}
