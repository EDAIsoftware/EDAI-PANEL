import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Cormorant_Garamond, Great_Vibes } from 'next/font/google'
import { createPublicClient } from '@/lib/supabase/publico'
import Invitacion, { type EventoPublico } from './Invitacion'

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500', '600', '700'], style: ['normal', 'italic'], variable: '--font-serif' })
const script = Great_Vibes({ subsets: ['latin'], weight: '400', variable: '--font-script' })

export const dynamic = 'force-dynamic' // cada invitado ve su propio enlace

async function cargar(slug: string, codigo?: string) {
  const { data } = await createPublicClient().rpc('evento_publico', { p_slug: decodeURIComponent(slug), p_codigo: codigo ?? null })
  return data as EventoPublico | null
}

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ p?: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ev = await cargar((await params).slug)
  if (!ev) return { title: 'Invitación' }
  const d = ev.datos || {}
  const titulo = d.nombres ? `${d.nombres} · ${d.frase || ev.nombre}` : ev.nombre
  return {
    title: titulo,
    description: 'Tienes una invitación especial. Ábrela para ver todos los detalles y confirmar tu asistencia.',
    openGraph: { title: titulo, images: d.portada_url ? [d.portada_url] : [] },
  }
}

export default async function PaginaInvitacion({ params, searchParams }: Props) {
  const { slug } = await params
  const { p } = await searchParams
  const ev = await cargar(slug, p)
  if (!ev) notFound()
  return <div className={`${serif.variable} ${script.variable}`}><Invitacion ev={ev} codigo={p ?? null} /></div>
}
