import Boveda from '../Boveda'
import { requireAdmin } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function CuentasEdai() {
  await requireAdmin()
  return <Boveda seccion="edai" sugeridas={[]} />
}
