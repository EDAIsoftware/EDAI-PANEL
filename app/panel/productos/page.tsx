import Link from 'next/link'
import { cargarTienda } from '@/lib/tienda'
import { RUBROS } from '@/lib/rubros'
import ListaProductos from './ListaProductos'

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
      <ListaProductos productos={lista} prefijo={tienda.prefijo} emoji={RUBROS[tienda.rubro]?.e ?? '📦'}
        usaStock={config.campos.includes('stock')} usaOferta={config.campos.includes('oferta')} />
    </>
  )
}
