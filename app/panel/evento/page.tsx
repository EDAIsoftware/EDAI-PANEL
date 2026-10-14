import Link from 'next/link'
import { cargarEvento } from '@/lib/evento'
import { fechaHora, urlInvitacion } from '@/lib/utils'
import Copiar from '@/components/Copiar'

export default async function ResumenEvento() {
  const { supabase, evento, plan } = await cargarEvento()
  if (!evento) return null
  const { data } = await supabase.from('invitados').select('nombre, pases, estado, confirmados, mensaje, origen, respondido_en').eq('evento_id', evento.id)
  const inv = data ?? []
  const lista = inv.filter((i) => i.origen === 'lista')
  const personas = inv.reduce((a, i) => a + Number(i.confirmados), 0)
  const pases = lista.reduce((a, i) => a + Number(i.pases), 0)
  const noAsisten = inv.filter((i) => i.estado === 'No asiste').length
  const pendientes = lista.filter((i) => i.estado === 'Pendiente').length
  const dias = Math.ceil((new Date(evento.fecha).getTime() - Date.now()) / 864e5)
  const mensajes = inv.filter((i) => i.mensaje).sort((a, b) => String(b.respondido_en).localeCompare(String(a.respondido_en))).slice(0, 8)
  const enlace = urlInvitacion(evento.slug)

  return (
    <>
      <h1 className="titulo">{evento.nombre}</h1>
      <p className="subtitulo">{dias > 1 ? `Faltan ${dias} días` : dias === 1 ? '¡Es mañana!' : dias === 0 ? '¡Es hoy!' : 'El evento ya pasó'} · {fechaHora(evento.fecha)}</p>

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="caja border-transparent bg-chip p-4"><span className="text-sm text-suave">Personas confirmadas</span><strong className="block text-3xl font-extrabold">{personas}</strong>{plan.pases && <small className="text-suave">de {pases} pases</small>}</div>
        {plan.pases && <div className="caja p-4"><span className="text-sm text-suave">Familias invitadas</span><strong className="block text-3xl font-extrabold">{lista.length}</strong></div>}
        {plan.pases && <div className="caja p-4"><span className="text-sm text-suave">Sin responder</span><strong className="block text-3xl font-extrabold">{pendientes}</strong></div>}
        <div className="caja p-4"><span className="text-sm text-suave">No asistirán</span><strong className="block text-3xl font-extrabold">{noAsisten}</strong></div>
      </div>

      <div className="caja mb-6 flex flex-wrap items-center gap-3 p-4">
        <div className="min-w-0 flex-1"><b className="block">Tu invitación</b><small className="break-all text-suave">{enlace}</small></div>
        <a href={enlace} target="_blank" rel="noopener noreferrer" className="btn-borde btn-sm">Ver</a>
        <Copiar texto={enlace} />
        {plan.pases && <Link href="/panel/evento/invitados" className="btn-primario btn-sm">Enviar a mis invitados</Link>}
      </div>

      <h2 className="mb-3 text-lg font-bold">Mensajes de tus invitados</h2>
      <div className="caja">
        {mensajes.length === 0 && <p className="p-4 text-suave">Aquí aparecerán los mensajes que te dejen al confirmar.</p>}
        {mensajes.map((m, i) => (
          <div key={i} className="border-t border-linea px-4 py-3 first:border-t-0">
            <b>{m.nombre}</b> <small className="text-suave">· {m.estado === 'Confirmado' ? `asistirán ${m.confirmados}` : 'no asistirá'}</small>
            <p className="mt-1 text-sm">“{m.mensaje}”</p>
          </div>
        ))}
      </div>
    </>
  )
}
