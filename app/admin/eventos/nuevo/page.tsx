import { requireAdmin } from '@/lib/auth'
import NuevoEventoForm, { type InicialEvento } from './NuevoEventoForm'

// Si llega ?cliente=ID desde el CRM, el formulario se llena con sus datos
export default async function NuevoEvento({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  const { supabase } = await requireAdmin()
  const { cliente } = await searchParams
  let inicial: InicialEvento | undefined
  if (cliente) {
    const { data: c } = await supabase.from('crm_clientes').select('id, nombre, telefono, email').eq('id', cliente).maybeSingle()
    if (c) inicial = { crmId: c.id, cliente: c.nombre, correo: c.email ?? '', whatsapp: (c.telefono ?? '').replace(/\D/g, '') }
  }
  return <NuevoEventoForm inicial={inicial} />
}
