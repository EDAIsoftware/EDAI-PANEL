'use client'

import { useEffect } from 'react'

export default function Modal({ titulo, onCerrar, children, ancho = 'max-w-lg' }: {
  titulo: string; onCerrar: () => void; children: React.ReactNode; ancho?: string
}) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') onCerrar() }
    window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f)
  }, [onCerrar])
  return (
    <div className="fixed inset-0 z-40 grid place-items-center overflow-y-auto bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={titulo}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onCerrar() }}>
      <div className={`caja w-full ${ancho} p-6`}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{titulo}</h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="grid h-8 w-8 place-items-center rounded-lg border border-linea text-suave">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Campo({ etq, children, full }: { etq: string; children: React.ReactNode; full?: boolean }) {
  return <label className={`block ${full ? 'sm:col-span-2' : ''}`}><span className="etiqueta">{etq}</span>{children}</label>
}
