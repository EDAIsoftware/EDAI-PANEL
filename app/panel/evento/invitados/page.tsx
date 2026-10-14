import { cargarEvento } from '@/lib/evento'
import Invitados from './Invitados'

export default async function PaginaInvitados() {
  const { supabase, evento, plan } = await cargarEvento()
  if (!evento) return null
  const { data } = await supabase.from('invitados').select('*').eq('evento_id', evento.id).order('creado_en', { ascending: false })
  return <Invitados eventoId={evento.id} slug={evento.slug} nombreEvento={evento.nombre} tipo={evento.tipo}
    inicial={data ?? []} pases={plan.pases} maxInvitados={plan.invitados} />
}
