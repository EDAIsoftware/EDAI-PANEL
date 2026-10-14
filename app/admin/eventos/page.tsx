import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { tipoDe } from '@/lib/eventos'
import { bs, fechaCorta } from '@/lib/utils'

export default async function AdminEventos() {
  const { supabase } = await requireAdmin()
  const { data } = await supabase.from('admin_eventos').select('*').order('fecha', { ascending: true })
  const eventos = data ?? []
  const ahora = Date.now()
  const proximos = eventos.filter((e) => new Date(e.fecha).getTime() >= ahora)
  const cobrado = eventos.filter((e) => e.pagado).reduce((a, e) => a + Number(e.plan_precio), 0)
  const porCobrar = eventos.filter((e) => !e.pagado).reduce((a, e) => a + Number(e.plan_precio), 0)

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="titulo">Invitaciones</h1><p className="subtitulo">{eventos.length} eventos · {proximos.length} próximos</p></div>
        <Link href="/admin/eventos/nuevo" className="btn-primario">Nueva invitación</Link>
      </div>
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="caja border-transparent bg-chip p-4"><span className="text-sm text-suave">Cobrado</span><strong className="block text-3xl font-extrabold">{bs(cobrado)}</strong></div>
        <div className="caja p-4"><span className="text-sm text-suave">Por cobrar</span><strong className="block text-3xl font-extrabold">{bs(porCobrar)}</strong></div>
        <div className="caja p-4"><span className="text-sm text-suave">Eventos próximos</span><strong className="block text-3xl font-extrabold">{proximos.length}</strong></div>
      </div>
      {eventos.length === 0 ? (
        <div className="caja p-8 text-center"><p className="font-semibold">Aún no tienes invitaciones</p><p className="mt-1 text-suave">Crea la primera y mándale el acceso al cliente por WhatsApp.</p></div>
      ) : (
        <div className="caja overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead><tr className="text-[12.5px] text-suave">
              {['Evento', 'Fecha', 'Plan', 'Confirmados', 'Pago', 'Estado'].map((h) => <th key={h} className="border-b border-linea px-4 py-3 font-semibold">{h}</th>)}
            </tr></thead>
            <tbody>
              {eventos.map((e) => {
                const t = tipoDe(e.tipo)
                const paso = new Date(e.fecha).getTime() < ahora
                const vencida = new Date(e.activa_hasta).getTime() < ahora
                return (
                  <tr key={e.id} className="border-t border-linea hover:bg-sup2">
                    <td className="px-4 py-3"><Link href={`/admin/eventos/${e.id}`} className="flex items-center gap-3">
                      <span className="text-xl">{t.e}</span><span><b className="block">{e.nombre}</b><small className="text-suave">{t.n} · {e.cliente_nombre}</small></span></Link></td>
                    <td className="px-4 py-3">{fechaCorta(e.fecha)}</td>
                    <td className="px-4 py-3">{e.plan_nombre}</td>
                    <td className="px-4 py-3 tabular-nums">{e.personas_confirmadas}{e.plan_pases ? <small className="text-suave"> / {e.pases_total}</small> : null}</td>
                    <td className="px-4 py-3">{e.pagado ? <span className="chip">Pagado</span> : <span className="chip-aviso">{bs(e.plan_precio)}</span>}</td>
                    <td className="px-4 py-3">{e.suspendido ? <span className="chip-malo">Suspendida</span> : vencida ? <span className="chip-malo">Finalizada</span> : paso ? <span className="chip-aviso">Ya pasó</span> : <span className="chip">Activa</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
