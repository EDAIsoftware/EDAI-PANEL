'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { FormCliente } from '@/components/crm/Formularios'
import { aBs, codCliente, dinero, type Cliente, type Division, type Venta } from '@/lib/crm'

export default function ListaClientes({ clientes, ventas, tc, divisiones, tiendas, eventos }: {
  clientes: Cliente[]; ventas: Venta[]; tc: number; divisiones: Division[]
  tiendas: { id: string; nombre: string }[]; eventos: { id: string; nombre: string }[]
}) {
  const [q, setQ] = useState('')
  const [div, setDiv] = useState('')
  const [nuevo, setNuevo] = useState(false)

  const filas = useMemo(() => clientes.map((c) => {
    const vs = ventas.filter((v) => v.cliente_id === c.id && v.estado !== 'Cancelado' && v.estado !== 'Cotizado')
    return { c, total: vs.reduce((a, v) => a + aBs(v.valor, v.moneda, tc), 0), saldo: vs.reduce((a, v) => a + aBs(v.saldo, v.moneda, tc), 0),
      ultima: vs.map((v) => v.fecha).sort().pop() ?? null, n: vs.length }
  }), [clientes, ventas, tc])

  const visibles = filas.filter(({ c }) => {
    const t = q.trim().toLowerCase()
    return (!div || c.division_id === div) && (!t || [c.nombre, c.empresa, c.telefono, c.email, codCliente(c.numero)].some((x) => x && x.toLowerCase().includes(t)))
  })
  const nombreDiv = (id: string | null) => divisiones.find((d) => d.id === id)?.nombre ?? '—'

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="titulo">Clientes</h1><p className="subtitulo">{clientes.length} clientes · total histórico {dinero(filas.reduce((a, f) => a + f.total, 0))}</p></div>
        <button className="btn-primario" onClick={() => setNuevo(true)}>Nuevo cliente</button>
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <input className="campo min-w-[220px] flex-1" placeholder="Buscar por nombre, empresa, teléfono, correo o código" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
        <select className="campo w-auto" value={div} onChange={(e) => setDiv(e.target.value)} aria-label="División">
          <option value="">Todas las divisiones</option>{divisiones.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
        </select>
      </div>
      <div className="caja overflow-x-auto">
        <table className="w-full min-w-[760px] text-left">
          <thead><tr className="text-[12.5px] text-suave">{['Cliente', 'Contacto', 'División', 'Ventas', 'Total histórico', 'Por cobrar'].map((h) => <th key={h} className="border-b border-linea px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody>
            {visibles.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-suave">{clientes.length ? 'Nadie coincide con la búsqueda.' : 'Aún no tienes clientes en el CRM.'}</td></tr>}
            {visibles.map(({ c, total, saldo, n, ultima }) => (
              <tr key={c.id} className="border-t border-linea hover:bg-sup2">
                <td className="px-4 py-3"><Link href={`/admin/crm/clientes/${c.id}`} className="block">
                  <small className="text-suave">{codCliente(c.numero)}</small><b className="block">{c.nombre}</b>{c.empresa && <small className="text-suave">{c.empresa}</small>}</Link></td>
                <td className="px-4 py-3 text-sm">{c.telefono || '—'}<small className="block text-suave">{c.email}</small></td>
                <td className="px-4 py-3 text-sm">{nombreDiv(c.division_id)}</td>
                <td className="px-4 py-3 tabular-nums">{n}{ultima && <small className="block text-suave">última {ultima}</small>}</td>
                <td className="px-4 py-3 font-semibold tabular-nums">{dinero(total)}</td>
                <td className="px-4 py-3 tabular-nums">{saldo > 0 ? <span className="chip-aviso">{dinero(saldo)}</span> : <span className="text-suave">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {nuevo && <FormCliente divisiones={divisiones} tiendas={tiendas} eventos={eventos} onCerrar={() => setNuevo(false)}
        onGuardado={(id) => { window.location.href = `/admin/crm/clientes/${id}` }} />}
    </>
  )
}
