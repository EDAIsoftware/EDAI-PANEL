'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const PALETAS = [
  { k: 'verde', n: 'Verde EDAI', fondo: '#0f1a17', lateral: '#132420', linea: '#2c4a40', acento: '#22c55e' },
  { k: 'negro', n: 'Negro', fondo: '#000000', lateral: '#0a0a0a', linea: '#333333', acento: '#ffffff' },
  { k: 'blanco', n: 'Blanco', fondo: '#f1f1ec', lateral: '#ffffff', linea: '#d8d8d2', acento: '#1b1b1b' },
  { k: 'rosado', n: 'Rosado', fondo: '#fff4f7', lateral: '#ffe9f0', linea: '#f6cfdc', acento: '#e0457b' },
]

export default function Apariencia({ tiendaId, nombre, logoInicial, paletaInicial }: {
  tiendaId: string; nombre: string; logoInicial: string | null; paletaInicial: string
}) {
  const router = useRouter()
  const supabase = createClient()
  const [paleta, setPaleta] = useState(paletaInicial)
  const [logo, setLogo] = useState<string | null>(logoInicial)
  const [subiendo, setSubiendo] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)

  async function guardar(nuevaPaleta: string, nuevoLogo: string | null) {
    setMsg(null)
    const { error } = await supabase.rpc('actualizar_apariencia', { p_logo_url: nuevoLogo, p_paleta: nuevaPaleta })
    if (error) return setMsg({ ok: false, t: 'No se pudo guardar. Intenta de nuevo.' })
    setMsg({ ok: true, t: 'Guardado.' })
    router.refresh()
  }

  async function subirLogo(file: File) {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return setMsg({ ok: false, t: 'Usa una imagen PNG, JPG o WEBP.' })
    if (file.size > 1.5 * 1024 * 1024) return setMsg({ ok: false, t: 'El logo debe pesar menos de 1,5 MB.' })
    setSubiendo(true)
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
    const ruta = `${tiendaId}/logo-${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from('productos').upload(ruta, file, { contentType: file.type, cacheControl: '31536000' })
    setSubiendo(false)
    if (error) return setMsg({ ok: false, t: 'No se pudo subir el logo.' })
    const url = supabase.storage.from('productos').getPublicUrl(ruta).data.publicUrl
    const anterior = logo?.split('/productos/')[1]
    setLogo(url)
    await guardar(paleta, url)
    if (anterior) await supabase.storage.from('productos').remove([anterior])
  }

  async function quitarLogo() {
    const anterior = logo?.split('/productos/')[1]
    setLogo(null)
    await guardar(paleta, null)
    if (anterior) await supabase.storage.from('productos').remove([anterior])
  }

  return (
    <>
      <h1 className="titulo">Apariencia</h1>
      <p className="subtitulo">Elige cómo se ve tu panel y sube tu logo</p>
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="caja p-5">
          <h2 className="font-bold">Colores del panel</h2>
          <p className="mb-4 mt-1 text-sm text-suave">El cambio se aplica al instante.</p>
          <div className="grid grid-cols-2 gap-3">
            {PALETAS.map((p) => (
              <button key={p.k} aria-pressed={paleta === p.k}
                onClick={() => { setPaleta(p.k); guardar(p.k, logo) }}
                className={`rounded-xl border-2 bg-sup2 p-2.5 text-left ${paleta === p.k ? 'border-acento' : 'border-linea'}`}>
                <div className="mb-2 grid h-16 grid-cols-[28%_1fr] overflow-hidden rounded-lg" style={{ background: p.fondo }}>
                  <i style={{ background: p.lateral }} />
                  <div className="flex flex-col gap-1.5 p-2">
                    <em className="block h-1.5 w-[70%] rounded" style={{ background: p.linea }} />
                    <em className="block h-1.5 w-[90%] rounded" style={{ background: p.linea }} />
                    <em className="block h-1.5 w-[40%] rounded" style={{ background: p.acento }} />
                  </div>
                </div>
                <b className="text-sm">{p.n}</b>
              </button>
            ))}
          </div>
        </section>

        <section className="caja p-5">
          <h2 className="font-bold">Logo</h2>
          <p className="mb-4 mt-1 text-sm text-suave">Se muestra en tu panel y en tu tienda. Un PNG con fondo transparente se ve mejor.</p>
          <div className="flex items-center gap-4 rounded-xl border-2 border-dashed border-linea p-5">
            <div className="grid h-20 w-20 flex-none place-items-center overflow-hidden rounded-2xl bg-chip text-2xl font-extrabold text-chiptinta">
              {logo ? <img src={logo} alt={`Logo de ${nombre}`} className="h-full w-full object-contain" /> : nombre.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="btn-primario cursor-pointer">{subiendo ? 'Subiendo…' : logo ? 'Cambiar logo' : 'Subir logo'}
                <input type="file" accept="image/png,image/jpeg,image/webp" hidden disabled={subiendo}
                  onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) subirLogo(f) }} /></label>
              {logo && <button className="btn-borde" onClick={quitarLogo}>Quitar</button>}
            </div>
          </div>
        </section>
      </div>
      {msg && <p role="status" className={`mt-4 text-sm ${msg.ok ? 'text-chiptinta' : 'text-malo'}`}>{msg.t}</p>}
    </>
  )
}
