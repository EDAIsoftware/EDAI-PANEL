'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { PLANES, PLAN_IDS } from '@/lib/planes'

export default function FiltroTiendas({ q, estado, plan }: { q: string; estado: string; plan: string }) {
  const router = useRouter()
  const [texto, setTexto] = useState(q)
  const ir = (cambios: Record<string, string>) => {
    const p = new URLSearchParams({ q: texto, estado, plan, ...cambios })
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k)
    router.replace(`/admin/tiendas${p.toString() ? '?' + p : ''}`)
  }
  return (
    <form className="mb-4 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); ir({ q: texto }) }}>
      <input className="campo min-w-[220px] flex-1" placeholder="Buscar por tienda, ciudad o dueño" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Buscar" />
      <select className="campo w-auto" value={estado} onChange={(e) => ir({ estado: e.target.value })} aria-label="Estado">
        <option value="">Todos los estados</option><option value="activa">Al día</option><option value="por-vencer">Por vencer</option>
        <option value="vencida">Vencidas</option><option value="suspendida">Suspendidas</option>
      </select>
      <select className="campo w-auto" value={plan} onChange={(e) => ir({ plan: e.target.value })} aria-label="Plan">
        <option value="">Todos los planes</option>{PLAN_IDS.map((p) => <option key={p} value={p}>{PLANES[p].nombre}</option>)}
      </select>
    </form>
  )
}
