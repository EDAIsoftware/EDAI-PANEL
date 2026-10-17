import { requireAdmin } from '@/lib/auth'
import Demos, { type Demo } from './Demos'

export const dynamic = 'force-dynamic'

export default async function PaginaDemos() {
  const { supabase } = await requireAdmin()
  const { data } = await supabase.from('demos').select('*').order('creado_en', { ascending: false })
  return <Demos inicial={(data ?? []) as Demo[]} />
}
