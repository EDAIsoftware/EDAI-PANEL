import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { PLANES_EVENTO, PLAN_EVENTO_IDS, aLocalBolivia, tipoDe } from '@/lib/eventos'
import { PANEL_URL, bs, fechaCorta, fechaHora, urlInvitacion, waLink } from '@/lib/utils'
import { actualizarEventoAdmin, cambiarPlanEvento, eliminarEvento, enlaceAccesoEvento, eventoAlCrm, marcarPagado, suspenderEvento } from '../actions'
import BotonEnlace from '@/components/BotonEnlace'
import EliminarTienda from '@/components/EliminarTienda'

export default async function FichaEvento({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase } = await requireAdmin()
  const { data: ev } = await supabase.from('admin_eventos').select('*').eq('id', id).maybeSingle()
  if (!ev) notFound()
  const { data: perfiles } = await supabase.from('perfiles').select('*').eq('evento_id', id)
  const { data: crm } = await supabase.from('crm_clientes').select('id, nombre').eq('evento_id', id).maybeSingle()
  const admin = createAdminClient()
  const usuarios = await Promise.all((perfiles ?? []).map(async (p) => {
    const { data } = await admin.auth.admin.getUserById(p.user_id)
    return { ...p, ultimo: data.user?.last_sign_in_at ?? null }
  }))
  const t = tipoDe(ev.tipo)
  const enlace = urlInvitacion(ev.slug)
  const cobro = `Hola ${ev.cliente_nombre || ''}, te escribimos de EDAI. Tu invitación "${ev.nombre}" ya está activa: ${enlace}\nEl total del plan ${ev.plan_nombre} es ${bs(ev.plan_precio)}. Puedes pagar por QR o transferencia. ¡Gracias!`

  return (
    <div className="max-w-4xl">
      <Link href="/admin/eventos" className="text-sm text-suave underline">← Invitaciones</Link>
      <div className="mt-3 flex flex-wrap items-start gap-3">
        <span className="text-4xl">{t.e}</span>
        <div className="flex-1">
          <h1 className="titulo">{ev.nombre}</h1>
          <p className="text-suave">{t.n} · {fechaHora(ev.fecha)} · activa hasta {fechaCorta(ev.activa_hasta)}</p>
        </div>
        {ev.pagado ? <span className="chip">Pagado</span> : <span className="chip-aviso">Pendiente de pago</span>}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-linea bg-sup px-4 py-2.5 text-sm">
        {crm ? <>Cliente en el CRM: <b>{crm.nombre}</b><Link className="underline" href={`/admin/crm/clientes/${crm.id}`}>ver ficha</Link></>
          : <><span className="text-suave">Esta invitación todavía no está en tu CRM.</span><form action={eventoAlCrm.bind(null, id)}><button className="btn-borde btn-sm">Agregar al CRM</button></form></>}
      </div>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="caja p-4"><span className="text-xs text-suave">Personas confirmadas</span><strong className="block text-2xl font-extrabold">{ev.personas_confirmadas}</strong></div>
        <div className="caja p-4"><span className="text-xs text-suave">Respuestas</span><strong className="block text-2xl font-extrabold">{ev.respuestas}</strong></div>
        <div className="caja p-4"><span className="text-xs text-suave">Familias en lista</span><strong className="block text-2xl font-extrabold">{ev.invitados_lista}{ev.max_invitados ? <small className="text-base text-suave"> / {ev.max_invitados}</small> : null}</strong></div>
        <div className="caja p-4"><span className="text-xs text-suave">Pases</span><strong className="block text-2xl font-extrabold">{ev.pases_total}</strong></div>
      </section>

      <div className="caja mt-4 flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-0 flex-1"><b className="block">Invitación</b><a className="break-all text-sm text-suave underline" href={enlace} target="_blank" rel="noopener noreferrer">{enlace}</a></div>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">Plan y pago</h2>
        <div className="caja flex flex-wrap items-center gap-3 p-4">
          <form key={ev.plan} action={cambiarPlanEvento.bind(null, id)} className="flex gap-2">
            <select name="plan" defaultValue={ev.plan} className="campo w-auto" aria-label="Plan">
              {PLAN_EVENTO_IDS.map((p) => <option key={p} value={p}>{PLANES_EVENTO[p].nombre} · {bs(PLANES_EVENTO[p].precio)}</option>)}
            </select>
            <button className="btn-borde">Cambiar plan</button>
          </form>
          <form action={marcarPagado.bind(null, id, !ev.pagado)}><button className={ev.pagado ? 'btn-borde' : 'btn-primario'}>{ev.pagado ? 'Marcar como no pagado' : 'Registrar pago'}</button></form>
          {ev.whatsapp && !ev.pagado && <a className="btn-wa" href={waLink(ev.whatsapp, cobro)} target="_blank" rel="noopener noreferrer">Cobrar por WhatsApp</a>}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-1 text-lg font-bold">Acceso del cliente</h2>
        <p className="mb-3 text-sm text-suave">Panel: {PANEL_URL}</p>
        <div className="caja">
          {usuarios.map((u) => (
            <div key={u.user_id} className="flex flex-wrap items-center gap-3 border-t border-linea px-4 py-3 first:border-t-0">
              <div className="min-w-0 flex-1"><b className="block">{u.nombre || u.correo}</b>
                <small className="text-suave">{u.correo}{u.ultimo ? ` · último ingreso ${fechaCorta(u.ultimo)}` : ''}</small></div>
              <span className={u.ultimo ? 'chip' : 'chip-aviso'}>{u.ultimo ? 'Activo' : 'Invitación pendiente'}</span>
              <BotonEnlace userId={u.user_id} texto={u.ultimo ? 'Restablecer contraseña' : 'Reenviar invitación'} accion={enlaceAccesoEvento.bind(null, id, u.user_id)} />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">Datos del evento</h2>
        <form key={JSON.stringify([ev.nombre, ev.cliente_nombre, ev.whatsapp, ev.ciudad, ev.fecha])} action={actualizarEventoAdmin.bind(null, id)} className="caja grid gap-3 p-4 sm:grid-cols-2">
          <div><label className="etiqueta" htmlFor="nombre">Nombre del evento</label><input id="nombre" name="nombre" className="campo" defaultValue={ev.nombre} /></div>
          <div><label className="etiqueta" htmlFor="fecha">Fecha y hora</label><input id="fecha" name="fecha" type="datetime-local" className="campo" defaultValue={aLocalBolivia(ev.fecha)} /></div>
          <div><label className="etiqueta" htmlFor="cliente">Cliente</label><input id="cliente" name="cliente" className="campo" defaultValue={ev.cliente_nombre ?? ''} /></div>
          <div><label className="etiqueta" htmlFor="whatsapp">WhatsApp</label><input id="whatsapp" name="whatsapp" className="campo" defaultValue={ev.whatsapp ?? ''} /></div>
          <div><label className="etiqueta" htmlFor="ciudad">Ciudad</label><input id="ciudad" name="ciudad" className="campo" defaultValue={ev.ciudad ?? ''} /></div>
          <div className="self-end"><button className="btn-borde">Guardar datos</button></div>
        </form>
      </section>

      <section className="mt-8 border-t border-linea pt-6">
        <h2 className="mb-3 text-lg font-bold">Zona delicada</h2>
        <div className="flex flex-wrap gap-2">
          <form action={suspenderEvento.bind(null, id, !ev.suspendido)}><button className="btn-borde">{ev.suspendido ? 'Reactivar invitación' : 'Suspender invitación'}</button></form>
          <EliminarTienda id={id} nombre={ev.nombre} accion={eliminarEvento}
            detalle="Se borran la invitación, la lista de invitados, sus confirmaciones, las fotos y el usuario del cliente. Esto no se puede deshacer." />
        </div>
      </section>
    </div>
  )
}
