import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { analizarTiendas, recordatorio, type Analisis, type FilaTienda } from '@/lib/analisis'
import { PLANES, PLAN_IDS } from '@/lib/planes'
import { RUBROS } from '@/lib/rubros'
import { bs, waLink } from '@/lib/utils'

function FilaOportunidad({ t }: { t: Analisis }) {
  return (
    <Link href={`/admin/tiendas/${t.id}`} className="flex items-center gap-3 border-t border-linea px-4 py-3 first:border-t-0 hover:bg-sup2">
      <span className="grid h-10 w-10 flex-none place-items-center rounded-lg border border-linea bg-sup2 text-lg">{RUBROS[t.rubro]?.e ?? '🏪'}</span>
      <div className="min-w-0 flex-1"><b className="block">{t.nombre}</b><small className="text-suave">{t.motivos[0]}</small></div>
      {t.tipo === 'riesgo' ? <span className="chip-malo">En riesgo</span> : <span className="chip">Pasar a {t.siguiente ? PLANES[t.siguiente].nombre : ''}</span>}
    </Link>
  )
}

export default async function Resumen() {
  const { supabase } = await requireAdmin()
  const [{ data }, { data: eventos }] = await Promise.all([
    supabase.from('admin_resumen').select('*'),
    supabase.from('admin_eventos').select('id, nombre, pagado, plan_precio, fecha'),
  ])
  const tiendas = await analizarTiendas((data ?? []) as FilaTienda[])
  const activas = tiendas.filter((t) => t.estado.k === 'activa' || t.estado.k === 'por-vencer')
  const mrr = activas.reduce((a, t) => a + Number(t.plan_precio), 0)
  const subir = tiendas.filter((t) => t.tipo === 'subir')
  const riesgo = tiendas.filter((t) => t.tipo === 'riesgo')
  const potencial = subir.reduce((a, t) => a + (t.siguiente ? PLANES[t.siguiente].precio - Number(t.plan_precio) : 0), 0)
  const cobrar = tiendas.filter((t) => t.estado.k === 'vencida' || t.estado.k === 'por-vencer').sort((a, b) => a.vence_el.localeCompare(b.vence_el))
  const pedidos = tiendas.reduce((a, t) => a + Number(t.pedidos_30d), 0)
  const vendido = tiendas.reduce((a, t) => a + Number(t.ventas_30d), 0)
  const evPendientes = (eventos ?? []).filter((e) => !e.pagado)

  return (
    <>
      <h1 className="titulo">Resumen</h1>
      <p className="subtitulo">Cómo va el negocio de EDAI este mes</p>

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="caja border-transparent bg-chip p-4">
          <span className="text-sm text-suave">Ingreso mensual por suscripciones</span>
          <strong className="block text-3xl font-extrabold">{bs(mrr)}</strong>
          {potencial > 0 && <small className="text-chiptinta">+{bs(potencial)} posibles si suben de plan</small>}
        </div>
        <div className="caja p-4"><span className="text-sm text-suave">Tiendas activas</span>
          <strong className="block text-3xl font-extrabold">{activas.length} <small className="text-base text-suave">de {tiendas.length}</small></strong>
          <small className="text-suave">{tiendas.length - activas.length} vencidas o suspendidas</small></div>
        <div className="caja p-4"><span className="text-sm text-suave">Pedidos en todas las tiendas</span>
          <strong className="block text-3xl font-extrabold">{pedidos.toLocaleString('es-BO')}</strong><small className="text-suave">últimos 30 días</small></div>
        <div className="caja p-4"><span className="text-sm text-suave">Vendido por tus clientes</span>
          <strong className="block text-3xl font-extrabold">{bs(vendido)}</strong><small className="text-suave">últimos 30 días</small></div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <h2 className="mb-3 text-lg font-bold">Listos para un plan mejor</h2>
          <div className="caja mb-6">{subir.length ? subir.map((t) => <FilaOportunidad key={t.id} t={t} />) : <p className="p-4 text-suave">Nadie por ahora.</p>}</div>
          <h2 className="mb-3 text-lg font-bold">En riesgo de irse</h2>
          <div className="caja">{riesgo.length ? riesgo.map((t) => <FilaOportunidad key={t.id} t={t} />) : <p className="p-4 text-suave">Todos van bien.</p>}</div>
        </div>
        <div>
          <h2 className="mb-3 text-lg font-bold">Cobros pendientes</h2>
          <div className="caja mb-6">
            {cobrar.length === 0 && evPendientes.length === 0 && <p className="p-4 text-suave">Todo cobrado.</p>}
            {cobrar.map((t) => (
              <div key={t.id} className="flex items-center gap-3 border-t border-linea px-4 py-3 first:border-t-0">
                <span className="text-lg">{RUBROS[t.rubro]?.e ?? '🏪'}</span>
                <Link href={`/admin/tiendas/${t.id}`} className="min-w-0 flex-1"><b className="block">{t.nombre}</b><small className="text-suave">{bs(t.plan_precio)}</small></Link>
                <span className={t.estado.cls}>{t.estado.txt}</span>
                {t.whatsapp && <a className="btn-wa btn-sm" href={waLink(t.whatsapp, recordatorio(t))} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
              </div>
            ))}
            {evPendientes.slice(0, 5).map((e) => (
              <Link key={e.id} href={`/admin/eventos/${e.id}`} className="flex items-center gap-3 border-t border-linea px-4 py-3 first:border-t-0 hover:bg-sup2">
                <span className="text-lg">💌</span><div className="min-w-0 flex-1"><b className="block">{e.nombre}</b><small className="text-suave">Invitación</small></div>
                <span className="chip-aviso">{bs(e.plan_precio)}</span>
              </Link>
            ))}
          </div>
          <h2 className="mb-3 text-lg font-bold">Clientes por plan</h2>
          <div className="caja">
            {PLAN_IDS.map((k) => { const n = tiendas.filter((t) => t.plan === k).length; return (
              <div key={k} className="flex items-center border-t border-linea px-4 py-3 first:border-t-0">
                <div className="flex-1"><b className="block">{PLANES[k].nombre}</b><small className="text-suave">{bs(PLANES[k].precio)}/mes</small></div>
                <span className="chip">{n} {n === 1 ? 'tienda' : 'tiendas'}</span>
              </div>) })}
          </div>
        </div>
      </div>
    </>
  )
}
