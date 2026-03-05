"use server"

import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { stores, tailors } from '@/lib/schema'

export async function getActiveStores() {
  return db
    .select({ id: stores.id, name: stores.name })
    .from(stores)
    .where(eq(stores.isActive, true))
    .all()
}

export async function getActiveTailors() {
  return db
    .select({ id: tailors.id, name: tailors.name })
    .from(tailors)
    .where(eq(tailors.isActive, true))
    .all()
}
