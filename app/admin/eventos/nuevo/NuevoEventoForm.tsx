'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { crearEvento } from '../actions'
import type { Resultado } from '../../actions'
import AccesoCard from '@/components/AccesoCard'
import { ESTILOS, PLANES_EVENTO, PLAN_EVENTO_IDS, TIPOS_EVENTO, type TipoEvento } from '@/lib/eventos'
import { INVITACIONES_URL, bs, slugify } from '@/lib/utils'

export type InicialEvento = { crmId: string; cliente: string; correo: string; whatsapp: string }

export default function NuevoEventoForm({ inicial }: { inicial?: InicialEvento }) {
  const [res, accion, pend] = useActionState<Resultado, FormData>(crearEvento, null)
  const [tipo, setTipo] = useState<TipoEvento>('boda')
  const [nombres, setNombres] = useState('')
  const [slug, setSlug] = useState('')
  const [estilo, setEstilo] = useState<string>(TIPOS_EVENTO.boda.estilo)

  if (res?.ok) {
    return (
      <div className="max-w-xl">
        <h1 className="titulo">La invitación está lista</h1>
        <p className="subtitulo">Mándale el acceso al cliente. Desde su panel completa los datos y carga sus invitados.</p>
        <AccesoCard a={res} />
        <Link href={`/admin/eventos/${res.tiendaId}`} className="btn-borde mt-4">Ir a la ficha del evento</Link>
      </div>
    )
  }

  return (
    <form action={accion} className="max-w-2xl">
      <h1 className="titulo">Nueva invitación</h1>
      {inicial && <input type="hidden" name="crm_cliente_id" value={inicial.crmId} />}
      {inicial && <p className="mb-4 rounded-lg border border-acento bg-chip px-4 py-2.5 text-sm">Para tu cliente del CRM <b>{inicial.cliente}</b>. Al crearla quedará vinculada a su ficha.</p>}
      <p className="subtitulo">Datos del evento y del cliente. Al crearla se genera su acceso para mandarlo por WhatsApp.</p>
      <div className="caja grid gap-4 p-5 sm:grid-cols-2">
        <fieldset className="sm:col-span-2"><legend className="etiqueta">Tipo de evento</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(TIPOS_EVENTO) as TipoEvento[]).map((k) => (
              <label key={k} className="flex cursor-pointer items-center gap-2 rounded-lg border border-linea bg-sup2 p-3 has-[:checked]:border-acento">
                <input type="radio" name="tipo" value={k} checked={tipo === k} onChange={() => { setTipo(k); setEstilo(TIPOS_EVENTO[k].estilo) }} className="accent-acento" />
                <span>{TIPOS_EVENTO[k].e} {TIPOS_EVENTO[k].n}</span>
              </label>
            ))}
          </div></fieldset>
        <div className="sm:col-span-2"><label className="etiqueta" htmlFor="nombre">Nombre del evento (para tu lista)</label>
          <input id="nombre" name="nombre" className="campo" required placeholder={`${TIPOS_EVENTO[tipo].n} de ${TIPOS_EVENTO[tipo].textoNombres}`} /></div>
        <div><label className="etiqueta" htmlFor="nombres">{tipo === 'boda' ? 'Nombres de los novios' : 'Nombre en la portada'}</label>
          <input id="nombres" name="nombres" className="campo" value={nombres} onChange={(e) => setNombres(e.target.value)} placeholder={TIPOS_EVENTO[tipo].textoNombres} /></div>
        <div><label className="etiqueta" htmlFor="fecha">Fecha y hora</label><input id="fecha" name="fecha" type="datetime-local" className="campo" required /></div>
        <div className="sm:col-span-2"><label className="etiqueta" htmlFor="slug">Dirección de la invitación</label>
          <div className="flex items-center gap-2"><span className="whitespace-nowrap text-sm text-suave">{INVITACIONES_URL.replace(/^https?:\/\//, '')}/</span>
            <input id="slug" name="slug" className="campo" value={slug} onChange={(e) => setSlug(slugify(e.target.value))} placeholder={slugify(nombres) || 'ana-y-luis'} /></div></div>
        <div><label className="etiqueta" htmlFor="cliente">Cliente (quien contrata)</label><input id="cliente" name="cliente" className="campo" defaultValue={inicial?.cliente ?? ''} /></div>
        <div><label className="etiqueta" htmlFor="whatsapp">WhatsApp del cliente</label><input id="whatsapp" name="whatsapp" className="campo" inputMode="tel" defaultValue={inicial?.whatsapp || '591'} /></div>
        <div className="sm:col-span-2"><label className="etiqueta" htmlFor="correo">Correo del cliente (será su usuario)</label>
          <input id="correo" name="correo" type="email" className="campo" required defaultValue={inicial?.correo ?? ''} /></div>
        <div><label className="etiqueta" htmlFor="ciudad">Ciudad</label><input id="ciudad" name="ciudad" className="campo" defaultValue="Santa Cruz" /></div>
        <div><label className="etiqueta" htmlFor="plan">Plan</label>
          <select id="plan" name="plan" className="campo" defaultValue="completa">
            {PLAN_EVENTO_IDS.map((p) => <option key={p} value={p}>{PLANES_EVENTO[p].nombre} · {bs(PLANES_EVENTO[p].precio)}</option>)}
          </select></div>
        <fieldset className="sm:col-span-2"><legend className="etiqueta">Estilo inicial (el cliente puede cambiarlo)</legend>
          <input type="hidden" name="estilo" value={estilo} />
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-7">
            {Object.entries(ESTILOS).map(([k, e]) => (
              <button type="button" key={k} onClick={() => setEstilo(k)} title={e.n}
                className={`flex h-12 items-center justify-center rounded-lg border-2 text-lg ${estilo === k ? 'border-acento' : 'border-linea'}`}
                style={{ background: e.fondo, color: e.acento, fontFamily: 'Georgia, serif' }}>Aa</button>
            ))}
          </div></fieldset>
      </div>
      {res && !res.ok && <p role="alert" className="mt-3 text-malo">{res.error}</p>}
      <button className="btn-primario mt-5" disabled={pend}>{pend ? 'Creando…' : 'Crear invitación'}</button>
    </form>
  )
}
