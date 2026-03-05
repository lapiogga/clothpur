import { db } from '@/lib/db'
import { categories } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { CategoriesClient } from './_components/categories-client'

export default function CategoriesPage() {
  // 전체 분류 조회 (sortOrder 순)
  const allCategories = db.select().from(categories).all()
    .sort((a, b) => a.sortOrder - b.sortOrder)

  const level1 = allCategories.filter(c => c.level === 1)
  const level2 = allCategories.filter(c => c.level === 2)
  const level3 = allCategories.filter(c => c.level === 3)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#1a3a5c]">품목 분류 관리</h2>
      </div>
      <CategoriesClient
        level1={level1}
        level2={level2}
        level3={level3}
      />
    </div>
  )
}
