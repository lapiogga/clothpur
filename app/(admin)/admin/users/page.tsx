import { getUsers } from '@/actions/users'
import { UsersTable } from './_components/users-table'

interface Props {
  searchParams: Promise<{
    role?: string
    rank?: string
    search?: string
    page?: string
  }>
}

export default async function UsersPage({ searchParams }: Props) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const { users, totalCount } = await getUsers({
    role: params.role,
    rank: params.rank,
    search: params.search,
    page,
    pageSize: 20,
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#1a3a5c]">사용자 관리</h2>
        <a href="/admin/users/new">
          <button className="px-4 py-2 text-sm text-white bg-[#1a3a5c] hover:bg-[#15304d] rounded-[4px]">
            사용자 등록
          </button>
        </a>
      </div>

      <UsersTable
        users={users}
        totalCount={totalCount}
        currentPage={page}
        currentRole={params.role}
        currentRank={params.rank}
        currentSearch={params.search}
      />
    </div>
  )
}
