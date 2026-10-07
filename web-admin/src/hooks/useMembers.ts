import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '@/lib/axios'
import type {
  Member,
  CreateMemberDto,
  UpdateMemberDto,
  PaginatedResponse,
  PaginationParams,
  MemberPackage,
  Booking,
  CheckIn,
} from '@/types'

const MEMBERS_KEY = 'members'

interface MembersParams extends PaginationParams {
  status?: string
}

export function useMembers(params: MembersParams = {}) {
  return useQuery({
    queryKey: [MEMBERS_KEY, params],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Member>>('/members', {
        params,
      })
      return response.data
    },
  })
}

export function useMember(id: string) {
  return useQuery({
    queryKey: [MEMBERS_KEY, id],
    queryFn: async () => {
      const response = await api.get<Member>(`/members/${id}`)
      return response.data
    },
    enabled: !!id,
  })
}

export function useMemberPackages(memberId: string) {
  return useQuery({
    queryKey: [MEMBERS_KEY, memberId, 'packages'],
    queryFn: async () => {
      const response = await api.get<MemberPackage[]>(
        `/members/${memberId}/packages`
      )
      return response.data
    },
    enabled: !!memberId,
  })
}

export function useMemberBookings(memberId: string) {
  return useQuery({
    queryKey: [MEMBERS_KEY, memberId, 'bookings'],
    queryFn: async () => {
      const response = await api.get<Booking[]>(
        `/members/${memberId}/bookings`
      )
      return response.data
    },
    enabled: !!memberId,
  })
}

export function useMemberCheckIns(memberId: string) {
  return useQuery({
    queryKey: [MEMBERS_KEY, memberId, 'checkins'],
    queryFn: async () => {
      const response = await api.get<CheckIn[]>(
        `/members/${memberId}/checkins`
      )
      return response.data
    },
    enabled: !!memberId,
  })
}

export function useCreateMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: any) => {
      const payload: any = {
        fullName: data.name || data.fullName,
        email: data.email,
        phone: data.phone,
      }
      if (data.dateOfBirth) payload.dateOfBirth = data.dateOfBirth
      if (data.gender) payload.gender = data.gender
      if (data.emergencyContact || data.emergencyContactName) {
        payload.emergencyContactName = data.emergencyContact || data.emergencyContactName
      }
      if (data.emergencyPhone || data.emergencyContactPhone) {
        payload.emergencyContactPhone = data.emergencyPhone || data.emergencyContactPhone
      }
      if (data.healthNotes) payload.healthNotes = data.healthNotes
      if (data.goals) payload.goals = data.goals
      if (data.branchId) payload.branchId = data.branchId

      const response = await api.post<Member>('/members', payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEMBERS_KEY] })
      toast.success('Thêm học viên thành công!')
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Thêm học viên thất bại!'
      toast.error(message)
    },
  })
}

export function useUpdateMember(id: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: any) => {
      const payload: any = {}
      if (data.name || data.fullName) payload.fullName = data.name || data.fullName
      if (data.phone) payload.phone = data.phone
      if (data.dateOfBirth) payload.dateOfBirth = data.dateOfBirth
      if (data.gender) payload.gender = data.gender
      if (data.emergencyContact || data.emergencyContactName) {
        payload.emergencyContactName = data.emergencyContact || data.emergencyContactName
      }
      if (data.emergencyPhone || data.emergencyContactPhone) {
        payload.emergencyContactPhone = data.emergencyPhone || data.emergencyContactPhone
      }
      if (data.healthNotes) payload.healthNotes = data.healthNotes
      if (data.goals) payload.goals = data.goals

      const response = await api.patch<Member>(`/members/${id}`, payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEMBERS_KEY] })
      toast.success('Cập nhật học viên thành công!')
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Cập nhật học viên thất bại!'
      toast.error(message)
    },
  })
}

export function useDeleteMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/members/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEMBERS_KEY] })
      toast.success('Xóa học viên thành công!')
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Xóa học viên thất bại!'
      toast.error(message)
    },
  })
}
