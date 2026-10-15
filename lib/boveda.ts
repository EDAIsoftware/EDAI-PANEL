import { requireAdmin } from '@/lib/auth'

// Clientes del CRM, tiendas e invitaciones: se sugieren como carpetas al guardar claves
export async function datosBoveda() {
  const { supabase } = await requireAdmin()
  const [{ data: t }, { data: e }, { data: c }] = await Promise.all([
    supabase.from('tiendas').select('nombre'),
    supabase.from('eventos').select('nombre'),
    supabase.from('crm_clientes').select('id, nombre, empresa'),
  ])
  const crm = (c ?? []) as { id: string; nombre: string; empresa: string | null }[]
  const sugeridas = Array.from(new Set([
    ...crm.map((x) => x.empresa || x.nombre),
    ...(t ?? []).map((x) => x.nombre as string),
    ...(e ?? []).map((x) => x.nombre as string),
  ]))
  return { sugeridas, crm }
}
