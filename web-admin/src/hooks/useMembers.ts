import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "@/lib/axios";
import { adaptMemberDetail } from "@/lib/memberAdapters";
import type {
  Member,
  CreateMemberDto,
  UpdateMemberDto,
  PaginatedResponse,
  PaginationParams,
  MemberPackage,
  Booking,
  CheckIn,
} from "@/types";

const MEMBERS_KEY = "members";

export function memberError(error: unknown, fallback = 'Không lưu được hồ sơ học viên'): string {
  const body = (error as any)?.response?.data;
  const message = body?.errors ?? body?.message ?? (error as Error)?.message;
  return Array.isArray(message) ? message.join('. ') : message || fallback;
}

function memberPayload(data: any) {
  const payload: Record<string, unknown> = {};
  const values = {
    fullName: data.name ?? data.fullName,
    email: data.email,
    phone: data.phone,
    dateOfBirth: data.dateOfBirth === '' ? null : data.dateOfBirth,
    gender: data.gender === '' ? null : data.gender,
    address: data.address,
    emergencyContactName: data.emergencyContact ?? data.emergencyContactName,
    emergencyContactPhone: data.emergencyPhone ?? data.emergencyContactPhone,
    healthNotes: data.healthNotes,
    goals: data.goals,
  };
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) payload[key] = value;
  }
  return payload;
}

interface MembersParams extends PaginationParams {
  status?: string;
}

export function useMembers(params: MembersParams = {}) {
  return useQuery({
    queryKey: [MEMBERS_KEY, params],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Member>>("/members", {
        params,
      });
      return response.data;
    },
    refetchInterval: 15000,
  });
}

export function useMember(id: string) {
  return useQuery({
    queryKey: [MEMBERS_KEY, id],
    queryFn: async () => {
      const response = await api.get(`/members/${id}`);
      return adaptMemberDetail(response.data);
    },
    enabled: !!id,
    refetchInterval: 15000,
  });
}

export function useMemberPackages(memberId: string) {
  const query = useMember(memberId);
  return { ...query, data: query.data?.packages };
}

export function useMemberBookings(memberId: string) {
  const query = useMember(memberId);
  return { ...query, data: query.data?.bookings };
}

export function useMemberCheckIns(memberId: string) {
  const query = useMember(memberId);
  return { ...query, data: query.data?.checkIns };
}

export function useCreateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const payload = memberPayload(data);
      if (data.branchId) payload.branchId = data.branchId;

      const response = await api.post<Member>("/members", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEMBERS_KEY] });
      toast.success("Thêm học viên thành công!");
    },
    onError: (error: unknown) => {
      toast.error(memberError(error, 'Thêm học viên thất bại!'));
    },
  });
}

export function useUpdateMember(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const payload = memberPayload(data);
      const response = await api.patch<Member>(`/members/${id}`, payload);
      return response.data;
    },
    onSuccess: async () => {
      await Promise.all([MEMBERS_KEY, 'teaching', 'schedules', 'bookings', 'checkins'].map(key =>
        queryClient.invalidateQueries({ queryKey: [key] })));
      toast.success("Cập nhật học viên thành công!");
    },
    onError: (error: unknown) => {
      toast.error(memberError(error, 'Cập nhật học viên thất bại!'));
    },
  });
}

export function useDeleteMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/members/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [MEMBERS_KEY] });
      toast.success("Xóa học viên thành công!");
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? "Xóa học viên thất bại!";
      toast.error(message);
    },
  });
}
