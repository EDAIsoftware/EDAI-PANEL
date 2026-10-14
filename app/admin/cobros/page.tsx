import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { estadoDe, recordatorio, type FilaTienda } from '@/lib/analisis'
import { registrarPago } from '../actions'
import { marcarPagado } from '../eventos/actions'
import { RUBROS } from '@/lib/rubros'
import { bs, fechaCorta, waLink } from '@/lib/utils'

export default async function Cobros() {
  const { supabase } = await requireAdmin()
  const [{ data }, { data: eventos }] = await Promise.all([
    supabase.from('admin_resumen').select('*').order('vence_el'),
    supabase.from('admin_eventos').select('id, nombre, cliente_nombre, whatsapp, pagado, plan_nombre, plan_precio, fecha').eq('pagado', false).order('fecha'),
  ])
  const tiendas = ((data ?? []) as FilaTienda[]).map((t) => ({ ...t, estado: estadoDe(t) })).filter((t) => t.estado.k !== 'suspendida')
  const pendientes = tiendas.filter((t) => t.estado.k !== 'activa')
  const total = pendientes.reduce((a, t) => a + Number(t.plan_precio), 0) + (eventos ?? []).reduce((a, e) => a + Number(e.plan_precio), 0)

  return (
    <>
      <h1 className="titulo">Cobros</h1>
      <p className="subtitulo">{bs(total)} por cobrar entre suscripciones e invitaciones</p>

      <h2 className="mb-3 text-lg font-bold">Suscripciones de tiendas</h2>
      <div className="caja mb-8">
        {tiendas.length === 0 && <p className="p-4 text-suave">Sin tiendas.</p>}
        {tiendas.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center gap-3 border-t border-linea px-4 py-3 first:border-t-0">
            <span className="text-lg">{RUBROS[t.rubro]?.e ?? '🏪'}</span>
            <Link href={`/admin/tiendas/${t.id}`} className="min-w-0 flex-1"><b className="block">{t.nombre}</b>
              <small className="text-suave">Plan {t.plan_nombre} · {bs(t.plan_precio)}/mes · vence el {fechaCorta(t.vence_el)}</small></Link>
            <span className={t.estado.cls}>{t.estado.txt}</span>
            {t.whatsapp && t.estado.k !== 'activa' && <a className="btn-wa btn-sm" href={waLink(t.whatsapp, recordatorio(t))} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
            <form action={registrarPago.bind(null, t.id)}><button className="btn-borde btn-sm">Registrar pago</button></form>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-lg font-bold">Invitaciones sin pagar</h2>
      <div className="caja">
        {(eventos ?? []).length === 0 && <p className="p-4 text-suave">Todas las invitaciones están pagadas.</p>}
        {(eventos ?? []).map((e) => (
          <div key={e.id} className="flex flex-wrap items-center gap-3 border-t border-linea px-4 py-3 first:border-t-0">
            <span className="text-lg">💌</span>
            <Link href={`/admin/eventos/${e.id}`} className="min-w-0 flex-1"><b className="block">{e.nombre}</b>
              <small className="text-suave">{e.cliente_nombre} · plan {e.plan_nombre} · evento el {fechaCorta(e.fecha)}</small></Link>
            <span className="chip-aviso">{bs(e.plan_precio)}</span>
            {e.whatsapp && <a className="btn-wa btn-sm" target="_blank" rel="noopener noreferrer"
              href={waLink(e.whatsapp, `Hola ${e.cliente_nombre || ''}, te escribimos de EDAI por tu invitación "${e.nombre}". El total es ${bs(e.plan_precio)}; puedes pagar por QR o transferencia. ¡Gracias!`)}>WhatsApp</a>}
            <form action={marcarPagado.bind(null, e.id, true)}><button className="btn-borde btn-sm">Registrar pago</button></form>
          </div>
        ))}
      </div>
    </>
  )
}
