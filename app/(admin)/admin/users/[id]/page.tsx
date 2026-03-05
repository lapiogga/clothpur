import { notFound } from 'next/navigation'
import { getUserById } from '@/actions/users'
import { getActiveStores, getActiveTailors } from '@/actions/stores'
import { UserForm } from '../_components/user-form'
import { ResetPasswordButton } from './_components/reset-password-button'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditUserPage({ params }: Props) {
  const { id } = await params
  const [user, stores, tailors] = await Promise.all([
    getUserById(id),
    getActiveStores(),
    getActiveTailors(),
  ])

  if (!user) {
    notFound()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[#1a3a5c]">사용자 수정</h2>
        <ResetPasswordButton userId={user.id} userName={user.name} />
      </div>
      <UserForm
        mode="edit"
        defaultValues={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as 'admin' | 'store' | 'tailor' | 'user',
          rank: user.rank ?? '',
          militaryNumber: user.militaryNumber ?? '',
          unit: user.unit ?? '',
          enlistDate: user.enlistDate ?? '',
          promotionDate: user.promotionDate ?? '',
          retirementDate: user.retirementDate ?? '',
          storeId: user.storeId ?? '',
          tailorId: user.tailorId ?? '',
          isActive: user.isActive,
        }}
        stores={stores}
        tailors={tailors}
      />
    </div>
  )
}
