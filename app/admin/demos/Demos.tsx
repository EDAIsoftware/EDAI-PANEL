'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Modal, { Campo } from '@/components/crm/Modal'
import Copiar from '@/components/Copiar'
import { DEMOS_URL, slugify } from '@/lib/utils'

export type Demo = { id: string; slug: string; titulo: string; descripcion: string | null; archivo: string; visitas: number; activo: boolean; creado_en: string; actualizado_en: string }

export default function Demos({ inicial }: { inicial: Demo[] }) {
  const router = useRouter()
  const [form, setForm] = useState<{ id?: string; titulo: string; slug: string; descripcion: string; archivo: File | null } | null>(null)
  const [err, setErr] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const url = (d: Pick<Demo, 'slug'>) => `${DEMOS_URL}/${d.slug}`

  async function guardar() {
    if (!form) return
    const slug = slugify(form.slug || form.titulo).slice(0, 50)
    if (!form.titulo.trim()) return setErr('Ponle un título.')
    if (slug.length < 3) return setErr('La dirección necesita al menos 3 letras.')
    if (!form.id && !form.archivo) return setErr('Elige el archivo .html de la demo.')
    if (form.archivo && !/\.html?$/i.test(form.archivo.name)) return setErr('El archivo debe ser .html (todo en un solo archivo).')
    if (form.archivo && form.archivo.size > 10 * 1024 * 1024) return setErr('El archivo pesa más de 10 MB.')
    setSubiendo(true); setErr('')
    const sb = createClient()
    const ruta = `${slug}.html`
    if (form.archivo) {
      const { error } = await sb.storage.from('demos').upload(ruta, form.archivo, { upsert: true, contentType: 'text/html', cacheControl: '0' })
      if (error) { setSubiendo(false); return setErr('No se pudo subir el archivo. ¿Ejecutaste la migración 007?') }
    }
    const datos = { titulo: form.titulo.trim(), slug, descripcion: form.descripcion.trim() || null, archivo: ruta, actualizado_en: new Date().toISOString() }
    const anterior = inicial.find((d) => d.id === form.id)
    const { error } = form.id ? await sb.from('demos').update(datos).eq('id', form.id) : await sb.from('demos').insert(datos)
    if (!error && anterior && anterior.archivo !== ruta) {
      if (form.archivo) await sb.storage.from('demos').remove([anterior.archivo])
      else await sb.storage.from('demos').move(anterior.archivo, ruta)
    }
    setSubiendo(false)
    if (error) return setErr(error.code === '23505' ? `Ya tienes una demo en /${slug}.` : 'No se pudo guardar.')
    setForm(null); router.refresh()
  }

  async function alternar(d: Demo) {
    await createClient().from('demos').update({ activo: !d.activo }).eq('id', d.id); router.refresh()
  }
  async function eliminar(d: Demo) {
    if (!confirm(`¿Eliminar la demo "${d.titulo}"? El enlace dejará de funcionar.`)) return
    const sb = createClient()
    await sb.storage.from('demos').remove([d.archivo]); await sb.from('demos').delete().eq('id', d.id); router.refresh()
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="titulo">Demos</h1><p className="subtitulo">Páginas modelo para mostrar a tus prospectos. Se publican al instante, sin pasar por Vercel.</p></div>
        <button className="btn-primario" onClick={() => setForm({ titulo: '', slug: '', descripcion: '', archivo: null })}>Subir demo</button>
      </div>
      <div className="caja">
        {inicial.length === 0 && <p className="p-5 text-suave">Sube tu primera página modelo: un archivo .html con todo adentro (estilos y scripts). Las fotos pueden ir como enlaces o incrustadas.</p>}
        {inicial.map((d) => (
          <div key={d.id} className={`flex flex-wrap items-center gap-3 border-t border-linea px-4 py-3 first:border-t-0 ${d.activo ? '' : 'opacity-50'}`}>
            <div className="min-w-0 flex-1">
              <b className="block">{d.titulo}{!d.activo && <span className="chip-malo ml-2">Pausada</span>}</b>
              <small className="block break-all text-suave">{url(d)} · {d.visitas} {d.visitas === 1 ? 'visita' : 'visitas'}</small>
              {d.descripcion && <small className="block text-suave">{d.descripcion}</small>}
            </div>
            <a className="btn-borde btn-sm" href={url(d)} target="_blank" rel="noopener noreferrer">Abrir</a>
            <Copiar texto={url(d)} etiqueta="Copiar enlace" />
            <a className="btn-wa btn-sm" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`Mira cómo quedaría tu página: ${url(d)}`)}`}>Enviar</a>
            <button className="btn-borde btn-sm" onClick={() => setForm({ id: d.id, titulo: d.titulo, slug: d.slug, descripcion: d.descripcion ?? '', archivo: null })}>Editar</button>
            <button className="btn-borde btn-sm" onClick={() => alternar(d)}>{d.activo ? 'Pausar' : 'Activar'}</button>
            <button className="btn-borde btn-sm text-malo" onClick={() => eliminar(d)} aria-label={`Eliminar ${d.titulo}`}>✕</button>
          </div>
        ))}
      </div>

      {form && (
        <Modal titulo={form.id ? 'Editar demo' : 'Subir demo'} onCerrar={() => { setForm(null); setErr('') }}>
          <div className="grid gap-3">
            <Campo etq="Título"><input className="campo" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ej: Demo agente inmobiliario" autoFocus /></Campo>
            <Campo etq="Dirección">
              <div className="flex items-center gap-2"><span className="whitespace-nowrap text-sm text-suave">{DEMOS_URL.replace(/^https?:\/\//, '')}/</span>
                <input className="campo" value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} placeholder={slugify(form.titulo) || 'agente-inmobiliario'} /></div>
            </Campo>
            <Campo etq="Nota para ti (opcional)"><input className="campo" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Ej: para mostrar a agentes de RE/MAX" /></Campo>
            <Campo etq={form.id ? 'Reemplazar archivo (opcional)' : 'Archivo .html'}>
              <input type="file" accept=".html,.htm,text/html" className="campo" onChange={(e) => setForm({ ...form, archivo: e.target.files?.[0] ?? null })} />
            </Campo>
          </div>
          {err && <p role="alert" className="mt-3 text-sm text-malo">{err}</p>}
          <div className="mt-5 flex justify-end gap-2"><button className="btn-borde" onClick={() => setForm(null)}>Cancelar</button>
            <button className="btn-primario" disabled={subiendo} onClick={guardar}>{subiendo ? 'Subiendo…' : 'Guardar'}</button></div>
        </Modal>
      )}
    </>
  )
}
