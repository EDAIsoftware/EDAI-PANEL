import Boveda from '../Boveda'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function CuentasEdai({ searchParams }: { searchParams: Promise<{ carpeta?: string }> }) {
  await requireAdmin()
  const { carpeta } = await searchParams
  return <Boveda seccion="edai" sugeridas={[]} carpetaInicial={carpeta} />
}
