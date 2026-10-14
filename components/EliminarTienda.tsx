'use client'

import { useState, useTransition } from 'react'
import { eliminarTienda } from '@/app/admin/actions'

type Accion = (id: string, confirmacion: string) => Promise<{ ok: boolean; error: string } | void>

export default function EliminarTienda({ id, nombre, accion, detalle }: { id: string; nombre: string; accion?: Accion; detalle?: string }) {
  const [abierto, setAbierto] = useState(false)
  const [txt, setTxt] = useState('')
  const [err, setErr] = useState('')
  const [pend, start] = useTransition()
  const coincide = txt.trim().toLowerCase() === nombre.trim().toLowerCase()

  return (
    <>
      <button type="button" className="btn-borde border-malo text-malo" onClick={() => setAbierto(true)}>Eliminar cliente</button>
      {abierto && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <div className="caja w-full max-w-md p-6">
            <h2 className="text-xl font-bold">¿Eliminar {nombre}?</h2>
            <p className="mt-2 text-sm text-suave">{detalle ?? 'Se borran su tienda, productos, fotos, ventas y los usuarios de su panel. Esto no se puede deshacer. Si solo dejó de pagar, mejor suspéndela.'}</p>
            <label className="etiqueta mt-4" htmlFor="conf">Para confirmar, escribe <b className="text-tinta">{nombre}</b></label>
            <input id="conf" className="campo" value={txt} onChange={(e) => setTxt(e.target.value)} autoComplete="off" />
            {err && <p className="mt-2 text-sm text-malo">{err}</p>}
            <div className="mt-5 flex gap-2">
              <button type="button" className="btn-peligro" disabled={!coincide || pend}
                onClick={() => start(async () => { const r = await (accion ?? eliminarTienda)(id, txt); if (r && !r.ok) setErr(r.error) })}>
                {pend ? 'Eliminando…' : 'Eliminar definitivamente'}
              </button>
              <button type="button" className="btn-borde" onClick={() => setAbierto(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
