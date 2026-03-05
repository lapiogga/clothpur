import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoginForm } from './_components/login-form'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-sm rounded-[4px] shadow-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-semibold text-[#1a3a5c]">
            피복 구매관리 시스템
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            이메일과 비밀번호를 입력하세요
          </p>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  )
}
