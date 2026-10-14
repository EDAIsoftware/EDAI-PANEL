import { cargarTienda } from '@/lib/tienda'
import { PLANES, PLAN_IDS } from '@/lib/planes'
import { bs, diasHasta, fechaCorta, waLink } from '@/lib/utils'

const EDAI_WA = process.env.NEXT_PUBLIC_EDAI_WHATSAPP || ''

export default async function Suscripcion() {
  const { tienda, plan } = await cargarTienda()
  if (!tienda) return null
  const d = diasHasta(tienda.vence_el)
  const estado = d < 0 ? { cls: 'chip-malo', t: `Vencida hace ${-d} días` } : d <= 7 ? { cls: 'chip-aviso', t: `Vence en ${d} días` } : { cls: 'chip', t: `Hasta ${fechaCorta(tienda.vence_el)}` }
  const renovar = `Hola EDAI, quiero renovar la suscripción de ${tienda.nombre} (plan ${plan.nombre}).`
  return (
    <>
      <h1 className="titulo">Suscripción</h1>
      <p className="subtitulo">Tu plan con EDAI</p>
      <div className="caja mb-8 flex flex-wrap items-center gap-4 p-5">
        <div className="min-w-0 flex-1">
          <b className="block text-lg">Plan {plan.nombre}</b>
          <small className="text-suave">{bs(plan.precio)} al mes · {bs(plan.anual)} pagando el año (2 meses gratis)</small>
        </div>
        <span className={estado.cls}>{estado.t}</span>
        {EDAI_WA && <a className="btn-wa" href={waLink(EDAI_WA, renovar)} target="_blank" rel="noopener noreferrer">Renovar por WhatsApp</a>}
      </div>

      <h2 className="mb-3 text-lg font-bold">Planes disponibles</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {PLAN_IDS.map((k) => { const p = PLANES[k]; const actual = p.nombre === plan.nombre; return (
          <div key={k} className={`caja p-5 ${actual ? 'border-acento' : ''}`}>
            <div className="flex items-center justify-between"><b className="text-lg">{p.nombre}</b>{actual && <span className="chip">Tu plan</span>}</div>
            <p className="mt-2 text-2xl font-extrabold">{bs(p.precio)}<small className="text-sm font-medium text-suave"> /mes</small></p>
            <ul className="mt-3 space-y-1 text-sm text-suave">
              <li>{p.productos ? `Hasta ${p.productos} productos` : 'Productos ilimitados'}</li>
              <li>{p.fotos === 1 ? '1 foto' : `Hasta ${p.fotos} fotos`} por producto</li>
              <li>{p.usuarios} {p.usuarios === 1 ? 'usuario' : 'usuarios'} del panel</li>
            </ul>
            {!actual && EDAI_WA && <a className="btn-borde btn-sm mt-4" target="_blank" rel="noopener noreferrer"
              href={waLink(EDAI_WA, `Hola EDAI, quiero cambiar ${tienda.nombre} al plan ${p.nombre}.`)}>Quiero este plan</a>}
          </div>) })}
      </div>
    </>
  )
}
