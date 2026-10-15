import { baseCrm } from '@/lib/crmDatos'
import ListaVentas from './ListaVentas'
import type { Venta } from '@/lib/crm'

export default async function PaginaVentas() {
  const { supabase, tc, divisiones, servicios, clientes } = await baseCrm()
  const { data } = await supabase.from('crm_ventas_resumen').select('*').order('fecha', { ascending: false })
  return <ListaVentas ventas={(data ?? []) as Venta[]} tc={tc} divisiones={divisiones} servicios={servicios} clientes={clientes} />
}
