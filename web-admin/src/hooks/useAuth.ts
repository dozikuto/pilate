import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '@/lib/axios'
import { useAuthStore } from '@/store/auth.store'
import type { LoginRequest, LoginResponse } from '@/types'

export function useAuth() {
  const { user, token, login, logout } = useAuthStore()
  const navigate = useNavigate()

  const loginMutation = useMutation({
    mutationFn: async (data: LoginRequest): Promise<LoginResponse> => {
      const response = await api.post<LoginResponse>('/auth/login', data)
      return response.data
    },
    onSuccess: (data) => {
      login(data.token, data.refreshToken, data.user)
      toast.success(`Chào mừng, ${data.user.name}!`)
      navigate('/dashboard', { replace: true })
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Đăng nhập thất bại. Vui lòng thử lại.'
      toast.error(message)
    },
  })

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
    toast.success('Đã đăng xuất thành công.')
  }

  return {
    user,
    token,
    isAuthenticated: !!token,
    isLogging: loginMutation.isPending,
    login: loginMutation.mutate,
    logout: handleLogout,
  }
}
