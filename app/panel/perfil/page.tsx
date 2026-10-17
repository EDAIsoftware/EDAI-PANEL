import { cargarTienda } from '@/lib/tienda'
import Perfil from './Perfil'

export default async function PaginaPerfil() {
  const { tienda } = await cargarTienda()
  if (!tienda) return null
  return <Perfil tiendaId={tienda.id} nombre={tienda.nombre} inicial={tienda.perfil ?? {}} />
}
