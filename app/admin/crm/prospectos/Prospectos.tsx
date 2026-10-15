'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Modal, { Campo } from '@/components/crm/Modal'
import { ETAPAS, ORIGENES, codProspecto, dinero, hoyBolivia, rangoPrecio, type Division, type Etapa, type Moneda, type Prospecto, type Servicio } from '@/lib/crm'
import { waLink } from '@/lib/utils'

const COLOR: Record<Etapa, string> = { Nuevo: 'bg-sup2', Contactado: 'bg-sup2', Demo: 'bg-sup2', Propuesta: 'bg-sup2', Ganado: 'bg-chip', Perdido: 'bg-malofondo' }

export default function Prospectos({ inicial, servicios, divisiones }: { inicial: Prospecto[]; servicios: Servicio[]; divisiones: Division[] }) {
  const router = useRouter()
  const sb = useMemo(() => createClient(), [])
  const [lista, setLista] = useState(inicial)
  const [form, setForm] = useState<Partial<Prospecto> | null>(null)
  const [nota, setNota] = useState('')
  const [q, setQ] = useState('')
  const [verCerrados, setVerCerrados] = useState(false)
  const [err, setErr] = useState('')
  const hoy = hoyBolivia()
  const servicio = (id: string | null | undefined) => servicios.find((s) => s.id === id)

  const visibles = lista.filter((p) => {
    const t = q.trim().toLowerCase()
    return !t || [p.nombre, p.empresa, p.telefono, p.origen, p.notas].some((x) => x && x.toLowerCase().includes(t))
  })
  const columnas = ETAPAS.filter((e) => verCerrados || (e !== 'Ganado' && e !== 'Perdido'))

  async function actualizar(p: Prospecto, cambios: Partial<Prospecto>) {
    const { data, error } = await sb.from('crm_prospectos').update({ ...cambios, actualizado_en: new Date().toISOString() }).eq('id', p.id).select().single()
    if (!error && data) setLista((l) => l.map((x) => (x.id === p.id ? (data as Prospecto) : x)))
  }

  async function convertir(p: Prospecto) {
    const { data: c, error } = await sb.from('crm_clientes').insert({
      nombre: p.nombre, empresa: p.empresa, telefono: p.telefono, email: p.email, origen: p.origen,
      division_id: servicio(p.servicio_id)?.division_id ?? divisiones[0]?.id ?? null, notas: p.notas,
    }).select('id').single()
    if (error || !c) return alert('No se pudo crear el cliente.')
    await sb.from('crm_prospectos').update({ cliente_id: c.id, etapa: 'Ganado', actualizado_en: new Date().toISOString() }).eq('id', p.id)
    const qs = new URLSearchParams({ nuevaVenta: '1' })
    if (p.servicio_id) qs.set('servicio', p.servicio_id)
    if (p.valor) { qs.set('valor', String(p.valor)); qs.set('moneda', p.moneda) }
    router.push(`/admin/crm/clientes/${c.id}?${qs.toString()}`)
  }

  async function mover(p: Prospecto, etapa: Etapa) {
    if (etapa === 'Perdido') {
      const motivo = prompt('¿Por qué se perdió? (precio, no respondió, eligió a otro…)') ?? ''
      await actualizar(p, { etapa, motivo_perdida: motivo || null })
      return
    }
    await actualizar(p, { etapa })
    if (etapa === 'Ganado' && !p.cliente_id && confirm(`¡Felicidades! ¿Convertir a ${p.nombre} en cliente ahora?`)) convertir({ ...p, etapa })
  }

  async function guardar() {
    if (!form?.nombre?.trim()) return setErr('Escribe el nombre.')
    const datos = {
      nombre: form.nombre.trim(), empresa: form.empresa || null, telefono: form.telefono || null, email: form.email || null,
      origen: form.origen || null, etapa: form.etapa ?? 'Nuevo', servicio_id: form.servicio_id || null,
      valor: form.valor ?? null, moneda: form.moneda ?? 'BOB', proxima_accion: form.proxima_accion || null,
      proxima_fecha: form.proxima_fecha || null, notas: form.notas || null, actualizado_en: new Date().toISOString(),
    }
    const { data, error } = form.id
      ? await sb.from('crm_prospectos').update(datos).eq('id', form.id).select().single()
      : await sb.from('crm_prospectos').insert(datos).select().single()
    if (error || !data) return setErr('No se pudo guardar.')
    if (nota.trim()) await sb.from('crm_actividades').insert({ prospecto_id: data.id, tipo: 'Nota', texto: nota.trim() })
    setLista((l) => (form.id ? l.map((x) => (x.id === form.id ? (data as Prospecto) : x)) : [data as Prospecto, ...l]))
    setForm(null); setNota(''); setErr(''); router.refresh()
  }

  async function eliminar(p: Prospecto) {
    if (!confirm(`¿Eliminar a ${p.nombre} de tus prospectos?`)) return
    const { error } = await sb.from('crm_prospectos').delete().eq('id', p.id)
    if (!error) { setLista((l) => l.filter((x) => x.id !== p.id)); setForm(null); router.refresh() }
  }

  const set = <K extends keyof Prospecto>(k: K, v: Prospecto[K] | null) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="titulo">Prospectos</h1><p className="subtitulo">Interesados que todavía no compran. Cambia la etapa con el selector de cada tarjeta.</p></div>
        <button className="btn-primario" onClick={() => setForm({ etapa: 'Nuevo', moneda: 'BOB', proxima_fecha: hoy })}>Nuevo prospecto</button>
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input className="campo min-w-[220px] flex-1" placeholder="Buscar por nombre, empresa, teléfono u origen" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
        <label className="flex items-center gap-2 text-sm text-suave"><input type="checkbox" className="accent-acento" checked={verCerrados} onChange={(e) => setVerCerrados(e.target.checked)} /> Ver ganados y perdidos</label>
      </div>

      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-4">
        {columnas.map((etapa) => {
          const items = visibles.filter((p) => p.etapa === etapa)
          return (
            <section key={etapa} className="w-72 flex-none">
              <div className="mb-2 flex items-center justify-between px-1"><b>{etapa}</b><span className="chip">{items.length}</span></div>
              <div className="flex flex-col gap-2">
                {items.length === 0 && <p className="rounded-lg border border-dashed border-linea p-3 text-center text-xs text-suave">Sin prospectos</p>}
                {items.map((p) => {
                  const s = servicio(p.servicio_id)
                  const vencida = !!p.proxima_fecha && p.proxima_fecha < hoy
                  return (
                    <article key={p.id} className={`rounded-xl border border-linea p-3 ${COLOR[p.etapa]}`}>
                      <button className="block w-full text-left" onClick={() => setForm(p)}>
                        <small className="text-suave">{codProspecto(p.numero)}{p.origen ? ` · ${p.origen}` : ''}</small>
                        <b className="block leading-snug">{p.nombre}</b>
                        {p.empresa && <small className="block text-suave">{p.empresa}</small>}
                        {(s || p.valor) && <small className="mt-1 block">{s?.nombre}{s && p.valor ? ' · ' : ''}{p.valor ? dinero(p.valor, p.moneda) : ''}</small>}
                        {p.proxima_accion && <small className={`mt-1 block ${vencida ? 'font-semibold text-malo' : 'text-suave'}`}>→ {p.proxima_accion}{p.proxima_fecha ? ` · ${p.proxima_fecha === hoy ? 'hoy' : p.proxima_fecha}` : ''}</small>}
                        {p.etapa === 'Perdido' && p.motivo_perdida && <small className="mt-1 block text-malo">Motivo: {p.motivo_perdida}</small>}
                      </button>
                      <div className="mt-2 flex gap-1.5">
                        <select aria-label="Mover a etapa" className="flex-1 rounded-md border border-linea bg-sup px-2 py-1 text-xs" value={p.etapa} onChange={(e) => mover(p, e.target.value as Etapa)}>
                          {ETAPAS.map((e) => <option key={e}>{e}</option>)}
                        </select>
                        {p.telefono && <a className="btn-wa btn-sm px-2 py-1 text-xs" href={waLink(p.telefono, `Hola ${p.nombre}, te escribo de EDAI.`)} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
                      </div>
                      {p.etapa === 'Ganado' && !p.cliente_id && <button className="btn-primario btn-sm mt-2 w-full text-xs" onClick={() => convertir(p)}>Convertir en cliente</button>}
                      {p.cliente_id && <a href={`/admin/crm/clientes/${p.cliente_id}`} className="mt-2 block text-center text-xs text-chiptinta underline">Ver ficha del cliente</a>}
                    </article>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      {form && (
        <Modal titulo={form.id ? `${codProspecto(form.numero ?? 0)} · ${form.nombre}` : 'Nuevo prospecto'} onCerrar={() => { setForm(null); setErr('') }} ancho="max-w-2xl">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etq="Nombre"><input className="campo" value={form.nombre ?? ''} onChange={(e) => set('nombre', e.target.value)} autoFocus /></Campo>
            <Campo etq="Empresa / negocio"><input className="campo" value={form.empresa ?? ''} onChange={(e) => set('empresa', e.target.value)} /></Campo>
            <Campo etq="WhatsApp"><input className="campo" inputMode="tel" value={form.telefono ?? ''} onChange={(e) => set('telefono', e.target.value)} placeholder="591…" /></Campo>
            <Campo etq="Correo"><input className="campo" type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} /></Campo>
            <Campo etq="¿De dónde llegó?"><select className="campo" value={form.origen ?? ''} onChange={(e) => set('origen', e.target.value)}><option value="">—</option>{ORIGENES.map((o) => <option key={o}>{o}</option>)}</select></Campo>
            <Campo etq="Etapa"><select className="campo" value={form.etapa ?? 'Nuevo'} onChange={(e) => set('etapa', e.target.value as Etapa)}>{ETAPAS.map((e) => <option key={e}>{e}</option>)}</select></Campo>
            <Campo etq="Le interesa"><select className="campo" value={form.servicio_id ?? ''} onChange={(e) => {
              const s = servicio(e.target.value)
              setForm((f) => ({ ...f, servicio_id: e.target.value || null, ...(s && !f?.valor ? { valor: s.precio_min, moneda: s.moneda } : {}) }))
            }}><option value="">Aún no sabe</option>{servicios.filter((s) => s.activo).map((s) => <option key={s.id} value={s.id}>{s.nombre} · {rangoPrecio(s)}</option>)}</select></Campo>
            <div className="grid grid-cols-[90px_1fr] gap-2">
              <Campo etq="Moneda"><select className="campo" value={form.moneda ?? 'BOB'} onChange={(e) => set('moneda', e.target.value as Moneda)}><option value="BOB">Bs.</option><option value="USD">$</option></select></Campo>
              <Campo etq="Valor estimado"><input className="campo" type="number" min="0" value={form.valor ?? ''} onChange={(e) => set('valor', e.target.value === '' ? null : Number(e.target.value))} /></Campo>
            </div>
            <Campo etq="Próxima acción"><input className="campo" value={form.proxima_accion ?? ''} onChange={(e) => set('proxima_accion', e.target.value)} placeholder="Ej: Enviar demo de tienda" /></Campo>
            <Campo etq="¿Cuándo?"><input className="campo" type="date" value={form.proxima_fecha ?? ''} onChange={(e) => set('proxima_fecha', e.target.value || null)} /></Campo>
            <Campo etq="Notas" full><textarea className="campo min-h-[70px]" value={form.notas ?? ''} onChange={(e) => set('notas', e.target.value)} placeholder="Qué necesita, presupuesto, objeciones…" /></Campo>
            {form.id && <Campo etq="Agregar al historial (opcional)" full><input className="campo" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: Le mandé la propuesta por WhatsApp" /></Campo>}
          </div>
          {err && <p role="alert" className="mt-3 text-sm text-malo">{err}</p>}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            {form.id && <button className="btn-borde mr-auto text-malo" onClick={() => eliminar(form as Prospecto)}>Eliminar</button>}
            {form.id && !form.cliente_id && <button className="btn-borde" onClick={() => convertir(form as Prospecto)}>Convertir en cliente</button>}
            <button className="btn-borde" onClick={() => setForm(null)}>Cancelar</button>
            <button className="btn-primario" onClick={guardar}>Guardar</button>
          </div>
        </Modal>
      )}
    </>
  )
}
