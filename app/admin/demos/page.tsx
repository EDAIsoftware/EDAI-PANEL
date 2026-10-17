import { requireAdmin } from '@/lib/auth'
import Demos, { type Demo, type Envio, type Persona } from './Demos'

export const dynamic = 'force-dynamic'

export default async function PaginaDemos({ searchParams }: { searchParams: Promise<{ prospecto?: string; cliente?: string }> }) {
  const { supabase } = await requireAdmin()
  const { prospecto, cliente } = await searchParams
  const [{ data: demos }, { data: envios }, { data: pros }, { data: clis }] = await Promise.all([
    supabase.from('demos').select('*').order('creado_en', { ascending: false }),
    supabase.from('demo_envios').select('*').order('creado_en', { ascending: false }),
    supabase.from('crm_prospectos').select('id, nombre, empresa, telefono, etapa').not('etapa', 'in', '("Ganado","Perdido")').order('nombre'),
    supabase.from('crm_clientes').select('id, nombre, empresa, telefono').order('nombre'),
  ])
  const personas: Persona[] = [
    ...(pros ?? []).map((p) => ({ tipo: 'prospecto' as const, id: p.id, nombre: p.nombre, empresa: p.empresa, telefono: p.telefono, etapa: p.etapa })),
    ...(clis ?? []).map((c) => ({ tipo: 'cliente' as const, id: c.id, nombre: c.nombre, empresa: c.empresa, telefono: c.telefono })),
  ]
  const para = prospecto ? personas.find((x) => x.tipo === 'prospecto' && x.id === prospecto) : cliente ? personas.find((x) => x.tipo === 'cliente' && x.id === cliente) : undefined
  return <Demos inicial={(demos ?? []) as Demo[]} envios={(envios ?? []) as Envio[]} personas={personas} para={para ?? null} />
}
