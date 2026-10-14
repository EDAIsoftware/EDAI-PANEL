import ProductoForm from '../ProductoForm'
import { cargarTienda } from '@/lib/tienda'

export default async function NuevoProducto() {
  const { tienda, plan, config } = await cargarTienda()
  if (!tienda || !config) return null
  return <ProductoForm tiendaId={tienda.id} config={config} maxFotos={plan.fotos} siguiente={tienda.siguiente_numero} prefijo={tienda.prefijo} />
}
