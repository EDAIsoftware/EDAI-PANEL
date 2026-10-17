'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { codigo, especificaciones, estiloAgente, mensajeVisita, precioTexto, titularPropiedad, wa, type DatosAgente, type Propiedad } from './comun'

const OPERACIONES = ['Venta', 'Alquiler', 'Anticrético', 'Preventa']
const TIPOS = ['Casa', 'Departamento', 'Terreno', 'Oficina', 'Local comercial', 'Quinta', 'Otro']

export default function LandingAgente({ t, clave, base }: { t: DatosAgente; clave: string; base: string }) {
  const p = t.perfil ?? {}
  const e = estiloAgente(p.estilo)
  const [op, setOp] = useState('Todas')
  const [form, setForm] = useState({ nombre: '', telefono: '', inmueble: 'Casa', operacion: 'Venta', zona: '', mensaje: '' })
  const [envio, setEnvio] = useState<'' | 'enviando' | 'listo'>('')
  const [err, setErr] = useState('')

  useEffect(() => {
    const k = 'visita-' + t.slug
    try { if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1') } catch {}
    createClient().rpc('registrar_visita', { p_tienda: clave }).then(() => {})
  }, [t.slug, clave])

  const operaciones = useMemo(() => OPERACIONES.filter((o) => t.productos.some((x) => x.operacion === o)), [t.productos])
  const lista = t.productos.filter((x) => op === 'Todas' || x.operacion === op)
  const iniciales = t.nombre.split(' ').map((w) => w[0]).slice(0, 2).join('')

  function clicWhatsApp(x: Propiedad) {
    createClient().rpc('registrar_vista_producto', { p_tienda: clave, p_producto: x.id, p_tipo: 'whatsapp' }).then(() => {})
  }

  async function enviarCaptacion() {
    setErr('')
    if (!form.nombre.trim() || form.telefono.replace(/\D/g, '').length < 7) return setErr('Escribe tu nombre y tu número de WhatsApp.')
    setEnvio('enviando')
    const { error } = await createClient().rpc('crear_contacto', {
      p_tienda: clave, p_tipo: 'captacion', p_nombre: form.nombre, p_telefono: form.telefono, p_inmueble: form.inmueble,
      p_zona: form.zona, p_operacion: form.operacion, p_mensaje: form.mensaje, p_producto: null,
    })
    if (error) { setEnvio(''); return setErr(error.message || 'No se pudo enviar. Intenta de nuevo.') }
    setEnvio('listo')
  }

  const boton = { background: e.acento, color: e.sobreAcento }
  const tarjeta = { background: e.tarjeta, borderColor: e.linea }
  const campo = 'w-full rounded-xl border px-4 py-3 text-[15px] outline-none'
  const estiloCampo = { background: e.fondo, borderColor: e.linea, color: e.texto }

  return (
    <div className="min-h-screen pb-24" style={{ background: e.fondo, color: e.texto }}>
      {/* Barra superior */}
      <header className="sticky top-0 z-20 border-b backdrop-blur" style={{ background: e.fondo + 'e6', borderColor: e.linea }}>
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <div className="h-9 w-9 overflow-hidden rounded-full" style={{ background: e.tarjeta }}>
            {p.foto ? <img src={p.foto} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-sm font-bold" style={{ color: e.acento }}>{iniciales}</span>}
          </div>
          <div className="min-w-0 flex-1"><b className="block truncate text-sm">{t.nombre}</b><small className="block truncate text-xs" style={{ color: e.suave }}>{p.cargo || 'Asesor inmobiliario'}</small></div>
          {t.whatsapp && <a href={wa(t.whatsapp, `Hola ${t.nombre.split(' ')[0]}, vi tu página y quiero información.`)} target="_blank" rel="noopener noreferrer" className="rounded-full px-4 py-2 text-sm font-semibold" style={boton}>WhatsApp</a>}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4">
        {/* Presentación */}
        <section className="grid items-center gap-6 py-10 sm:grid-cols-[220px_1fr] sm:py-14">
          <div className="mx-auto h-44 w-44 overflow-hidden rounded-3xl border sm:h-56 sm:w-56" style={{ borderColor: e.linea, background: e.tarjeta }}>
            {p.foto ? <img src={p.foto} alt={`Foto de ${t.nombre}`} className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-5xl font-bold" style={{ color: e.acento }}>{iniciales}</span>}
          </div>
          <div className="text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: e.acento }}>{p.cargo || 'Asesor inmobiliario'}{p.inmobiliaria ? ` · ${p.inmobiliaria}` : ''}</p>
            <h1 className="mt-2 text-4xl font-bold leading-tight sm:text-5xl" style={{ fontFamily: 'Georgia, serif' }}>{t.nombre}</h1>
            <p className="mt-3 text-lg" style={{ color: e.suave }}>{p.frase || 'Te ayudo a encontrar el inmueble ideal, sin perder tiempo.'}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm sm:justify-start">
              {p.experiencia && <span className="rounded-full border px-3 py-1" style={{ borderColor: e.linea }}>{p.experiencia}</span>}
              {p.zonas && <span className="rounded-full border px-3 py-1" style={{ borderColor: e.linea }}>Zonas: {p.zonas}</span>}
              <span className="rounded-full border px-3 py-1" style={{ borderColor: e.linea }}>{t.productos.length} {t.productos.length === 1 ? 'propiedad' : 'propiedades'}</span>
            </div>
            <div className="mt-6 flex flex-wrap justify-center gap-3 sm:justify-start">
              <a href="#propiedades" className="rounded-full px-6 py-3 font-semibold" style={boton}>Ver propiedades</a>
              <a href="#vender" className="rounded-full border px-6 py-3 font-semibold" style={{ borderColor: e.acento, color: e.acento }}>Quiero vender mi inmueble</a>
            </div>
          </div>
        </section>

        {/* Propiedades */}
        <section id="propiedades" className="scroll-mt-20">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-2xl font-bold" style={{ fontFamily: 'Georgia, serif' }}>Propiedades disponibles</h2>
            {operaciones.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {['Todas', ...operaciones].map((o) => (
                  <button key={o} onClick={() => setOp(o)} className="rounded-full border px-4 py-1.5 text-sm"
                    style={op === o ? { ...boton, borderColor: e.acento } : { borderColor: e.linea }}>{o}</button>
                ))}
              </div>
            )}
          </div>
          {lista.length === 0 && <p className="rounded-2xl border p-8 text-center" style={{ ...tarjeta, color: e.suave }}>Pronto publicaré nuevas propiedades. Escríbeme y te aviso primero.</p>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lista.map((x) => {
              const cerrada = x.estado_inmueble !== 'Disponible'
              return (
                <article key={x.id} className="overflow-hidden rounded-2xl border" style={tarjeta}>
                  <a href={`${base}/p/${x.numero}`} className="relative block aspect-[4/3]" style={{ background: e.linea }}>
                    {x.fotos[0] && <img src={x.fotos[0]} alt={x.nombre} loading="lazy" className={`h-full w-full object-cover ${cerrada ? 'opacity-60' : ''}`} />}
                    <span className="absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-bold" style={boton}>{x.operacion || 'Venta'}</span>
                    {cerrada && <span className="absolute inset-x-0 bottom-0 bg-black/70 py-2 text-center text-sm font-bold uppercase tracking-widest text-white">{x.estado_inmueble}</span>}
                    {x.fotos.length > 1 && !cerrada && <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white">{x.fotos.length} fotos</span>}
                  </a>
                  <div className="p-4">
                    <p className="text-xl font-bold" style={{ color: e.acento }}>{precioTexto(x)}</p>
                    <h3 className="mt-1 font-semibold leading-snug">{x.nombre}</h3>
                    <p className="text-sm" style={{ color: e.suave }}>{titularPropiedad(x)}</p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm" style={{ color: e.suave }}>
                      {especificaciones(x).slice(0, 4).map((s) => <span key={s.k}><b style={{ color: e.texto }}>{s.v}</b> {s.t}</span>)}
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <a href={`${base}/p/${x.numero}`} className="rounded-xl border py-2.5 text-center text-sm font-semibold" style={{ borderColor: e.linea }}>Ver detalles</a>
                      {!cerrada && t.whatsapp
                        ? <a href={wa(t.whatsapp, mensajeVisita(t.prefijo, x))} onClick={() => clicWhatsApp(x)} target="_blank" rel="noopener noreferrer" className="rounded-xl py-2.5 text-center text-sm font-semibold" style={boton}>Agendar visita</a>
                        : <span className="rounded-xl py-2.5 text-center text-sm" style={{ color: e.suave }}>{codigo(t.prefijo, x.numero)}</span>}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>

        {/* Sobre mí */}
        {p.bio && (
          <section className="mt-16 rounded-3xl border p-6 sm:p-10" style={tarjeta}>
            <h2 className="text-2xl font-bold" style={{ fontFamily: 'Georgia, serif' }}>Sobre mí</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed" style={{ color: e.suave }}>{p.bio}</p>
          </section>
        )}

        {/* Captación de dueños */}
        <section id="vender" className="mt-16 scroll-mt-20 rounded-3xl border p-6 sm:p-10" style={tarjeta}>
          <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: e.acento }}>Para propietarios</p>
          <h2 className="mt-2 text-2xl font-bold sm:text-3xl" style={{ fontFamily: 'Georgia, serif' }}>¿Quieres vender o alquilar tu inmueble?</h2>
          <p className="mt-2" style={{ color: e.suave }}>{p.captacion || 'Lo promociono con fotos profesionales, una página propia para tu inmueble y te informo cada semana cuántas personas se interesaron.'}</p>
          {envio === 'listo' ? (
            <div className="mt-6 rounded-2xl p-6 text-center" style={{ background: e.fondo }}>
              <p className="text-xl font-bold" style={{ color: e.acento }}>¡Gracias, {form.nombre.split(' ')[0]}!</p>
              <p className="mt-1" style={{ color: e.suave }}>Te escribiré muy pronto por WhatsApp.</p>
            </div>
          ) : (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <input className={campo} style={estiloCampo} placeholder="Tu nombre" value={form.nombre} onChange={(x) => setForm({ ...form, nombre: x.target.value })} aria-label="Tu nombre" />
              <input className={campo} style={estiloCampo} placeholder="Tu WhatsApp" inputMode="tel" value={form.telefono} onChange={(x) => setForm({ ...form, telefono: x.target.value })} aria-label="Tu WhatsApp" />
              <select className={campo} style={estiloCampo} value={form.inmueble} onChange={(x) => setForm({ ...form, inmueble: x.target.value })} aria-label="Tipo de inmueble">{TIPOS.map((o) => <option key={o}>{o}</option>)}</select>
              <select className={campo} style={estiloCampo} value={form.operacion} onChange={(x) => setForm({ ...form, operacion: x.target.value })} aria-label="Quiero">{['Venta', 'Alquiler', 'Anticrético'].map((o) => <option key={o} value={o}>Quiero {o === 'Venta' ? 'vender' : o === 'Alquiler' ? 'alquilar' : 'dar en anticrético'}</option>)}</select>
              <input className={`${campo} sm:col-span-2`} style={estiloCampo} placeholder="Zona o barrio" value={form.zona} onChange={(x) => setForm({ ...form, zona: x.target.value })} aria-label="Zona" />
              <textarea className={`${campo} min-h-[90px] sm:col-span-2`} style={estiloCampo} placeholder="Cuéntame un poco del inmueble (opcional)" value={form.mensaje} onChange={(x) => setForm({ ...form, mensaje: x.target.value })} aria-label="Mensaje" />
              {err && <p role="alert" className="text-sm text-red-500 sm:col-span-2">{err}</p>}
              <button disabled={envio === 'enviando'} onClick={enviarCaptacion} className="rounded-xl py-3.5 font-semibold disabled:opacity-60 sm:col-span-2" style={boton}>
                {envio === 'enviando' ? 'Enviando…' : 'Quiero que me contacten'}
              </button>
            </div>
          )}
        </section>

        <footer className="mt-14 flex flex-col items-center gap-3 text-sm" style={{ color: e.suave }}>
          <div className="flex gap-4">
            {p.instagram && <a className="underline" href={`https://instagram.com/${p.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer">Instagram</a>}
            {p.facebook && <a className="underline" href={p.facebook} target="_blank" rel="noopener noreferrer">Facebook</a>}
            {p.tiktok && <a className="underline" href={`https://tiktok.com/@${p.tiktok.replace('@', '')}`} target="_blank" rel="noopener noreferrer">TikTok</a>}
          </div>
          <p className="text-xs">Página creada por <a href="https://www.edaisoftware.com" className="underline">EDAI</a></p>
        </footer>
      </main>

      {t.whatsapp && (
        <a href={wa(t.whatsapp, `Hola ${t.nombre.split(' ')[0]}, vi tu página y quiero información.`)} target="_blank" rel="noopener noreferrer"
          className="fixed bottom-5 right-5 z-30 grid h-14 w-14 place-items-center rounded-full shadow-xl sm:hidden" style={{ background: '#25d366' }} aria-label="Escribir por WhatsApp">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="#fff" aria-hidden><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.7 1.2 1.6 2 1.1 1 2 1.3 2.3 1.4.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l1.9.9c.3.1.5.2.5.3.1.2.1.8-.1 1.3z" /></svg>
        </a>
      )}
    </div>
  )
}
