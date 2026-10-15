'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Modal, { Campo } from './Modal'
import {
  ESTADOS_VENTA, METODOS_PAGO, ORIGENES, TIPO_COBRO, dinero, hoyBolivia, rangoPrecio,
  type Cliente, type Division, type Moneda, type Servicio, type TipoCobro, type Venta,
} from '@/lib/crm'

type Opcion = { id: string; nombre: string }

// ------------------------------------------------------------------ CLIENTE
export type DatosCliente = Partial<Cliente>

export function FormCliente({ inicial, divisiones, tiendas = [], eventos = [], onCerrar, onGuardado }: {
  inicial?: DatosCliente; divisiones: Division[]; tiendas?: Opcion[]; eventos?: Opcion[]
  onCerrar: () => void; onGuardado?: (id: string) => void
}) {
  const router = useRouter()
  const [c, setC] = useState<DatosCliente>(inicial ?? { division_id: divisiones[0]?.id ?? null })
  const [err, setErr] = useState('')
  const [guardando, setGuardando] = useState(false)
  const set = (k: keyof Cliente, v: string | null) => setC((x) => ({ ...x, [k]: v === '' ? null : v }))

  async function guardar() {
    if (!c.nombre?.trim()) return setErr('Escribe el nombre del cliente.')
    setGuardando(true)
    const datos = { nombre: c.nombre.trim(), empresa: c.empresa ?? null, telefono: c.telefono ?? null, email: c.email ?? null,
      division_id: c.division_id ?? null, origen: c.origen ?? null, notas: c.notas ?? null, tienda_id: c.tienda_id ?? null, evento_id: c.evento_id ?? null }
    const sb = createClient()
    const { data, error } = c.id
      ? await sb.from('crm_clientes').update(datos).eq('id', c.id).select('id').single()
      : await sb.from('crm_clientes').insert(datos).select('id').single()
    setGuardando(false)
    if (error || !data) return setErr('No se pudo guardar el cliente.')
    onGuardado?.(data.id); onCerrar(); router.refresh()
  }

  return (
    <Modal titulo={c.id ? 'Editar cliente' : 'Nuevo cliente'} onCerrar={onCerrar}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etq="Nombre"><input className="campo" value={c.nombre ?? ''} onChange={(e) => set('nombre', e.target.value)} autoFocus /></Campo>
        <Campo etq="Empresa / negocio"><input className="campo" value={c.empresa ?? ''} onChange={(e) => set('empresa', e.target.value)} /></Campo>
        <Campo etq="Teléfono / WhatsApp"><input className="campo" inputMode="tel" value={c.telefono ?? ''} onChange={(e) => set('telefono', e.target.value)} placeholder="591…" /></Campo>
        <Campo etq="Correo"><input className="campo" type="email" value={c.email ?? ''} onChange={(e) => set('email', e.target.value)} /></Campo>
        <Campo etq="División"><select className="campo" value={c.division_id ?? ''} onChange={(e) => set('division_id', e.target.value)}>
          <option value="">Sin división</option>{divisiones.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}</select></Campo>
        <Campo etq="¿Cómo llegó?"><select className="campo" value={c.origen ?? ''} onChange={(e) => set('origen', e.target.value)}>
          <option value="">—</option>{[...ORIGENES, ...(c.origen && !ORIGENES.includes(c.origen) ? [c.origen] : [])].map((o) => <option key={o}>{o}</option>)}</select></Campo>
        {tiendas.length > 0 && <Campo etq="Su tienda en EDAI (opcional)"><select className="campo" value={c.tienda_id ?? ''} onChange={(e) => set('tienda_id', e.target.value)}>
          <option value="">Ninguna</option>{tiendas.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></Campo>}
        {eventos.length > 0 && <Campo etq="Su invitación en EDAI (opcional)"><select className="campo" value={c.evento_id ?? ''} onChange={(e) => set('evento_id', e.target.value)}>
          <option value="">Ninguna</option>{eventos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></Campo>}
        <Campo etq="Notas y preferencias" full><textarea className="campo min-h-[80px]" value={c.notas ?? ''} onChange={(e) => set('notas', e.target.value)} placeholder="Qué necesita, cómo le gusta trabajar, recordatorios…" /></Campo>
      </div>
      {err && <p role="alert" className="mt-3 text-sm text-malo">{err}</p>}
      <div className="mt-5 flex justify-end gap-2"><button className="btn-borde" onClick={onCerrar}>Cancelar</button>
        <button className="btn-primario" disabled={guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar'}</button></div>
    </Modal>
  )
}

// ------------------------------------------------------------------ VENTA
export type DatosVenta = Partial<Pick<Venta, 'id' | 'cliente_id' | 'division_id' | 'servicio_id' | 'descripcion' | 'tipo' | 'moneda' | 'valor' | 'costo' | 'estado' | 'fecha' | 'entrega' | 'notas'>>

export function FormVenta({ inicial, clientes, servicios, divisiones, onCerrar }: {
  inicial?: DatosVenta; clientes: Pick<Cliente, 'id' | 'nombre' | 'empresa'>[]; servicios: Servicio[]; divisiones: Division[]; onCerrar: () => void
}) {
  const router = useRouter()
  const [v, setV] = useState<DatosVenta>(inicial ?? { tipo: 'unico', moneda: 'USD', estado: 'En desarrollo', fecha: hoyBolivia(), costo: 0, division_id: divisiones[0]?.id ?? null })
  const [cobrado, setCobrado] = useState('')
  const [err, setErr] = useState('')
  const [guardando, setGuardando] = useState(false)
  const set = <K extends keyof DatosVenta>(k: K, val: DatosVenta[K]) => setV((x) => ({ ...x, [k]: val }))
  const ganancia = Number(v.valor ?? 0) - Number(v.costo ?? 0)
  const margen = Number(v.valor) > 0 ? Math.round((ganancia / Number(v.valor)) * 100) : null

  function elegirServicio(id: string) {
    const s = servicios.find((x) => x.id === id)
    setV((x) => ({ ...x, servicio_id: id || null, ...(s && !x.id ? {
      tipo: s.tipo, moneda: s.moneda, valor: s.precio_min ?? x.valor, division_id: s.division_id ?? x.division_id,
      descripcion: x.descripcion || s.nombre } : {}) }))
  }

  async function guardar() {
    if (!v.cliente_id) return setErr('Elige el cliente.')
    if (v.valor == null || Number(v.valor) < 0) return setErr('Escribe el valor de la venta.')
    setGuardando(true)
    const datos = { cliente_id: v.cliente_id, division_id: v.division_id ?? null, servicio_id: v.servicio_id ?? null, descripcion: v.descripcion ?? null,
      tipo: v.tipo ?? 'unico', moneda: v.moneda ?? 'USD', valor: Number(v.valor), costo: Number(v.costo ?? 0), estado: v.estado ?? 'En desarrollo',
      fecha: v.fecha || hoyBolivia(), entrega: v.entrega || null, notas: v.notas ?? null }
    const sb = createClient()
    const { data, error } = v.id
      ? await sb.from('crm_ventas').update(datos).eq('id', v.id).select('id').single()
      : await sb.from('crm_ventas').insert(datos).select('id').single()
    if (!error && data && !v.id && Number(cobrado) > 0) {
      await sb.from('crm_pagos').insert({ venta_id: data.id, monto: Number(cobrado), fecha: datos.fecha, nota: 'Pago inicial' })
    }
    setGuardando(false)
    if (error) return setErr('No se pudo guardar la venta.')
    onCerrar(); router.refresh()
  }

  return (
    <Modal titulo={v.id ? 'Editar venta' : 'Nueva venta'} onCerrar={onCerrar} ancho="max-w-2xl">
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etq="Cliente"><select className="campo" value={v.cliente_id ?? ''} onChange={(e) => set('cliente_id', e.target.value)}>
          <option value="">Elige…</option>{clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}{c.empresa ? ` · ${c.empresa}` : ''}</option>)}</select></Campo>
        <Campo etq="Servicio o paquete"><select className="campo" value={v.servicio_id ?? ''} onChange={(e) => elegirServicio(e.target.value)}>
          <option value="">Otro / personalizado</option>{servicios.filter((s) => s.activo || s.id === v.servicio_id).map((s) => <option key={s.id} value={s.id}>{s.nombre} · {rangoPrecio(s)}</option>)}</select></Campo>
        <Campo etq="Descripción" full><input className="campo" value={v.descripcion ?? ''} onChange={(e) => set('descripcion', e.target.value)} placeholder="Ej: Página con catálogo para su boutique" /></Campo>
        <Campo etq="División"><select className="campo" value={v.division_id ?? ''} onChange={(e) => set('division_id', e.target.value || null)}>
          <option value="">Sin división</option>{divisiones.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}</select></Campo>
        <Campo etq="Tipo de cobro"><select className="campo" value={v.tipo} onChange={(e) => set('tipo', e.target.value as TipoCobro)}>
          {(Object.keys(TIPO_COBRO) as TipoCobro[]).map((k) => <option key={k} value={k}>{TIPO_COBRO[k]}</option>)}</select></Campo>
        <div className="grid grid-cols-[90px_1fr] gap-2">
          <Campo etq="Moneda"><select className="campo" value={v.moneda} onChange={(e) => set('moneda', e.target.value as Moneda)}><option value="USD">$</option><option value="BOB">Bs.</option></select></Campo>
          <Campo etq={v.tipo === 'mensual' ? 'Valor por mes' : 'Valor total'}><input className="campo" type="number" min="0" step="0.01" value={v.valor ?? ''} onChange={(e) => set('valor', e.target.value === '' ? undefined : Number(e.target.value))} /></Campo>
        </div>
        <Campo etq="Costo directo (lo que te cuesta)"><input className="campo" type="number" min="0" step="0.01" value={v.costo ?? 0} onChange={(e) => set('costo', Number(e.target.value) || 0)} /></Campo>
        <div className="rounded-lg border border-linea bg-sup2 px-3 py-2 text-sm sm:col-span-2">
          Ganancia: <b className={ganancia >= 0 ? 'text-chiptinta' : 'text-malo'}>{dinero(ganancia, v.moneda)}</b>{margen !== null && <> · Margen: <b>{margen}%</b></>}
        </div>
        <Campo etq="Estado"><select className="campo" value={v.estado} onChange={(e) => set('estado', e.target.value)}>{ESTADOS_VENTA.map((s) => <option key={s}>{s}</option>)}</select></Campo>
        <Campo etq="Fecha de venta"><input className="campo" type="date" value={v.fecha ?? ''} onChange={(e) => set('fecha', e.target.value)} /></Campo>
        <Campo etq="Fecha de entrega (opcional)"><input className="campo" type="date" value={v.entrega ?? ''} onChange={(e) => set('entrega', e.target.value || null)} /></Campo>
        {!v.id && <Campo etq="¿Ya te pagó algo? (opcional)"><input className="campo" type="number" min="0" step="0.01" value={cobrado} onChange={(e) => setCobrado(e.target.value)} placeholder="Anticipo" /></Campo>}
        <Campo etq="Notas" full><textarea className="campo min-h-[70px]" value={v.notas ?? ''} onChange={(e) => set('notas', e.target.value)} /></Campo>
      </div>
      {err && <p role="alert" className="mt-3 text-sm text-malo">{err}</p>}
      <div className="mt-5 flex justify-end gap-2"><button className="btn-borde" onClick={onCerrar}>Cancelar</button>
        <button className="btn-primario" disabled={guardando} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar venta'}</button></div>
    </Modal>
  )
}

// ------------------------------------------------------------------ PAGO
export function FormPago({ venta, onCerrar }: { venta: Pick<Venta, 'id' | 'numero' | 'moneda' | 'saldo' | 'descripcion'>; onCerrar: () => void }) {
  const router = useRouter()
  const [monto, setMonto] = useState(String(Number(venta.saldo) || ''))
  const [fecha, setFecha] = useState(hoyBolivia())
  const [metodo, setMetodo] = useState('QR')
  const [nota, setNota] = useState('')
  const [err, setErr] = useState('')
  async function guardar() {
    if (!(Number(monto) > 0)) return setErr('Escribe el monto.')
    const { error } = await createClient().from('crm_pagos').insert({ venta_id: venta.id, monto: Number(monto), fecha, metodo, nota: nota || null })
    if (error) return setErr('No se pudo registrar el pago.')
    onCerrar(); router.refresh()
  }
  return (
    <Modal titulo="Registrar pago" onCerrar={onCerrar}>
      <p className="mb-4 text-sm text-suave">{venta.descripcion || 'Venta'} · falta cobrar <b className="text-tinta">{dinero(venta.saldo, venta.moneda)}</b></p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etq={`Monto (${venta.moneda === 'USD' ? '$' : 'Bs.'})`}><input className="campo" type="number" min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} autoFocus /></Campo>
        <Campo etq="Fecha"><input className="campo" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Campo>
        <Campo etq="Método"><select className="campo" value={metodo} onChange={(e) => setMetodo(e.target.value)}>{METODOS_PAGO.map((m) => <option key={m}>{m}</option>)}</select></Campo>
        <Campo etq="Nota (opcional)"><input className="campo" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: anticipo 50%" /></Campo>
      </div>
      {err && <p role="alert" className="mt-3 text-sm text-malo">{err}</p>}
      <div className="mt-5 flex justify-end gap-2"><button className="btn-borde" onClick={onCerrar}>Cancelar</button><button className="btn-primario" onClick={guardar}>Registrar</button></div>
    </Modal>
  )
}
