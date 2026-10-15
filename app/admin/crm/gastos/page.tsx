import { baseCrm } from '@/lib/crmDatos'
import Gastos from './Gastos'
import type { Gasto } from '@/lib/crm'

export default async function PaginaGastos() {
  const { supabase, tc } = await baseCrm()
  const { data } = await supabase.from('crm_gastos').select('*').order('concepto')
  return <Gastos gastos={(data ?? []) as Gasto[]} tc={tc} />
}
