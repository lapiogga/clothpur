"use client"

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { resetPassword } from '@/actions/users'

interface ResetPasswordButtonProps {
  userId: string
  userName: string
}

export function ResetPasswordButton({ userId, userName }: ResetPasswordButtonProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  async function handleReset() {
    setIsLoading(true)
    try {
      const result = await resetPassword(userId)
      if (result.success) {
        toast.success('비밀번호가 초기화되었습니다. (password1234)')
        setOpen(false)
      } else {
        toast.error(result.error ?? '비밀번호 초기화에 실패했습니다.')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-[4px]">
          비밀번호 초기화
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-[4px]">
        <DialogHeader>
          <DialogTitle>비밀번호 초기화</DialogTitle>
          <DialogDescription>
            {userName}님의 비밀번호를 초기값(password1234)으로 재설정합니다.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-[4px]"
            onClick={() => setOpen(false)}
          >
            취소
          </Button>
          <Button
            className="rounded-[4px] bg-[#1a3a5c] hover:bg-[#15304d]"
            onClick={handleReset}
            disabled={isLoading}
          >
            {isLoading ? '처리 중...' : '초기화'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
