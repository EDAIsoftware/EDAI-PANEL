'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'

function Formulario() {
  const router = useRouter()
  const params = useSearchParams()
  const [modo, setModo] = useState<'entrar' | 'olvide'>('entrar')
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(
    params.get('error') === 'enlace' ? { ok: false, t: 'El enlace venció o ya se usó. Pide uno nuevo.' } : null
  )
  const [cargando, setCargando] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setCargando(true); setMsg(null)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email: correo.trim(), password: clave })
    if (error || !data.user) {
      setCargando(false)
      setMsg({ ok: false, t: 'Correo o contraseña incorrectos.' })
      return
    }
    const { data: perfil } = await supabase.from('perfiles').select('rol, activo').eq('user_id', data.user.id).maybeSingle()
    if (!perfil || !perfil.activo) {
      await supabase.auth.signOut()
      setCargando(false)
      setMsg({ ok: false, t: 'Tu usuario no tiene acceso. Escríbele a EDAI.' })
      return
    }
    router.replace(perfil.rol === 'admin' ? '/admin' : '/panel')
    router.refresh()
  }

  async function recuperar(e: React.FormEvent) {
    e.preventDefault()
    setCargando(true); setMsg(null)
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(correo.trim(), {
      redirectTo: `${window.location.origin}/auth/confirm?next=/crear-clave`,
    })
    setCargando(false)
    // Mismo mensaje exista o no el correo, para no revelar quién tiene cuenta.
    setMsg({ ok: true, t: 'Si ese correo tiene una cuenta, te llegará un enlace en unos minutos.' })
  }

  return (
    <form onSubmit={modo === 'entrar' ? entrar : recuperar} className="caja w-full max-w-sm p-7">
      <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-acento font-extrabold text-sobreacento">ED</div>
      <h1 className="text-2xl font-extrabold">{modo === 'entrar' ? 'Entra a tu panel' : 'Recupera tu acceso'}</h1>
      <p className="mt-1 text-sm text-suave">
        {modo === 'entrar' ? 'Tiendas EDAI' : 'Te enviamos un enlace para crear una contraseña nueva.'}
      </p>

      <label className="etiqueta mt-5" htmlFor="correo">Correo</label>
      <input id="correo" type="email" autoComplete="username" required className="campo"
        value={correo} onChange={(e) => setCorreo(e.target.value)} />

      {modo === 'entrar' && (
        <>
          <label className="etiqueta mt-4" htmlFor="clave">Contraseña</label>
          <input id="clave" type="password" autoComplete="current-password" required className="campo"
            value={clave} onChange={(e) => setClave(e.target.value)} />
        </>
      )}

      <p role="alert" className={`mt-3 min-h-[1.25rem] text-sm ${msg?.ok ? 'text-chiptinta' : 'text-malo'}`}>{msg?.t}</p>

      <button className="btn-primario mt-2 w-full" disabled={cargando}>
        {cargando ? 'Un momento…' : modo === 'entrar' ? 'Entrar' : 'Enviar enlace'}
      </button>
      <button type="button" className="mt-4 text-sm text-suave underline"
        onClick={() => { setModo(modo === 'entrar' ? 'olvide' : 'entrar'); setMsg(null) }}>
        {modo === 'entrar' ? '¿Olvidaste tu contraseña?' : 'Volver'}
      </button>
    </form>
  )
}

export default function Login() {
  return (
    <main className="grid min-h-screen place-items-center p-5">
      <Suspense><Formulario /></Suspense>
    </main>
  )
}
