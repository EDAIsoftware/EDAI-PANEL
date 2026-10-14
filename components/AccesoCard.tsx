'use client'

import { useState } from 'react'
import type { Acceso } from '@/app/admin/actions'
import { PANEL_URL, urlTienda, waLink } from '@/lib/utils'

function Fila({ etq, valor, destacar }: { etq: string; valor: string; destacar?: boolean }) {
  const [copiado, setCopiado] = useState(false)
  return (
    <div className={`flex items-center gap-3 rounded-lg border bg-sup px-3 py-2.5 ${destacar ? 'border-acento' : 'border-linea'}`}>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-semibold text-suave">{etq}</div>
        <div className="break-all text-sm">{valor}</div>
      </div>
      <button type="button" className="btn-borde btn-sm" onClick={async () => {
        try { await navigator.clipboard.writeText(valor); setCopiado(true); setTimeout(() => setCopiado(false), 1500) } catch {}
      }}>{copiado ? 'Copiado' : 'Copiar'}</button>
    </div>
  )
}

export default function AccesoCard({ a, onCerrar }: { a: Acceso; onCerrar?: () => void }) {
  const tienda = a.urlPublica ?? urlTienda(a.slug)
  const etq = a.etiquetaPublica ?? 'Su tienda'
  const msg = a.tipo === 'clave'
    ? `Hola ${a.nombre}, para crear tu nueva contraseña del panel de ${a.tienda} entra aquí:\n${a.enlace}\n\nEl enlace sirve una sola vez.`
    : a.esEvento
      ? `Hola ${a.nombre}, ¡bienvenido a EDAI! 💌\n\nTu invitación "${a.tienda}" ya está lista.\n\n1. Crea tu contraseña aquí: ${a.enlace}\n2. Tu usuario es: ${a.correo}\n3. En tu panel ${PANEL_URL} puedes editar tu invitación, cargar tu lista de invitados y ver quién confirma.\n\nTu invitación: ${tienda}\n\nCualquier duda, escríbenos por aquí.`
      : `Hola ${a.nombre}, ¡bienvenido a EDAI! 🎉\n\nTu tienda ${a.tienda} ya está lista.\n\n1. Crea tu contraseña aquí: ${a.enlace}\n2. Tu usuario es: ${a.correo}\n3. Después entra siempre a tu panel en: ${PANEL_URL}\n\nTu tienda para compartir con tus clientes: ${tienda}\n\nCualquier duda, escríbenos por aquí.`

  return (
    <div className="caja border-acento p-5">
      <h2 className="text-xl font-bold">{a.tipo === 'clave' ? 'Enlace para nueva contraseña' : `Acceso para ${a.nombre || a.correo}`}</h2>
      <p className="mt-1 text-sm text-suave">Mándale estos datos. Con el enlace crea su propia contraseña; tú nunca la ves.</p>
      <div className="mt-4 flex flex-col gap-2.5">
        <Fila etq="Usuario" valor={a.correo} />
        <Fila etq={a.tipo === 'clave' ? 'Enlace para nueva contraseña' : 'Enlace para crear su contraseña'} valor={a.enlace} destacar />
        {a.tipo !== 'clave' && <><Fila etq="Su panel" valor={PANEL_URL} /><Fila etq={etq} valor={tienda} /></>}
      </div>
      <p className="mt-3 text-[13px] text-suave">El enlace sirve una sola vez y vence en 24 horas. Si vence, genera otro.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {a.whatsapp && <a className="btn-wa" href={waLink(a.whatsapp, msg)} target="_blank" rel="noopener noreferrer">Enviar por WhatsApp</a>}
        <button type="button" className="btn-borde" onClick={() => navigator.clipboard.writeText(msg).catch(() => {})}>Copiar mensaje</button>
        {onCerrar && <button type="button" className="btn-borde" onClick={onCerrar}>Listo</button>}
      </div>
    </div>
  )
}
