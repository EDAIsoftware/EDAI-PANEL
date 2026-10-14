import Lateral from '@/components/Lateral'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin()
  return (
    <div className="md:flex">
      <Lateral marca="EDAI" sub="Panel maestro" usuario={user.email || ''} pie="Administrador"
        items={[
          { href: '/admin', texto: 'Tiendas', icono: '🏪' },
          { href: '/admin/nueva', texto: 'Nueva tienda', icono: '＋' },
        ]} />
      <main className="w-full max-w-6xl p-5 md:p-10">{children}</main>
    </div>
  )
}
