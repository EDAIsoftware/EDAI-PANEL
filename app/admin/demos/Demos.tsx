'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Modal, { Campo } from '@/components/crm/Modal'
import Copiar from '@/components/Copiar'
import { DEMOS_URL, fechaHora, slugify, waLink } from '@/lib/utils'

export type Demo = { id: string; slug: string; titulo: string; descripcion: string | null; categoria: string; archivo: string; visitas: number; activo: boolean; creado_en: string; actualizado_en: string }
export type Envio = { id: string; codigo: string; demo_id: string; prospecto_id: string | null; cliente_id: string | null; nombre: string; telefono: string | null
  aperturas: number; primera_apertura: string | null; ultima_apertura: string | null; creado_en: string }
export type Persona = { tipo: 'prospecto' | 'cliente'; id: string; nombre: string; empresa: string | null; telefono: string | null; etapa?: string }

const CATEGORIAS = ['Tienda online', 'Invitación', 'Agente inmobiliario', 'Web a medida', 'Sistema / App', 'Otro']
const ETAPAS_PREVIAS = ['Nuevo', 'Contactado']

export default function Demos({ inicial, envios, personas, para }: { inicial: Demo[]; envios: Envio[]; personas: Persona[]; para: Persona | null }) {
  const router = useRouter()
  const sb = useMemo(() => createClient(), [])
  const [cat, setCat] = useState('Todas')
  const [abierta, setAbierta] = useState<string | null>(null)
  const [form, setForm] = useState<{ id?: string; titulo: string; slug: string; categoria: string; descripcion: string; archivo: File | null } | null>(null)
  const [enviar, setEnviar] = useState<Demo | null>(null)
  const [err, setErr] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const url = (d: Pick<Demo, 'slug'>) => `${DEMOS_URL}/${d.slug}`
  const categorias = ['Todas', ...CATEGORIAS.filter((c) => inicial.some((d) => d.categoria === c))]
  const lista = inicial.filter((d) => cat === 'Todas' || d.categoria === cat)
  const enviosDe = (id: string) => envios.filter((e) => e.demo_id === id)

  async function guardar() {
    if (!form) return
    const slug = slugify(form.slug || form.titulo).slice(0, 50)
    if (!form.titulo.trim()) return setErr('Ponle un título.')
    if (slug.length < 3) return setErr('La dirección necesita al menos 3 letras.')
    if (!form.id && !form.archivo) return setErr('Elige el archivo .html de la demo.')
    if (form.archivo && !/\.html?$/i.test(form.archivo.name)) return setErr('El archivo debe ser .html (todo en un solo archivo).')
    if (form.archivo && form.archivo.size > 10 * 1024 * 1024) return setErr('El archivo pesa más de 10 MB.')
    setSubiendo(true); setErr('')
    const ruta = `${slug}.html`
    if (form.archivo) {
      const { error } = await sb.storage.from('demos').upload(ruta, form.archivo, { upsert: true, contentType: 'text/html', cacheControl: '0' })
      if (error) { setSubiendo(false); return setErr('No se pudo subir el archivo. ¿Ejecutaste la migración 007?') }
    }
    const datos = { titulo: form.titulo.trim(), slug, categoria: form.categoria, descripcion: form.descripcion.trim() || null, archivo: ruta, actualizado_en: new Date().toISOString() }
    const anterior = inicial.find((d) => d.id === form.id)
    const { error } = form.id ? await sb.from('demos').update(datos).eq('id', form.id) : await sb.from('demos').insert(datos)
    if (!error && anterior && anterior.archivo !== ruta) {
      if (form.archivo) await sb.storage.from('demos').remove([anterior.archivo])
      else await sb.storage.from('demos').move(anterior.archivo, ruta)
    }
    setSubiendo(false)
    if (error) return setErr(error.code === '23505' ? `Ya tienes una demo en /${slug}.` : 'No se pudo guardar. ¿Ejecutaste la migración 008?')
    setForm(null); router.refresh()
  }
  async function alternar(d: Demo) { await sb.from('demos').update({ activo: !d.activo }).eq('id', d.id); router.refresh() }
  async function eliminar(d: Demo) {
    if (!confirm(`¿Eliminar la demo "${d.titulo}"? Los enlaces enviados dejarán de funcionar.`)) return
    await sb.storage.from('demos').remove([d.archivo]); await sb.from('demos').delete().eq('id', d.id); router.refresh()
  }
  async function quitarEnvio(e: Envio) {
    if (!confirm(`¿Quitar el envío a ${e.nombre} de la lista?`)) return
    await sb.from('demo_envios').delete().eq('id', e.id); router.refresh()
  }

  const estadoEnvio = (e: Envio) => e.aperturas > 0
    ? <span className="chip">Abrió {e.aperturas} {e.aperturas === 1 ? 'vez' : 'veces'} · {fechaHora(e.ultima_apertura!)}</span>
    : <span className="chip-aviso">Sin abrir</span>

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="titulo">Demos</h1><p className="subtitulo">Páginas modelo para tus prospectos y clientes. Se publican al instante y sabes quién las abrió.</p></div>
        <button className="btn-primario" onClick={() => setForm({ titulo: '', slug: '', categoria: CATEGORIAS[0], descripcion: '', archivo: null })}>Subir demo</button>
      </div>

      {para && <div className="mb-4 rounded-lg border border-acento bg-chip px-4 py-3 text-sm">Elige qué demo quieres enviarle a <b>{para.nombre}</b>{para.empresa ? ` (${para.empresa})` : ''} y toca <b>Enviar</b>.</div>}

      {categorias.length > 2 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {categorias.map((c) => <button key={c} onClick={() => setCat(c)} className={`rounded-full border px-3 py-1 text-sm ${cat === c ? 'border-primario bg-primario text-sobreprimario' : 'border-linea bg-sup2'}`}>{c}</button>)}
        </div>
      )}

      <div className="caja">
        {lista.length === 0 && <p className="p-5 text-suave">Sube tu primera página modelo: un archivo .html con todo adentro (estilos y scripts). Las fotos pueden ir como enlaces o incrustadas.</p>}
        {lista.map((d) => {
          const ev = enviosDe(d.id), abiertos = ev.filter((e) => e.aperturas > 0).length
          return (
            <div key={d.id} className={`border-t border-linea first:border-t-0 ${d.activo ? '' : 'opacity-60'}`}>
              <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <b className="block">{d.titulo} <span className="chip ml-1 align-middle">{d.categoria}</span>{!d.activo && <span className="chip-malo ml-1 align-middle">Pausada</span>}</b>
                  <small className="block break-all text-suave">{url(d)} · {d.visitas} {d.visitas === 1 ? 'visita' : 'visitas'}</small>
                  {ev.length > 0 && <button className="text-sm text-chiptinta underline" onClick={() => setAbierta(abierta === d.id ? null : d.id)}>
                    Enviada a {ev.length} {ev.length === 1 ? 'persona' : 'personas'} · {abiertos} la {abiertos === 1 ? 'abrió' : 'abrieron'}</button>}
                  {d.descripcion && <small className="block text-suave">{d.descripcion}</small>}
                </div>
                <button className="btn-wa btn-sm" onClick={() => setEnviar(d)}>Enviar</button>
                <a className="btn-borde btn-sm" href={url(d)} target="_blank" rel="noopener noreferrer">Abrir</a>
                <Copiar texto={url(d)} etiqueta="Copiar enlace" />
                <button className="btn-borde btn-sm" onClick={() => setForm({ id: d.id, titulo: d.titulo, slug: d.slug, categoria: d.categoria, descripcion: d.descripcion ?? '', archivo: null })}>Editar</button>
                <button className="btn-borde btn-sm" onClick={() => alternar(d)}>{d.activo ? 'Pausar' : 'Activar'}</button>
                <button className="btn-borde btn-sm text-malo" onClick={() => eliminar(d)} aria-label={`Eliminar ${d.titulo}`}>✕</button>
              </div>
              {abierta === d.id && (
                <ul className="mx-4 mb-3 divide-y divide-linea rounded-lg bg-sup2">
                  {ev.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                      <span className="min-w-0 flex-1"><b>{e.nombre}</b> <small className="text-suave">· enviada {fechaHora(e.creado_en)}</small>
                        {(e.prospecto_id || e.cliente_id) && <a className="ml-2 text-xs underline" href={e.cliente_id ? `/admin/crm/clientes/${e.cliente_id}` : '/admin/crm/prospectos'}>ver en CRM</a>}</span>
                      {estadoEnvio(e)}
                      {e.telefono && <a className="btn-borde btn-sm" target="_blank" rel="noopener noreferrer" href={waLink(e.telefono, `Hola ${e.nombre.split(' ')[0]}, ¿pudiste ver la demo? ${url(d)}?e=${e.codigo}`)}>Seguimiento</a>}
                      <button className="text-xs text-suave underline" onClick={() => quitarEnvio(e)}>quitar</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </div>

      {form && (
        <Modal titulo={form.id ? 'Editar demo' : 'Subir demo'} onCerrar={() => { setForm(null); setErr('') }}>
          <div className="grid gap-3">
            <Campo etq="Título"><input className="campo" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ej: Tienda de ropa · estilo boutique" autoFocus /></Campo>
            <Campo etq="Categoría"><select className="campo" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>{CATEGORIAS.map((c) => <option key={c}>{c}</option>)}</select></Campo>
            <Campo etq="Dirección">
              <div className="flex items-center gap-2"><span className="whitespace-nowrap text-sm text-suave">{DEMOS_URL.replace(/^https?:\/\//, '')}/</span>
                <input className="campo" value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} placeholder={slugify(form.titulo) || 'mi-demo'} /></div>
            </Campo>
            <Campo etq="Nota para ti (opcional)"><input className="campo" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Ej: para boutiques y tiendas de ropa" /></Campo>
            <Campo etq={form.id ? 'Reemplazar archivo (opcional)' : 'Archivo .html'}>
              <input type="file" accept=".html,.htm,text/html" className="campo" onChange={(e) => setForm({ ...form, archivo: e.target.files?.[0] ?? null })} />
            </Campo>
          </div>
          {err && <p role="alert" className="mt-3 text-sm text-malo">{err}</p>}
          <div className="mt-5 flex justify-end gap-2"><button className="btn-borde" onClick={() => setForm(null)}>Cancelar</button>
            <button className="btn-primario" disabled={subiendo} onClick={guardar}>{subiendo ? 'Subiendo…' : 'Guardar'}</button></div>
        </Modal>
      )}

      {enviar && <EnviarDemo demo={enviar} url={url(enviar)} personas={personas} para={para} onCerrar={() => setEnviar(null)} onListo={() => { setEnviar(null); setAbierta(enviar.id); router.refresh() }} />}
    </>
  )
}

function EnviarDemo({ demo, url, personas, para, onCerrar, onListo }: {
  demo: Demo; url: string; personas: Persona[]; para: Persona | null; onCerrar: () => void; onListo: () => void
}) {
  const [modo, setModo] = useState<'prospecto' | 'cliente' | 'otro'>(para?.tipo ?? 'prospecto')
  const [elegido, setElegido] = useState<Persona | null>(para)
  const [q, setQ] = useState('')
  const [nombre, setNombre] = useState('')
  const [tel, setTel] = useState('591')
  const [texto, setTexto] = useState('')
  const [err, setErr] = useState('')
  const opciones = personas.filter((p) => p.tipo === modo && (!q || `${p.nombre} ${p.empresa ?? ''}`.toLowerCase().includes(q.toLowerCase())))
  const quien = modo === 'otro' ? nombre.trim() : elegido?.nombre ?? ''
  const mensaje = texto || `Hola ${quien.split(' ')[0] || ''}, te preparé una demo para que veas cómo quedaría: ${url}?e=…\n\nÁbrela desde tu celular y dime qué te parece.`

  async function mandar() {
    setErr('')
    if (!quien) return setErr(modo === 'otro' ? 'Escribe el nombre.' : `Elige un ${modo}.`)
    const telefono = modo === 'otro' ? tel.replace(/\D/g, '') : (elegido?.telefono ?? '').replace(/\D/g, '')
    const ventana = window.open('', '_blank') // se abre ya para que el navegador no la bloquee
    const sb = createClient()
    const { data, error } = await sb.from('demo_envios').insert({
      demo_id: demo.id, nombre: quien, telefono: telefono || null,
      prospecto_id: modo === 'prospecto' ? elegido!.id : null, cliente_id: modo === 'cliente' ? elegido!.id : null,
    }).select('codigo').single()
    if (error || !data) { ventana?.close(); return setErr('No se pudo registrar el envío. ¿Ejecutaste la migración 008?') }
    const enlace = `${url}?e=${data.codigo}`
    const final = (texto || `Hola ${quien.split(' ')[0]}, te preparé una demo para que veas cómo quedaría: ${enlace}\n\nÁbrela desde tu celular y dime qué te parece.`).replace(`${url}?e=…`, enlace)
    if (modo !== 'otro' && elegido) {
      await sb.from('crm_actividades').insert({ [modo === 'prospecto' ? 'prospecto_id' : 'cliente_id']: elegido.id, tipo: 'WhatsApp', texto: `Le envié la demo "${demo.titulo}"` })
      if (modo === 'prospecto' && elegido.etapa && ETAPAS_PREVIAS.includes(elegido.etapa)) {
        await sb.from('crm_prospectos').update({ etapa: 'Demo', actualizado_en: new Date().toISOString() }).eq('id', elegido.id)
      }
    }
    const destino = waLink(telefono, final)
    if (ventana) ventana.location.href = destino; else window.location.href = destino
    onListo()
  }

  return (
    <Modal titulo={`Enviar "${demo.titulo}"`} onCerrar={onCerrar}>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {(['prospecto', 'cliente', 'otro'] as const).map((m) => (
          <button key={m} onClick={() => { setModo(m); setElegido(m === para?.tipo ? para : null); setQ('') }}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${modo === m ? 'border-primario bg-primario text-sobreprimario' : 'border-linea bg-sup2'}`}>
            {m === 'prospecto' ? 'Prospecto' : m === 'cliente' ? 'Cliente' : 'Otra persona'}</button>
        ))}
      </div>
      {modo === 'otro' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etq="Nombre"><input className="campo" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus /></Campo>
          <Campo etq="WhatsApp"><input className="campo" inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} /></Campo>
        </div>
      ) : elegido ? (
        <div className="flex items-center gap-3 rounded-lg border border-acento bg-chip px-3 py-2.5">
          <div className="min-w-0 flex-1"><b className="block">{elegido.nombre}</b><small className="text-suave">{[elegido.empresa, elegido.telefono || 'sin WhatsApp', elegido.etapa].filter(Boolean).join(' · ')}</small></div>
          <button className="text-sm underline" onClick={() => setElegido(null)}>cambiar</button>
        </div>
      ) : (
        <>
          <input className="campo" placeholder={`Buscar ${modo}…`} value={q} onChange={(e) => setQ(e.target.value)} autoFocus aria-label="Buscar" />
          <ul className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-linea">
            {opciones.length === 0 && <li className="p-3 text-sm text-suave">No hay {modo === 'prospecto' ? 'prospectos abiertos' : 'clientes'} con ese nombre.</li>}
            {opciones.map((p) => (
              <li key={p.id}><button className="w-full border-t border-linea px-3 py-2 text-left first:border-t-0 hover:bg-sup2" onClick={() => setElegido(p)}>
                <b className="block text-sm">{p.nombre}</b><small className="text-suave">{[p.empresa, p.telefono, p.etapa].filter(Boolean).join(' · ')}</small></button></li>
            ))}
          </ul>
        </>
      )}
      <Campo etq="Mensaje" full>
        <textarea className="campo mt-1 min-h-[110px]" value={mensaje} onChange={(e) => setTexto(e.target.value)} />
      </Campo>
      <p className="mt-1 text-xs text-suave">El enlace lleva un código personal, así sabrás si {quien || 'esa persona'} abrió la demo. Si es un prospecto en etapa Nuevo o Contactado, pasa solo a Demo.</p>
      {err && <p role="alert" className="mt-3 text-sm text-malo">{err}</p>}
      <div className="mt-5 flex justify-end gap-2"><button className="btn-borde" onClick={onCerrar}>Cancelar</button>
        <button className="btn-wa" onClick={mandar}>Enviar por WhatsApp</button></div>
    </Modal>
  )
}
