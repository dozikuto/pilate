import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/axios";
import type { ClassSchedule, ApiResponse } from "@/types";

const SCHEDULES_KEY = "schedules";

export function useSchedules(date: string) {
  return useQuery({
    queryKey: [SCHEDULES_KEY, date],
    queryFn: async () => {
      const res = await apiClient.get<any>(`/schedules?date=${date}`);
      const d = res.data?.data ?? res.data;
      return Array.isArray(d) ? d : (d?.items ?? []);
    },
    staleTime: 1000 * 60 * 5, 
  });
}

export function useUpcomingClasses() {
  return useQuery({
    queryKey: [SCHEDULES_KEY, "upcoming"],
    queryFn: async () => {
      const res = await apiClient.get<any>("/schedules/upcoming?limit=3");
      const d = res.data?.data ?? res.data;
      return Array.isArray(d) ? d : (d?.items ?? []);
    },
    staleTime: 1000 * 60 * 2,
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
      const res = await apiClient.delete<ApiResponse<{ message: string }>>(
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
