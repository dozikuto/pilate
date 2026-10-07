import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '@/lib/axios'
import type { Schedule, CreateScheduleDto } from '@/types'

const SCHEDULES_KEY = 'schedules'

interface SchedulesParams {
  startDate?: string
  endDate?: string
  instructorId?: string
  classId?: string
  status?: string
}

export function useSchedules(params: SchedulesParams = {}) {
  return useQuery({
    queryKey: [SCHEDULES_KEY, params],
    queryFn: async () => {
      const response = await api.get<Schedule[]>('/schedules', { params })
      return response.data
    },
  })
}

export function useSchedule(id: string) {
  return useQuery({
    queryKey: [SCHEDULES_KEY, id],
    queryFn: async () => {
      const response = await api.get<Schedule>(`/schedules/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

export function useCreateSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateScheduleDto) => {
      const response = await api.post<Schedule>('/schedules', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SCHEDULES_KEY] })
      toast.success('Tạo lịch học thành công!')
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Tạo lịch học thất bại!'
      toast.error(message)
    },
  })
}

export function useUpdateSchedule(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<CreateScheduleDto>) => {
      const response = await api.put<Schedule>(`/schedules/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SCHEDULES_KEY] })
      toast.success('Cập nhật lịch học thành công!')
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Cập nhật lịch học thất bại!'
      toast.error(message)
    },
  })
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/schedules/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SCHEDULES_KEY] })
      toast.success('Xóa lịch học thành công!')
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Xóa lịch học thất bại!'
      toast.error(message)
    },
  })
}
