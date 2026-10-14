'use client'

import { useActionState } from 'react'
import { invitarUsuario, type Resultado } from '@/app/admin/actions'
import AccesoCard from './AccesoCard'

export default function InvitarUsuario({ tiendaId }: { tiendaId: string }) {
  const [res, accion, pend] = useActionState<Resultado, FormData>(invitarUsuario.bind(null, tiendaId), null)
  if (res?.ok) return <AccesoCard a={res} />
  return (
    <form action={accion} className="grid gap-2 border-t border-linea p-3 sm:grid-cols-[1fr_1fr_auto]">
      <input name="nombre" className="campo" placeholder="Nombre (ej: cajero)" aria-label="Nombre" />
      <input name="correo" type="email" className="campo" placeholder="Correo" aria-label="Correo" required />
      <button className="btn-primario" disabled={pend}>{pend ? 'Invitando…' : 'Invitar usuario'}</button>
      {res && !res.ok && <p className="text-sm text-malo sm:col-span-3">{res.error}</p>}
    </form>
  )
}
