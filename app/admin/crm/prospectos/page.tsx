import { baseCrm } from '@/lib/crmDatos'
import Prospectos from './Prospectos'
import type { Prospecto } from '@/lib/crm'

export default async function PaginaProspectos() {
  const { supabase, servicios, divisiones } = await baseCrm()
  const { data } = await supabase.from('crm_prospectos').select('*').order('actualizado_en', { ascending: false })
  return <Prospectos inicial={(data ?? []) as Prospecto[]} servicios={servicios} divisiones={divisiones} />
}
