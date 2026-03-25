import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { deliveryZones } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { DeliveryZonesClient } from './_components/delivery-zones-client'

export default async function DeliveryZonesPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'store') redirect('/login')

  const storeId = session.user.storeId
  if (!storeId) redirect('/store/dashboard')

  const zones = db.select({
    id: deliveryZones.id,
    name: deliveryZones.name,
    address: deliveryZones.address,
    note: deliveryZones.note,
    isActive: deliveryZones.isActive,
  })
    .from(deliveryZones)
    .where(eq(deliveryZones.storeId, storeId))
    .all()

  return <DeliveryZonesClient zones={zones} />
}
