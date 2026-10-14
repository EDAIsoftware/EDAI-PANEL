import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { CAMPOS_BASE, CAMPOS_EXTRA, RUBROS, leerConfig, type CampoExtra } from '@/lib/rubros'
import { PLANES, PLAN_IDS, esPlan } from '@/lib/planes'
import { PANEL_URL, bs, diasHasta, fechaCorta, urlTienda, waLink } from '@/lib/utils'
import {
  actualizarDatos, cambiarActivo, cambiarPlan, cambiarRubro, guardarConfig, registrarPago, suspender,
} from '../../actions'
import BotonEnlace from '@/components/BotonEnlace'
import InvitarUsuario from '@/components/InvitarUsuario'
import EliminarTienda from '@/components/EliminarTienda'

export default async function FichaTienda({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase } = await requireAdmin()
  const { data: t } = await supabase.from('admin_resumen').select('*').eq('id', id).maybeSingle()
  if (!t) notFound()
  const { data: perfiles } = await supabase.from('perfiles').select('*').eq('tienda_id', id).order('creado_en')

  // Último ingreso de cada usuario (solo lo puede leer el servidor)
  const admin = createAdminClient()
  const usuarios = await Promise.all((perfiles ?? []).map(async (p) => {
    const { data } = await admin.auth.admin.getUserById(p.user_id)
    return { ...p, ultimo: data.user?.last_sign_in_at ?? null }
  }))

  const planId: string = t.plan
  const plan = esPlan(planId) ? PLANES[planId] : PLANES.emprende
  const cfg = leerConfig(t.config, t.rubro)
  const d = diasHasta(t.vence_el)
  const activos = usuarios.filter((u) => u.activo).length
  const conv = t.visitas_30d ? ((t.pedidos_30d / t.visitas_30d) * 100).toFixed(1) : '0'
  const tienda = urlTienda(t.slug, t.dominio)
  const recordatorio = `Hola ${t.dueno_nombre || ''}, te escribimos de EDAI. ${d < 0 ? `La suscripción de ${t.nombre} venció el ${fechaCorta(t.vence_el)}` : `La suscripción de ${t.nombre} vence el ${fechaCorta(t.vence_el)}`}. ¿Te ayudamos a renovarla?`

  return (
    <div className="max-w-4xl">
      <Link href="/admin/tiendas" className="text-sm text-suave underline">← Tiendas</Link>
      <div className="mt-3 flex flex-wrap items-start gap-3">
        <span className="text-4xl">{RUBROS[t.rubro]?.e ?? '🏪'}</span>
        <div className="flex-1">
          <h1 className="titulo">{t.nombre}</h1>
          <p className="text-suave">{RUBROS[t.rubro]?.n} · {t.ciudad} · cliente desde {fechaCorta(t.creado_en)} · códigos <b className="text-tinta">{t.prefijo}-0001</b></p>
        </div>
        {t.suspendida ? <span className="chip-malo">Suspendida</span>
          : <span className={d < 0 ? 'chip-malo' : d <= 7 ? 'chip-aviso' : 'chip'}>{d < 0 ? `Vencida hace ${-d} d` : `Hasta ${fechaCorta(t.vence_el)}`}</span>}
      </div>

      {/* MÉTRICAS */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="caja p-4"><span className="text-xs text-suave">Ventas 30 d</span><strong className="block text-2xl font-extrabold">{bs(t.ventas_30d)}</strong></div>
        <div className="caja p-4"><span className="text-xs text-suave">Pedidos 30 d</span><strong className="block text-2xl font-extrabold">{t.pedidos_30d}</strong></div>
        <div className="caja p-4"><span className="text-xs text-suave">Visitas 30 d</span><strong className="block text-2xl font-extrabold">{t.visitas_30d}</strong><small className="text-suave">{conv}% compra</small></div>
        <div className="caja p-4"><span className="text-xs text-suave">Productos</span><strong className="block text-2xl font-extrabold">{t.productos}{plan.productos ? <small className="text-base text-suave"> / {plan.productos}</small> : null}</strong></div>
      </section>

      {/* SUSCRIPCIÓN */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">Suscripción</h2>
        <div className="caja flex flex-wrap items-center gap-3 p-4">
          <form key={t.plan} action={cambiarPlan.bind(null, id)} className="flex gap-2">
            <select name="plan" defaultValue={t.plan} className="campo w-auto" aria-label="Plan">
              {PLAN_IDS.map((p) => <option key={p} value={p}>{PLANES[p].nombre} · {bs(PLANES[p].precio)}/mes</option>)}
            </select>
            <button className="btn-borde">Cambiar plan</button>
          </form>
          <form action={registrarPago.bind(null, id)}><button className="btn-primario">Registrar pago (+1 mes)</button></form>
          {t.whatsapp && <a className="btn-wa" href={waLink(t.whatsapp, recordatorio)} target="_blank" rel="noopener noreferrer">Recordar pago</a>}
        </div>
      </section>

      {/* ACCESOS */}
      <section className="mt-8">
        <h2 className="mb-1 text-lg font-bold">Accesos <span className="text-sm font-medium text-suave">{activos} de {plan.usuarios} usuarios · plan {plan.nombre}</span></h2>
        <p className="mb-3 text-sm text-suave">Tienda: <a className="underline" href={tienda} target="_blank" rel="noopener noreferrer">{tienda}</a> · Panel: {PANEL_URL}</p>
        <div className="caja">
          {usuarios.map((u) => (
            <div key={u.user_id} className="flex flex-wrap items-center gap-3 border-t border-linea px-4 py-3 first:border-t-0">
              <div className="min-w-0 flex-1"><b className="block">{u.nombre || u.correo}</b>
                <small className="text-suave">{u.correo} · {u.rol === 'dueno' ? 'Dueño' : 'Empleado'}{u.ultimo ? ` · último ingreso ${fechaCorta(u.ultimo)}` : ''}</small></div>
              <span className={!u.activo ? 'chip-malo' : u.ultimo ? 'chip' : 'chip-aviso'}>{!u.activo ? 'Desactivado' : u.ultimo ? 'Activo' : 'Invitación pendiente'}</span>
              {u.activo && <BotonEnlace tiendaId={id} userId={u.user_id} texto={u.ultimo ? 'Restablecer contraseña' : 'Reenviar invitación'} />}
              {u.rol !== 'dueno' && (
                <form action={cambiarActivo.bind(null, id, u.user_id, !u.activo)}><button className="btn-borde btn-sm">{u.activo ? 'Desactivar' : 'Activar'}</button></form>
              )}
            </div>
          ))}
          {activos < plan.usuarios ? <InvitarUsuario tiendaId={id} />
            : <p className="border-t border-linea px-4 py-3 text-sm text-suave">Llegó al límite de usuarios de su plan.</p>}
        </div>
      </section>

      {/* AJUSTES DE PRODUCTOS */}
      <section className="mt-8">
        <h2 className="mb-1 text-lg font-bold">Ajustes de productos</h2>
        <p className="mb-3 text-sm text-suave">Esto es lo único que verá el dueño al subir productos.</p>
        <form key={t.rubro} action={cambiarRubro.bind(null, id)} className="caja mb-3 flex flex-wrap items-center gap-2 p-4">
          <label className="etiqueta mb-0 mr-2" htmlFor="rubro">Rubro</label>
          <select id="rubro" name="rubro" defaultValue={t.rubro} className="campo w-auto">
            {Object.entries(RUBROS).map(([k, r]) => <option key={k} value={k}>{r.e} {r.n}</option>)}
          </select>
          <button className="btn-borde">Aplicar rubro</button>
          <small className="w-full text-suave">Aplicar un rubro reemplaza los campos y listas de abajo por los de ese rubro.</small>
        </form>
        {/* key: al cambiar el rubro o guardar, el formulario se vuelve a dibujar con los valores nuevos */}
        <form key={JSON.stringify(cfg)} action={guardarConfig.bind(null, id)} className="caja p-4">
          <p className="etiqueta">Siempre visibles: {CAMPOS_BASE.join(', ')} y código EDAI</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(CAMPOS_EXTRA) as CampoExtra[]).map((k) => (
              <label key={k} className="flex cursor-pointer items-center gap-3 rounded-lg border border-linea bg-sup2 px-3 py-2">
                <input type="checkbox" name={`campo_${k}`} defaultChecked={cfg.campos.includes(k)} className="h-4 w-4 accent-acento" />
                <span><b className="block text-sm">{CAMPOS_EXTRA[k].t}</b><small className="text-suave">{CAMPOS_EXTRA[k].d}</small></span>
              </label>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {([['categorias', 'Categorías'], ['unidades', 'Se vende por'], ['variantes', 'Variantes'], ['etiquetas', 'Etiquetas']] as const).map(([k, etq]) => (
              <div key={k}><label className="etiqueta" htmlFor={k}>{etq} <span className="font-normal">(separadas por coma)</span></label>
                <input id={k} name={k} className="campo" defaultValue={cfg[k].join(', ')} /></div>
            ))}
          </div>
          <button className="btn-primario mt-4">Guardar ajustes</button>
        </form>
      </section>

      {/* DATOS */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-bold">Datos del cliente</h2>
        <form key={JSON.stringify([t.dueno_nombre, t.whatsapp, t.ciudad, t.dominio, t.prefijo])} action={actualizarDatos.bind(null, id)} className="caja grid gap-3 p-4 sm:grid-cols-2">
          <div><label className="etiqueta" htmlFor="dueno">Dueño</label><input id="dueno" name="dueno" className="campo" defaultValue={t.dueno_nombre ?? ''} /></div>
          <div><label className="etiqueta" htmlFor="whatsapp">WhatsApp</label><input id="whatsapp" name="whatsapp" className="campo" defaultValue={t.whatsapp ?? ''} /></div>
          <div><label className="etiqueta" htmlFor="ciudad">Ciudad</label><input id="ciudad" name="ciudad" className="campo" defaultValue={t.ciudad ?? ''} /></div>
          <div><label className="etiqueta" htmlFor="dominio">Dominio propio (opcional)</label><input id="dominio" name="dominio" className="campo" defaultValue={t.dominio ?? ''} placeholder="www.sutienda.com" /></div>
          <div><label className="etiqueta" htmlFor="prefijo">Prefijo de códigos</label><input id="prefijo" name="prefijo" className="campo uppercase" maxLength={6} defaultValue={t.prefijo ?? ''} />
            <small className="text-suave">2 a 6 letras o números. Si otra tienda ya lo usa, se mantiene el actual.</small></div>
          <div className="self-end"><button className="btn-borde">Guardar datos</button></div>
        </form>
      </section>

      {/* ZONA DELICADA */}
      <section className="mt-8 border-t border-linea pt-6">
        <h2 className="mb-3 text-lg font-bold">Zona delicada</h2>
        <div className="flex flex-wrap gap-2">
          <form action={suspender.bind(null, id, !t.suspendida)}>
            <button className="btn-borde">{t.suspendida ? 'Reactivar tienda' : 'Suspender tienda'}</button>
          </form>
          <EliminarTienda id={id} nombre={t.nombre} />
        </div>
        <p className="mt-2 text-sm text-suave">Suspender bloquea su tienda y su panel pero guarda todo. Eliminar borra todo para siempre.</p>
      </section>
    </div>
  )
}
