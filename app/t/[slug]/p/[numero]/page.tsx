import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createPublicClient } from '@/lib/supabase/publico'
import PaginaPropiedad from '@/components/agente/Propiedad'
import { codigo, precioTexto, titularPropiedad, type DatosAgente } from '@/components/agente/comun'
import { baseTienda } from '@/lib/baseTienda'

export const revalidate = 60

type Props = { params: Promise<{ slug: string; numero: string }> }

async function cargar(slug: string, numero: string) {
  const { data } = await createPublicClient().rpc('tienda_publica', { p_tienda: decodeURIComponent(slug) })
  const t = data as DatosAgente | null
  if (!t || t.tipo !== 'agente') return null
  const x = t.productos.find((p) => String(p.numero) === numero)
  return x ? { t, x } : null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, numero } = await params
  const r = await cargar(slug, numero)
  if (!r) return { title: 'Propiedad no disponible' }
  const titulo = `${r.x.nombre} · ${precioTexto(r.x)}`
  return {
    title: titulo,
    description: `${titularPropiedad(r.x)} · ${codigo(r.t.prefijo, r.x.numero)} · ${r.t.nombre}`,
    openGraph: { title: titulo, description: titularPropiedad(r.x), images: r.x.fotos[0] ? [r.x.fotos[0]] : [] },
  }
}

export default async function Propiedad({ params }: Props) {
  const { slug, numero } = await params
  const r = await cargar(slug, numero)
  if (!r) notFound()
  return <PaginaPropiedad t={r.t} x={r.x} clave={decodeURIComponent(slug)} base={await baseTienda(slug)} />
}
