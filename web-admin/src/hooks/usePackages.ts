import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '@/lib/axios'
import type { Package, CreatePackageDto } from '@/types'

const PACKAGES_KEY = 'packages'

export function usePackages(params?: { status?: string }) {
  return useQuery({
    queryKey: [PACKAGES_KEY, params],
    queryFn: async () => {
      const response = await api.get<Package[]>('/packages', { params })
      return response.data
    },
  })
}

export function usePackage(id: string) {
  return useQuery({
    queryKey: [PACKAGES_KEY, id],
    queryFn: async () => {
      const response = await api.get<Package>(`/packages/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

export function useCreatePackage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreatePackageDto) => {
      const response = await api.post<Package>('/packages', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PACKAGES_KEY] })
      toast.success('Tạo gói tập thành công!')
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Tạo gói tập thất bại!'
      toast.error(message)
    },
  })
}

export function useUpdatePackage(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<CreatePackageDto>) => {
      const response = await api.put<Package>(`/packages/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PACKAGES_KEY] })
      toast.success('Cập nhật gói tập thành công!')
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Cập nhật gói tập thất bại!'
      toast.error(message)
    },
  })
}

export function useDeletePackage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/packages/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PACKAGES_KEY] })
      toast.success('Xóa gói tập thành công!')
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Xóa gói tập thất bại!'
      toast.error(message)
    },
  })
}

export function useAssignPackage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { memberId: string; packageId: string; startDate?: string }) => {
      const response = await api.post('/packages/assign', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['member-packages'] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
      toast.success('Gán gói tập cho học viên thành công!')
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Gán gói tập thất bại!'
      toast.error(message)
    },
  })
}
