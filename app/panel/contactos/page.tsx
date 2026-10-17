import { cargarTienda } from '@/lib/tienda'
import Contactos from './Contactos'

export default async function PaginaContactos() {
  const { supabase, tienda } = await cargarTienda()
  if (!tienda) return null
  const [{ data }, { data: props }] = await Promise.all([
    supabase.from('contactos').select('*').eq('tienda_id', tienda.id).order('creado_en', { ascending: false }).limit(300),
    supabase.from('productos').select('id, numero, nombre').eq('tienda_id', tienda.id),
  ])
  return <Contactos inicial={data ?? []} propiedades={props ?? []} agente={tienda.nombre} prefijo={tienda.prefijo} />
}
