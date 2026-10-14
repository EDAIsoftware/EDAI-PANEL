'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Icono from './Icono'

export type ItemMenu = { href: string; texto: string; icono: string; contador?: number }

export default function MenuLateral({ items }: { items: ItemMenu[] }) {
  const ruta = usePathname() || ''
  // El ítem activo es el que tiene la ruta más larga que coincide
  const activo = items
    .filter((i) => ruta === i.href || ruta.startsWith(i.href + '/') || ruta.endsWith(i.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href
  return (
    <nav className="flex w-full gap-1 overflow-x-auto md:flex-col">
      {items.map((i) => {
        const on = i.href === activo
        return (
          <Link key={i.href} href={i.href} aria-current={on ? 'page' : undefined}
            className={`flex items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 transition ${on ? 'bg-sup2 font-bold text-tinta' : 'font-medium text-suave hover:text-tinta'}`}>
            <Icono n={i.icono} />{i.texto}
            {!!i.contador && <span className="ml-auto rounded-md bg-avisofondo px-1.5 text-xs font-bold text-aviso">{i.contador}</span>}
          </Link>
        )
      })}
    </nav>
  )
}
