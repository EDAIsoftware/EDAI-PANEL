import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { bs, diasHasta, fechaCorta } from '@/lib/utils'
import { RUBROS } from '@/lib/rubros'

type Fila = {
  id: string; nombre: string; slug: string; rubro: string; ciudad: string | null; plan: string
  plan_nombre: string; plan_precio: number; max_productos: number | null; vence_el: string; suspendida: boolean
  productos: number; ventas_30d: number; ventas_30d_previos: number; pedidos_30d: number; visitas_30d: number
}

function estado(t: Fila) {
  if (t.suspendida) return { txt: 'Suspendida', cls: 'chip-malo', k: 'suspendida' }
  const d = diasHasta(t.vence_el)
  if (d < 0) return { txt: `Vencida hace ${-d} d`, cls: 'chip-malo', k: 'vencida' }
  if (d <= 7) return { txt: `Vence en ${d} d`, cls: 'chip-aviso', k: 'por-vencer' }
  return { txt: `Hasta ${fechaCorta(t.vence_el)}`, cls: 'chip', k: 'activa' }
}

export default async function AdminInicio() {
  const { supabase } = await requireAdmin()
  const { data } = await supabase.from('admin_resumen').select('*').order('ventas_30d', { ascending: false })
  const tiendas = (data ?? []) as Fila[]
  const activas = tiendas.filter((t) => !['suspendida', 'vencida'].includes(estado(t).k))
  const mrr = activas.reduce((a, t) => a + Number(t.plan_precio), 0)
  const porCobrar = tiendas.filter((t) => ['vencida', 'por-vencer'].includes(estado(t).k))
  const vendido = tiendas.reduce((a, t) => a + Number(t.ventas_30d), 0)

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="titulo">Tiendas</h1><p className="subtitulo">{tiendas.length} clientes</p></div>
        <Link href="/admin/nueva" className="btn-primario">Agregar tienda</Link>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="caja border-transparent bg-chip p-4"><span className="text-sm text-suave">Ingreso mensual</span><strong className="block text-3xl font-extrabold">{bs(mrr)}</strong></div>
        <div className="caja p-4"><span className="text-sm text-suave">Tiendas activas</span><strong className="block text-3xl font-extrabold">{activas.length}</strong></div>
        <div className="caja p-4"><span className="text-sm text-suave">Por cobrar</span><strong className="block text-3xl font-extrabold">{porCobrar.length}</strong></div>
        <div className="caja p-4"><span className="text-sm text-suave">Vendido por tus clientes (30 d)</span><strong className="block text-3xl font-extrabold">{bs(vendido)}</strong></div>
      </div>

      {tiendas.length === 0 ? (
        <div className="caja p-8 text-center"><p className="font-semibold">Aún no tienes tiendas</p><p className="mt-1 text-suave">Crea la primera y mándale el acceso al dueño por WhatsApp.</p></div>
      ) : (
        <div className="caja overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead><tr className="text-[12.5px] text-suave">
              {['Tienda', 'Plan', 'Ventas 30 d', 'Tendencia', 'Pedidos', 'Visitas', 'Productos', 'Suscripción'].map((h) => <th key={h} className="border-b border-linea px-4 py-3 font-semibold">{h}</th>)}
            </tr></thead>
            <tbody>
              {tiendas.map((t) => {
                const e = estado(t)
                const tr = Number(t.ventas_30d_previos) > 0 ? Math.round((Number(t.ventas_30d) - Number(t.ventas_30d_previos)) / Number(t.ventas_30d_previos) * 100) : null
                const uso = t.max_productos ? t.productos / t.max_productos : 0
                return (
                  <tr key={t.id} className="border-t border-linea hover:bg-sup2">
                    <td className="px-4 py-3"><Link href={`/admin/tiendas/${t.id}`} className="flex items-center gap-3">
                      <span className="text-xl">{RUBROS[t.rubro]?.e ?? '🏪'}</span>
                      <span><b className="block">{t.nombre}</b><small className="text-suave">{RUBROS[t.rubro]?.n} · {t.ciudad}</small></span></Link></td>
                    <td className="px-4 py-3">{t.plan_nombre}{uso >= 0.8 && <span className="chip ml-2" title="Cerca del límite: ofrécele un plan mejor">↑</span>}</td>
                    <td className="px-4 py-3 tabular-nums">{bs(t.ventas_30d)}</td>
                    <td className={`px-4 py-3 tabular-nums ${tr === null ? 'text-suave' : tr >= 0 ? 'text-chiptinta' : 'text-malo'}`}>{tr === null ? '—' : `${tr >= 0 ? '▲' : '▼'} ${Math.abs(tr)}%`}</td>
                    <td className="px-4 py-3 tabular-nums">{t.pedidos_30d}</td>
                    <td className="px-4 py-3 tabular-nums">{t.visitas_30d}</td>
                    <td className="px-4 py-3 tabular-nums">{t.productos}{t.max_productos ? ` / ${t.max_productos}` : ''}</td>
                    <td className="px-4 py-3"><span className={e.cls}>{e.txt}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
