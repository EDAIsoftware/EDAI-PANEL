'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { bs, codigoEdai } from '@/lib/utils'

type P = {
  id: string; numero: number; nombre: string; precio: number; precio_oferta: number | null; categoria: string | null
  subcategoria: string | null; unidad: string; fotos: string[]; disponible: boolean; stock: number | null
  codigo: string | null; marca: string | null
}

const normal = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export default function ListaProductos({ productos, prefijo, emoji, usaStock, usaOferta }: {
  productos: P[]; prefijo: string; emoji: string; usaStock: boolean; usaOferta: boolean
}) {
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState<'todos' | 'disponibles' | 'ocultos' | 'agotados'>('todos')

  const agotado = (p: P) => p.stock !== null && Number(p.stock) <= 0
  const visibles = useMemo(() => {
    const t = normal(q.trim())
    return productos.filter((p) => {
      if (filtro === 'disponibles' && (!p.disponible || agotado(p))) return false
      if (filtro === 'ocultos' && p.disponible) return false
      if (filtro === 'agotados' && !agotado(p)) return false
      if (!t) return true
      return [p.nombre, codigoEdai(prefijo, p.numero), p.codigo, p.categoria, p.subcategoria, p.marca]
        .some((x) => x && normal(String(x)).includes(t))
    })
  }, [q, filtro, productos, prefijo])

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        <input className="campo min-w-[220px] flex-1" placeholder="Buscar por nombre, código o categoría" value={q}
          onChange={(e) => setQ(e.target.value)} aria-label="Buscar producto" />
        <select className="campo w-auto" value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)} aria-label="Filtrar">
          <option value="todos">Todos</option>
          <option value="disponibles">Disponibles</option>
          <option value="ocultos">Ocultos</option>
          {usaStock && <option value="agotados">Agotados</option>}
        </select>
      </div>
      <div className="caja">
        {productos.length === 0 && <p className="p-5 text-suave">Aún no tienes productos. Agrega el primero y aparecerá en tu tienda.</p>}
        {productos.length > 0 && visibles.length === 0 && <p className="p-5 text-suave">Ningún producto coincide con “{q}”.</p>}
        {visibles.map((p) => (
          <Link key={p.id} href={`/panel/productos/${p.id}`}
            className={`flex items-center gap-4 border-t border-linea px-4 py-3 first:border-t-0 hover:bg-sup2 ${!p.disponible || agotado(p) ? 'opacity-55' : ''}`}>
            <div className="grid h-12 w-12 flex-none place-items-center overflow-hidden rounded-lg border border-linea bg-sup2 text-xl">
              {p.fotos?.[0] ? <img src={p.fotos[0]} alt="" className="h-full w-full object-cover" /> : emoji}
            </div>
            <div className="min-w-0 flex-1">
              <b>{p.nombre}</b>
              <span className="ml-2 rounded border border-linea bg-sup2 px-1.5 text-xs font-bold text-suave">{codigoEdai(prefijo, p.numero)}</span>
              {p.codigo && <span className="ml-1 text-xs text-suave">· tu código {p.codigo}</span>}
              <small className="block text-suave">
                {[p.categoria, 'por ' + p.unidad, !p.disponible ? 'oculto' : null,
                  usaStock && p.stock !== null ? (agotado(p) ? 'agotado' : `${Number(p.stock)} en stock`) : null].filter(Boolean).join(' · ')}
              </small>
            </div>
            <span className="chip">
              {usaOferta && p.precio_oferta !== null ? <><s className="mr-1 font-medium text-suave">{bs(p.precio)}</s>{bs(p.precio_oferta)}</> : bs(p.precio)}
            </span>
          </Link>
        ))}
      </div>
    </>
  )
}
