'use client'

import { useState, useTransition } from 'react'
import { enlaceAcceso, type Resultado } from '@/app/admin/actions'
import AccesoCard from './AccesoCard'

export default function BotonEnlace({ tiendaId, userId, texto, accion }: {
  tiendaId?: string; userId: string; texto: string; accion?: () => Promise<Resultado>
}) {
  const [res, setRes] = useState<Resultado>(null)
  const [pend, start] = useTransition()
  return (
    <>
      <button type="button" className="btn-borde btn-sm" disabled={pend}
        onClick={() => start(async () => setRes(accion ? await accion() : await enlaceAcceso(tiendaId ?? '', userId)))}>
        {pend ? 'Generando…' : texto}
      </button>
      {res && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg">
            {res.ok ? <AccesoCard a={res} onCerrar={() => setRes(null)} />
              : <div className="caja p-5"><p className="text-malo">{res.error}</p><button className="btn-borde mt-3" onClick={() => setRes(null)}>Cerrar</button></div>}
          </div>
        </div>
      )}
    </>
  )
}
