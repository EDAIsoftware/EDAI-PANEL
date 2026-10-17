import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { estadoDe, type FilaTienda } from '@/lib/analisis'
import { PLANES, esPlan } from '@/lib/planes'
import { bs, urlTienda } from '@/lib/utils'

export default async function AdminAgentes() {
  const { supabase } = await requireAdmin()
  const { data } = await supabase.from('admin_resumen').select('*').eq('tipo', 'agente').order('nombre')
  const agentes = (data ?? []) as FilaTienda[]
  const activos = agentes.filter((a) => ['activa', 'por-vencer'].includes(estadoDe(a).k))
  const mrr = activos.reduce((s, a) => s + Number(a.plan_precio), 0)
  const contactos = agentes.reduce((s, a) => s + Number(a.contactos_30d ?? 0), 0)

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="titulo">Agentes inmobiliarios</h1><p className="subtitulo">Páginas personales de asesores · {agentes.length} agentes</p></div>
        <Link href="/admin/nueva?tipo=agente" className="btn-primario">Nuevo agente</Link>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <div className="caja border-transparent bg-chip p-4"><span className="text-sm text-suave">Ingreso mensual de agentes</span><strong className="block text-3xl font-extrabold">{bs(mrr)}</strong></div>
        <div className="caja p-4"><span className="text-sm text-suave">Agentes activos</span><strong className="block text-3xl font-extrabold">{activos.length}</strong></div>
        <div className="caja p-4"><span className="text-sm text-suave">Contactos recibidos (30 d)</span><strong className="block text-3xl font-extrabold">{contactos}</strong><small className="text-suave">dueños y consultas</small></div>
      </div>
      {agentes.length === 0 ? (
        <div className="caja p-8 text-center"><p className="font-semibold">Aún no tienes agentes</p>
          <p className="mt-1 text-suave">Muéstrales la demo desde tu celular y crea su página cuando digan que sí.</p>
          <Link href="/admin/demos" className="btn-borde mt-4">Ir a mis demos</Link></div>
      ) : (
        <div className="caja overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead><tr className="text-[12.5px] text-suave">{['Agente', 'Plan', 'Propiedades', 'Visitas 30 d', 'WhatsApp 30 d', 'Contactos 30 d', 'Suscripción'].map((h) => <th key={h} className="border-b border-linea px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {agentes.map((a) => {
                const e = estadoDe(a)
                const pid: string = a.plan
                const max = esPlan(pid) ? PLANES[pid].productos : null
                return (
                  <tr key={a.id} className="border-t border-linea hover:bg-sup2">
                    <td className="px-4 py-3"><Link href={`/admin/tiendas/${a.id}`} className="block"><b className="block">{a.nombre}</b>
                      <small className="text-suave">{a.perfil?.inmobiliaria || 'Asesor inmobiliario'} · {urlTienda(a.slug).replace('https://', '')}</small></Link></td>
                    <td className="px-4 py-3">{a.plan_nombre}</td>
                    <td className="px-4 py-3 tabular-nums">{a.productos}{max ? ` / ${max}` : ''}</td>
                    <td className="px-4 py-3 tabular-nums">{a.visitas_30d}</td>
                    <td className="px-4 py-3 tabular-nums">{a.whatsapp_30d ?? 0}</td>
                    <td className="px-4 py-3 tabular-nums">{a.contactos_30d ?? 0}</td>
                    <td className="px-4 py-3"><span className={e.cls}>{e.txt}</span></td>
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
