import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createPublicClient } from '@/lib/supabase/publico'
import Tienda, { type DatosTienda } from './Tienda'
import LandingAgente from '@/components/agente/Landing'
import type { DatosAgente } from '@/components/agente/comun'
import { baseTienda } from '@/lib/baseTienda'

export const revalidate = 60 // la tienda se actualiza como máximo cada minuto

async function cargar(slug: string) {
  const supabase = createPublicClient()
  const { data } = await supabase.rpc('tienda_publica', { p_tienda: decodeURIComponent(slug) })
  return data as DatosTienda | null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const t = await cargar((await params).slug)
  if (!t) return { title: 'Tienda no disponible' }
  const ag = t as unknown as DatosAgente
  if (ag.tipo === 'agente') {
    return {
      title: `${ag.nombre} · ${ag.perfil?.cargo || 'Asesor inmobiliario'}`,
      description: ag.perfil?.frase || `Propiedades en venta y alquiler${ag.ciudad ? ' en ' + ag.ciudad : ''}.`,
      openGraph: { title: ag.nombre, images: ag.perfil?.foto ? [ag.perfil.foto] : ag.productos[0]?.fotos?.[0] ? [ag.productos[0].fotos[0]] : [] },
    }
  }
  return {
    title: t.nombre,
    description: `Pide en ${t.nombre}${t.ciudad ? ' · ' + t.ciudad : ''} y recibe tu pedido por WhatsApp.`,
    openGraph: { title: t.nombre, images: t.productos[0]?.fotos?.[0] ? [t.productos[0].fotos[0]] : [] },
  }
}

export default async function PaginaTienda({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const t = await cargar(slug)
  if (!t) notFound()
  const ag = t as unknown as DatosAgente
  if (ag.tipo === 'agente') return <LandingAgente t={ag} clave={decodeURIComponent(slug)} base={await baseTienda(slug)} />
  return <Tienda t={t} clave={decodeURIComponent(slug)} />
}
