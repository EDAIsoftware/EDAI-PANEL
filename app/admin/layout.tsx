import Lateral from '@/components/Lateral'
import { requireAdmin } from '@/lib/auth'
import { analizarTiendas, estadoDe, type FilaTienda } from '@/lib/analisis'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user } = await requireAdmin()
  const [{ data }, { count: evSinPagar }] = await Promise.all([
    supabase.from('admin_resumen').select('*'),
    supabase.from('eventos').select('*', { count: 'exact', head: true }).eq('pagado', false),
  ])
  const filas = (data ?? []) as FilaTienda[]
  const oportunidades = (await analizarTiendas(filas)).filter((t) => t.tipo).length
  const cobros = filas.filter((t) => ['vencida', 'por-vencer'].includes(estadoDe(t).k)).length + (evSinPagar ?? 0)

  return (
    <div className="md:flex">
      <Lateral marca="EDAI" sub="Panel maestro" usuario={user.email || ''} pie="Administrador"
        items={[
          { href: '/admin', texto: 'Resumen', icono: 'resumen' },
          { href: '/admin/tiendas', texto: 'Tiendas', icono: 'tiendas' },
          { href: '/admin/eventos', texto: 'Invitaciones', icono: 'invitaciones' },
          { href: '/admin/oportunidades', texto: 'Oportunidades', icono: 'oportunidades', contador: oportunidades },
          { href: '/admin/cobros', texto: 'Cobros', icono: 'cobros', contador: cobros },
          { href: '/admin/planes', texto: 'Planes', icono: 'planes' },
        ]} />
      <main className="w-full max-w-6xl p-5 md:p-10">{children}</main>
    </div>
  )
}
