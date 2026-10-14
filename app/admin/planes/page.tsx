import { requireAdmin } from '@/lib/auth'
import { PLANES, PLAN_IDS } from '@/lib/planes'
import { PLANES_EVENTO, PLAN_EVENTO_IDS } from '@/lib/eventos'
import { bs } from '@/lib/utils'

export default async function Planes() {
  const { supabase } = await requireAdmin()
  const [{ data: t }, { data: e }] = await Promise.all([
    supabase.from('tiendas').select('plan'),
    supabase.from('eventos').select('plan'),
  ])
  const cuenta = (lista: { plan: string }[] | null, id: string) => (lista ?? []).filter((x) => x.plan === id).length
  const Item = ({ children }: { children: React.ReactNode }) => <li className="flex gap-2"><span className="text-chiptinta">✓</span><span>{children}</span></li>

  return (
    <>
      <h1 className="titulo">Planes</h1>
      <p className="subtitulo">Precios en bolivianos. Para cambiarlos, actualiza las tablas de planes en Supabase y el archivo de planes del proyecto.</p>

      <h2 className="mb-1 text-xl font-bold">Tiendas online</h2>
      <p className="mb-4 text-sm text-suave">Suscripción mensual, sin permanencia. Pedidos por WhatsApp ilimitados en todos los planes.</p>
      <div className="mb-10 grid gap-4 md:grid-cols-3">
        {PLAN_IDS.map((k) => { const p = PLANES[k]; return (
          <div key={k} className={`caja p-5 ${k === 'negocio' ? 'border-acento' : ''}`}>
            <div className="flex items-center justify-between"><h3 className="text-lg font-bold">{p.nombre}</h3><span className="chip">{cuenta(t, k)} clientes</span></div>
            <p className="mt-2 text-3xl font-extrabold">{bs(p.precio)}<small className="text-sm font-medium text-suave"> /mes</small></p>
            <p className="text-sm text-suave">{bs(p.anual)} al año (2 meses gratis)</p>
            <ul className="mt-4 space-y-1.5 text-sm">
              <Item>{p.productos ? `Hasta ${p.productos} productos` : 'Productos ilimitados'}</Item>
              <Item>{p.fotos === 1 ? '1 foto' : `Hasta ${p.fotos} fotos`} por producto</Item>
              <Item>{p.usuarios} {p.usuarios === 1 ? 'usuario' : 'usuarios'} del panel</Item>
            </ul>
          </div>) })}
      </div>

      <h2 className="mb-1 text-xl font-bold">Invitaciones digitales</h2>
      <p className="mb-4 text-sm text-suave">Pago único por evento. Incluye panel para el cliente con sus confirmaciones.</p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLAN_EVENTO_IDS.map((k) => { const p = PLANES_EVENTO[k]; return (
          <div key={k} className={`caja p-5 ${k === 'completa' ? 'border-acento' : ''}`}>
            <div className="flex items-center justify-between"><h3 className="text-lg font-bold">{p.nombre}</h3><span className="chip">{cuenta(e, k)} eventos</span></div>
            <p className="mt-2 text-3xl font-extrabold">{bs(p.precio)}<small className="text-sm font-medium text-suave"> por evento</small></p>
            <ul className="mt-4 space-y-1.5 text-sm">
              <Item>Plantillas para boda, XV años, cumpleaños, bautizo y más</Item>
              <Item>Cuenta regresiva, lugares con mapa y botón para agendar</Item>
              <Item>{p.pases ? `Pases personales por familia${p.invitados ? ` (hasta ${p.invitados})` : ' ilimitados'}` : 'Confirmación general con enlace único'}</Item>
              {p.fotos > 0 ? <Item>Galería de {p.fotos} fotos</Item> : <Item>Foto de portada</Item>}
              {p.musica && <Item>Música de fondo</Item>}
              {p.regalos && <Item>Regalos con QR para transferencias</Item>}
              <Item>Activa hasta {p.dias} días después del evento</Item>
            </ul>
          </div>) })}
      </div>
    </>
  )
}
