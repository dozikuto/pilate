import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'instructor'
  avatar?: string
}

interface AuthState {
  token: string | null
  refreshToken: string | null
  user: AuthUser | null
  isLoading: boolean

  setTokens: (token: string, refreshToken: string) => void
  setUser: (user: AuthUser) => void
  login: (token: string, refreshToken: string, user: AuthUser) => void
  logout: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      isLoading: false,

      setTokens: (token, refreshToken) =>
        set({ token, refreshToken }),

      setUser: (user) => set({ user }),

      login: (token, refreshToken, user) =>
        set({ token, refreshToken, user }),

      logout: () =>
        set({ token: null, refreshToken: null, user: null }),

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'pilatesms-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
    }
  )
)
