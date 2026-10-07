import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email không được để trống')
    .email('Email không hợp lệ'),
  password: z
    .string()
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { login, isLogging } = useAuth()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = (data: LoginFormData) => {
    login(data)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-700 to-primary-500 flex items-center justify-center p-4">
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute top-1/2 left-1/4 w-48 h-48 rounded-full bg-accent/10" />
      </div>

      <div className="relative w-full max-w-md">
        
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-lg">
              <span className="text-white font-bold text-2xl">P</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">PilatesMS</h1>
            <p className="text-gray-500 text-sm mt-1">
              Hệ thống quản lý phòng tập
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Email <span className="text-accent">*</span>
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="admin@pilatesms.vn"
                  autoComplete="email"
                  className={`w-full rounded-lg border bg-white px-3 py-2.5 pl-10 text-sm text-gray-900 placeholder:text-gray-400
                    focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors
                    ${errors.email ? 'border-accent' : 'border-gray-300'}`}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-accent">{errors.email.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Mật khẩu <span className="text-accent">*</span>
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`w-full rounded-lg border bg-white px-3 py-2.5 pl-10 pr-10 text-sm text-gray-900 placeholder:text-gray-400
                    focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors
                    ${errors.password ? 'border-accent' : 'border-gray-300'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-accent">{errors.password.message}</p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                className="text-sm text-primary hover:underline font-medium"
              >
                Quên mật khẩu?
              </button>
            </div>

            <Button
              type="submit"
              className="w-full h-11 text-base"
              loading={isLogging}
            >
              Đăng nhập
            </Button>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 font-medium mb-2">
              Thông tin demo:
            </p>
            <p className="text-xs text-gray-600">
              Email: <span className="font-mono font-medium">admin@pilatesms.vn</span>
            </p>
            <p className="text-xs text-gray-600">
              Mật khẩu: <span className="font-mono font-medium">Admin@123456</span>
            </p>
          </div>
        </div>

        <p className="text-center text-white/50 text-xs mt-6">
          © 2024 PilatesMS. Bảo lưu mọi quyền.
        </p>
      </div>
    </div>
  )
}
