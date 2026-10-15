'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { FormPago, FormVenta, type DatosVenta } from '@/components/crm/Formularios'
import { ESTADOS_VENTA, TIPO_COBRO, aBs, codCliente, codVenta, dinero, hoyBolivia, type Cliente, type Division, type Servicio, type Venta } from '@/lib/crm'

export default function ListaVentas({ ventas, tc, divisiones, servicios, clientes }: {
  ventas: Venta[]; tc: number; divisiones: Division[]; servicios: Servicio[]; clientes: Pick<Cliente, 'id' | 'nombre' | 'empresa'>[]
}) {
  const [q, setQ] = useState('')
  const [estado, setEstado] = useState('')
  const [div, setDiv] = useState('')
  const [mes, setMes] = useState('')
  const [soloSaldo, setSoloSaldo] = useState(false)
  const [venta, setVenta] = useState<DatosVenta | null>(null)
  const [pago, setPago] = useState<Venta | null>(null)

  const meses = useMemo(() => Array.from(new Set(ventas.map((v) => v.fecha.slice(0, 7)))).sort().reverse(), [ventas])
  const visibles = ventas.filter((v) => {
    const t = q.trim().toLowerCase()
    return (!estado || v.estado === estado) && (!div || v.division_id === div) && (!mes || v.fecha.startsWith(mes)) && (!soloSaldo || v.saldo > 0)
      && (!t || [v.cliente_nombre, v.cliente_empresa, v.descripcion, v.servicio_nombre, codVenta(v.numero)].some((x) => x && x.toLowerCase().includes(t)))
  })
  const cuentan = visibles.filter((v) => v.estado !== 'Cancelado' && v.estado !== 'Cotizado')
  const suma = (k: 'valor' | 'cobrado' | 'saldo' | 'ganancia') => cuentan.reduce((a, v) => a + aBs(v[k], v.moneda, tc), 0)
  const margen = suma('valor') > 0 ? Math.round((suma('ganancia') / suma('valor')) * 100) : 0

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="titulo">Ventas</h1><p className="subtitulo">Proyectos, servicios y cobros · montos convertidos a Bs. con 1 $ = Bs. {tc}</p></div>
        <button className="btn-primario" onClick={() => setVenta({ tipo: 'unico', moneda: 'USD', estado: 'En desarrollo', fecha: hoyBolivia(), costo: 0, division_id: divisiones[0]?.id ?? null })}>Nueva venta</button>
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="caja border-transparent bg-chip p-4"><span className="text-sm text-suave">Vendido</span><strong className="block text-2xl font-extrabold">{dinero(suma('valor'))}</strong></div>
        <div className="caja p-4"><span className="text-sm text-suave">Cobrado</span><strong className="block text-2xl font-extrabold">{dinero(suma('cobrado'))}</strong></div>
        <div className="caja p-4"><span className="text-sm text-suave">Por cobrar</span><strong className="block text-2xl font-extrabold">{dinero(suma('saldo'))}</strong></div>
        <div className="caja p-4"><span className="text-sm text-suave">Ganancia</span><strong className="block text-2xl font-extrabold">{dinero(suma('ganancia'))}</strong><small className="text-suave">margen {margen}%</small></div>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input className="campo min-w-[200px] flex-1" placeholder="Buscar por cliente, servicio o código" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
        <select className="campo w-auto" value={mes} onChange={(e) => setMes(e.target.value)} aria-label="Mes"><option value="">Todos los meses</option>{meses.map((m) => <option key={m}>{m}</option>)}</select>
        <select className="campo w-auto" value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Estado"><option value="">Todos los estados</option>{ESTADOS_VENTA.map((s) => <option key={s}>{s}</option>)}</select>
        {divisiones.length > 1 && <select className="campo w-auto" value={div} onChange={(e) => setDiv(e.target.value)} aria-label="División"><option value="">Todas las divisiones</option>{divisiones.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}</select>}
        <label className="flex items-center gap-2 text-sm text-suave"><input type="checkbox" className="accent-acento" checked={soloSaldo} onChange={(e) => setSoloSaldo(e.target.checked)} /> Solo con saldo</label>
      </div>
      <div className="caja overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
          <thead><tr className="text-[12.5px] text-suave">{['Venta', 'Cliente', 'Valor', 'Ganancia', 'Cobrado', 'Estado', ''].map((h, i) => <th key={i} className="border-b border-linea px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody>
            {visibles.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-suave">{ventas.length ? 'Ninguna venta coincide.' : 'Registra tu primera venta.'}</td></tr>}
            {visibles.map((v) => (
              <tr key={v.id} className="border-t border-linea align-top hover:bg-sup2">
                <td className="px-4 py-3"><small className="text-suave">{codVenta(v.numero)} · {v.fecha} · {TIPO_COBRO[v.tipo]}</small>
                  <b className="block">{v.descripcion || v.servicio_nombre || 'Venta'}</b>{v.servicio_nombre && v.descripcion && <small className="text-suave">{v.servicio_nombre}</small>}</td>
                <td className="px-4 py-3"><Link href={`/admin/crm/clientes/${v.cliente_id}`} className="underline-offset-2 hover:underline"><small className="block text-suave">{codCliente(v.cliente_numero)}</small>{v.cliente_nombre}</Link></td>
                <td className="px-4 py-3 tabular-nums">{dinero(v.valor, v.moneda)}{v.moneda === 'USD' && <small className="block text-suave">≈ {dinero(aBs(v.valor, 'USD', tc))}</small>}</td>
                <td className="px-4 py-3 tabular-nums">{dinero(v.ganancia, v.moneda)}<small className="block text-suave">{v.valor > 0 ? Math.round((v.ganancia / v.valor) * 100) : 0}%</small></td>
                <td className="px-4 py-3 tabular-nums">{dinero(v.cobrado, v.moneda)}{v.saldo > 0 && <small className="block text-aviso">falta {dinero(v.saldo, v.moneda)}</small>}</td>
                <td className="px-4 py-3"><span className={v.estado === 'Entregado' ? 'chip' : v.estado === 'Cancelado' ? 'chip-malo' : 'chip-aviso'}>{v.estado}</span></td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {v.saldo > 0 && v.estado !== 'Cancelado' && <button className="btn-primario btn-sm mr-1.5" onClick={() => setPago(v)}>Pago</button>}
                  <button className="btn-borde btn-sm" onClick={() => setVenta(v)}>Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {venta && <FormVenta inicial={venta} clientes={clientes} servicios={servicios} divisiones={divisiones} onCerrar={() => setVenta(null)} />}
      {pago && <FormPago venta={pago} onCerrar={() => setPago(null)} />}
    </>
  )
}
