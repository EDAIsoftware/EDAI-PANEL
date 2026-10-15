'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { FormCliente, FormPago, FormVenta, type DatosVenta } from '@/components/crm/Formularios'
import {
  TIPOS_ACTIVIDAD, TIPO_COBRO, aBs, codCliente, codVenta, dinero, hoyBolivia,
  type Actividad, type Cliente, type Division, type Moneda, type Pago, type Servicio, type Venta,
} from '@/lib/crm'
import { urlInvitacion, urlTienda, waLink } from '@/lib/utils'

const chipEstado = (e: string) => (e === 'Entregado' ? 'chip' : e === 'Cancelado' ? 'chip-malo' : 'chip-aviso')

export default function FichaCliente({ cliente: c, ventas, pagos, actividades, tc, divisiones, servicios, clientes, tiendas, eventos, nuevaVenta }: {
  cliente: Cliente; ventas: Venta[]; pagos: Pago[]; actividades: Actividad[]; tc: number; divisiones: Division[]; servicios: Servicio[]
  clientes: Pick<Cliente, 'id' | 'nombre' | 'empresa'>[]; tiendas: { id: string; nombre: string; slug: string }[]; eventos: { id: string; nombre: string; slug: string }[]
  nuevaVenta: { servicio?: string; valor?: number; moneda?: Moneda } | null
}) {
  const router = useRouter()
  const servInicial = servicios.find((s) => s.id === nuevaVenta?.servicio)
  const [editando, setEditando] = useState(false)
  const [venta, setVenta] = useState<DatosVenta | null>(nuevaVenta ? {
    cliente_id: c.id, servicio_id: nuevaVenta.servicio ?? null, valor: nuevaVenta.valor ?? servInicial?.precio_min ?? undefined,
    moneda: nuevaVenta.moneda ?? servInicial?.moneda ?? 'USD', tipo: servInicial?.tipo ?? 'unico', estado: 'En desarrollo',
    fecha: hoyBolivia(), costo: 0, division_id: servInicial?.division_id ?? c.division_id, descripcion: servInicial?.nombre ?? '',
  } : null)
  const [pago, setPago] = useState<Venta | null>(null)
  const [tipoAct, setTipoAct] = useState('Nota')
  const [texto, setTexto] = useState('')

  const validas = ventas.filter((v) => v.estado !== 'Cancelado' && v.estado !== 'Cotizado')
  const total = validas.reduce((a, v) => a + aBs(v.valor, v.moneda, tc), 0)
  const cobrado = validas.reduce((a, v) => a + aBs(v.cobrado, v.moneda, tc), 0)
  const saldo = validas.reduce((a, v) => a + aBs(v.saldo, v.moneda, tc), 0)
  const ganancia = validas.reduce((a, v) => a + aBs(v.ganancia, v.moneda, tc), 0)
  const tienda = tiendas.find((t) => t.id === c.tienda_id)
  const evento = eventos.find((t) => t.id === c.evento_id)

  async function agregarActividad() {
    if (!texto.trim()) return
    const { error } = await createClient().from('crm_actividades').insert({ cliente_id: c.id, tipo: tipoAct, texto: texto.trim() })
    if (!error) { setTexto(''); router.refresh() }
  }
  async function borrarVenta(v: Venta) {
    if (!confirm(`¿Eliminar ${codVenta(v.numero)} y sus pagos? No se puede deshacer.`)) return
    await createClient().from('crm_ventas').delete().eq('id', v.id); router.refresh()
  }
  async function borrarPago(p: Pago) {
    if (!confirm('¿Eliminar este pago?')) return
    await createClient().from('crm_pagos').delete().eq('id', p.id); router.refresh()
  }
  async function borrarCliente() {
    if (!confirm(`¿Eliminar a ${c.nombre} del CRM con todas sus ventas, pagos e historial? No se puede deshacer.`)) return
    await createClient().from('crm_clientes').delete().eq('id', c.id); router.push('/admin/crm/clientes'); router.refresh()
  }

  return (
    <div className="max-w-5xl">
      <Link href="/admin/crm/clientes" className="text-sm text-suave underline">← Clientes</Link>
      <div className="mt-3 flex flex-wrap items-start gap-3">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-chip text-lg font-extrabold text-chiptinta">{c.nombre.slice(0, 2).toUpperCase()}</div>
        <div className="min-w-0 flex-1">
          <small className="text-suave">{codCliente(c.numero)}{c.origen ? ` · llegó por ${c.origen}` : ''}</small>
          <h1 className="titulo">{c.nombre}</h1>
          <p className="text-suave">{[c.empresa, divisiones.find((d) => d.id === c.division_id)?.nombre].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {c.telefono && <a className="btn-wa" href={waLink(c.telefono, `Hola ${c.nombre.split(' ')[0]}, te escribo de EDAI.`)} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
          {c.email && <a className="btn-borde" href={`mailto:${c.email}`}>Correo</a>}
          <button className="btn-borde" onClick={() => setEditando(true)}>Editar</button>
        </div>
      </div>

      <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="caja border-transparent bg-chip p-4"><span className="text-xs text-suave">Total histórico</span><strong className="block text-2xl font-extrabold">{dinero(total)}</strong></div>
        <div className="caja p-4"><span className="text-xs text-suave">Cobrado</span><strong className="block text-2xl font-extrabold">{dinero(cobrado)}</strong></div>
        <div className="caja p-4"><span className="text-xs text-suave">Por cobrar</span><strong className={`block text-2xl font-extrabold ${saldo > 0 ? 'text-aviso' : ''}`}>{dinero(saldo)}</strong></div>
        <div className="caja p-4"><span className="text-xs text-suave">Ganancia</span><strong className="block text-2xl font-extrabold">{dinero(ganancia)}</strong></div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Ventas y proyectos</h2>
            <button className="btn-primario btn-sm" onClick={() => setVenta({ cliente_id: c.id, tipo: 'unico', moneda: 'USD', estado: 'En desarrollo', fecha: hoyBolivia(), costo: 0, division_id: c.division_id })}>Nueva venta</button></div>
          <div className="caja">
            {ventas.length === 0 && <p className="p-4 text-suave">Todavía no hay ventas para este cliente.</p>}
            {ventas.map((v) => {
              const ps = pagos.filter((p) => p.venta_id === v.id)
              return (
                <div key={v.id} className="border-t border-linea p-4 first:border-t-0">
                  <div className="flex flex-wrap items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <small className="text-suave">{codVenta(v.numero)} · {v.fecha} · {TIPO_COBRO[v.tipo]}{v.servicio_nombre ? ` · ${v.servicio_nombre}` : ''}</small>
                      <b className="block">{v.descripcion || v.servicio_nombre || 'Venta'}</b>
                      <small className="text-suave">Valor {dinero(v.valor, v.moneda)} · costo {dinero(v.costo, v.moneda)} · ganancia {dinero(v.ganancia, v.moneda)}
                        {v.moneda === 'USD' && <> · ≈ {dinero(aBs(v.valor, 'USD', tc))}</>}</small>
                    </div>
                    <span className={chipEstado(v.estado)}>{v.estado}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded bg-sup2"><i className="block h-full bg-acento" style={{ width: `${v.valor > 0 ? Math.min(100, (v.cobrado / v.valor) * 100) : 0}%` }} /></div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-suave">Cobrado {dinero(v.cobrado, v.moneda)}{v.saldo > 0 ? ` · falta ${dinero(v.saldo, v.moneda)}` : ' · pagado completo'}</span>
                    <span className="ml-auto flex gap-1.5">
                      {v.saldo > 0 && v.estado !== 'Cancelado' && <button className="btn-primario btn-sm" onClick={() => setPago(v)}>Registrar pago</button>}
                      <button className="btn-borde btn-sm" onClick={() => setVenta(v)}>Editar</button>
                      <button className="btn-borde btn-sm text-malo" onClick={() => borrarVenta(v)} aria-label="Eliminar venta">✕</button>
                    </span>
                  </div>
                  {ps.length > 0 && (
                    <ul className="mt-2 space-y-1 rounded-lg bg-sup2 p-2 text-sm">
                      {ps.map((p) => (
                        <li key={p.id} className="flex items-center gap-2"><span className="text-suave">{p.fecha}</span><b>{dinero(p.monto, v.moneda)}</b>
                          <span className="text-suave">{[p.metodo, p.nota].filter(Boolean).join(' · ')}</span>
                          <button className="ml-auto text-xs text-suave underline" onClick={() => borrarPago(p)}>quitar</button></li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-lg font-bold">Datos</h2>
          <div className="caja space-y-2 p-4 text-sm">
            <p><span className="text-suave">Teléfono:</span> {c.telefono || '—'}</p>
            <p><span className="text-suave">Correo:</span> {c.email || '—'}</p>
            {tienda && <p><span className="text-suave">Tienda EDAI:</span> <a className="underline" href={urlTienda(tienda.slug)} target="_blank" rel="noopener noreferrer">{tienda.nombre}</a> · <Link className="underline" href={`/admin/tiendas/${tienda.id}`}>ficha</Link></p>}
            {evento && <p><span className="text-suave">Invitación EDAI:</span> <a className="underline" href={urlInvitacion(evento.slug)} target="_blank" rel="noopener noreferrer">{evento.nombre}</a> · <Link className="underline" href={`/admin/eventos/${evento.id}`}>ficha</Link></p>}
            {c.notas && <p className="whitespace-pre-line rounded-lg bg-sup2 p-3">{c.notas}</p>}
            <p className="pt-1"><Link className="text-suave underline" href="/admin/boveda/clientes">Ver sus claves en la bóveda</Link></p>
          </div>

          <h2 className="mb-3 mt-6 text-lg font-bold">Historial</h2>
          <div className="caja p-3">
            <div className="flex gap-2">
              <select className="campo w-auto" value={tipoAct} onChange={(e) => setTipoAct(e.target.value)} aria-label="Tipo">{TIPOS_ACTIVIDAD.map((t) => <option key={t}>{t}</option>)}</select>
              <input className="campo" placeholder="¿Qué pasó? Ej: Le mostré el avance" value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') agregarActividad() }} aria-label="Detalle" />
              <button className="btn-primario btn-sm" onClick={agregarActividad}>Agregar</button>
            </div>
            <ul className="mt-3 space-y-2">
              {actividades.length === 0 && <li className="text-sm text-suave">Anota aquí llamadas, reuniones y acuerdos.</li>}
              {actividades.map((a) => (
                <li key={a.id} className="border-l-2 border-acento pl-3 text-sm">
                  <small className="text-suave">{new Date(a.fecha).toLocaleString('es-BO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/La_Paz' })} · {a.tipo}</small>
                  <p>{a.texto}</p>
                </li>
              ))}
            </ul>
          </div>
          <button className="mt-6 text-sm text-malo underline" onClick={borrarCliente}>Eliminar cliente del CRM</button>
        </div>
      </div>

      {editando && <FormCliente inicial={c} divisiones={divisiones} tiendas={tiendas} eventos={eventos} onCerrar={() => setEditando(false)} />}
      {venta && <FormVenta inicial={venta} clientes={clientes} servicios={servicios} divisiones={divisiones}
        onCerrar={() => { setVenta(null); if (nuevaVenta) router.replace(`/admin/crm/clientes/${c.id}`) }} />}
      {pago && <FormPago venta={pago} onCerrar={() => setPago(null)} />}
    </div>
  )
}
