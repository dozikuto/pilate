import axios from 'axios'
import { useAuthStore } from '@/store/auth.store'

const BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api/v1'

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

let isRefreshing = false
let failedQueue: Array<{
  resolve: (value: string) => void
  reject: (reason: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error)
    } else {
      resolve(token!)
    }
  })
  failedQueue = []
}

api.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object' && 'data' in response.data && 'success' in response.data) {
      const payload = response.data.data
      if (payload && typeof payload === 'object') {
        if (payload.accessToken && !payload.token) {
          payload.token = payload.accessToken
        }
        if (payload.user && payload.user.fullName && !payload.user.name) {
          payload.user.name = payload.user.fullName
        }
        if (payload.items && !payload.data) {
          payload.data = payload.items.map((item: any) => {
            if (item && item.user && !item.name) {
              const activePkg =
                item.memberPackages?.find((mp: any) => mp.status === 'active') ||
                item.memberPackages?.[0]
              const pkgName =
                activePkg?.package?.name || (activePkg ? 'Gói tập Pilates' : undefined)
              const total =
                activePkg?.package?.totalSessions || activePkg?.totalSessions || 0
              const rem = activePkg?.remainingSessions ?? 0
              return {
                ...item,
                name: item.user.fullName || item.name || 'Học viên',
                email: item.user.email || item.email,
                phone: item.user.phone || item.phone,
                code: item.qrCode || item.code || `HV-${item.id?.substring(0, 6).toUpperCase()}`,
                status: item.status || (item.user.isActive ? 'active' : 'inactive'),
                currentPackage: activePkg
                  ? {
                      id: activePkg.id,
                      memberId: item.id,
                      packageId: activePkg.packageId,
                      packageName: pkgName,
                      packageType: activePkg.package?.type || 'session',
                      totalSessions: total,
                      usedSessions: Math.max(0, total - rem),
                      remainingSessions: rem,
                      startDate: activePkg.startDate,
                      purchaseDate: activePkg.createdAt,
                      price: activePkg.package?.price || 0,
                      status: activePkg.status || 'active',
                    }
                  : undefined,
                totalSessions: total,
                usedSessions: item.totalSessionsAttended || 0,
                remainingSessions: rem,
                joinDate: item.createdAt
                  ? new Date(item.createdAt).toLocaleDateString('vi-VN')
                  : '—',
              }
            }
            return item
          })
        }
      }
      return { ...response, data: payload }
    }
    return response
  },
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return api(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      const { refreshToken, setTokens, logout } = useAuthStore.getState()

      if (!refreshToken) {
        logout()
        return Promise.reject(error)
      }

      try {
        const response = await axios.post(`${BASE_URL}/auth/refresh`, {
          refreshToken,
        })
        const resData = response.data?.data || response.data
        const newToken = resData?.accessToken || resData?.token
        const newRefreshToken = resData?.refreshToken || refreshToken

        if (!newToken) {
          throw new Error('Refresh token không trả về access token mới')
        }

        setTokens(newToken, newRefreshToken)
        processQueue(null, newToken)
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        logout()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
