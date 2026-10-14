import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createPublicClient } from '@/lib/supabase/publico'
import Tienda, { type DatosTienda } from './Tienda'

export const revalidate = 60 // la tienda se actualiza como máximo cada minuto

async function cargar(slug: string) {
  const supabase = createPublicClient()
  const { data } = await supabase.rpc('tienda_publica', { p_tienda: decodeURIComponent(slug) })
  return data as DatosTienda | null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const t = await cargar((await params).slug)
  if (!t) return { title: 'Tienda no disponible' }
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
  return <Tienda t={t} clave={decodeURIComponent(slug)} />
}
