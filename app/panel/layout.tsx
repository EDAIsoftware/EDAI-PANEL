import { redirect } from 'next/navigation'
import Lateral from '@/components/Lateral'
import { getSesion } from '@/lib/auth'
import { PLANES, esPlan } from '@/lib/planes'
import { PLANES_EVENTO, TIPOS_EVENTO, esPlanEvento, esTipo } from '@/lib/eventos'
import { fechaCorta } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const PALETAS = ['verde', 'negro', 'blanco', 'rosado']

function Pausado({ que }: { que: string }) {
  return (
    <main className="grid min-h-screen place-items-center p-6 text-center">
      <div className="caja max-w-md p-8">
        <h1 className="text-2xl font-extrabold">Tu {que} está pausada</h1>
        <p className="mt-2 text-suave">Escríbele a EDAI para reactivarla. Tus datos siguen guardados.</p>
        <form action="/auth/salir" method="post"><button className="btn-borde mt-5">Cerrar sesión</button></form>
      </div>
    </main>
  )
}

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, perfil } = await getSesion()
  if (!user || !perfil || !perfil.activo) redirect('/login')
  if (perfil.rol === 'admin') redirect('/admin')

  // ---------- Cliente de invitación ----------
  if (perfil.evento_id) {
    const { data: ev } = await supabase.from('eventos').select('nombre, tipo, plan, fecha').eq('id', perfil.evento_id).maybeSingle()
    if (!ev) return <Pausado que="invitación" />
    const planId: string = ev.plan
    const plan = esPlanEvento(planId) ? PLANES_EVENTO[planId] : PLANES_EVENTO.completa
    const tipoId: string = ev.tipo
    const tipo = esTipo(tipoId) ? TIPOS_EVENTO[tipoId] : TIPOS_EVENTO.otro
    return (
      <div className="md:flex">
        <Lateral marca={ev.nombre} sub={`${tipo.e} Invitación por EDAI`} usuario={user.email || ''}
          pie={`Plan ${plan.nombre} · evento el ${fechaCorta(ev.fecha)}`}
          items={[
            { href: '/panel/evento', texto: 'Resumen', icono: 'resumen' },
            { href: '/panel/evento/invitados', texto: plan.pases ? 'Invitados' : 'Confirmaciones', icono: 'invitados' },
            { href: '/panel/evento/editar', texto: 'Mi invitación', icono: 'editar' },
          ]} />
        <main className="w-full max-w-5xl p-5 md:p-10">{children}</main>
      </div>
    )
  }

  // ---------- Dueño de tienda ----------
  const { data: tienda } = await supabase.from('tiendas').select('nombre, logo_url, plan, vence_el, tema').eq('id', perfil.tienda_id).maybeSingle()
  if (!tienda) return <Pausado que="tienda" />
  const planId: string = tienda.plan
  const plan = esPlan(planId) ? PLANES[planId] : PLANES.emprende
  const paleta = PALETAS.includes(tienda.tema?.panel) ? tienda.tema.panel : 'verde'
  return (
    <div data-paleta={paleta} className="min-h-screen bg-fondo text-tinta md:flex">
      <Lateral marca={tienda.nombre} sub="Tienda por EDAI" logo={tienda.logo_url} usuario={user.email || ''}
        pie={`Plan ${plan.nombre} · vence el ${fechaCorta(tienda.vence_el)}`}
        items={[
          { href: '/panel', texto: 'Hoy', icono: 'hoy' },
          { href: '/panel/productos', texto: 'Productos', icono: 'productos' },
          { href: '/panel/ventas', texto: 'Ventas', icono: 'ventas' },
          { href: '/panel/apariencia', texto: 'Apariencia', icono: 'apariencia' },
          { href: '/panel/suscripcion', texto: 'Suscripción', icono: 'suscripcion' },
        ]} />
      <main className="w-full max-w-5xl p-5 md:p-10">{children}</main>
    </div>
  )
}
