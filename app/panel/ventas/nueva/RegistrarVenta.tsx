'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { bs, codigoEdai } from '@/lib/utils'

type Prod = { id: string; numero: number; codigo: string | null; nombre: string; precio: number; precio_oferta: number | null; unidad: string; stock: number | null }
type Linea = { producto_id: string; numero: number; nombre: string; unidad: string; precio: number; cantidad: number; stock: number | null }

const CANALES = ['Tienda física', 'WhatsApp', 'Teléfono', 'Redes sociales']
const PAGOS = ['Efectivo', 'QR', 'Transferencia', 'Tarjeta']

export default function RegistrarVenta({ tiendaId, prefijo, productos, usaOferta }: { tiendaId: string; prefijo: string; productos: Prod[]; usaOferta: boolean }) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [lineas, setLineas] = useState<Linea[]>([])
  const [d, setD] = useState({ cliente: '', telefono: '', canal: 'Tienda física', pago: 'Efectivo', estado: 'Pagado', entrega: 'Retira en tienda', zona: '', nota: '', descuento: 0 })
  const [err, setErr] = useState('')
  const [guardando, setGuardando] = useState(false)
  const paso = (u: string) => (u === 'Kg' ? 0.5 : 1)

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase()
    return productos.filter((p) => !(p.stock !== null && Number(p.stock) <= 0) &&
      (!t || p.nombre.toLowerCase().includes(t) || codigoEdai(prefijo, p.numero).toLowerCase().includes(t) ||
        (p.codigo ?? '').toLowerCase().includes(t) || String(p.numero) === t.replace(/\D/g, '').replace(/^0+/, '')))
  }, [q, productos, prefijo])

  const subtotal = lineas.reduce((a, l) => a + l.precio * l.cantidad, 0)
  const total = Math.max(0, subtotal - (d.descuento || 0))

  const enCarrito = (id: string) => lineas.find((l) => l.producto_id === id)?.cantidad ?? 0
  const quedan = (p: { stock: number | null }, usado: number) => (p.stock === null ? null : +(Number(p.stock) - usado).toFixed(2))

  function agregar(p: Prod) {
    setErr('')
    const ex = lineas.find((l) => l.producto_id === p.id)
    const nueva = ex ? +(ex.cantidad + paso(ex.unidad)).toFixed(2) : 1
    if (p.stock !== null && nueva > Number(p.stock)) return setErr(`Solo hay ${Number(p.stock)} de ${p.nombre}.`)
    if (ex) return setLineas((ls) => ls.map((l) => (l.producto_id === p.id ? { ...l, cantidad: nueva } : l)))
    const precio = usaOferta && p.precio_oferta !== null ? Number(p.precio_oferta) : Number(p.precio)
    setLineas((ls) => [...ls, { producto_id: p.id, numero: p.numero, nombre: p.nombre, unidad: p.unidad, precio, cantidad: 1, stock: p.stock === null ? null : Number(p.stock) }])
  }
  const cambiar = (i: number, c: number) => {
    setErr('')
    const l = lineas[i]
    if (l.stock !== null && c > l.stock) { setErr(`Solo hay ${l.stock} de ${l.nombre}.`); c = l.stock }
    setLineas((ls) => (c <= 0 ? ls.filter((_, k) => k !== i) : ls.map((x, k) => (k === i ? { ...x, cantidad: +c.toFixed(2) } : x))))
  }

  async function guardar() {
    setErr('')
    if (!lineas.length) return setErr('Agrega al menos un producto.')
    setGuardando(true)
    const supabase = createClient()
    const { data: venta, error } = await supabase.from('ventas').insert({
      tienda_id: tiendaId, cliente: d.cliente || null, telefono: d.telefono || null, canal: d.canal, pago: d.pago,
      estado: d.estado, entrega: d.entrega, zona: d.entrega === 'Delivery' ? d.zona || null : null, nota: d.nota || null,
      descuento: d.descuento || 0, total: +total.toFixed(2),
    }).select('id').single()
    if (error || !venta) { setGuardando(false); return setErr('No se pudo guardar la venta.') }
    const { error: e2 } = await supabase.from('venta_items').insert(lineas.map((l) => ({
      venta_id: venta.id, producto_id: l.producto_id, producto_numero: l.numero, nombre: l.nombre, unidad: l.unidad, cantidad: l.cantidad, precio: l.precio,
    })))
    if (e2) {
      await supabase.from('ventas').delete().eq('id', venta.id)
      setGuardando(false)
      return setErr(e2.message.includes('stock') ? e2.message : 'No se pudo guardar el detalle de la venta.')
    }
    router.push('/panel/ventas'); router.refresh()
  }

  const opciones = (k: 'canal' | 'pago' | 'estado' | 'entrega', ops: string[]) => (
    <div className="flex flex-wrap gap-2">{ops.map((o) => (
      <button type="button" key={o} onClick={() => setD({ ...d, [k]: o })}
        className={`rounded-lg border px-3 py-1.5 text-sm ${d[k] === o ? 'border-primario bg-primario text-sobreprimario' : 'border-linea bg-sup2'}`}>{o}</button>
    ))}</div>
  )

  return (
    <>
      <h1 className="titulo">Registrar venta</h1>
      <p className="subtitulo">Para ventas en tu local, por WhatsApp o por teléfono</p>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="caja p-4">
          <h2 className="mb-3 font-bold">Productos</h2>
          <input className="campo" placeholder="Buscar por nombre o número" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar producto" />
          <div className="mt-3 grid max-h-80 grid-cols-2 gap-2 overflow-y-auto">
            {visibles.map((p) => (
              <button type="button" key={p.id} onClick={() => agregar(p)} className="rounded-lg border border-linea bg-sup2 p-2.5 text-left hover:border-acento">
                <small className="text-suave">{codigoEdai(prefijo, p.numero)}{p.codigo ? ` · ${p.codigo}` : ''}</small>
                <b className="block text-sm leading-snug">{p.nombre}</b>
                <small className="text-suave">{bs(usaOferta && p.precio_oferta !== null ? p.precio_oferta : p.precio)} / {p.unidad}</small>
                {p.stock !== null && (() => { const r = quedan(p, enCarrito(p.id))!; return (
                  <small className={`block font-semibold ${r <= 0 ? 'text-malo' : r <= 3 ? 'text-aviso' : 'text-chiptinta'}`}>
                    {r <= 0 ? 'Ya agregaste todo el stock' : `${r} disponible${r === 1 ? '' : 's'}`}</small>) })()}
              </button>
            ))}
            {visibles.length === 0 && <p className="col-span-2 py-6 text-center text-sm text-suave">No hay productos disponibles con ese nombre</p>}
          </div>
        </div>
        <div className="caja p-4">
          <h2 className="mb-1 font-bold">Detalle de la venta</h2>
          {lineas.length === 0 && <p className="py-6 text-center text-sm text-suave">Toca un producto para agregarlo</p>}
          {lineas.map((l, i) => (
            <div key={l.producto_id} className="flex items-center gap-2 border-t border-linea py-2.5 first:border-t-0">
              <div className="min-w-0 flex-1"><b className="block text-sm">{l.nombre}</b><small className="text-suave">{bs(l.precio)} / {l.unidad}{l.stock !== null ? ` · hay ${l.stock}` : ''}</small></div>
              <div className="flex items-center overflow-hidden rounded-lg border border-linea">
                <button type="button" aria-label="Menos" className="h-8 w-8 bg-sup2" onClick={() => cambiar(i, l.cantidad - paso(l.unidad))}>−</button>
                <input type="number" min="0" step="any" aria-label={`Cantidad de ${l.nombre}`} className="w-14 bg-transparent text-center" value={l.cantidad} onChange={(e) => cambiar(i, Number(e.target.value) || 0)} />
                <button type="button" aria-label="Más" className="h-8 w-8 bg-sup2" onClick={() => cambiar(i, l.cantidad + paso(l.unidad))}>+</button>
              </div>
              <b className="w-24 text-right tabular-nums">{bs(l.precio * l.cantidad)}</b>
            </div>
          ))}
          <div className="mt-3 flex items-end gap-3 border-t-2 border-linea pt-3">
            <div className="w-32"><label className="etiqueta" htmlFor="desc">Descuento (Bs.)</label>
              <input id="desc" type="number" min="0" className="campo" value={d.descuento || ''} onChange={(e) => setD({ ...d, descuento: Number(e.target.value) || 0 })} /></div>
            <div className="ml-auto text-right"><span className="text-suave">Total</span><strong className="block text-3xl font-extrabold tabular-nums">{bs(total)}</strong></div>
          </div>
        </div>
        <div className="caja grid gap-4 p-4 sm:grid-cols-2 lg:col-span-2">
          <div><label className="etiqueta" htmlFor="cli">Cliente (opcional)</label><input id="cli" className="campo" value={d.cliente} onChange={(e) => setD({ ...d, cliente: e.target.value })} /></div>
          <div><label className="etiqueta" htmlFor="tel">WhatsApp (opcional)</label><input id="tel" className="campo" inputMode="tel" placeholder="591…" value={d.telefono} onChange={(e) => setD({ ...d, telefono: e.target.value })} /></div>
          <div className="sm:col-span-2"><span className="etiqueta">Dónde se vendió</span>{opciones('canal', CANALES)}</div>
          <div><span className="etiqueta">Forma de pago</span>{opciones('pago', PAGOS)}</div>
          <div><span className="etiqueta">Estado</span>{opciones('estado', ['Pagado', 'Pendiente', 'Entregado'])}</div>
          <div><span className="etiqueta">Entrega</span>{opciones('entrega', ['Retira en tienda', 'Delivery'])}</div>
          {d.entrega === 'Delivery' && <div><label className="etiqueta" htmlFor="zona">Zona o dirección</label><input id="zona" className="campo" value={d.zona} onChange={(e) => setD({ ...d, zona: e.target.value })} /></div>}
          <div className="sm:col-span-2"><label className="etiqueta" htmlFor="nota">Nota (opcional)</label><input id="nota" className="campo" value={d.nota} onChange={(e) => setD({ ...d, nota: e.target.value })} /></div>
          {err && <p role="alert" className="text-malo sm:col-span-2">{err}</p>}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <button type="button" className="btn-borde" onClick={() => router.back()}>Cancelar</button>
            <button type="button" className="btn-primario" disabled={guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar venta'}</button>
          </div>
        </div>
      </div>
    </>
  )
}
