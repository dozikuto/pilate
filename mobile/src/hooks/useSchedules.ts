import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/axios";
import type { ClassSchedule, ApiResponse } from "@/types";

const SCHEDULES_KEY = "schedules";

export function useSchedules(date: string, endDate?: string, enabled = true) {
  return useQuery({
    queryKey: [SCHEDULES_KEY, date, endDate],
    queryFn: async () => {
      const res = await apiClient.get<any>('/schedules', { params: endDate
        ? { startDate: `${date}T00:00:00+07:00`, endDate: `${endDate}T23:59:59.999+07:00` }
        : { date } });
      const d = res.data?.data ?? res.data;
      return Array.isArray(d) ? d : (d?.items ?? []);
    },
    staleTime: 0,
    refetchInterval: 15000,
    enabled,
  });
}

export function useBookPackageSchedules() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { memberPackageId: string; scheduleIds: string[] }) => {
      const res = await apiClient.post('/bookings/package-schedules', payload);
      return (res.data?.data ?? res.data) as {
        bookedCount: number;
        confirmedCount?: number;
        waitlistedCount?: number;
        remainingSessions: number | null;
      };
    },
    onSuccess: async () => {
      await Promise.all(['schedules', 'instructor-week', 'my-packages', 'dashboard-stats', 'my-bookings']
        .map(key => queryClient.invalidateQueries({ queryKey: [key] })));
    },
  });
}

export function useUpcomingClasses() {
  return useQuery({
    queryKey: [SCHEDULES_KEY, "upcoming"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/schedules/upcoming?limit=10");
      const d = res.data?.data ?? res.data;
      const items = Array.isArray(d) ? d : (d?.items ?? []);
      return items.filter((item: any) => item.isBooked);
    },
    staleTime: 0,
  });
}

export function useBookClass() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (scheduleId: string) => {
      const res = await apiClient.post<ApiResponse<{ message: string }>>(
        `/schedules/${scheduleId}/book`
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SCHEDULES_KEY] });
      queryClient.invalidateQueries({ queryKey: ["instructor-week"] });
      queryClient.invalidateQueries({ queryKey: ["my-packages"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (scheduleId: string) => {
      const res = await apiClient.delete<any>(
        `/schedules/${scheduleId}/book`
      );
      return (res.data?.data ?? res.data) as {
        success: boolean;
        message: string;
        isLateCancel?: boolean;
        wasWaitlisted?: boolean;
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SCHEDULES_KEY] });
      queryClient.invalidateQueries({ queryKey: ["instructor-week"] });
      queryClient.invalidateQueries({ queryKey: ["my-packages"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}
