'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Modal, { Campo } from '@/components/crm/Modal'
import { TIPO_COBRO, aBs, dinero, rangoPrecio, type Division, type Moneda, type Servicio, type TipoCobro } from '@/lib/crm'

export default function Servicios({ servicios, divisiones, tc }: { servicios: Servicio[]; divisiones: Division[]; tc: number }) {
  const router = useRouter()
  const [form, setForm] = useState<Partial<Servicio> | null>(null)
  const [verInactivos, setVerInactivos] = useState(false)
  const [err, setErr] = useState('')
  const set = <K extends keyof Servicio>(k: K, v: Servicio[K] | null) => setForm((f) => ({ ...f, [k]: v }))
  const grupos = [...divisiones.map((d) => ({ id: d.id as string | null, nombre: d.nombre })), { id: null, nombre: 'Sin división' }]

  async function guardar() {
    if (!form?.nombre?.trim()) return setErr('Escribe el nombre del servicio.')
    const datos = { nombre: form.nombre.trim(), division_id: form.division_id || null, tipo: form.tipo ?? 'unico', moneda: form.moneda ?? 'USD',
      precio_min: form.precio_min ?? null, precio_max: form.precio_max ?? null, entrega: form.entrega || null, publico: form.publico || null,
      incluye: form.incluye || null, asesoria: form.asesoria || null, activo: form.activo ?? true }
    const sb = createClient()
    const { error } = form.id ? await sb.from('crm_servicios').update(datos).eq('id', form.id) : await sb.from('crm_servicios').insert(datos)
    if (error) return setErr('No se pudo guardar.')
    setForm(null); setErr(''); router.refresh()
  }
  async function eliminar() {
    if (!form?.id || !confirm('¿Eliminar este servicio? Las ventas que lo usaban se conservan.')) return
    await createClient().from('crm_servicios').delete().eq('id', form.id); setForm(null); router.refresh()
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="titulo">Servicios y paquetes</h1><p className="subtitulo">Tu catálogo. Se usa al registrar ventas y prospectos.</p></div>
        <button className="btn-primario" onClick={() => setForm({ tipo: 'unico', moneda: 'USD', activo: true, division_id: divisiones[0]?.id ?? null })}>Nuevo servicio</button>
      </div>
      <label className="mb-4 flex items-center gap-2 text-sm text-suave"><input type="checkbox" className="accent-acento" checked={verInactivos} onChange={(e) => setVerInactivos(e.target.checked)} /> Mostrar los que ya no ofreces</label>
      {grupos.map((g) => {
        const lista = servicios.filter((s) => s.division_id === g.id && (verInactivos || s.activo))
        if (!lista.length) return null
        return (
          <section key={g.nombre} className="mb-8">
            <h2 className="mb-3 text-lg font-bold">{g.nombre}</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {lista.map((s) => (
                <button key={s.id} onClick={() => setForm(s)} className={`caja p-4 text-left hover:border-acento ${s.activo ? '' : 'opacity-50'}`}>
                  <div className="flex items-start justify-between gap-2"><b>{s.nombre}</b><span className="chip">{TIPO_COBRO[s.tipo]}</span></div>
                  <p className="mt-1 text-lg font-extrabold">{rangoPrecio(s)}</p>
                  {s.moneda === 'USD' && s.precio_min != null && <small className="text-suave">≈ {dinero(aBs(s.precio_min, 'USD', tc))}{s.precio_max != null && s.precio_max !== s.precio_min ? ` – ${dinero(aBs(s.precio_max, 'USD', tc))}` : ''}</small>}
                  {s.publico && <p className="mt-2 text-sm text-suave">Para: {s.publico}</p>}
                  {s.entrega && <p className="text-sm text-suave">Entrega: {s.entrega}</p>}
                  {s.incluye && <p className="mt-2 line-clamp-3 text-sm">{s.incluye}</p>}
                </button>
              ))}
            </div>
          </section>
        )
      })}
      {servicios.length === 0 && <div className="caja p-6 text-suave">Aún no tienes servicios. Ejecuta los datos iniciales del CRM o crea el primero.</div>}

      {form && (
        <Modal titulo={form.id ? 'Editar servicio' : 'Nuevo servicio'} onCerrar={() => setForm(null)} ancho="max-w-2xl">
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo etq="Nombre" full><input className="campo" value={form.nombre ?? ''} onChange={(e) => set('nombre', e.target.value)} autoFocus /></Campo>
            <Campo etq="División"><select className="campo" value={form.division_id ?? ''} onChange={(e) => set('division_id', e.target.value || null)}><option value="">Sin división</option>{divisiones.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}</select></Campo>
            <Campo etq="Tipo de cobro"><select className="campo" value={form.tipo ?? 'unico'} onChange={(e) => set('tipo', e.target.value as TipoCobro)}>{(Object.keys(TIPO_COBRO) as TipoCobro[]).map((k) => <option key={k} value={k}>{TIPO_COBRO[k]}</option>)}</select></Campo>
            <Campo etq="Moneda"><select className="campo" value={form.moneda ?? 'USD'} onChange={(e) => set('moneda', e.target.value as Moneda)}><option value="USD">Dólares ($)</option><option value="BOB">Bolivianos (Bs.)</option></select></Campo>
            <div className="grid grid-cols-2 gap-2">
              <Campo etq="Precio desde"><input className="campo" type="number" min="0" value={form.precio_min ?? ''} onChange={(e) => set('precio_min', e.target.value === '' ? null : Number(e.target.value))} /></Campo>
              <Campo etq="Hasta (opcional)"><input className="campo" type="number" min="0" value={form.precio_max ?? ''} onChange={(e) => set('precio_max', e.target.value === '' ? null : Number(e.target.value))} /></Campo>
            </div>
            <Campo etq="Tiempo de entrega"><input className="campo" value={form.entrega ?? ''} onChange={(e) => set('entrega', e.target.value)} placeholder="Ej: 3 a 5 días hábiles" /></Campo>
            <Campo etq="Público objetivo"><input className="campo" value={form.publico ?? ''} onChange={(e) => set('publico', e.target.value)} /></Campo>
            <Campo etq="Qué incluye" full><textarea className="campo min-h-[80px]" value={form.incluye ?? ''} onChange={(e) => set('incluye', e.target.value)} /></Campo>
            <Campo etq="Asesoramiento incluido" full><textarea className="campo min-h-[60px]" value={form.asesoria ?? ''} onChange={(e) => set('asesoria', e.target.value)} /></Campo>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" className="h-4 w-4 accent-acento" checked={form.activo ?? true} onChange={(e) => set('activo', e.target.checked)} /> Lo sigo ofreciendo</label>
          </div>
          {err && <p role="alert" className="mt-3 text-sm text-malo">{err}</p>}
          <div className="mt-5 flex justify-end gap-2">
            {form.id && <button className="btn-borde mr-auto text-malo" onClick={eliminar}>Eliminar</button>}
            <button className="btn-borde" onClick={() => setForm(null)}>Cancelar</button><button className="btn-primario" onClick={guardar}>Guardar</button>
          </div>
        </Modal>
      )}
    </>
  )
}
