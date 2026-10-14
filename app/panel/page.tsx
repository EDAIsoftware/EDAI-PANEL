import Link from 'next/link'
import { cargarTienda } from '@/lib/tienda'
import { bs, fechaHora, urlTienda } from '@/lib/utils'

export default async function Hoy() {
  const { supabase, tienda } = await cargarTienda()
  if (!tienda) return null
  const hace7 = new Date(Date.now() - 7 * 864e5).toISOString()
  const inicioHoy = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' }) + 'T00:00:00-04:00').toISOString()

  const [{ data: semana }, { data: pendientes }, { count: publicados }] = await Promise.all([
    supabase.from('ventas').select('total, creado_en, estado').eq('tienda_id', tienda.id).gte('creado_en', hace7).neq('estado', 'Cancelado'),
    supabase.from('ventas').select('id, cliente, total, canal, estado, creado_en').eq('tienda_id', tienda.id).in('estado', ['Nuevo', 'Pendiente']).order('creado_en', { ascending: false }).limit(20),
    supabase.from('productos').select('*', { count: 'exact', head: true }).eq('tienda_id', tienda.id).eq('disponible', true),
  ])
  const hoy = (semana ?? []).filter((v) => v.creado_en >= inicioHoy)
  const total = (l: { total: number }[]) => l.reduce((a, v) => a + Number(v.total), 0)

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="titulo">Hoy</h1>
          <p className="subtitulo">{hoy.length} {hoy.length === 1 ? 'venta' : 'ventas'} hoy por {bs(total(hoy))}</p></div>
        <Link href="/panel/ventas/nueva" className="btn-primario">Registrar venta</Link>
      </div>
      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <div className="caja p-4"><span className="text-sm text-suave">Pedidos por atender</span><strong className="block text-3xl font-extrabold">{pendientes?.length ?? 0}</strong></div>
        <div className="caja p-4"><span className="text-sm text-suave">Ventas de la semana</span><strong className="block text-3xl font-extrabold">{bs(total(semana ?? []))}</strong></div>
        <div className="caja p-4"><span className="text-sm text-suave">Productos publicados</span><strong className="block text-3xl font-extrabold">{publicados ?? 0}</strong></div>
      </div>
      <h2 className="mb-3 text-lg font-bold">Pedidos por atender</h2>
      <div className="caja">
        {(pendientes ?? []).length === 0 ? <p className="p-4 text-suave">Todo al día. Comparte tu tienda: <a className="underline" href={urlTienda(tienda.slug, tienda.dominio)}>{urlTienda(tienda.slug, tienda.dominio)}</a></p>
          : pendientes!.map((v) => (
            <Link key={v.id} href="/panel/ventas" className="flex items-center gap-3 border-t border-linea px-4 py-3 first:border-t-0 hover:bg-sup2">
              <div className="flex-1"><b>{v.cliente || 'Cliente sin nombre'} <small className="text-suave">#{v.id}</small></b>
                <small className="block text-suave">{bs(v.total)} · {v.canal} · {fechaHora(v.creado_en)}</small></div>
              <span className="chip">{v.estado}</span>
            </Link>
          ))}
      </div>
    </>
  )
}
