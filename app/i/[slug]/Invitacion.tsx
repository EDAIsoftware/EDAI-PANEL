'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TIPOS_EVENTO, estiloDe, esTipo, leerDatos, type DatosEvento } from '@/lib/eventos'

export type EventoPublico = {
  id: string; nombre: string; slug: string; tipo: string; fecha: string; estilo: string; ciudad: string | null
  datos: DatosEvento; activa: boolean
  plan: { pases: boolean; musica: boolean; regalos: boolean }
  invitado: { nombre: string; pases: number; estado: string; confirmados: number; mensaje: string | null } | null
}

const TZ = 'America/La_Paz'
const serif = { fontFamily: 'var(--font-serif), Georgia, serif' }

function cuentaRegresiva(fecha: string) {
  const ms = new Date(fecha).getTime() - Date.now()
  if (ms <= 0) return null
  return { d: Math.floor(ms / 864e5), h: Math.floor(ms / 36e5) % 24, m: Math.floor(ms / 6e4) % 60, s: Math.floor(ms / 1e3) % 60 }
}

function linkCalendario(ev: EventoPublico, lugar?: string) {
  const ini = new Date(ev.fecha), fin = new Date(ini.getTime() + 5 * 36e5)
  const f = (x: Date) => x.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const p = new URLSearchParams({ action: 'TEMPLATE', text: ev.datos.nombres ? `${ev.nombre} · ${ev.datos.nombres}` : ev.nombre, dates: `${f(ini)}/${f(fin)}` })
  if (lugar) p.set('location', lugar)
  return 'https://calendar.google.com/calendar/render?' + p.toString()
}

// Rama con hojas y flores dibujada en SVG (sin imágenes externas)
function Flores({ hoja, flor, className = '', espejo = false }: { hoja: string; flor: string; className?: string; espejo?: boolean }) {
  const hojas: [number, number, number][] = [[30, 150, -40], [52, 122, 25], [70, 104, -35], [92, 82, 30], [112, 66, -30], [138, 50, 20], [60, 140, 60], [100, 98, 70]]
  const flores: [number, number, number][] = [[150, 36, 13], [120, 80, 10], [76, 122, 9]]
  return (
    <svg viewBox="0 0 200 200" className={className} style={espejo ? { transform: 'scaleX(-1)' } : undefined} aria-hidden>
      <path d="M8 196 C 40 150, 80 110, 165 30" fill="none" stroke={hoja} strokeWidth="2" strokeLinecap="round" />
      <path d="M60 140 C 70 160, 95 170, 120 168" fill="none" stroke={hoja} strokeWidth="1.5" strokeLinecap="round" opacity=".8" />
      {hojas.map(([x, y, r], i) => <ellipse key={i} cx={x} cy={y} rx="13" ry="5.5" fill={hoja} opacity={0.75 + (i % 3) * 0.08} transform={`rotate(${r} ${x} ${y})`} />)}
      {flores.map(([x, y, t], i) => (
        <g key={i}>
          {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx={x} cy={y - t * 0.55} rx={t * 0.45} ry={t * 0.62} fill={flor} transform={`rotate(${a} ${x} ${y})`} />)}
          <circle cx={x} cy={y} r={t * 0.28} fill={hoja} opacity=".9" />
        </g>
      ))}
    </svg>
  )
}

const icNav: Record<string, string> = {
  inicio: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  lugares: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  confirmar: 'M22 6 12 13 2 6M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  galeria: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21',
  regalos: 'M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z',
}

export default function Invitacion({ ev: crudo, codigo }: { ev: EventoPublico; codigo: string | null }) {
  const ev = { ...crudo, datos: leerDatos(crudo.datos) }
  const d = ev.datos
  const e = estiloDe(ev.estilo)
  const tipo = esTipo(ev.tipo) ? TIPOS_EVENTO[ev.tipo] : TIPOS_EVENTO.otro
  const [cr, setCr] = useState(cuentaRegresiva(ev.fecha))
  const [sonando, setSonando] = useState(false)
  const audio = useRef<HTMLAudioElement>(null)

  useEffect(() => { const t = setInterval(() => setCr(cuentaRegresiva(ev.fecha)), 1000); return () => clearInterval(t) }, [ev.fecha])

  const fecha = new Date(ev.fecha)
  const diaLargo = fecha.toLocaleDateString('es-BO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ })
  const hora = fecha.toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
  const semana = fecha.toLocaleDateString('es-BO', { weekday: 'short', timeZone: TZ }).replace('.', '')
  const dia = fecha.toLocaleDateString('es-BO', { day: 'numeric', timeZone: TZ })
  const mes = fecha.toLocaleDateString('es-BO', { month: 'short', timeZone: TZ }).replace('.', '')
  const anio = fecha.toLocaleDateString('es-BO', { year: 'numeric', timeZone: TZ })
  const conFoto = !!d.portada_url
  const script = { fontFamily: 'var(--font-script), cursive' }

  const tarjeta = { background: e.tarjeta, borderColor: e.acento + '33' }
  const tieneRegalos = ev.plan.regalos && d.regalos && (d.regalos.texto || d.regalos.qr_url || d.regalos.cuenta)
  const nav = [
    { id: 'inicio', t: 'Inicio' },
    ...((d.lugares ?? []).length ? [{ id: 'lugares', t: 'Ubicación' }] : []),
    { id: 'confirmar', t: 'Confirmar' },
    ...((d.galeria ?? []).length ? [{ id: 'galeria', t: 'Galería' }] : tieneRegalos ? [{ id: 'regalos', t: 'Regalos' }] : []),
  ]

  const Separador = () => (
    <div className="my-12 flex items-center justify-center gap-3" aria-hidden>
      <span className="h-px w-14" style={{ background: e.acento + '66' }} />
      <Flores hoja={e.hoja} flor={e.flor} className="h-8 w-8 -rotate-45" />
      <span className="h-px w-14" style={{ background: e.acento + '66' }} />
    </div>
  )
  const Titulo = ({ children }: { children: React.ReactNode }) => (
    <h2 className="mb-6 text-center text-5xl" style={{ ...script, color: e.acento }}>{children}</h2>
  )

  return (
    <div className="min-h-screen pb-20" style={{ background: e.fondo, color: e.texto }}>
      {d.musica_url && ev.plan.musica && (
        <>
          <audio ref={audio} src={d.musica_url} loop preload="none" />
          <button onClick={() => { if (!audio.current) return; if (sonando) audio.current.pause(); else audio.current.play().catch(() => {}); setSonando(!sonando) }}
            className="fixed right-4 top-4 z-30 grid h-11 w-11 place-items-center rounded-full shadow-lg"
            style={{ background: e.acento, color: e.sobreAcento }} aria-label={sonando ? 'Pausar música' : 'Escuchar música'}>
            {sonando ? '❚❚' : '♪'}
          </button>
        </>
      )}

      {/* PORTADA */}
      <header id="inicio" className="relative flex min-h-[88vh] flex-col items-center justify-center overflow-hidden px-6 pb-24 pt-16 text-center">
        {conFoto ? (
          <>
            <img src={d.portada_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(0,0,0,.15) 0%, rgba(0,0,0,.25) 45%, rgba(0,0,0,.65) 100%)' }} />
          </>
        ) : (
          <>
            <Flores hoja={e.hoja} flor={e.flor} className="pointer-events-none absolute -left-6 -top-6 h-52 w-52 rotate-180 opacity-90" espejo />
            <Flores hoja={e.hoja} flor={e.flor} className="pointer-events-none absolute -right-6 -top-6 h-52 w-52 rotate-180 opacity-90" />
            <Flores hoja={e.hoja} flor={e.flor} className="pointer-events-none absolute -bottom-4 -left-4 h-44 w-44 opacity-80" />
            <Flores hoja={e.hoja} flor={e.flor} className="pointer-events-none absolute -bottom-4 -right-4 h-44 w-44 opacity-80" espejo />
          </>
        )}
        <div className="relative" style={conFoto ? { color: '#fff' } : undefined}>
          <p className="mb-2 text-xs uppercase tracking-[0.4em] opacity-80" style={serif}>{d.frase || tipo.frase}</p>
          <span className="mx-auto mb-3 block h-px w-16" style={{ background: conFoto ? '#ffffffaa' : e.acento }} />
          <h1 className="text-6xl leading-tight sm:text-8xl" style={{ ...script, color: conFoto ? '#fff' : e.acento }}>
            {d.nombres || ev.nombre}
          </h1>
          <div className="mx-auto mt-6 flex items-center justify-center gap-4 text-sm uppercase tracking-[0.25em]" style={serif}>
            <span>{semana}</span><span className="border-x px-4 text-3xl tracking-normal" style={{ borderColor: 'currentColor' }}>{dia}</span><span>{mes} · {anio}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5">
        {/* CUENTA REGRESIVA sobre la portada */}
        <section className="relative z-10 -mt-16 rounded-2xl border p-5 text-center shadow-lg" style={tarjeta}>
          {cr ? (
            <div className="grid grid-cols-4 divide-x" style={{ borderColor: e.acento + '33' }}>
              {([['d', 'días'], ['h', 'horas'], ['m', 'min'], ['s', 'seg']] as const).map(([k, t]) => (
                <div key={k} style={{ borderColor: e.acento + '33' }}>
                  <div className="text-4xl font-semibold tabular-nums" style={{ ...serif, color: e.acento }}>{String(cr[k]).padStart(2, '0')}</div>
                  <div className="text-[11px] uppercase tracking-widest" style={{ color: e.suave }}>{t}</div>
                </div>
              ))}
            </div>
          ) : <p className="text-3xl" style={{ ...script, color: e.acento }}>¡Llegó el gran día!</p>}
          <p className="mt-3 text-sm capitalize" style={{ color: e.suave }}>{diaLargo} · {hora}</p>
        </section>

        {/* INVITADO PERSONAL */}
        {ev.invitado && (
          <section className="mt-6 rounded-2xl border p-6 text-center" style={tarjeta}>
            <p className="text-sm" style={{ color: e.suave }}>Esta invitación es para</p>
            <p className="mt-1 text-4xl" style={{ ...script, color: e.acento }}>{ev.invitado.nombre}</p>
            <p className="mt-2" style={{ color: e.suave }}>Hemos reservado <b style={{ color: e.texto }}>{ev.invitado.pases} {ev.invitado.pases === 1 ? 'lugar' : 'lugares'}</b> en tu honor</p>
          </section>
        )}

        {/* MENSAJE */}
        {d.mensaje && <><Separador /><p className="whitespace-pre-line text-center text-2xl leading-relaxed" style={serif}>{d.mensaje}</p></>}

        {/* LUGARES */}
        {(d.lugares ?? []).length > 0 && <div id="lugares" className="scroll-mt-6"><Separador /><Titulo>¿Dónde y cuándo?</Titulo>
          <div className="grid gap-4">
            {(d.lugares ?? []).map((l, i) => {
              const donde = [l.lugar, l.direccion, ev.ciudad].filter(Boolean).join(', ')
              const mapa = l.maps || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(donde)}`
              return (
                <div key={i} className="rounded-2xl border p-6 text-center" style={tarjeta}>
                  <p className="text-xs uppercase tracking-[0.3em]" style={{ color: e.suave }}>{l.titulo}</p>
                  {l.hora && <p className="mt-2 text-3xl font-semibold" style={{ ...serif, color: e.acento }}>{l.hora}</p>}
                  {l.lugar && <p className="mt-2 text-xl font-semibold" style={serif}>{l.lugar}</p>}
                  {l.direccion && <p className="text-sm" style={{ color: e.suave }}>{l.direccion}</p>}
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <a href={mapa} target="_blank" rel="noopener noreferrer" className="rounded-full px-5 py-2 text-sm font-semibold" style={{ background: e.acento, color: e.sobreAcento }}>Cómo llegar</a>
                    <a href={linkCalendario(ev, donde)} target="_blank" rel="noopener noreferrer" className="rounded-full border px-5 py-2 text-sm font-semibold" style={{ borderColor: e.acento, color: e.acento }}>Agendar</a>
                  </div>
                </div>
              )
            })}
          </div></div>}

        {/* VESTIMENTA Y PADRINOS */}
        {d.vestimenta && <><Separador /><Titulo>Código de vestimenta</Titulo><p className="text-center text-2xl" style={serif}>{d.vestimenta}</p></>}
        {d.padrinos && <><Separador /><Titulo>Padrinos</Titulo>
          <div className="space-y-1 text-center text-xl" style={serif}>{d.padrinos.split('\n').filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}</div></>}

        {/* GALERÍA */}
        {(d.galeria ?? []).length > 0 && <div id="galeria" className="scroll-mt-6"><Separador /><Titulo>Nuestros momentos</Titulo>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(d.galeria ?? []).map((u, i) => <img key={u} src={u} alt={`Foto ${i + 1}`} loading="lazy" className={`w-full rounded-xl object-cover ${i % 5 === 0 ? 'col-span-2 aspect-[2/1]' : 'aspect-square'}`} />)}
          </div></div>}

        {/* REGALOS */}
        {tieneRegalos && <div id="regalos" className="scroll-mt-6"><Separador /><Titulo>Regalos</Titulo>
          <div className="rounded-2xl border p-6 text-center" style={tarjeta}>
            {d.regalos!.texto && <p className="whitespace-pre-line text-xl" style={serif}>{d.regalos!.texto}</p>}
            {d.regalos!.qr_url && <img src={d.regalos!.qr_url} alt="QR para transferencias" className="mx-auto mt-4 w-48 rounded-lg bg-white p-2" />}
            {(d.regalos!.banco || d.regalos!.titular || d.regalos!.cuenta) && (
              <p className="mt-4 text-sm" style={{ color: e.suave }}>{[d.regalos!.banco, d.regalos!.titular, d.regalos!.cuenta].filter(Boolean).join(' · ')}</p>
            )}
          </div></div>}

        {/* CONFIRMACIÓN */}
        <div id="confirmar" className="scroll-mt-6"><Separador /><Confirmar ev={ev} codigo={codigo} /></div>

        <div className="mt-14 flex justify-center"><Flores hoja={e.hoja} flor={e.flor} className="h-16 w-16 -rotate-45" /></div>
        <p className="mt-4 text-center text-xs" style={{ color: e.suave }}>
          Invitación digital creada por <a href="https://www.edaisoftware.com" className="underline">EDAI</a>
        </p>
      </main>

      {/* BARRA DE NAVEGACIÓN */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t backdrop-blur" style={{ background: e.tarjeta + 'ee', borderColor: e.acento + '33' }} aria-label="Secciones">
        <div className="mx-auto flex max-w-md justify-around px-2 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2">
          {nav.map((n) => (
            <a key={n.id} href={`#${n.id}`} className="flex flex-col items-center gap-0.5 px-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: n.id === 'confirmar' ? e.acento : e.suave }}>
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={icNav[n.id]} /></svg>
              {n.t}
            </a>
          ))}
        </div>
      </nav>
    </div>
  )
}

function Confirmar({ ev, codigo }: { ev: EventoPublico; codigo: string | null }) {
  const e = estiloDe(ev.estilo)
  const inv = ev.invitado
  const abierto = ev.datos.rsvp_abierto !== false
  const [cuantos, setCuantos] = useState<number>(inv ? (inv.estado === 'Pendiente' ? inv.pases : inv.confirmados) : 1)
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [mensaje, setMensaje] = useState(inv?.mensaje ?? '')
  const [estado, setEstado] = useState<'form' | 'enviando' | 'listo'>(inv && inv.estado !== 'Pendiente' ? 'listo' : 'form')
  const [ultimo, setUltimo] = useState<number>(inv?.confirmados ?? 0)
  const [err, setErr] = useState('')
  const tarjeta = { background: e.tarjeta, borderColor: e.acento + '33' }
  const boton = { background: e.acento, color: e.sobreAcento }
  const campo = 'w-full rounded-xl border px-4 py-3 outline-none focus:ring-2'
  const estiloCampo = { background: e.fondo, borderColor: e.acento + '44', color: e.texto }

  if (!ev.activa) return <p className="text-center" style={{ color: e.suave }}>Gracias por acompañarnos. Este evento ya pasó.</p>
  if (!inv && codigo) return <p className="text-center" style={{ color: e.suave }}>Este enlace personal no es válido. Pide a los anfitriones que te lo reenvíen.</p>
  if (!inv && ev.plan.pases && !abierto) return <p className="text-center" style={{ color: e.suave }}>Confirma tu asistencia desde el enlace personal que te enviaron por WhatsApp.</p>

  async function enviar(asistentes: number) {
    setErr('')
    if (!inv && !nombre.trim()) return setErr('Escribe tu nombre.')
    setEstado('enviando')
    const { error } = await createClient().rpc('confirmar_asistencia', {
      p_slug: ev.slug, p_codigo: codigo, p_nombre: nombre, p_asistentes: asistentes, p_telefono: telefono, p_mensaje: mensaje,
    })
    if (error) { setEstado('form'); return setErr(error.message || 'No se pudo enviar. Intenta de nuevo.') }
    setUltimo(asistentes); setEstado('listo')
  }

  if (estado === 'listo') {
    return (
      <div className="rounded-2xl border p-8 text-center" style={tarjeta}>
        <p className="text-4xl" style={{ fontFamily: 'var(--font-script), cursive', color: e.acento }}>{ultimo > 0 ? '¡Gracias por confirmar!' : 'Gracias por avisarnos'}</p>
        <p className="mt-2" style={{ color: e.suave }}>{ultimo > 0 ? `Te esperamos${ultimo > 1 ? `, ${ultimo} personas` : ''}.` : 'Te vamos a extrañar.'}</p>
        <button className="mt-5 text-sm underline" style={{ color: e.suave }} onClick={() => setEstado('form')}>Cambiar mi respuesta</button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border p-6 sm:p-8" style={tarjeta}>
      <h2 className="text-center text-5xl" style={{ fontFamily: 'var(--font-script), cursive', color: e.acento }}>Confirma tu asistencia</h2>
      {ev.datos.rsvp_limite && <p className="mt-1 text-center text-sm" style={{ color: e.suave }}>Por favor antes del {ev.datos.rsvp_limite}</p>}
      <div className="mt-6 grid gap-3">
        {!inv && <input className={campo} style={estiloCampo} placeholder="Tu nombre completo" value={nombre} onChange={(x) => setNombre(x.target.value)} aria-label="Tu nombre" />}
        <div>
          <p className="mb-2 text-sm" style={{ color: e.suave }}>¿Cuántas personas asistirán?</p>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: inv ? inv.pases : 6 }, (_, i) => i + 1).map((n) => (
              <button key={n} type="button" onClick={() => setCuantos(n)} className="h-11 min-w-11 rounded-full border px-4 font-semibold"
                style={cuantos === n ? boton : { borderColor: e.acento + '55' }}>{n}</button>
            ))}
          </div>
        </div>
        {!inv && <input className={campo} style={estiloCampo} inputMode="tel" placeholder="Tu WhatsApp (opcional)" value={telefono} onChange={(x) => setTelefono(x.target.value)} aria-label="Tu WhatsApp" />}
        <textarea className={`${campo} min-h-[90px]`} style={estiloCampo} placeholder="Déjales un mensaje (opcional)" value={mensaje} onChange={(x) => setMensaje(x.target.value)} aria-label="Mensaje" />
      </div>
      {err && <p role="alert" className="mt-3 text-sm text-red-600">{err}</p>}
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button disabled={estado === 'enviando'} onClick={() => enviar(cuantos)} className="rounded-full py-3.5 font-semibold disabled:opacity-60" style={boton}>
          {estado === 'enviando' ? 'Enviando…' : 'Sí, asistiré'}
        </button>
        <button disabled={estado === 'enviando'} onClick={() => enviar(0)} className="rounded-full border py-3.5 font-semibold" style={{ borderColor: e.acento, color: e.acento }}>
          No podré asistir
        </button>
      </div>
    </div>
  )
}
