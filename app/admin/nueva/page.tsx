import { requireAdmin } from '@/lib/auth'
import NuevaTiendaForm, { type InicialTienda } from './NuevaTiendaForm'

// Si llega ?cliente=ID desde el CRM, el formulario se llena con sus datos
export default async function NuevaTienda({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const { supabase } = await requireAdmin()
  const { cliente } = await searchParams
  let inicial: InicialTienda | undefined
  if (cliente) {
    const { data: c } = await supabase.from('crm_clientes').select('id, nombre, empresa, telefono, email').eq('id', cliente).maybeSingle()
    if (c) inicial = { crmId: c.id, nombre: c.empresa || c.nombre, dueno: c.nombre, correo: c.email ?? '', whatsapp: (c.telefono ?? '').replace(/\D/g, '') }
  }
  return <NuevaTiendaForm inicial={inicial} />
}
