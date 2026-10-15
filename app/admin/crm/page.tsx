import Link from 'next/link'
import { baseCrm } from '@/lib/crmDatos'
import { ETAPAS, aBs, codProspecto, dinero, gastoMensual, hoyBolivia, mesBolivia, nombreMes, type Gasto, type Pago, type Prospecto, type Venta } from '@/lib/crm'
import { waLink } from '@/lib/utils'

export default async function InicioCrm() {
  const { supabase, tc, divisiones } = await baseCrm()
  const [{ data: v }, { data: p }, { data: g }, { data: pr }, { data: tiendas }] = await Promise.all([
    supabase.from('crm_ventas_resumen').select('*'),
    supabase.from('crm_pagos').select('*, crm_ventas(moneda)'),
    supabase.from('crm_gastos').select('*'),
    supabase.from('crm_prospectos').select('*'),
    supabase.from('admin_resumen').select('plan_precio, suspendida, vence_el'),
  ])
  const ventas = (v ?? []) as Venta[]
  const pagos = (p ?? []) as (Pago & { crm_ventas: { moneda: 'BOB' | 'USD' } | null })[]
  const gastos = (g ?? []) as Gasto[]
  const prospectos = (pr ?? []) as Prospecto[]
  const hoy = hoyBolivia(), mes = mesBolivia(hoy)
  const validas = ventas.filter((x) => x.estado !== 'Cancelado' && x.estado !== 'Cotizado')

  const vendidoMes = validas.filter((x) => mesBolivia(x.fecha) === mes).reduce((a, x) => a + aBs(x.valor, x.moneda, tc), 0)
  const gananciaMes = validas.filter((x) => mesBolivia(x.fecha) === mes).reduce((a, x) => a + aBs(x.ganancia, x.moneda, tc), 0)
  const cobradoMes = pagos.filter((x) => mesBolivia(x.fecha) === mes).reduce((a, x) => a + aBs(x.monto, x.crm_ventas?.moneda ?? 'BOB', tc), 0)
  const porCobrar = validas.reduce((a, x) => a + aBs(x.saldo, x.moneda, tc), 0)
  const gastoMes = gastos.reduce((a, x) => a + aBs(gastoMensual(x), x.moneda, tc), 0)
  const mrrTiendas = (tiendas ?? []).filter((t) => !t.suspendida && t.vence_el >= hoy).reduce((a, t) => a + Number(t.plan_precio), 0)
  const mrrCrm = validas.filter((x) => x.tipo === 'mensual').reduce((a, x) => a + aBs(x.valor, x.moneda, tc), 0)
  const utilidad = cobradoMes + mrrTiendas - gastoMes

  // Ventas de los últimos 6 meses
  const meses = Array.from({ length: 6 }, (_, i) => { const d = new Date(hoy + 'T12:00:00'); d.setMonth(d.getMonth() - (5 - i)); return d.toISOString().slice(0, 7) })
  const porMes = meses.map((m) => ({ m, total: validas.filter((x) => mesBolivia(x.fecha) === m).reduce((a, x) => a + aBs(x.valor, x.moneda, tc), 0) }))
  const maxMes = Math.max(...porMes.map((x) => x.total), 1)
  const porDivision = divisiones.map((d) => ({ d: d.nombre, total: validas.filter((x) => x.division_id === d.id).reduce((a, x) => a + aBs(x.valor, x.moneda, tc), 0) }))

  const abiertos = prospectos.filter((x) => x.etapa !== 'Ganado' && x.etapa !== 'Perdido')
  const embudo = ETAPAS.filter((e) => e !== 'Perdido').map((e) => {
    const l = prospectos.filter((x) => x.etapa === e)
    return { e, n: l.length, valor: l.reduce((a, x) => a + aBs(x.valor ?? 0, x.moneda, tc), 0) }
  })
  const acciones = abiertos.filter((x) => x.proxima_fecha).sort((a, b) => a.proxima_fecha!.localeCompare(b.proxima_fecha!)).slice(0, 8)

  const Kpi = ({ t, v, s, destacar }: { t: string; v: string; s?: string; destacar?: boolean }) => (
    <div className={`caja p-4 ${destacar ? 'border-transparent bg-chip' : ''}`}><span className="text-sm text-suave">{t}</span>
      <strong className="block text-2xl font-extrabold sm:text-3xl">{v}</strong>{s && <small className="text-suave">{s}</small>}</div>
  )

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="titulo">CRM</h1><p className="subtitulo">Cómo va EDAI este mes · montos en bolivianos (1 $ = Bs. {tc})</p></div>
        <div className="flex flex-wrap gap-2"><Link href="/admin/crm/prospectos" className="btn-primario">Nuevo prospecto</Link><Link href="/admin/crm/ajustes" className="btn-borde">Ajustes</Link></div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi destacar t="Utilidad estimada del mes" v={dinero(utilidad)} s="cobrado + tiendas − gastos" />
        <Kpi t="Cobrado este mes" v={dinero(cobradoMes)} s={`vendido: ${dinero(vendidoMes)}`} />
        <Kpi t="Por cobrar" v={dinero(porCobrar)} s="saldos pendientes de ventas" />
        <Kpi t="Gastos del mes" v={dinero(gastoMes)} s="anuales divididos en 12" />
        <Kpi t="Ingreso recurrente" v={dinero(mrrTiendas + mrrCrm)} s={`tiendas ${dinero(mrrTiendas)} · servicios ${dinero(mrrCrm)}`} />
        <Kpi t="Ganancia de ventas del mes" v={dinero(gananciaMes)} s="valor − costo directo" />
        <Kpi t="Prospectos abiertos" v={String(abiertos.length)} s={dinero(abiertos.reduce((a, x) => a + aBs(x.valor ?? 0, x.moneda, tc), 0)) + ' en juego'} />
        <Kpi t="Clientes con ventas" v={String(new Set(validas.map((x) => x.cliente_id)).size)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-bold">Próximas acciones</h2>
          <div className="caja">
            {acciones.length === 0 && <p className="p-4 text-suave">No tienes seguimientos agendados. Agrega una próxima acción a tus prospectos.</p>}
            {acciones.map((x) => {
              const vencida = x.proxima_fecha! < hoy, esHoy = x.proxima_fecha === hoy
              return (
                <div key={x.id} className="flex flex-wrap items-center gap-3 border-t border-linea px-4 py-3 first:border-t-0">
                  <div className="min-w-0 flex-1"><b className="block">{x.nombre}{x.empresa ? ` · ${x.empresa}` : ''}</b>
                    <small className="text-suave">{codProspecto(x.numero)} · {x.etapa} · {x.proxima_accion || 'Hacer seguimiento'}</small></div>
                  <span className={vencida ? 'chip-malo' : esHoy ? 'chip-aviso' : 'chip'}>{vencida ? 'Atrasada' : esHoy ? 'Hoy' : x.proxima_fecha}</span>
                  {x.telefono && <a className="btn-wa btn-sm" href={waLink(x.telefono, `Hola ${x.nombre}, te escribo de EDAI.`)} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
                </div>
              )
            })}
          </div>
          <Link href="/admin/crm/prospectos" className="mt-2 inline-block text-sm text-suave underline">Ver todos los prospectos</Link>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold">Embudo de ventas</h2>
          <div className="caja p-4">
            {embudo.map((x) => (
              <div key={x.e} className="mb-3 last:mb-0">
                <div className="mb-1 flex justify-between text-sm"><span>{x.e} <span className="text-suave">({x.n})</span></span><span className="text-suave">{dinero(x.valor)}</span></div>
                <div className="h-2 overflow-hidden rounded bg-sup2"><i className="block h-full rounded bg-acento" style={{ width: `${Math.max(3, (x.n / Math.max(1, ...embudo.map((y) => y.n))) * 100)}%` }} /></div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold">Ventas de los últimos 6 meses</h2>
          <div className="caja flex h-52 items-end gap-3 p-4">
            {porMes.map((x) => (
              <div key={x.m} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                <small className="text-[11px] text-suave">{x.total ? dinero(Math.round(x.total)) : ''}</small>
                <div className={`w-full rounded-t ${x.m === mes ? 'bg-acento' : 'bg-linea'}`} style={{ height: `${Math.max(2, (x.total / maxMes) * 100)}%` }} title={dinero(x.total)} />
                <small className="text-xs capitalize text-suave">{nombreMes(x.m)}</small>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-bold">Ventas por división</h2>
          <div className="caja">
            {porDivision.map((x) => (
              <div key={x.d} className="flex items-center border-t border-linea px-4 py-3 first:border-t-0">
                <span className="flex-1">{x.d}</span><b>{dinero(x.total)}</b>
              </div>
            ))}
            {porDivision.length === 0 && <p className="p-4 text-suave">Crea tus divisiones en Ajustes.</p>}
          </div>
        </section>
      </div>
    </>
  )
}
