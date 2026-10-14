import { cargarEvento } from '@/lib/evento'
import EditarEvento from './EditarEvento'

export default async function PaginaEditar() {
  const { evento, plan, datos } = await cargarEvento()
  if (!evento) return null
  return <EditarEvento eventoId={evento.id} slug={evento.slug} tipo={evento.tipo} fechaIso={evento.fecha}
    estiloInicial={evento.estilo} inicial={datos} maxFotos={plan.fotos} musica={plan.musica} regalos={plan.regalos} pases={plan.pases} />
}
