import { db } from '@/lib/db'
import { stores } from '@/lib/schema'
import { desc } from 'drizzle-orm'
import { StoresClient } from './_components/stores-client'

export default function StoresPage() {
  const storeList = db
    .select()
    .from(stores)
    .orderBy(desc(stores.createdAt))
    .all()

  return <StoresClient stores={storeList} />
}
