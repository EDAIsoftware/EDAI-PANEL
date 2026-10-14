import Link from 'next/link'
import { cargarTienda } from '@/lib/tienda'
import { bs, fechaHora } from '@/lib/utils'
import EstadoVenta from './EstadoVenta'

export default async function Ventas() {
  const { supabase, tienda } = await cargarTienda()
  if (!tienda) return null
  const { data } = await supabase.from('ventas')
    .select('*, venta_items(nombre, cantidad, unidad, precio, producto_numero)')
    .eq('tienda_id', tienda.id).order('creado_en', { ascending: false }).limit(200)
  const ventas = data ?? []
  const validas = ventas.filter((v) => v.estado !== 'Cancelado')
  const canales = ['Tienda física', 'WhatsApp', 'Teléfono', 'Redes sociales', 'Tienda web']
  const porCanal = (c: string) => validas.filter((v) => v.canal === c).reduce((a, v) => a + Number(v.total), 0)

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="titulo">Ventas y pedidos</h1>
          <p className="subtitulo">Los de tu tienda web llegan solos; las del local, WhatsApp o teléfono regístralas aquí</p></div>
        <Link href="/panel/ventas/nueva" className="btn-primario">Registrar venta</Link>
      </div>
      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-suave">
        <span>Total: <b className="text-tinta">{bs(validas.reduce((a, v) => a + Number(v.total), 0))}</b></span>
        {canales.filter(porCanal).map((c) => <span key={c}>{c}: <b className="text-tinta">{bs(porCanal(c))}</b></span>)}
      </div>
      <div className="caja">
        {ventas.length === 0 && <p className="p-5 text-suave">Aún no hay ventas. Registra una o comparte tu tienda.</p>}
        {ventas.map((v) => {
          const items = (v.venta_items ?? []) as { nombre: string; cantidad: number; unidad: string }[]
          const det = items.length === 1 ? `${Number(items[0].cantidad)} ${items[0].unidad} ${items[0].nombre}` : `${items.length} productos`
          return (
            <div key={v.id} className={`flex flex-wrap items-center gap-3 border-t border-linea px-4 py-3 first:border-t-0 ${v.estado === 'Cancelado' ? 'opacity-55' : ''}`}>
              <div className="min-w-0 flex-1">
                <b>{v.cliente || 'Cliente sin nombre'} <small className="text-suave">#{v.id}</small></b>
                <small className="block text-suave">{det} · {bs(v.total)} · {v.canal} · {v.pago}{v.entrega === 'Delivery' ? ` · delivery${v.zona ? ' a ' + v.zona : ''}` : ''} · {fechaHora(v.creado_en)}</small>
                {v.nota && <small className="block text-suave">Nota: {v.nota}</small>}
              </div>
              <EstadoVenta id={v.id} estado={v.estado} telefono={v.telefono} cliente={v.cliente}
                resumen={items.map((i) => `- ${Number(i.cantidad)} ${i.unidad} ${i.nombre}`).join('\n')} total={Number(v.total)} tienda={tienda.nombre} />
            </div>
          )
        })}
      </div>
    </>
  )
}
