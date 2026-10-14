import { cargarTienda } from '@/lib/tienda'
import RegistrarVenta from './RegistrarVenta'

export default async function NuevaVenta() {
  const { supabase, tienda, config } = await cargarTienda()
  if (!tienda || !config) return null
  const { data } = await supabase.from('productos')
    .select('id, numero, codigo, nombre, precio, precio_oferta, unidad, stock, disponible')
    .eq('tienda_id', tienda.id).eq('disponible', true).order('nombre')
  return <RegistrarVenta tiendaId={tienda.id} prefijo={tienda.prefijo} productos={data ?? []} usaOferta={config.campos.includes('oferta')} />
}
