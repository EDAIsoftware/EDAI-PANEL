import { cargarTienda } from '@/lib/tienda'
import Apariencia from './Apariencia'

export default async function PaginaApariencia() {
  const { tienda } = await cargarTienda()
  if (!tienda) return null
  return <Apariencia tiendaId={tienda.id} nombre={tienda.nombre} logoInicial={tienda.logo_url} paletaInicial={tienda.tema?.panel ?? 'verde'} />
}
