'use client'

import { useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { urlInvitacion, waLink } from '@/lib/utils'
import Copiar from '@/components/Copiar'

type Inv = {
  id: string; nombre: string; pases: number; codigo: string | null; telefono: string | null; mesa: string | null
  estado: string; confirmados: number; mensaje: string | null; origen: string; respondido_en: string | null
}

const vacio = { nombre: '', pases: 2, telefono: '591', mesa: '' }

export default function Invitados({ eventoId, slug, nombreEvento, tipo, inicial, pases, maxInvitados }: {
  eventoId: string; slug: string; nombreEvento: string; tipo: string; inicial: Inv[]; pases: boolean; maxInvitados: number | null
}) {
  const supabase = createClient()
  const [lista, setLista] = useState<Inv[]>(inicial)
  const [f, setF] = useState(vacio)
  const [editando, setEditando] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState('Todos')
  const [err, setErr] = useState('')
  const [guardando, setGuardando] = useState(false)

  const deLista = lista.filter((i) => i.origen === 'lista')
  const lleno = maxInvitados !== null && deLista.length >= maxInvitados && !editando
  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase()
    return lista.filter((i) => (filtro === 'Todos' || i.estado === filtro) &&
      (!t || i.nombre.toLowerCase().includes(t) || (i.mesa ?? '').toLowerCase().includes(t) || (i.telefono ?? '').includes(t)))
  }, [lista, q, filtro])

  const total = (k: 'pases' | 'confirmados') => lista.reduce((a, i) => a + (k === 'pases' && i.origen !== 'lista' ? 0 : Number(i[k])), 0)

  function mensajeWa(i: Inv) {
    const quien = tipo === 'boda' ? 'nuestra boda' : tipo === 'xv' ? 'mis XV años' : nombreEvento
    return `Hola ${i.nombre} 💌\n\nCon mucho cariño te invitamos a ${quien}.\nTu invitación personal (${i.pases} ${i.pases === 1 ? 'pase' : 'pases'}):\n${urlInvitacion(slug, i.codigo)}\n\nPor favor confirma tu asistencia desde el enlace. ¡Te esperamos!`
  }

  async function guardar() {
    setErr('')
    if (!f.nombre.trim()) return setErr('Escribe el nombre del invitado o familia.')
    const datos = { nombre: f.nombre.trim(), pases: Math.max(1, Math.min(50, Number(f.pases) || 1)),
      telefono: f.telefono.replace(/\D/g, '').length > 3 ? f.telefono.replace(/\D/g, '') : null, mesa: f.mesa.trim() || null }
    setGuardando(true)
    if (editando) {
      const { data, error } = await supabase.from('invitados').update(datos).eq('id', editando).select().single()
      setGuardando(false)
      if (error || !data) return setErr('No se pudo guardar.')
      setLista((l) => l.map((x) => (x.id === editando ? (data as Inv) : x)))
    } else {
      const { data, error } = await supabase.from('invitados').insert({ ...datos, evento_id: eventoId, origen: 'lista' }).select().single()
      setGuardando(false)
      if (error || !data) return setErr(error?.message.includes('límite') ? error.message : 'No se pudo agregar.')
      setLista((l) => [data as Inv, ...l])
    }
    setF(vacio); setEditando(null)
  }

  async function borrar(i: Inv) {
    if (!confirm(`¿Quitar a ${i.nombre} de la lista?`)) return
    const { error } = await supabase.from('invitados').delete().eq('id', i.id)
    if (!error) setLista((l) => l.filter((x) => x.id !== i.id))
  }

  function descargar() {
    const filas = [['Nombre', 'Pases', 'Confirmados', 'Estado', 'Mesa', 'Teléfono', 'Mensaje', 'Enlace']]
      .concat(lista.map((i) => [i.nombre, String(i.origen === 'lista' ? i.pases : ''), String(i.confirmados), i.estado, i.mesa ?? '', i.telefono ?? '', i.mensaje ?? '', i.codigo ? urlInvitacion(slug, i.codigo) : '']))
    const csv = '\uFEFF' + filas.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(';')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `invitados-${slug}.csv`; a.click()
  }

  const chip = (e: string) => (e === 'Confirmado' ? 'chip' : e === 'No asiste' ? 'chip-malo' : 'chip-aviso')

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h1 className="titulo">{pases ? 'Invitados' : 'Confirmaciones'}</h1>
          <p className="subtitulo">{total('confirmados')} personas confirmadas{pases ? ` de ${total('pases')} pases · ${deLista.length}${maxInvitados ? ` de ${maxInvitados}` : ''} familias` : ''}</p></div>
        {lista.length > 0 && <button className="btn-borde" onClick={descargar}>Descargar lista (Excel)</button>}
      </div>

      {pases ? (
        <div className="caja mb-5 p-4">
          <h2 className="mb-3 font-bold">{editando ? 'Editar invitado' : 'Agregar invitado o familia'}</h2>
          {lleno ? <p className="text-sm text-aviso">Llegaste al límite de invitados de tu plan.</p> : (
            <div className="grid gap-3 sm:grid-cols-[2fr_90px_1fr_1fr_auto]">
              <input className="campo" placeholder="Ej: Familia Pérez" value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} aria-label="Nombre" />
              <input className="campo" type="number" min={1} max={50} value={f.pases} onChange={(e) => setF({ ...f, pases: Number(e.target.value) })} aria-label="Pases" title="Pases" />
              <input className="campo" inputMode="tel" placeholder="WhatsApp" value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} aria-label="WhatsApp" />
              <input className="campo" placeholder="Mesa (opcional)" value={f.mesa} onChange={(e) => setF({ ...f, mesa: e.target.value })} aria-label="Mesa" />
              <div className="flex gap-2">
                <button className="btn-primario" disabled={guardando} onClick={guardar}>{editando ? 'Guardar' : 'Agregar'}</button>
                {editando && <button className="btn-borde" onClick={() => { setEditando(null); setF(vacio) }}>Cancelar</button>}
              </div>
            </div>
          )}
          <p className="mt-2 text-xs text-suave">Cada familia recibe su propio enlace con sus pases. Así nadie puede confirmar más personas de las invitadas.</p>
          {err && <p role="alert" className="mt-2 text-sm text-malo">{err}</p>}
        </div>
      ) : (
        <div className="caja mb-5 p-4 text-sm text-suave">
          Comparte tu invitación general y aquí verás quién confirma. Con el plan <b className="text-tinta">Completa</b> puedes tener la lista de invitados con pases personales por familia.
          <div className="mt-3 flex flex-wrap items-center gap-2"><code className="break-all text-tinta">{urlInvitacion(slug)}</code><Copiar texto={urlInvitacion(slug)} /></div>
        </div>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        <input className="campo min-w-[200px] flex-1" placeholder="Buscar por nombre, mesa o teléfono" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
        <select className="campo w-auto" value={filtro} onChange={(e) => setFiltro(e.target.value)} aria-label="Filtrar">
          {['Todos', 'Pendiente', 'Confirmado', 'No asiste'].map((x) => <option key={x}>{x}</option>)}
        </select>
      </div>

      <div className="caja">
        {visibles.length === 0 && <p className="p-5 text-suave">{lista.length ? 'Nadie coincide con la búsqueda.' : pases ? 'Agrega tu primer invitado arriba.' : 'Todavía nadie confirmó.'}</p>}
        {visibles.map((i) => (
          <div key={i.id} className="flex flex-wrap items-center gap-3 border-t border-linea px-4 py-3 first:border-t-0">
            <div className="min-w-0 flex-1">
              <b>{i.nombre}</b>{i.origen === 'publico' && <small className="ml-2 text-suave">confirmó desde el enlace general</small>}
              <small className="block text-suave">
                {[i.origen === 'lista' ? `${i.pases} ${i.pases === 1 ? 'pase' : 'pases'}` : null,
                  i.estado === 'Confirmado' ? `asistirán ${i.confirmados}` : null, i.mesa ? `mesa ${i.mesa}` : null].filter(Boolean).join(' · ')}
              </small>
              {i.mensaje && <small className="block italic text-suave">“{i.mensaje}”</small>}
            </div>
            <span className={chip(i.estado)}>{i.estado}</span>
            {i.codigo && <>
              {i.telefono
                ? <a className="btn-wa btn-sm" href={waLink(i.telefono, mensajeWa(i))} target="_blank" rel="noopener noreferrer">Enviar</a>
                : <Copiar texto={mensajeWa(i)} etiqueta="Copiar invitación" />}
              <button className="btn-borde btn-sm" onClick={() => { setEditando(i.id); setF({ nombre: i.nombre, pases: i.pases, telefono: i.telefono ?? '591', mesa: i.mesa ?? '' }); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Editar</button>
            </>}
            <button className="btn-borde btn-sm text-malo" onClick={() => borrar(i)} aria-label={`Quitar a ${i.nombre}`}>Quitar</button>
          </div>
        ))}
      </div>
    </>
  )
}
