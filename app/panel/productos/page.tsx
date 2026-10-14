import Link from 'next/link'
import { cargarTienda } from '@/lib/tienda'
import { RUBROS } from '@/lib/rubros'
import { bs, pid } from '@/lib/utils'

export default async function Productos() {
  const { supabase, tienda, plan, config } = await cargarTienda()
  if (!tienda || !config) return null
  const { data: productos } = await supabase.from('productos').select('*').eq('tienda_id', tienda.id).order('numero', { ascending: false })
  const lista = productos ?? []
  const lleno = plan.productos !== null && lista.length >= plan.productos

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 className="titulo">Productos</h1>
          <p className="subtitulo">{lista.length}{plan.productos ? ` de ${plan.productos}` : ''} productos · plan {plan.nombre}</p></div>
        {lleno ? <span className="chip-aviso">Llegaste al límite de tu plan</span>
          : <Link href="/panel/productos/nuevo" className="btn-primario">Agregar producto</Link>}
      </div>
      <div className="caja">
        {lista.length === 0 && <p className="p-5 text-suave">Aún no tienes productos. Agrega el primero y aparecerá en tu tienda.</p>}
        {lista.map((p) => {
          const agotado = !p.disponible || (p.stock !== null && Number(p.stock) <= 0)
          return (
            <Link key={p.id} href={`/panel/productos/${p.id}`} className={`flex items-center gap-4 border-t border-linea px-4 py-3 first:border-t-0 hover:bg-sup2 ${agotado ? 'opacity-55' : ''}`}>
              <div className="grid h-12 w-12 flex-none place-items-center overflow-hidden rounded-lg border border-linea bg-sup2 text-xl">
                {p.fotos?.[0] ? <img src={p.fotos[0]} alt="" className="h-full w-full object-cover" /> : RUBROS[tienda.rubro]?.e}
              </div>
              <div className="min-w-0 flex-1">
                <b>{p.nombre}</b> <span className="ml-1 rounded border border-linea bg-sup2 px-1.5 text-xs font-bold text-suave">{pid(p.numero)}</span>
                <small className="block text-suave">{[p.categoria, 'por ' + p.unidad, config.campos.includes('stock') && p.stock !== null ? `${Number(p.stock)} en stock` : null].filter(Boolean).join(' · ')}</small>
              </div>
              <span className="chip">
                {config.campos.includes('oferta') && p.precio_oferta !== null
                  ? <><s className="mr-1 font-medium text-suave">{bs(p.precio)}</s>{bs(p.precio_oferta)}</> : bs(p.precio)}
              </span>
            </Link>
          )
        })}
      </div>
    </>
  )
}
