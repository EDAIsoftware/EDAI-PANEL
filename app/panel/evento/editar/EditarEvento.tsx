'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { comprimir } from '@/lib/imagen'
import { ESTILOS, aIsoBolivia, aLocalBolivia, type DatosEvento, type Lugar } from '@/lib/eventos'
import { urlInvitacion } from '@/lib/utils'

const lugarVacio: Lugar = { titulo: '', lugar: '', direccion: '', hora: '', maps: '' }

export default function EditarEvento({ eventoId, slug, tipo, fechaIso, estiloInicial, inicial, maxFotos, musica, regalos, pases }: {
  eventoId: string; slug: string; tipo: string; fechaIso: string; estiloInicial: string; inicial: DatosEvento
  maxFotos: number; musica: boolean; regalos: boolean; pases: boolean
}) {
  const router = useRouter()
  const supabase = createClient()
  const [d, setD] = useState<DatosEvento>(inicial)
  const [fecha, setFecha] = useState(aLocalBolivia(fechaIso))
  const [estilo, setEstilo] = useState(estiloInicial)
  const [subiendo, setSubiendo] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const [guardando, setGuardando] = useState(false)
  const set = <K extends keyof DatosEvento>(k: K, v: DatosEvento[K]) => setD((x) => ({ ...x, [k]: v }))
  const lugares = d.lugares ?? []
  const galeria = d.galeria ?? []
  const reg = d.regalos ?? {}

  async function subir(file: File, tipoArchivo: 'foto' | 'audio'): Promise<string | null> {
    try {
      let cuerpo: Blob = file, ext = 'jpg', ct = 'image/jpeg'
      if (tipoArchivo === 'foto') cuerpo = await comprimir(file)
      else {
        if (file.size > 9 * 1024 * 1024) { setMsg({ ok: false, t: 'La canción debe pesar menos de 9 MB.' }); return null }
        ext = 'mp3'; ct = file.type || 'audio/mpeg'
      }
      const ruta = `${eventoId}/${crypto.randomUUID()}.${ext}`
      const { error } = await supabase.storage.from('eventos').upload(ruta, cuerpo, { contentType: ct, cacheControl: '31536000' })
      if (error) throw error
      return supabase.storage.from('eventos').getPublicUrl(ruta).data.publicUrl
    } catch {
      setMsg({ ok: false, t: 'No se pudo subir el archivo. Prueba de nuevo.' }); return null
    }
  }

  async function guardar() {
    setMsg(null); setGuardando(true)
    const limpio: DatosEvento = { ...d, lugares: lugares.filter((l) => l.titulo || l.lugar) }
    const { error } = await supabase.rpc('actualizar_evento', { p_datos: limpio, p_fecha: aIsoBolivia(fecha), p_estilo: estilo })
    setGuardando(false)
    if (error) return setMsg({ ok: false, t: error.message.includes('plan') ? error.message : 'No se pudo guardar. Revisa los datos.' })
    // Borra del almacenamiento las fotos que se quitaron
    const antes = [inicial.portada_url, inicial.musica_url, inicial.regalos?.qr_url, ...(inicial.galeria ?? [])].filter(Boolean) as string[]
    const ahora = new Set([limpio.portada_url, limpio.musica_url, limpio.regalos?.qr_url, ...(limpio.galeria ?? [])].filter(Boolean))
    const quitar = antes.filter((u) => !ahora.has(u)).map((u) => u.split('/eventos/')[1]).filter(Boolean)
    if (quitar.length) await supabase.storage.from('eventos').remove(quitar)
    setMsg({ ok: true, t: 'Cambios guardados. Ya se ven en tu invitación.' })
    router.refresh()
  }

  const campo = (etq: string, valor: string | undefined, cambiar: (v: string) => void, extra?: { ph?: string; area?: boolean; id: string }) => (
    <div><label className="etiqueta" htmlFor={extra?.id}>{etq}</label>
      {extra?.area
        ? <textarea id={extra.id} className="campo min-h-[90px]" value={valor ?? ''} placeholder={extra?.ph} onChange={(e) => cambiar(e.target.value)} />
        : <input id={extra?.id} className="campo" value={valor ?? ''} placeholder={extra?.ph} onChange={(e) => cambiar(e.target.value)} />}
    </div>
  )

  return (
    <div className="max-w-3xl pb-24">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="titulo">Mi invitación</h1><p className="subtitulo">Lo que cambies aquí se ve al instante en tu invitación</p></div>
        <a href={urlInvitacion(slug)} target="_blank" rel="noopener noreferrer" className="btn-borde">Ver mi invitación</a>
      </div>

      <section className="caja mb-4 grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="font-bold sm:col-span-2">Portada</h2>
        {campo(tipo === 'boda' ? 'Nombres de los novios' : 'Nombre que aparece en grande', d.nombres, (v) => set('nombres', v), { id: 'nom', ph: tipo === 'boda' ? 'Ana & Luis' : 'Valentina' })}
        {campo('Frase de portada', d.frase, (v) => set('frase', v), { id: 'frase', ph: 'Nos casamos' })}
        <div><label className="etiqueta" htmlFor="fecha">Fecha y hora</label>
          <input id="fecha" type="datetime-local" className="campo" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
        <div><span className="etiqueta">Foto de portada</span>
          <div className="flex items-center gap-3">
            {d.portada_url && <img src={d.portada_url} alt="" className="h-14 w-14 rounded-lg object-cover" />}
            <label className="btn-borde btn-sm cursor-pointer">{subiendo === 'portada' ? 'Subiendo…' : d.portada_url ? 'Cambiar' : 'Subir foto'}
              <input type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; setSubiendo('portada'); const u = await subir(f, 'foto'); setSubiendo(''); if (u) set('portada_url', u) }} /></label>
            {d.portada_url && <button className="text-sm text-malo underline" onClick={() => set('portada_url', undefined)}>Quitar</button>}
          </div></div>
        <div className="sm:col-span-2">{campo('Mensaje', d.mensaje, (v) => set('mensaje', v), { id: 'msg', area: true, ph: 'Con la bendición de Dios y de nuestros padres, tenemos el honor de invitarte…' })}</div>
      </section>

      <section className="caja mb-4 p-5">
        <h2 className="mb-3 font-bold">Estilo</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Object.entries(ESTILOS).map(([k, e]) => (
            <button key={k} onClick={() => setEstilo(k)} className={`rounded-lg border-2 p-2 text-left ${estilo === k ? 'border-acento' : 'border-linea'}`}>
              <div className="mb-1.5 flex h-10 items-center justify-center rounded" style={{ background: e.fondo, color: e.acento, fontFamily: 'Georgia, serif', fontSize: 18 }}>Aa</div>
              <span className="text-sm">{e.n}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="caja mb-4 p-5">
        <h2 className="mb-1 font-bold">Lugares y horarios</h2>
        <p className="mb-3 text-sm text-suave">Ceremonia, misa, recepción… hasta 4. El botón “Cómo llegar” usa el enlace de Google Maps si lo pegas.</p>
        {lugares.map((l, i) => (
          <div key={i} className="mb-3 grid gap-2 rounded-lg border border-linea p-3 sm:grid-cols-2">
            {(['titulo', 'hora', 'lugar', 'direccion'] as const).map((k) => (
              <input key={k} className="campo" aria-label={k} placeholder={{ titulo: 'Ej: Ceremonia religiosa', hora: 'Ej: 19:00', lugar: 'Ej: Catedral de Santa Cruz', direccion: 'Dirección' }[k]}
                value={l[k]} onChange={(e) => set('lugares', lugares.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))} />
            ))}
            <input className="campo sm:col-span-2" placeholder="Enlace de Google Maps (opcional)" value={l.maps} aria-label="Enlace de Google Maps"
              onChange={(e) => set('lugares', lugares.map((x, j) => (j === i ? { ...x, maps: e.target.value } : x)))} />
            <button className="justify-self-start text-sm text-malo underline" onClick={() => set('lugares', lugares.filter((_, j) => j !== i))}>Quitar este lugar</button>
          </div>
        ))}
        {lugares.length < 4 && <button className="btn-borde btn-sm" onClick={() => set('lugares', [...lugares, { ...lugarVacio }])}>Agregar lugar</button>}
      </section>

      <section className="caja mb-4 grid gap-4 p-5 sm:grid-cols-2">
        {campo('Código de vestimenta', d.vestimenta, (v) => set('vestimenta', v), { id: 'vest', ph: 'Ej: Formal / Elegante' })}
        {campo('Fecha límite para confirmar', d.rsvp_limite, (v) => set('rsvp_limite', v), { id: 'lim', ph: 'Ej: 30 de noviembre' })}
        <div className="sm:col-span-2">{campo('Padrinos (uno por línea)', d.padrinos, (v) => set('padrinos', v), { id: 'pad', area: true, ph: 'Padrinos de anillos: Juan y María' })}</div>
        {pases && (
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-linea bg-sup2 p-3 sm:col-span-2">
            <span><b className="block">Permitir confirmar sin enlace personal</b><small className="text-suave">Si lo apagas, solo confirman las familias de tu lista con sus pases</small></span>
            <input type="checkbox" className="h-5 w-5 accent-acento" checked={d.rsvp_abierto !== false} onChange={(e) => set('rsvp_abierto', e.target.checked)} />
          </label>
        )}
      </section>

      {maxFotos > 0 && <section className="caja mb-4 p-5">
        <h2 className="mb-1 font-bold">Galería <span className="text-sm font-normal text-suave">({galeria.length} de {maxFotos})</span></h2>
        <div className="mt-3 flex flex-wrap gap-3">
          {galeria.map((u) => (
            <div key={u} className="relative h-24 w-24 overflow-hidden rounded-lg border border-linea">
              <img src={u} alt="" className="h-full w-full object-cover" />
              <button aria-label="Quitar foto" className="absolute right-1 top-1 h-6 w-6 rounded bg-black/65 text-xs text-white" onClick={() => set('galeria', galeria.filter((x) => x !== u))}>✕</button>
            </div>
          ))}
          {galeria.length < maxFotos && (
            <label className="grid h-24 w-24 cursor-pointer place-items-center rounded-lg border-2 border-dashed border-linea text-center text-xs text-suave">
              {subiendo === 'galeria' ? 'Subiendo…' : <span>📷<br />Agregar</span>}
              <input type="file" accept="image/*" multiple hidden onChange={async (e) => {
                const files = (e.target.files ? (Array.from(e.target.files) as File[]) : []).slice(0, maxFotos - galeria.length); e.target.value = ''
                if (!files.length) return
                setSubiendo('galeria')
                const urls: string[] = []
                for (const f of files) { const u = await subir(f, 'foto'); if (u) urls.push(u) }
                setSubiendo(''); setD((x) => ({ ...x, galeria: [...(x.galeria ?? []), ...urls].slice(0, maxFotos) }))
              }} />
            </label>
          )}
        </div>
      </section>}

      {regalos ? (
        <section className="caja mb-4 grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">Regalos</h2>
          <div className="sm:col-span-2">{campo('Mensaje', reg.texto, (v) => set('regalos', { ...reg, texto: v }), { id: 'rtx', area: true, ph: 'Tu presencia es nuestro mejor regalo. Si deseas hacernos un obsequio…' })}</div>
          {campo('Banco', reg.banco, (v) => set('regalos', { ...reg, banco: v }), { id: 'rbanco' })}
          {campo('Titular', reg.titular, (v) => set('regalos', { ...reg, titular: v }), { id: 'rtit' })}
          {campo('N.º de cuenta (opcional)', reg.cuenta, (v) => set('regalos', { ...reg, cuenta: v }), { id: 'rcta' })}
          <div><span className="etiqueta">QR para transferencias</span>
            <div className="flex items-center gap-3">
              {reg.qr_url && <img src={reg.qr_url} alt="" className="h-14 w-14 rounded bg-white object-contain" />}
              <label className="btn-borde btn-sm cursor-pointer">{subiendo === 'qr' ? 'Subiendo…' : reg.qr_url ? 'Cambiar' : 'Subir QR'}
                <input type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; setSubiendo('qr'); const u = await subir(f, 'foto'); setSubiendo(''); if (u) set('regalos', { ...reg, qr_url: u }) }} /></label>
              {reg.qr_url && <button className="text-sm text-malo underline" onClick={() => set('regalos', { ...reg, qr_url: undefined })}>Quitar</button>}
            </div></div>
        </section>
      ) : <p className="mb-4 text-sm text-suave">La sección de regalos con QR viene en los planes Completa y Premium.</p>}

      {musica && (
        <section className="caja mb-4 p-5">
          <h2 className="mb-1 font-bold">Música</h2>
          <p className="mb-3 text-sm text-suave">Una canción en MP3 (máx. 9 MB). Los invitados la activan con un botón.</p>
          <div className="flex flex-wrap items-center gap-3">
            {d.musica_url && <audio src={d.musica_url} controls className="h-10" />}
            <label className="btn-borde btn-sm cursor-pointer">{subiendo === 'musica' ? 'Subiendo…' : d.musica_url ? 'Cambiar canción' : 'Subir canción'}
              <input type="file" accept="audio/mpeg,audio/mp3,audio/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; e.target.value = ''; if (!f) return; setSubiendo('musica'); const u = await subir(f, 'audio'); setSubiendo(''); if (u) set('musica_url', u) }} /></label>
            {d.musica_url && <button className="text-sm text-malo underline" onClick={() => set('musica_url', undefined)}>Quitar</button>}
          </div>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-linea bg-fondo/95 p-3 md:left-60">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <p role="status" className={`flex-1 text-sm ${msg?.ok ? 'text-chiptinta' : 'text-malo'}`}>{msg?.t}</p>
          <button className="btn-primario" disabled={guardando || !!subiendo} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar cambios'}</button>
        </div>
      </div>
    </div>
  )
}
