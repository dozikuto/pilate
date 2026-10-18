import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/axios";
import type {
  MemberPackage,
  Package,
  AttendanceRecord,
  ApiResponse,
  DashboardStats,
} from "@/types";

export function useMyPackages() {
  return useQuery({
    queryKey: ["my-packages"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/members/me/packages");
      const d = res.data?.data ?? res.data;
      return Array.isArray(d) ? d : (d?.items ?? []);
    },
    staleTime: 0,
    refetchInterval: 15000,
  });
}

export function useAvailablePackages() {
  return useQuery({
    queryKey: ["available-packages"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/packages?limit=100");
      const d = res.data?.data ?? res.data;
      const items = Array.isArray(d) ? d : (d?.items ?? []);
      return items.filter((pkg: any) => pkg.isActive !== false).map((pkg: any) => ({
        id: pkg.id,
        name: pkg.name,
        catalogCode: pkg.catalogCode,
        description: pkg.description,
        type: pkg.type,
        totalSessions: pkg.totalSessions,
        durationDays: pkg.durationDays,
        price: Number(pkg.price) || 0,
        isTransferable: pkg.isTransferable,
        isActive: pkg.isActive,
        privateSessionEnabled: pkg.privateSessionEnabled,
        privateSessionType: pkg.privateSessionType,
        privateSessionDurationMinutes: pkg.privateSessionDurationMinutes,
      }));
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function usePackagePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, preferredInstructorId }: { id: string; preferredInstructorId: string | null }) => {
      const response = await apiClient.patch(`/members/me/packages/${id}/preferences`, { preferredInstructorId });
      return response.data?.data ?? response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-packages'] }),
  });
}

export interface PurchasePackagePayload {
  packageId: string;
  voucherCode?: string;
  paymentMethod?: string;
  discountAmount?: number;
  finalAmount?: number;
}

export function usePurchasePackage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: string | PurchasePackagePayload) => {
      const data = typeof payload === "string" ? { packageId: payload } : payload;
      const res = await apiClient.post<any>("/members/me/packages", data);
      return res.data?.data ?? res.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["my-packages"] });
      await queryClient.refetchQueries({ queryKey: ["my-packages"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      await queryClient.refetchQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useAttendanceHistory(limit = 5) {
  return useQuery({
    queryKey: ["attendance-history", limit],
    queryFn: async () => {
      const res = await apiClient.get<any>(
        `/members/me/attendance?limit=${limit}`
      );
      const d = res.data?.data ?? res.data;
      return Array.isArray(d) ? d : (d?.items ?? []);
    },
    staleTime: 0,
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/members/me/stats");
      return res.data?.data ?? res.data;
    },
    staleTime: 0,
  });
}
