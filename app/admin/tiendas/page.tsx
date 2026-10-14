import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { estadoDe, type FilaTienda } from '@/lib/analisis'
import { bs } from '@/lib/utils'
import { RUBROS } from '@/lib/rubros'
import FiltroTiendas from './FiltroTiendas'

export default async function AdminTiendas({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string; plan?: string }> }) {
  const { q = '', estado = '', plan = '' } = await searchParams
  const { supabase } = await requireAdmin()
  const { data } = await supabase.from('admin_resumen').select('*').order('ventas_30d', { ascending: false })
  const todas = (data ?? []) as FilaTienda[]
  const t = q.trim().toLowerCase()
  const tiendas = todas.filter((x) => (!t || [x.nombre, x.ciudad, x.dueno_nombre, x.slug].some((v) => v && String(v).toLowerCase().includes(t)))
    && (!estado || estadoDe(x).k === estado) && (!plan || x.plan === plan))

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="titulo">Tiendas</h1><p className="subtitulo">{todas.length} clientes · toca una tienda para ver su ficha</p></div>
        <Link href="/admin/nueva" className="btn-primario">Agregar tienda</Link>
      </div>
      <FiltroTiendas q={q} estado={estado} plan={plan} />
      {tiendas.length === 0 ? (
        <div className="caja p-8 text-center text-suave">{todas.length ? 'Ninguna tienda coincide con el filtro.' : 'Aún no tienes tiendas. Crea la primera.'}</div>
      ) : (
        <div className="caja overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead><tr className="text-[12.5px] text-suave">
              {['Tienda', 'Plan', 'Ventas 30 d', 'Tendencia', 'Pedidos', 'Visitas', 'Uso del plan', 'Suscripción'].map((h) => <th key={h} className="border-b border-linea px-4 py-3 font-semibold">{h}</th>)}
            </tr></thead>
            <tbody>
              {tiendas.map((x) => {
                const e = estadoDe(x)
                const tr = Number(x.ventas_30d_previos) > 0 ? Math.round((Number(x.ventas_30d) - Number(x.ventas_30d_previos)) / Number(x.ventas_30d_previos) * 100) : null
                const uso = x.max_productos ? x.productos / x.max_productos : null
                return (
                  <tr key={x.id} className="border-t border-linea hover:bg-sup2">
                    <td className="px-4 py-3"><Link href={`/admin/tiendas/${x.id}`} className="flex items-center gap-3">
                      <span className="grid h-10 w-10 place-items-center rounded-lg border border-linea bg-sup2 text-xl">{RUBROS[x.rubro]?.e ?? '🏪'}</span>
                      <span><b className="block">{x.nombre}</b><small className="text-suave">{RUBROS[x.rubro]?.n} · {x.ciudad}</small></span></Link></td>
                    <td className="px-4 py-3">{x.plan_nombre}</td>
                    <td className="px-4 py-3 tabular-nums">{bs(x.ventas_30d)}</td>
                    <td className={`px-4 py-3 tabular-nums ${tr === null ? 'text-suave' : tr >= 0 ? 'text-chiptinta' : 'text-malo'}`}>{tr === null ? '—' : `${tr >= 0 ? '▲' : '▼'} ${Math.abs(tr)}%`}</td>
                    <td className="px-4 py-3 tabular-nums">{x.pedidos_30d}</td>
                    <td className="px-4 py-3 tabular-nums">{x.visitas_30d}</td>
                    <td className="px-4 py-3">{uso === null ? <span className="text-suave">Ilimitado</span> : <>
                      <small className="text-suave">{x.productos} / {x.max_productos}</small>
                      <div className="mt-1 h-1.5 w-24 overflow-hidden rounded bg-sup2"><div className={`h-full rounded ${uso >= 0.9 ? 'bg-malo' : uso >= 0.8 ? 'bg-aviso' : 'bg-acento'}`} style={{ width: `${Math.min(100, uso * 100)}%` }} /></div></>}</td>
                    <td className="px-4 py-3"><span className={e.cls}>{e.k === 'activa' ? 'Al día' : e.txt}</span></td>
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
