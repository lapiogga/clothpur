import { db } from '@/lib/db'
import { users, pointSummary } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { GrantPointsClient } from './_components/grant-points-client'

export default function GrantPointsPage() {
  const activeUsers = db.select().from(users)
    .where(eq(users.role, 'user'))
    .all()
    .filter(u => u.isActive)
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))

  const summaries = db.select().from(pointSummary).all()
  const summaryMap = new Map(summaries.map(s => [s.userId, s]))

  const userOptions = activeUsers.map(u => {
    const s = summaryMap.get(u.id)
    const total = s?.totalPoints ?? 0
    const used = s?.usedPoints ?? 0
    const reserved = s?.reservedPoints ?? 0
    return {
      id: u.id,
      name: u.name,
      rank: u.rank,
      unit: u.unit,
      availablePoints: total - used - reserved,
    }
  })

  const currentYear = new Date().getFullYear()

  return <GrantPointsClient users={userOptions} currentYear={currentYear} />
}
