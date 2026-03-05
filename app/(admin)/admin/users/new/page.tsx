import { getActiveStores, getActiveTailors } from '@/actions/stores'
import { UserForm } from '../_components/user-form'

export default async function NewUserPage() {
  const [stores, tailors] = await Promise.all([
    getActiveStores(),
    getActiveTailors(),
  ])

  return (
    <div>
      <h2 className="text-lg font-semibold text-[#1a3a5c] mb-4">사용자 등록</h2>
      <UserForm mode="create" stores={stores} tailors={tailors} />
    </div>
  )
}
