import { requireAdmin } from '@/lib/auth'

// Nombres de tus clientes (tiendas e invitaciones) para sugerirlos al guardar claves
export async function clientesSugeridos() {
  const { supabase } = await requireAdmin()
  const [{ data: t }, { data: e }] = await Promise.all([
    supabase.from('tiendas').select('nombre'),
    supabase.from('eventos').select('nombre'),
  ])
  return Array.from(new Set([...(t ?? []).map((x) => x.nombre as string), ...(e ?? []).map((x) => x.nombre as string)]))
}
