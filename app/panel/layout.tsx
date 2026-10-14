import Lateral from '@/components/Lateral'
import { cargarTienda } from '@/lib/tienda'
import { fechaCorta } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user, tienda, plan } = await cargarTienda()

  // mi_tienda() devuelve null si la tienda está suspendida, así que no se puede leer
  if (!tienda) {
    return (
      <main className="grid min-h-screen place-items-center p-6 text-center">
        <div className="caja max-w-md p-8">
          <h1 className="text-2xl font-extrabold">Tu tienda está pausada</h1>
          <p className="mt-2 text-suave">Escríbele a EDAI para reactivarla. Tus productos y ventas siguen guardados.</p>
          <form action="/auth/salir" method="post"><button className="btn-borde mt-5">Cerrar sesión</button></form>
        </div>
      </main>
    )
  }

  return (
    <div className="md:flex">
      <Lateral marca={tienda.nombre} sub="Tienda por EDAI" logo={tienda.logo_url} usuario={user.email || ''}
        pie={`Plan ${plan.nombre} · vence el ${fechaCorta(tienda.vence_el)}`}
        items={[
          { href: '/panel', texto: 'Hoy', icono: '📅' },
          { href: '/panel/productos', texto: 'Productos', icono: '📦' },
          { href: '/panel/ventas', texto: 'Ventas', icono: '🧾' },
        ]} />
      <main className="w-full max-w-5xl p-5 md:p-10">{children}</main>
    </div>
  )
}
