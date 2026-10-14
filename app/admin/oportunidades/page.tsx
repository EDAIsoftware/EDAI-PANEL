import Link from 'next/link'
import { requireAdmin } from '@/lib/auth'
import { analizarTiendas, mensajeOferta, type Analisis, type FilaTienda } from '@/lib/analisis'
import { PLANES } from '@/lib/planes'
import { RUBROS } from '@/lib/rubros'
import { waLink } from '@/lib/utils'

function Lista({ items, vacio }: { items: Analisis[]; vacio: string }) {
  if (!items.length) return <div className="caja p-4 text-suave">{vacio}</div>
  return (
    <div className="caja">
      {items.map((t) => (
        <div key={t.id} className="flex flex-wrap items-center gap-3 border-t border-linea px-4 py-3 first:border-t-0">
          <span className="grid h-10 w-10 place-items-center rounded-lg border border-linea bg-sup2 text-lg">{RUBROS[t.rubro]?.e ?? '🏪'}</span>
          <Link href={`/admin/tiendas/${t.id}`} className="min-w-0 flex-1"><b className="block">{t.nombre}</b>
            <small className="text-suave">{t.motivos.join(' · ')}</small></Link>
          {t.tipo === 'subir' && t.siguiente && <span className="chip">Pasar a {PLANES[t.siguiente].nombre}</span>}
          {t.whatsapp && <a className="btn-wa btn-sm" href={waLink(t.whatsapp, mensajeOferta(t))} target="_blank" rel="noopener noreferrer">
            {t.tipo === 'riesgo' ? 'Ofrecer ayuda' : 'Enviar oferta'}</a>}
        </div>
      ))}
    </div>
  )
}

export default async function Oportunidades() {
  const { supabase } = await requireAdmin()
  const { data } = await supabase.from('admin_resumen').select('*')
  const tiendas = await analizarTiendas((data ?? []) as FilaTienda[])
  return (
    <>
      <h1 className="titulo">Oportunidades</h1>
      <p className="subtitulo">Clientes a los que conviene escribir esta semana. El mensaje ya va escrito con su dato real.</p>
      <h2 className="mb-3 text-lg font-bold">Ofrecer un plan mejor</h2>
      <div className="mb-8"><Lista items={tiendas.filter((t) => t.tipo === 'subir')} vacio="Nadie está cerca del límite de su plan por ahora." /></div>
      <h2 className="mb-3 text-lg font-bold">Recuperar antes de que se vayan</h2>
      <Lista items={tiendas.filter((t) => t.tipo === 'riesgo')} vacio="Ningún cliente en riesgo." />
    </>
  )
}
