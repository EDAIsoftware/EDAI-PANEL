'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { codigo, especificaciones, estiloAgente, mensajeVisita, precioTexto, titularPropiedad, wa, type DatosAgente, type Propiedad } from './comun'

export default function PaginaPropiedad({ t, x, clave, base }: { t: DatosAgente; x: Propiedad; clave: string; base: string }) {
  const p = t.perfil ?? {}
  const e = estiloAgente(p.estilo)
  const [foto, setFoto] = useState(0)
  const [copiado, setCopiado] = useState(false)
  const cerrada = x.estado_inmueble !== 'Disponible'
  const cod = codigo(t.prefijo, x.numero)
  const donde = [x.zona, t.ciudad].filter(Boolean).join(', ')

  useEffect(() => {
    const k = `vista-${x.id}`
    try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1') } catch {}
    createClient().rpc('registrar_vista_producto', { p_tienda: clave, p_producto: x.id, p_tipo: 'vista' }).then(() => {})
  }, [x.id, clave])

  function clicWhatsApp() {
    createClient().rpc('registrar_vista_producto', { p_tienda: clave, p_producto: x.id, p_tipo: 'whatsapp' }).then(() => {})
  }
  async function compartir() {
    const url = window.location.href
    const texto = `${x.nombre} · ${precioTexto(x)}`
    try {
      if (navigator.share) await navigator.share({ title: x.nombre, text: texto, url })
      else { await navigator.clipboard.writeText(url); setCopiado(true); setTimeout(() => setCopiado(false), 1800) }
    } catch {}
  }

  const boton = { background: e.acento, color: e.sobreAcento }
  return (
    <div className="min-h-screen pb-28" style={{ background: e.fondo, color: e.texto }}>
      <header className="sticky top-0 z-20 border-b backdrop-blur" style={{ background: e.fondo + 'e6', borderColor: e.linea }}>
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <a href={base || '/'} className="text-sm underline" style={{ color: e.suave }}>← Todas las propiedades</a>
          <span className="ml-auto text-xs" style={{ color: e.suave }}>{cod}</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl">
        {/* Galería deslizable */}
        <div className="relative">
          <div className="flex snap-x snap-mandatory overflow-x-auto" style={{ scrollbarWidth: 'none' }}
            onScroll={(ev) => { const el = ev.currentTarget; setFoto(Math.round(el.scrollLeft / el.clientWidth)) }}>
            {(x.fotos.length ? x.fotos : ['']).map((f, i) => (
              <div key={i} className="aspect-[4/3] w-full flex-none snap-center sm:aspect-[16/10]" style={{ background: e.linea }}>
                {f && <img src={f} alt={`${x.nombre} · foto ${i + 1}`} className="h-full w-full object-cover" loading={i ? 'lazy' : 'eager'} />}
              </div>
            ))}
          </div>
          {x.fotos.length > 1 && <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs text-white">{foto + 1} / {x.fotos.length}</span>}
          <span className="absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold" style={boton}>{x.operacion || 'Venta'}</span>
          {cerrada && <span className="absolute inset-x-0 bottom-0 bg-black/70 py-2 text-center text-sm font-bold uppercase tracking-widest text-white">{x.estado_inmueble}</span>}
        </div>

        <div className="px-4">
          <section className="py-6">
            <p className="text-3xl font-bold" style={{ color: e.acento }}>{precioTexto(x)}</p>
            <h1 className="mt-1 text-2xl font-bold leading-snug" style={{ fontFamily: 'Georgia, serif' }}>{x.nombre}</h1>
            <p style={{ color: e.suave }}>{titularPropiedad(x)}</p>
            {x.etiquetas.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{x.etiquetas.map((g) => <span key={g} className="rounded-full border px-3 py-0.5 text-xs" style={{ borderColor: e.acento, color: e.acento }}>{g}</span>)}</div>}
          </section>

          {especificaciones(x).length > 0 && (
            <section className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {especificaciones(x).map((s) => (
                <div key={s.k} className="rounded-xl border p-3 text-center" style={{ background: e.tarjeta, borderColor: e.linea }}>
                  <b className="block text-lg">{s.v}</b><small style={{ color: e.suave }}>{s.t}</small>
                </div>
              ))}
            </section>
          )}

          {x.descripcion && (
            <section className="mt-6">
              <h2 className="mb-2 text-lg font-bold">Descripción</h2>
              <p className="whitespace-pre-line leading-relaxed" style={{ color: e.suave }}>{x.descripcion}</p>
            </section>
          )}

          {donde && (
            <section className="mt-6">
              <h2 className="mb-2 text-lg font-bold">Ubicación</h2>
              <a className="inline-block rounded-xl border px-4 py-2.5 text-sm font-semibold" style={{ borderColor: e.linea }}
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(donde)}`} target="_blank" rel="noopener noreferrer">📍 {donde} · ver en el mapa</a>
              <p className="mt-1 text-xs" style={{ color: e.suave }}>La dirección exacta se comparte al agendar la visita.</p>
            </section>
          )}

          <section className="mt-8 flex items-center gap-4 rounded-2xl border p-4" style={{ background: e.tarjeta, borderColor: e.linea }}>
            <div className="h-16 w-16 flex-none overflow-hidden rounded-2xl" style={{ background: e.linea }}>
              {p.foto && <img src={p.foto} alt={`Foto de ${t.nombre}`} className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1"><b className="block">{t.nombre}</b><small style={{ color: e.suave }}>{p.cargo || 'Asesor inmobiliario'}{p.inmobiliaria ? ` · ${p.inmobiliaria}` : ''}</small></div>
            <a href={base || '/'} className="text-sm underline" style={{ color: e.acento }}>Ver más</a>
          </section>
          <p className="mt-6 text-center text-xs" style={{ color: e.suave }}>Código de la propiedad: {cod} · Página creada por <a href="https://www.edaisoftware.com" className="underline">EDAI</a></p>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]" style={{ background: e.fondo + 'f2', borderColor: e.linea }}>
        <div className="mx-auto flex max-w-3xl gap-2">
          <button onClick={compartir} className="rounded-xl border px-4 py-3.5 text-sm font-semibold" style={{ borderColor: e.linea }}>{copiado ? 'Enlace copiado' : 'Compartir'}</button>
          {!cerrada && t.whatsapp
            ? <a href={wa(t.whatsapp, mensajeVisita(t.prefijo, x))} onClick={clicWhatsApp} target="_blank" rel="noopener noreferrer" className="flex-1 rounded-xl py-3.5 text-center font-semibold" style={boton}>Agendar visita por WhatsApp</a>
            : <span className="flex-1 rounded-xl py-3.5 text-center font-semibold" style={{ background: e.tarjeta, color: e.suave }}>Esta propiedad está {x.estado_inmueble.toLowerCase()}</span>}
        </div>
      </div>
    </div>
  )
}
