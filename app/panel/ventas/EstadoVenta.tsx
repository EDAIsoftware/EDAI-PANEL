'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { bs, waLink } from '@/lib/utils'

const ESTADOS = ['Nuevo', 'Pendiente', 'Pagado', 'Entregado', 'Cancelado']

export default function EstadoVenta({ id, estado, telefono, cliente, resumen, total, tienda }: {
  id: number; estado: string; telefono: string | null; cliente: string | null; resumen: string; total: number; tienda: string
}) {
  const router = useRouter()
  const [e, setE] = useState(estado)
  const destacado = e === 'Nuevo' || e === 'Pendiente'
  return (
    <>
      <select aria-label="Estado del pedido" value={e}
        className={`rounded-md border-0 px-2 py-1 text-[12.5px] font-bold ${destacado ? 'bg-acento text-sobreacento' : 'bg-chip text-chiptinta'}`}
        onChange={async (ev) => {
          const nuevo = ev.target.value; setE(nuevo)
          const { error } = await createClient().from('ventas').update({ estado: nuevo }).eq('id', id)
          if (error) setE(estado); else router.refresh()
        }}>
        {ESTADOS.map((x) => <option key={x}>{x}</option>)}
      </select>
      {telefono && (
        <a className="btn-wa btn-sm" target="_blank" rel="noopener noreferrer"
          href={waLink(telefono, `Hola ${cliente || ''}, te escribimos de ${tienda}. Tu pedido #${id}:\n${resumen}\nTotal: ${bs(total)}. Estado: ${e.toLowerCase()}.`)}>WhatsApp</a>
      )}
    </>
  )
}
