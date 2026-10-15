import Lateral from '@/components/Lateral'
import { requireAdmin } from '@/lib/auth'
import { analizarTiendas, estadoDe, type FilaTienda } from '@/lib/analisis'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireAdmin()
  const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' })
  const [{ data }, { count: evSinPagar }, { count: seguimientos }] = await Promise.all([
    supabase.from('admin_resumen').select('*'),
    supabase.from('eventos').select('*', { count: 'exact', head: true }).eq('pagado', false),
    supabase.from('crm_prospectos').select('*', { count: 'exact', head: true }).lte('proxima_fecha', hoy).not('etapa', 'in', '("Ganado","Perdido")'),
  ])
  const filas = (data ?? []) as FilaTienda[]
  const oportunidades = (await analizarTiendas(filas)).filter((t) => t.tipo).length
  const cobros = filas.filter((t) => ['vencida', 'por-vencer'].includes(estadoDe(t).k)).length + (evSinPagar ?? 0)

  return (
    <div className="md:flex">
      <Lateral marca="EDAI" sub="Panel maestro" usuario={user.email || ''} pie="Administrador"
        items={[
          { grupo: 'Negocio', href: '/admin', texto: 'Resumen', icono: 'resumen' },
          { grupo: 'Negocio', href: '/admin/tiendas', texto: 'Tiendas', icono: 'tiendas' },
          { grupo: 'Negocio', href: '/admin/eventos', texto: 'Invitaciones', icono: 'invitaciones' },
          { grupo: 'Negocio', href: '/admin/oportunidades', texto: 'Oportunidades', icono: 'oportunidades', contador: oportunidades },
          { grupo: 'Negocio', href: '/admin/cobros', texto: 'Cobros', icono: 'cobros', contador: cobros },
          { grupo: 'Negocio', href: '/admin/planes', texto: 'Planes', icono: 'planes' },
          { grupo: 'CRM', href: '/admin/crm', texto: 'Inicio CRM', icono: 'crm' },
          { grupo: 'CRM', href: '/admin/crm/prospectos', texto: 'Prospectos', icono: 'embudo', contador: seguimientos ?? 0 },
          { grupo: 'CRM', href: '/admin/crm/clientes', texto: 'Clientes', icono: 'invitados' },
          { grupo: 'CRM', href: '/admin/crm/ventas', texto: 'Ventas', icono: 'ventas' },
          { grupo: 'CRM', href: '/admin/crm/servicios', texto: 'Servicios', icono: 'productos' },
          { grupo: 'CRM', href: '/admin/crm/gastos', texto: 'Gastos', icono: 'recibo' },
          { grupo: 'Seguridad', href: '/admin/boveda/clientes', texto: 'Claves de clientes', icono: 'boveda' },
          { grupo: 'Seguridad', href: '/admin/boveda/edai', texto: 'Cuentas de EDAI', icono: 'llave' },
        ]} />
      <main className="w-full max-w-6xl p-5 md:p-10">{children}</main>
    </div>
  )
}
