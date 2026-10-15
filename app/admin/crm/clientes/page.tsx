import { baseCrm } from '@/lib/crmDatos'
import ListaClientes from './ListaClientes'
import type { Cliente, Venta } from '@/lib/crm'

export default async function PaginaClientes() {
  const { supabase, tc, divisiones } = await baseCrm()
  const [{ data: c }, { data: v }, { data: t }, { data: e }] = await Promise.all([
    supabase.from('crm_clientes').select('*').order('numero'),
    supabase.from('crm_ventas_resumen').select('cliente_id, valor, saldo, moneda, estado, fecha'),
    supabase.from('tiendas').select('id, nombre').order('nombre'),
    supabase.from('eventos').select('id, nombre').order('nombre'),
  ])
  return <ListaClientes clientes={(c ?? []) as Cliente[]} ventas={(v ?? []) as Venta[]} tc={tc} divisiones={divisiones} tiendas={t ?? []} eventos={e ?? []} />
}
