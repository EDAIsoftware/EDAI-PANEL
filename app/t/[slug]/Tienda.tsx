'use client'

/*
  Plantilla base de tienda. Las tiendas con diseño a medida reemplazan este archivo
  (o usan uno propio) pero siguen usando los mismos datos: tienda_publica y crear_pedido.
*/

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { bs, waLink } from '@/lib/utils'

export type ProductoPublico = {
  id: string; numero: number; nombre: string; descripcion: string | null; precio: number; precio_oferta: number | null
  categoria: string | null; unidad: string; fotos: string[]; destacado: boolean; etiquetas: string[]; variantes: string[]; agotado: boolean
}
export type DatosTienda = {
  id: string; nombre: string; slug: string; whatsapp: string | null; ciudad: string | null; logo_url: string | null
  tema: { primario?: string } | null; rubro: string; categorias: string[]; productos: ProductoPublico[]
}
type Linea = { p: ProductoPublico; cantidad: number }

const precioDe = (p: ProductoPublico) => (p.precio_oferta !== null ? Number(p.precio_oferta) : Number(p.precio))
const paso = (u: string) => (u === 'Kg' ? 0.5 : 1)

export default function Tienda({ t, clave }: { t: DatosTienda; clave: string }) {
  const color = t.tema?.primario || '#22c55e'
  const [cat, setCat] = useState<string>('Todo')
  const [carrito, setCarrito] = useState<Linea[]>([])
  const [abierto, setAbierto] = useState(false)
  const [datos, setDatos] = useState({ nombre: '', telefono: '', entrega: 'Retira en tienda', zona: '', nota: '' })
  const [enviando, setEnviando] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    const k = 'visita-' + t.slug
    try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1') } catch {}
    createClient().rpc('registrar_visita', { p_tienda: clave }).then(() => {})
  }, [t.slug, clave])

  const categorias = useMemo(() => ['Todo', ...t.categorias.filter((c) => t.productos.some((p) => p.categoria === c))], [t])
  const lista = cat === 'Todo' ? t.productos : t.productos.filter((p) => p.categoria === cat)
  const total = carrito.reduce((a, l) => a + precioDe(l.p) * l.cantidad, 0)
  const unidades = carrito.length

  function agregar(p: ProductoPublico) {
    setCarrito((c) => {
      const ex = c.find((l) => l.p.id === p.id)
      return ex ? c.map((l) => (l === ex ? { ...l, cantidad: +(l.cantidad + paso(p.unidad)).toFixed(2) } : l)) : [...c, { p, cantidad: 1 }]
    })
  }
  const cambiar = (id: string, d: number) => setCarrito((c) => c.flatMap((l) => {
    if (l.p.id !== id) return [l]
    const n = +(l.cantidad + d * paso(l.p.unidad)).toFixed(2)
    return n > 0 ? [{ ...l, cantidad: n }] : []
  }))

  async function pedir() {
    setMsg('')
    if (!datos.nombre.trim()) return setMsg('Escribe tu nombre.')
    if (datos.entrega === 'Delivery' && !datos.zona.trim()) return setMsg('Escribe tu zona o dirección.')
    setEnviando(true)
    const { data, error } = await createClient().rpc('crear_pedido', {
      p_tienda: clave, p_cliente: datos.nombre.trim(), p_telefono: datos.telefono.trim(), p_entrega: datos.entrega,
      p_zona: datos.zona.trim(), p_nota: datos.nota.trim(),
      p_items: carrito.map((l) => ({ producto_id: l.p.id, cantidad: l.cantidad })),
    })
    setEnviando(false)
    if (error || !data) return setMsg(error?.message?.includes('stock') || error?.message?.includes('disponible') ? error.message : 'No se pudo enviar el pedido. Intenta de nuevo.')
    const r = data as { id: number; total: number }
    const texto = `Hola ${t.nombre}, quiero hacer este pedido (#${r.id}):\n\n` +
      carrito.map((l) => `• ${l.cantidad} ${l.p.unidad} ${l.p.nombre} — ${bs(precioDe(l.p) * l.cantidad)}`).join('\n') +
      `\n\nTotal: ${bs(r.total)}\nNombre: ${datos.nombre}\nEntrega: ${datos.entrega}${datos.entrega === 'Delivery' ? ' a ' + datos.zona : ''}` +
      (datos.nota ? `\nNota: ${datos.nota}` : '')
    setCarrito([]); setAbierto(false)
    if (t.whatsapp) window.location.href = waLink(t.whatsapp, texto)
    else setMsg('¡Pedido enviado! La tienda te contactará pronto.')
  }

  return (
    <div className="min-h-screen bg-[#0d0f0e] pb-28 text-[#f2f4f3]">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0d0f0e]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          {t.logo_url ? <img src={t.logo_url} alt="" className="h-10 w-10 rounded-lg object-contain" />
            : <div className="grid h-10 w-10 place-items-center rounded-lg font-extrabold text-black" style={{ background: color }}>{t.nombre[0]}</div>}
          <div className="flex-1"><h1 className="text-lg font-extrabold leading-tight">{t.nombre}</h1>{t.ciudad && <p className="text-xs text-white/60">{t.ciudad}</p>}</div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3" aria-label="Categorías">
          {categorias.map((c) => (
            <button key={c} onClick={() => setCat(c)} className="whitespace-nowrap rounded-full border px-4 py-1.5 text-sm"
              style={cat === c ? { background: color, borderColor: color, color: '#000' } : { borderColor: 'rgba(255,255,255,.15)' }}>{c}</button>
          ))}
        </nav>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-4 py-5 sm:grid-cols-3 lg:grid-cols-4">
        {lista.length === 0 && <p className="col-span-full py-16 text-center text-white/60">Pronto habrá productos aquí.</p>}
        {lista.map((p) => (
          <article key={p.id} className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[.03]">
            <div className="relative aspect-square bg-white/5">
              {p.fotos[0] ? <img src={p.fotos[0]} alt={p.nombre} loading="lazy" className="h-full w-full object-cover" /> : null}
              {p.precio_oferta !== null && <span className="absolute left-2 top-2 rounded-md px-2 py-0.5 text-xs font-bold text-black" style={{ background: color }}>Oferta</span>}
            </div>
            <div className="flex flex-1 flex-col p-3">
              <h2 className="font-semibold leading-snug">{p.nombre}</h2>
              {p.descripcion && <p className="mt-1 line-clamp-2 text-xs text-white/60">{p.descripcion}</p>}
              <p className="mt-auto pt-2">
                {p.precio_oferta !== null && <s className="mr-1.5 text-xs text-white/50">{bs(p.precio)}</s>}
                <b>{bs(precioDe(p))}</b> <small className="text-white/60">/ {p.unidad}</small>
              </p>
              <button disabled={p.agotado} onClick={() => agregar(p)} className="mt-2 rounded-lg py-2 text-sm font-bold text-black disabled:opacity-40" style={{ background: color }}>
                {p.agotado ? 'Agotado' : 'Agregar'}
              </button>
            </div>
          </article>
        ))}
      </main>

      {unidades > 0 && !abierto && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#0d0f0e]/95 p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex max-w-6xl items-center gap-3">
            <div className="flex-1"><small className="text-white/60">{unidades} producto(s)</small><b className="block text-xl">{bs(total)}</b></div>
            <button onClick={() => setAbierto(true)} className="rounded-xl px-6 py-3 font-bold text-black" style={{ background: color }}>Ver pedido</button>
          </div>
        </div>
      )}

      {abierto && (
        <div className="fixed inset-0 z-30 flex justify-end bg-black/60" onClick={() => setAbierto(false)}>
          <aside className="h-full w-full max-w-md overflow-y-auto bg-[#141716] p-5" onClick={(e) => e.stopPropagation()} aria-label="Tu pedido">
            <div className="flex items-center justify-between"><h2 className="text-xl font-extrabold">Tu pedido</h2>
              <button onClick={() => setAbierto(false)} aria-label="Cerrar" className="text-2xl text-white/60">✕</button></div>
            {carrito.map((l) => (
              <div key={l.p.id} className="flex items-center gap-3 border-b border-white/10 py-3">
                <div className="flex-1"><b className="block text-sm">{l.p.nombre}</b><small className="text-white/60">{bs(precioDe(l.p))} / {l.p.unidad}</small></div>
                <div className="flex items-center rounded-lg border border-white/15">
                  <button className="h-8 w-8" aria-label="Menos" onClick={() => cambiar(l.p.id, -1)}>−</button>
                  <span className="w-10 text-center text-sm">{l.cantidad}</span>
                  <button className="h-8 w-8" aria-label="Más" onClick={() => cambiar(l.p.id, 1)}>+</button>
                </div>
                <b className="w-20 text-right text-sm">{bs(precioDe(l.p) * l.cantidad)}</b>
              </div>
            ))}
            <div className="mt-4 grid gap-3">
              <input className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5" placeholder="Tu nombre" value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} aria-label="Tu nombre" />
              <input className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5" placeholder="Tu WhatsApp (opcional)" inputMode="tel" value={datos.telefono} onChange={(e) => setDatos({ ...datos, telefono: e.target.value })} aria-label="Tu WhatsApp" />
              <div className="flex gap-2">{['Retira en tienda', 'Delivery'].map((o) => (
                <button key={o} onClick={() => setDatos({ ...datos, entrega: o })} className="flex-1 rounded-lg border py-2 text-sm"
                  style={datos.entrega === o ? { background: color, borderColor: color, color: '#000' } : { borderColor: 'rgba(255,255,255,.15)' }}>{o}</button>
              ))}</div>
              {datos.entrega === 'Delivery' && <input className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5" placeholder="Zona o dirección" value={datos.zona} onChange={(e) => setDatos({ ...datos, zona: e.target.value })} aria-label="Zona o dirección" />}
              <input className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5" placeholder="Nota (opcional)" value={datos.nota} onChange={(e) => setDatos({ ...datos, nota: e.target.value })} aria-label="Nota" />
            </div>
            {msg && <p role="alert" className="mt-3 text-sm text-[#f2706b]">{msg}</p>}
            <div className="mt-5 flex items-center justify-between"><span className="text-white/60">Total</span><b className="text-2xl">{bs(total)}</b></div>
            <button disabled={enviando || !carrito.length} onClick={pedir} className="mt-4 w-full rounded-xl py-3.5 font-bold text-black disabled:opacity-50" style={{ background: color }}>
              {enviando ? 'Enviando…' : 'Enviar pedido por WhatsApp'}
            </button>
          </aside>
        </div>
      )}
      {msg && !abierto && <p className="mx-auto max-w-6xl px-4 text-center text-sm text-white/70">{msg}</p>}
      <footer className="py-8 text-center text-xs text-white/40">Tienda creada con <a href="https://www.edaisoftware.com" className="underline">EDAI</a></footer>
    </div>
  )
}
