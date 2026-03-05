import { db } from '@/lib/db'
import { tailors } from '@/lib/schema'
import { TailorsClient } from './_components/tailors-client'

export default function TailorsPage() {
  const allTailors = db.select().from(tailors).all()
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))

  return <TailorsClient tailors={allTailors} />
}
