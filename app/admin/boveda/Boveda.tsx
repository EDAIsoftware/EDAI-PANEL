'use client'

/*
  Bóveda de contraseñas (solo para el administrador).
  - La contraseña maestra NUNCA se envía ni se guarda: con ella el navegador deriva una llave
    (PBKDF2-SHA256, 600.000 vueltas) y cifra cada elemento con AES-256-GCM.
  - Supabase solo recibe texto cifrado. Si olvidas la contraseña maestra, nadie puede recuperar los datos.
  - Se bloquea sola tras 5 minutos sin actividad y al cerrar la pestaña.
*/

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Tipo = 'cliente' | 'edai'
type Item = { tipo: Tipo; carpeta: string; titulo: string; usuario: string; clave: string; url: string; notas: string }
type Fila = { id: string; item: Item }
type Config = { sal: string; iteraciones: number; prueba_iv: string; prueba: string }

const ITERACIONES = 600_000
const PRUEBA = 'edai-boveda-ok'
const BLOQUEO_MS = 5 * 60 * 1000
const vacio: Item = { tipo: 'cliente', carpeta: '', titulo: '', usuario: '', clave: '', url: '', notas: '' }
// Los elementos viejos sin tipo: si están en la carpeta EDAI son cuentas de EDAI
const normalizar = (x: Partial<Item>): Item => {
  const it = { ...vacio, ...x }
  return { ...it, tipo: x.tipo === 'edai' || x.tipo === 'cliente' ? x.tipo : it.carpeta.trim().toUpperCase() === 'EDAI' ? 'edai' : 'cliente' }
}
const GRUPOS_EDAI = ['Correo', 'Dominio y hosting', 'Desarrollo', 'Redes sociales', 'Herramientas', 'Bancos y pagos']

// ---------- utilidades de cifrado (Web Crypto, sin librerías externas) ----------
const enc = new TextEncoder()
const dec = new TextDecoder()
const aBuffer = (u: Uint8Array): ArrayBuffer => u.buffer.slice(u.byteOffset, u.byteOffset + u.byteLength) as ArrayBuffer
const aB64 = (b: ArrayBuffer | Uint8Array) => {
  const u = b instanceof Uint8Array ? b : new Uint8Array(b)
  let s = ''
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i])
  return btoa(s)
}
const deB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
const azar = (n: number) => crypto.getRandomValues(new Uint8Array(n))

async function derivarLlave(clave: string, sal: Uint8Array, iteraciones: number) {
  const base = await crypto.subtle.importKey('raw', aBuffer(enc.encode(clave)), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: aBuffer(sal), iterations: iteraciones, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}
async function cifrar(llave: CryptoKey, texto: string) {
  const iv = azar(12)
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: aBuffer(iv) }, llave, aBuffer(enc.encode(texto)))
  return { iv: aB64(iv), datos: aB64(ct) }
}
async function descifrar(llave: CryptoKey, iv: string, datos: string) {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: aBuffer(deB64(iv)) }, llave, aBuffer(deB64(datos)))
  return dec.decode(pt)
}
function generarClave(largo = 18) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*?-_'
  const r = azar(largo)
  return Array.from(r, (n) => chars[n % chars.length]).join('')
}
function fuerza(c: string) {
  let p = 0
  if (c.length >= 12) p++
  if (c.length >= 16) p++
  if (/[a-z]/.test(c) && /[A-Z]/.test(c)) p++
  if (/\d/.test(c)) p++
  if (/[^A-Za-z0-9]/.test(c)) p++
  return p <= 2 ? { t: 'Débil', c: 'text-malo' } : p <= 3 ? { t: 'Aceptable', c: 'text-aviso' } : { t: 'Fuerte', c: 'text-chiptinta' }
}
// CSV simple con comillas: carpeta,titulo,usuario,clave,url,notas
function leerCsv(texto: string): string[][] {
  const filas: string[][] = []; let fila: string[] = []; let campo = ''; let q = false
  for (let i = 0; i < texto.length; i++) {
    const ch = texto[i]
    if (q) { if (ch === '"' && texto[i + 1] === '"') { campo += '"'; i++ } else if (ch === '"') q = false; else campo += ch }
    else if (ch === '"') q = true
    else if (ch === ',' || ch === ';') { fila.push(campo); campo = '' }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && texto[i + 1] === '\n') i++; fila.push(campo); campo = ''; if (fila.some((x) => x.trim())) filas.push(fila); fila = [] }
    else campo += ch
  }
  fila.push(campo); if (fila.some((x) => x.trim())) filas.push(fila)
  return filas
}

// La llave queda en memoria mientras navegas entre "Claves de clientes" y "Cuentas de EDAI"
// (nunca se guarda en el disco; al recargar la página o tras 5 minutos sin uso se pierde).
let sesion: { llave: CryptoKey; config: Config } | null = null

type ClienteCrm = { id: string; nombre: string; empresa: string | null }

export default function Boveda({ sugeridas, seccion, carpetaInicial, crm = [] }: {
  sugeridas: string[]; seccion: Tipo; carpetaInicial?: string; crm?: ClienteCrm[]
}) {
  const supabase = useMemo(() => createClient(), [])
  const [estado, setEstado] = useState<'cargando' | 'crear' | 'bloqueada' | 'abierta'>('cargando')
  const [config, setConfig] = useState<Config | null>(null)
  const [llave, setLlave] = useState<CryptoKey | null>(null)
  const [filas, setFilas] = useState<Fila[]>([])
  const [m1, setM1] = useState('')
  const [m2, setM2] = useState('')
  const [err, setErr] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [q, setQ] = useState('')
  const [carpeta, setCarpeta] = useState(carpetaInicial || 'Todas')
  const [form, setForm] = useState<(Item & { id?: string }) | null>(null)
  const [visible, setVisible] = useState<string | null>(null)
  const [aviso, setAviso] = useState('')
  const [cambiando, setCambiando] = useState(false)
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)

  const avisar = (t: string) => { setAviso(t); setTimeout(() => setAviso(''), 2500) }

  const bloquear = useCallback(() => {
    sesion = null
    setLlave(null); setFilas([]); setForm(null); setVisible(null); setM1(''); setM2('')
    setEstado((e) => (e === 'abierta' ? 'bloqueada' : e))
  }, [])

  // Cargar configuración
  useEffect(() => {
    (async () => {
      if (sesion) {
        const s0 = sesion
        try { await cargarItems(s0.llave); setConfig(s0.config); setLlave(s0.llave); setEstado('abierta'); return } catch { sesion = null }
      }
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase.from('boveda_config').select('*').eq('user_id', user?.id ?? '').maybeSingle()
      if (data) { setConfig(data as Config); setEstado('bloqueada') } else setEstado('crear')
    })()
  }, [supabase])

  // Bloqueo automático por inactividad
  useEffect(() => {
    if (estado !== 'abierta') return
    const reiniciar = () => { if (temporizador.current) clearTimeout(temporizador.current); temporizador.current = setTimeout(bloquear, BLOQUEO_MS) }
    const eventos = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart']
    eventos.forEach((ev) => window.addEventListener(ev, reiniciar, { passive: true }))
    reiniciar()
    return () => { eventos.forEach((ev) => window.removeEventListener(ev, reiniciar)); if (temporizador.current) clearTimeout(temporizador.current) }
  }, [estado, bloquear])

  async function cargarItems(k: CryptoKey) {
    const { data, error } = await supabase.from('boveda').select('id, iv, datos').order('creado_en')
    if (error) throw error
    const res: Fila[] = []
    for (const r of data ?? []) {
      try { res.push({ id: r.id, item: normalizar(JSON.parse(await descifrar(k, r.iv, r.datos))) }) } catch { /* elemento dañado: se omite */ }
    }
    setFilas(res)
  }

  async function crearBoveda() {
    setErr('')
    if (m1.length < 12) return setErr('Usa al menos 12 caracteres. Una frase de varias palabras es ideal.')
    if (m1 !== m2) return setErr('Las contraseñas no coinciden.')
    setOcupado(true)
    try {
      const sal = azar(16)
      const k = await derivarLlave(m1, sal, ITERACIONES)
      const p = await cifrar(k, PRUEBA)
      const { data: { user } } = await supabase.auth.getUser()
      const cfg: Config = { sal: aB64(sal), iteraciones: ITERACIONES, prueba_iv: p.iv, prueba: p.datos }
      const { error } = await supabase.from('boveda_config').insert({ user_id: user!.id, ...cfg })
      if (error) throw error
      sesion = { llave: k, config: cfg }
      setConfig(cfg); setLlave(k); setFilas([]); setEstado('abierta'); setM1(''); setM2('')
    } catch { setErr('No se pudo crear la bóveda. ¿Ejecutaste la migración 005?') }
    setOcupado(false)
  }

  async function abrir() {
    if (!config) return
    setErr(''); setOcupado(true)
    try {
      const k = await derivarLlave(m1, deB64(config.sal), config.iteraciones)
      const ok = (await descifrar(k, config.prueba_iv, config.prueba)) === PRUEBA
      if (!ok) throw new Error()
      await cargarItems(k)
      sesion = { llave: k, config }
      setLlave(k); setEstado('abierta'); setM1('')
    } catch { setErr('Contraseña maestra incorrecta.') }
    setOcupado(false)
  }

  async function guardar() {
    if (!llave || !form) return
    if (!form.titulo.trim()) return avisar('Ponle un título (ej: Namecheap, Gmail de la tienda).')
    const { id, ...item } = form
    const limpio: Item = { ...item, carpeta: item.carpeta.trim() || (item.tipo === 'edai' ? 'General' : 'Sin cliente'), titulo: item.titulo.trim() }
    const c = await cifrar(llave, JSON.stringify(limpio))
    if (id) {
      const { error } = await supabase.from('boveda').update({ ...c, actualizado_en: new Date().toISOString() }).eq('id', id)
      if (error) return avisar('No se pudo guardar.')
      setFilas((f) => f.map((x) => (x.id === id ? { id, item: limpio } : x)))
    } else {
      const { data, error } = await supabase.from('boveda').insert(c).select('id').single()
      if (error || !data) return avisar('No se pudo guardar.')
      setFilas((f) => [...f, { id: data.id, item: limpio }])
    }
    setForm(null); setCarpeta(limpio.carpeta); setQ(''); avisar('Guardado y cifrado.')
  }

  async function eliminar(f: Fila) {
    if (!confirm(`¿Eliminar "${f.item.titulo}" de ${f.item.carpeta}? No se puede deshacer.`)) return
    const { error } = await supabase.from('boveda').delete().eq('id', f.id)
    if (!error) setFilas((x) => x.filter((y) => y.id !== f.id))
  }

  async function copiar(texto: string, que: string) {
    try {
      await navigator.clipboard.writeText(texto)
      avisar(`${que} copiado. Se borrará del portapapeles en 30 segundos.`)
      setTimeout(() => { navigator.clipboard.writeText('').catch(() => {}) }, 30000)
    } catch { avisar('No se pudo copiar.') }
  }

  async function importar(file: File) {
    if (!llave) return
    const filasCsv = leerCsv(await file.text())
    if (!filasCsv.length) return avisar('El archivo está vacío.')
    const cab = filasCsv[0].map((h) => h.trim().toLowerCase())
    const idx = (n: string) => cab.indexOf(n)
    if (idx('titulo') < 0 || idx('clave') < 0) return avisar('El archivo debe tener columnas: carpeta, titulo, usuario, clave, url, notas.')
    const nuevos: Item[] = filasCsv.slice(1).map((r) => normalizar({
      tipo: (idx('tipo') >= 0 ? r[idx('tipo')]?.trim().toLowerCase() : undefined) as Tipo | undefined,
      carpeta: r[idx('carpeta')]?.trim() || 'General', titulo: r[idx('titulo')]?.trim() || 'Sin título',
      usuario: r[idx('usuario')] ?? '', clave: r[idx('clave')] ?? '', url: r[idx('url')] ?? '', notas: r[idx('notas')] ?? '',
    }))
    const otros = nuevos.filter((it) => it.tipo !== seccion).length
    const aqui = nuevos.filter((it) => it.tipo === seccion)
    if (!aqui.length) return avisar(`El archivo no tiene filas de esta sección. Impórtalo desde ${seccion === 'cliente' ? 'Cuentas de EDAI' : 'Claves de clientes'}.`)
    nuevos.length = 0; nuevos.push(...aqui)
    const cifrados = await Promise.all(nuevos.map((it) => cifrar(llave, JSON.stringify(it))))
    const { data, error } = await supabase.from('boveda').insert(cifrados).select('id')
    if (error || !data) return avisar('No se pudo importar.')
    setFilas((f) => [...f, ...data.map((d: { id: string }, i: number) => ({ id: d.id, item: nuevos[i] }))])
    avisar(`${nuevos.length} claves importadas aquí.${otros ? ` Las otras ${otros} impórtalas desde ${seccion === 'cliente' ? 'Cuentas de EDAI' : 'Claves de clientes'}.` : ' Ahora borra el archivo CSV de tu computadora.'}`)
  }

  async function exportarRespaldo() {
    const { data } = await supabase.from('boveda').select('iv, datos, creado_en')
    const respaldo = { tipo: 'respaldo-boveda-edai', version: 1, fecha: new Date().toISOString(), config, items: data ?? [] }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(respaldo)], { type: 'application/json' }))
    a.download = `boveda-edai-respaldo-cifrado-${new Date().toISOString().slice(0, 10)}.json`; a.click()
    avisar('Respaldo descargado. Está cifrado: solo se abre con tu contraseña maestra.')
  }

  async function cambiarMaestra() {
    setErr('')
    if (m1.length < 12) return setErr('La nueva contraseña necesita al menos 12 caracteres.')
    if (m1 !== m2) return setErr('Las contraseñas no coinciden.')
    setOcupado(true)
    try {
      const sal = azar(16)
      const k = await derivarLlave(m1, sal, ITERACIONES)
      const p = await cifrar(k, PRUEBA)
      const items = await Promise.all(filas.map(async (f) => ({ id: f.id, ...(await cifrar(k, JSON.stringify(f.item))) })))
      const cfg: Config = { sal: aB64(sal), iteraciones: ITERACIONES, prueba_iv: p.iv, prueba: p.datos }
      const { error } = await supabase.rpc('boveda_cambiar_clave', { p_config: cfg, p_items: items })
      if (error) throw error
      sesion = { llave: k, config: cfg }
      setConfig(cfg); setLlave(k); setCambiando(false); setM1(''); setM2(''); avisar('Contraseña maestra cambiada.')
    } catch { setErr('No se pudo cambiar. Tu contraseña anterior sigue funcionando.') }
    setOcupado(false)
  }

  const deSeccion = useMemo(() => filas.filter((f) => f.item.tipo === seccion), [filas, seccion])
  const carpetas = useMemo(() => Array.from(new Set(deSeccion.map((f) => f.item.carpeta))).sort(), [deSeccion])
  const nClientes = useMemo(() => new Set(filas.filter((f) => f.item.tipo === 'cliente').map((f) => f.item.carpeta)).size, [filas])
  const nCuentasClientes = filas.filter((f) => f.item.tipo === 'cliente').length
  const nEdai = filas.filter((f) => f.item.tipo === 'edai').length
  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase()
    return deSeccion.filter((f) => (carpeta === 'Todas' || f.item.carpeta === carpeta) &&
      (!t || [f.item.titulo, f.item.usuario, f.item.url, f.item.notas, f.item.carpeta].some((v) => v.toLowerCase().includes(t))))
      .sort((a, b) => a.item.carpeta.localeCompare(b.item.carpeta) || a.item.titulo.localeCompare(b.item.titulo))
  }, [deSeccion, q, carpeta])

  // ---------- Pantallas de acceso ----------
  if (estado === 'cargando') return <p className="text-suave">Cargando bóveda…</p>

  if (estado === 'crear' || estado === 'bloqueada' || (estado === 'abierta' && cambiando)) {
    const creando = estado === 'crear'
    const f = fuerza(m1)
    return (
      <div className="max-w-md">
        <h1 className="titulo">{creando ? 'Crea tu bóveda' : cambiando ? 'Cambiar contraseña maestra' : `${seccion === 'cliente' ? 'Claves de clientes' : 'Cuentas de EDAI'} · bloqueado`}</h1>
        <p className="subtitulo">{creando
          ? 'Tus contraseñas se cifran en este navegador con una contraseña maestra que solo tú conoces. Ni la base de datos ni EDAI pueden leerlas.'
          : cambiando ? 'Todo se volverá a cifrar con la nueva contraseña.' : 'Escribe tu contraseña maestra. Es la misma para claves de clientes y cuentas de EDAI.'}</p>
        <form className="caja p-5" onSubmit={(e) => { e.preventDefault(); if (creando) crearBoveda(); else if (cambiando) cambiarMaestra(); else abrir() }}>
          <label className="etiqueta" htmlFor="m1">{creando || cambiando ? 'Nueva contraseña maestra' : 'Contraseña maestra'}</label>
          <input id="m1" type="password" className="campo" autoFocus autoComplete={creando || cambiando ? 'new-password' : 'current-password'} value={m1} onChange={(e) => setM1(e.target.value)} />
          {(creando || cambiando) && <>
            {m1 && <p className={`mt-1 text-xs ${f.c}`}>Seguridad: {f.t}</p>}
            <label className="etiqueta mt-4" htmlFor="m2">Repítela</label>
            <input id="m2" type="password" className="campo" autoComplete="new-password" value={m2} onChange={(e) => setM2(e.target.value)} />
            <div className="mt-4 rounded-lg border border-aviso/40 bg-avisofondo p-3 text-sm text-aviso">
              <b>Importante:</b> si olvidas esta contraseña, tus claves se pierden para siempre. Nadie puede recuperarla. Anótala en papel y guárdala en un lugar seguro.
            </div>
          </>}
          {err && <p role="alert" className="mt-3 text-sm text-malo">{err}</p>}
          <div className="mt-5 flex gap-2">
            <button className="btn-primario flex-1" disabled={ocupado}>{ocupado ? 'Un momento…' : creando ? 'Crear bóveda' : cambiando ? 'Cambiar' : 'Abrir'}</button>
            {cambiando && <button type="button" className="btn-borde" onClick={() => { setCambiando(false); setM1(''); setM2(''); setErr('') }}>Cancelar</button>}
          </div>
        </form>
      </div>
    )
  }

  // ---------- Bóveda abierta ----------
  const enCarpeta = carpeta !== 'Todas'
  const buscando = q.trim() !== ''
  const deCarpeta = (c: string) => deSeccion.filter((f) => f.item.carpeta === c)
  const fichaCrm = (c: string) => crm.find((x) => [x.nombre, x.empresa].some((n) => n && n.trim().toLowerCase() === c.trim().toLowerCase()))

  async function renombrarCarpeta() {
    if (!llave) return
    const nuevo = prompt(`Nuevo nombre para "${carpeta}"`, carpeta)?.trim()
    if (!nuevo || nuevo === carpeta) return
    const items = deCarpeta(carpeta)
    for (const f of items) {
      const c = await cifrar(llave, JSON.stringify({ ...f.item, carpeta: nuevo }))
      await supabase.from('boveda').update({ ...c, actualizado_en: new Date().toISOString() }).eq('id', f.id)
    }
    setFilas((l) => l.map((f) => (f.item.tipo === seccion && f.item.carpeta === carpeta ? { ...f, item: { ...f.item, carpeta: nuevo } } : f)))
    setCarpeta(nuevo); avisar('Carpeta renombrada.')
  }

  const Fila = ({ f }: { f: Fila }) => (
    <div className="flex flex-wrap items-center gap-3 border-t border-linea px-4 py-3 first:border-t-0">
      <div className="grid h-10 w-10 flex-none place-items-center rounded-lg bg-chip text-sm font-bold text-chiptinta">{f.item.titulo.slice(0, 2).toUpperCase()}</div>
      <div className="min-w-0 flex-1">
        <b className="block">{f.item.titulo}{!enCarpeta && <small className="font-normal text-suave"> · {f.item.carpeta}</small>}</b>
        <small className="block truncate text-suave">{f.item.usuario || 'sin usuario'}{f.item.url ? ` · ${f.item.url}` : ''}</small>
        {visible === f.id && <code className="mt-1 block break-all rounded bg-sup2 px-2 py-1 text-sm">{f.item.clave || '(sin contraseña)'}</code>}
        {visible === f.id && f.item.notas && <p className="mt-1 whitespace-pre-line text-sm text-suave">{f.item.notas}</p>}
      </div>
      {f.item.usuario && <button className="btn-borde btn-sm" onClick={() => copiar(f.item.usuario, 'Usuario')}>Usuario</button>}
      {f.item.clave && <button className="btn-borde btn-sm" onClick={() => copiar(f.item.clave, 'Contraseña')}>Clave</button>}
      <button className="btn-borde btn-sm" onClick={() => { setVisible(visible === f.id ? null : f.id); if (visible !== f.id) setTimeout(() => setVisible((v) => (v === f.id ? null : v)), 15000) }}>{visible === f.id ? 'Ocultar' : 'Ver'}</button>
      {f.item.url && <a className="btn-borde btn-sm" href={/^https?:\/\//.test(f.item.url) ? f.item.url : `https://${f.item.url}`} target="_blank" rel="noopener noreferrer">Abrir</a>}
      <button className="btn-borde btn-sm" onClick={() => setForm({ ...f.item, id: f.id })}>Editar</button>
      <button className="btn-borde btn-sm text-malo" onClick={() => eliminar(f)}>Eliminar</button>
    </div>
  )

  return (
    <>
      {enCarpeta ? (
        <>
          <button className="text-sm text-suave underline" onClick={() => { setCarpeta('Todas'); setQ('') }}>← {seccion === 'cliente' ? 'Todos los clientes' : 'Todos los grupos'}</button>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-chip text-lg font-extrabold text-chiptinta">📁</div>
              <div><h1 className="titulo">{carpeta}</h1>
                <p className="text-suave">{deCarpeta(carpeta).length} {deCarpeta(carpeta).length === 1 ? 'cuenta' : 'cuentas'}
                  {(() => { const c = fichaCrm(carpeta); return c ? <> · <a className="underline" href={`/admin/crm/clientes/${c.id}`}>ver ficha en el CRM</a></> : null })()}</p></div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-primario" onClick={() => setForm({ ...vacio, tipo: seccion, carpeta })}>Agregar cuenta</button>
              <button className="btn-borde" onClick={renombrarCarpeta}>Renombrar</button>
              <button className="btn-borde" onClick={bloquear}>Bloquear</button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h1 className="titulo">{seccion === 'cliente' ? 'Claves de clientes' : 'Cuentas de EDAI'}</h1>
            <p className="subtitulo">{seccion === 'cliente'
              ? `${nClientes} ${nClientes === 1 ? 'cliente' : 'clientes'} · ${nCuentasClientes} ${nCuentasClientes === 1 ? 'cuenta' : 'cuentas'}`
              : `${carpetas.length} ${carpetas.length === 1 ? 'grupo' : 'grupos'} · ${nEdai} ${nEdai === 1 ? 'cuenta' : 'cuentas'}`} · cifradas · se bloquea tras 5 minutos sin uso</p></div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-primario" onClick={() => setForm({ ...vacio, tipo: seccion, carpeta: seccion === 'edai' ? GRUPOS_EDAI[0] : '' })}>{seccion === 'cliente' ? 'Nuevo cliente' : 'Nueva cuenta'}</button>
            <button className="btn-borde" onClick={bloquear}>Bloquear</button>
          </div>
        </div>
      )}

      <div className="my-4 flex flex-wrap gap-2">
        <input className="campo min-w-[220px] flex-1" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar"
          placeholder={enCarpeta ? `Buscar en ${carpeta}` : seccion === 'cliente' ? 'Buscar en todos los clientes: título, usuario, web o notas' : 'Buscar en todas las cuentas de EDAI'} />
      </div>

      {!enCarpeta && !buscando ? (
        carpetas.length === 0 ? (
          <div className="caja p-6 text-suave">{seccion === 'cliente' ? 'Todavía no tienes claves de clientes. Toca "Nuevo cliente" para crear su carpeta.' : 'Todavía no tienes cuentas de EDAI guardadas.'}</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {carpetas.map((c) => {
              const items = deCarpeta(c)
              return (
                <button key={c} onClick={() => { setCarpeta(c); setQ('') }} className="caja p-4 text-left transition hover:border-acento">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 flex-none place-items-center rounded-xl bg-chip text-lg">📁</div>
                    <div className="min-w-0 flex-1"><b className="block truncate">{c}</b>
                      <small className="text-suave">{items.length} {items.length === 1 ? 'cuenta' : 'cuentas'}{fichaCrm(c) ? ' · en el CRM' : ''}</small></div>
                    <span className="text-suave" aria-hidden>›</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {items.slice(0, 4).map((f) => <span key={f.id} className="rounded-md border border-linea bg-sup2 px-2 py-0.5 text-xs">{f.item.titulo}</span>)}
                    {items.length > 4 && <span className="px-1 text-xs text-suave">+{items.length - 4}</span>}
                  </div>
                </button>
              )
            })}
          </div>
        )
      ) : (
        <div className="caja">
          {visibles.length === 0 && <p className="p-5 text-suave">{buscando ? 'Nada coincide con la búsqueda.' : `Esta carpeta está vacía. Toca "Agregar cuenta".`}</p>}
          {visibles.map((f) => <Fila key={f.id} f={f} />)}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2 border-t border-linea pt-5">
        <label className="btn-borde btn-sm cursor-pointer">Importar CSV
          <input type="file" accept=".csv,text/csv" hidden onChange={(e) => { const x = e.target.files?.[0]; e.target.value = ''; if (x) importar(x) }} /></label>
        <button className="btn-borde btn-sm" onClick={exportarRespaldo}>Descargar respaldo cifrado</button>
        <button className="btn-borde btn-sm" onClick={() => { setCambiando(true); setErr('') }}>Cambiar contraseña maestra</button>
      </div>

      {form && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true">
          <form className="caja w-full max-w-lg p-6" onSubmit={(e) => { e.preventDefault(); guardar() }}>
            <h2 className="mb-4 text-xl font-bold">{form.id ? 'Editar' : 'Nueva'} {seccion === 'cliente' ? 'clave de cliente' : 'cuenta de EDAI'}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="etiqueta" htmlFor="bc">{form.tipo === 'edai' ? 'Grupo (carpeta)' : 'Cliente (carpeta)'}</label>
                <input id="bc" list="carpetas" className="campo" value={form.carpeta} onChange={(e) => setForm({ ...form, carpeta: e.target.value })} placeholder={form.tipo === 'edai' ? 'Ej: Dominio y hosting' : 'Ej: Medalu'} />
                <datalist id="carpetas">{(form.tipo === 'edai'
                  ? Array.from(new Set([...GRUPOS_EDAI, ...filas.filter((f) => f.item.tipo === 'edai').map((f) => f.item.carpeta)]))
                  : Array.from(new Set([...filas.filter((f) => f.item.tipo === 'cliente').map((f) => f.item.carpeta), ...sugeridas.filter((x) => x !== 'EDAI')])).sort()
                ).map((c) => <option key={c} value={c} />)}</datalist></div>
              <div><label className="etiqueta" htmlFor="bt">Título</label>
                <input id="bt" className="campo" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ej: Namecheap" /></div>
              <div><label className="etiqueta" htmlFor="bu">Usuario o correo</label>
                <input id="bu" className="campo" autoComplete="off" value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} /></div>
              <div><label className="etiqueta" htmlFor="bp">Contraseña</label>
                <div className="flex gap-2"><input id="bp" className="campo font-mono" autoComplete="new-password" value={form.clave} onChange={(e) => setForm({ ...form, clave: e.target.value })} />
                  <button type="button" className="btn-borde btn-sm" title="Generar una contraseña segura" onClick={() => setForm({ ...form, clave: generarClave() })}>Generar</button></div>
                {form.clave && <p className={`mt-1 text-xs ${fuerza(form.clave).c}`}>{fuerza(form.clave).t}</p>}</div>
              <div className="sm:col-span-2"><label className="etiqueta" htmlFor="bw">Página web</label>
                <input id="bw" className="campo" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="Ej: namecheap.com" /></div>
              <div className="sm:col-span-2"><label className="etiqueta" htmlFor="bn">Notas</label>
                <textarea id="bn" className="campo min-h-[80px]" value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} placeholder="Dominio, fecha de compra, plan, recordatorios…" /></div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-borde" onClick={() => setForm(null)}>Cancelar</button>
              <button className="btn-primario">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {aviso && <div role="status" className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-tinta px-4 py-2.5 text-sm font-semibold text-fondo shadow-lg">{aviso}</div>}
    </>
  )
}
