import { baseCrm } from '@/lib/crmDatos'
import Prospectos from './Prospectos'
import type { Prospecto } from '@/lib/crm'

export default async function PaginaProspectos() {
  const { supabase, servicios, divisiones } = await baseCrm()
  const [{ data }, { data: envios }] = await Promise.all([
    supabase.from('crm_prospectos').select('*').order('actualizado_en', { ascending: false }),
    supabase.from('demo_envios').select('prospecto_id, aperturas, ultima_apertura').not('prospecto_id', 'is', null),
  ])
  // Resumen de demos por prospecto: cuántas se enviaron y cuántas veces las abrió
  const demos: Record<string, { enviadas: number; aperturas: number; ultima: string | null }> = {}
  for (const e of envios ?? []) {
    const d = (demos[e.prospecto_id] ??= { enviadas: 0, aperturas: 0, ultima: null })
    d.enviadas++; d.aperturas += e.aperturas ?? 0
    if (e.ultima_apertura && (!d.ultima || e.ultima_apertura > d.ultima)) d.ultima = e.ultima_apertura
  }
  return <Prospectos inicial={(data ?? []) as Prospecto[]} servicios={servicios} divisiones={divisiones} demos={demos} />
}
