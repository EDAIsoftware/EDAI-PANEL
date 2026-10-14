import { notFound } from 'next/navigation'
import ProductoForm from '../ProductoForm'
import { cargarTienda } from '@/lib/tienda'

export default async function EditarProducto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase, tienda, plan, config } = await cargarTienda()
  if (!tienda || !config) return null
  const { data: producto } = await supabase.from('productos').select('*').eq('id', id).eq('tienda_id', tienda.id).maybeSingle()
  if (!producto) notFound()
  return <ProductoForm tiendaId={tienda.id} config={config} maxFotos={plan.fotos} siguiente={tienda.siguiente_numero} prefijo={tienda.prefijo} producto={producto} />
}
