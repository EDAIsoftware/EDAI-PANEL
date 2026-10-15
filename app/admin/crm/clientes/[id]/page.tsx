import { notFound } from 'next/navigation'
import { baseCrm } from '@/lib/crmDatos'
import FichaCliente from './FichaCliente'
import type { Actividad, Cliente, Pago, Venta } from '@/lib/crm'

export default async function PaginaFicha({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ nuevaVenta?: string; servicio?: string; valor?: string; moneda?: string }>
}) {
  const { id } = await params
  const sp = await searchParams
  const { supabase, tc, divisiones, servicios, clientes } = await baseCrm()
  const { data: c } = await supabase.from('crm_clientes').select('*').eq('id', id).maybeSingle()
  if (!c) notFound()
  const [{ data: v }, { data: a }, { data: t }, { data: e }] = await Promise.all([
    supabase.from('crm_ventas_resumen').select('*').eq('cliente_id', id).order('fecha', { ascending: false }),
    supabase.from('crm_actividades').select('*').eq('cliente_id', id).order('fecha', { ascending: false }),
    supabase.from('tiendas').select('id, nombre, slug').order('nombre'),
    supabase.from('eventos').select('id, nombre, slug').order('nombre'),
  ])
  const ventas = (v ?? []) as Venta[]
  const { data: p } = ventas.length
    ? await supabase.from('crm_pagos').select('*').in('venta_id', ventas.map((x) => x.id)).order('fecha', { ascending: false })
    : { data: [] }
  return (
    <FichaCliente cliente={c as Cliente} ventas={ventas} pagos={(p ?? []) as Pago[]} actividades={(a ?? []) as Actividad[]}
      tc={tc} divisiones={divisiones} servicios={servicios} clientes={clientes} tiendas={t ?? []} eventos={e ?? []}
      nuevaVenta={sp.nuevaVenta ? { servicio: sp.servicio, valor: sp.valor ? Number(sp.valor) : undefined, moneda: sp.moneda === 'USD' ? 'USD' : sp.moneda === 'BOB' ? 'BOB' : undefined } : null} />
  )
}
