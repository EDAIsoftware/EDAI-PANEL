'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { comprimir } from '@/lib/imagen'

export type PerfilAgente = {
  foto?: string; inmobiliaria?: string; cargo?: string; frase?: string; bio?: string; experiencia?: string
  zonas?: string; instagram?: string; facebook?: string; tiktok?: string; estilo?: string; captacion?: string
}

const ESTILOS = [
  { k: 'elegante', n: 'Elegante oscuro', a: '#c9a96e', f: '#111214' },
  { k: 'claro', n: 'Minimalista claro', a: '#1f6feb', f: '#f7f7f5' },
  { k: 'lujo', n: 'Lujo dorado', a: '#d4af37', f: '#0d0b08' },
  { k: 'moderno', n: 'Moderno', a: '#e4572e', f: '#ffffff' },
]

export default function Perfil({ tiendaId, nombre, inicial }: { tiendaId: string; nombre: string; inicial: PerfilAgente }) {
  const router = useRouter()
  const [p, setP] = useState<PerfilAgente>({ estilo: 'elegante', ...inicial })
  const [subiendo, setSubiendo] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const set = (k: keyof PerfilAgente, v: string) => setP((x) => ({ ...x, [k]: v }))

  async function subirFoto(f: File) {
    setSubiendo(true)
    try {
      const sb = createClient()
      const ruta = `${tiendaId}/perfil-${crypto.randomUUID()}.jpg`
      const { error } = await sb.storage.from('productos').upload(ruta, await comprimir(f, 900), { contentType: 'image/jpeg', cacheControl: '31536000' })
      if (error) throw error
      const anterior = p.foto?.split('/productos/')[1]
      set('foto', sb.storage.from('productos').getPublicUrl(ruta).data.publicUrl)
      if (anterior) await sb.storage.from('productos').remove([anterior])
    } catch { setMsg({ ok: false, t: 'No se pudo subir la foto.' }) }
    setSubiendo(false)
  }

  async function guardar() {
    setMsg(null)
    const { error } = await createClient().rpc('actualizar_perfil', { p_perfil: p })
    if (error) return setMsg({ ok: false, t: 'No se pudo guardar.' })
    setMsg({ ok: true, t: 'Perfil guardado. Ya se ve en tu página.' }); router.refresh()
  }

  const campo = (k: keyof PerfilAgente, etq: string, ph = '', area = false) => (
    <label className="block"><span className="etiqueta">{etq}</span>
      {area ? <textarea className="campo min-h-[90px]" value={p[k] ?? ''} placeholder={ph} onChange={(e) => set(k, e.target.value)} />
        : <input className="campo" value={p[k] ?? ''} placeholder={ph} onChange={(e) => set(k, e.target.value)} />}</label>
  )

  return (
    <div className="max-w-3xl pb-20">
      <h1 className="titulo">Mi perfil</h1>
      <p className="subtitulo">Así te presentas en tu página. Una buena foto profesional hace la diferencia.</p>
      <section className="caja mb-4 flex flex-wrap items-center gap-5 p-5">
        <div className="h-28 w-28 overflow-hidden rounded-2xl border border-linea bg-sup2">
          {p.foto ? <img src={p.foto} alt={`Foto de ${nombre}`} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-3xl text-suave">👤</div>}
        </div>
        <div><b className="block text-lg">{nombre}</b><small className="text-suave">{p.cargo || 'Asesor inmobiliario'}{p.inmobiliaria ? ` · ${p.inmobiliaria}` : ''}</small>
          <div className="mt-3"><label className="btn-primario btn-sm cursor-pointer">{subiendo ? 'Subiendo…' : p.foto ? 'Cambiar foto' : 'Subir foto'}
            <input type="file" accept="image/*" hidden disabled={subiendo} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) subirFoto(f) }} /></label></div></div>
      </section>
      <section className="caja mb-4 grid gap-4 p-5 sm:grid-cols-2">
        {campo('cargo', 'Cargo', 'Asesor inmobiliario')}
        {campo('inmobiliaria', 'Inmobiliaria', 'Ej: asociado a…')}
        {campo('experiencia', 'Experiencia', 'Ej: 8 años · +120 inmuebles vendidos')}
        {campo('zonas', 'Zonas donde trabajas', 'Ej: Equipetrol, Urubó, Norte')}
        <div className="sm:col-span-2">{campo('frase', 'Frase principal', 'Ej: Te ayudo a encontrar tu próximo hogar sin perder tiempo')}</div>
        <div className="sm:col-span-2">{campo('bio', 'Sobre mí', 'Cuéntales en pocas líneas por qué trabajar contigo', true)}</div>
        <div className="sm:col-span-2">{campo('captacion', 'Mensaje para dueños', 'Ej: ¿Quieres vender o alquilar tu inmueble? Lo promociono con fotos profesionales y te informo cada semana.', true)}</div>
        {campo('instagram', 'Instagram (usuario)', 'Ej: marianarojas.inmuebles')}
        {campo('facebook', 'Facebook (enlace)', 'https://facebook.com/…')}
        {campo('tiktok', 'TikTok (usuario)', '')}
      </section>
      <section className="caja mb-4 p-5">
        <h2 className="mb-3 font-bold">Estilo de tu página</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ESTILOS.map((e) => (
            <button key={e.k} onClick={() => set('estilo', e.k)} className={`rounded-lg border-2 p-2 text-left ${p.estilo === e.k ? 'border-acento' : 'border-linea'}`}>
              <div className="mb-1.5 flex h-10 items-center justify-center rounded text-lg font-semibold" style={{ background: e.f, color: e.a, fontFamily: 'Georgia, serif' }}>Aa</div>
              <span className="text-sm">{e.n}</span>
            </button>
          ))}
        </div>
      </section>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-linea bg-fondo/95 p-3 md:left-60">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <p role="status" className={`flex-1 text-sm ${msg?.ok ? 'text-chiptinta' : 'text-malo'}`}>{msg?.t}</p>
          <button className="btn-primario" disabled={subiendo} onClick={guardar}>Guardar perfil</button>
        </div>
      </div>
    </div>
  )
}
