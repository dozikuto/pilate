import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import apiClient from "@/lib/axios";

export type PrivateSessionType =
  | "private_1v1"
  | "semi_private_1v2"
  | "small_group_1v3"
  | "small_group_1v4";

export interface InstructorOption {
  id: string;
  userId: string;
  fullName: string;
  avatarUrl?: string;
  bio?: string;
  specializations?: string;
}

export interface WeekClass {
  id: string;
  className: string;
  room: string;
  roomType?: string;
  startTime: string;
  endTime: string;
  capacity: number;
  enrolled: number;
  remaining: number;
  isFull: boolean;
  isPast: boolean;
  isBooked: boolean;
  waitlistCount: number;
}

export interface FreeSlot {
  startTime: string;
  endTime: string;
  label: string;
  myRequestStatus: string | null;
}

export interface WeekDay {
  date: string;
  weekday: number;
  classes: WeekClass[];
  freeSlots: FreeSlot[];
  totalClasses: number;
  availableClasses: number;
}

export interface InstructorWeek {
  instructor: { userId: string; fullName: string; avatarUrl?: string };
  weekStart: string;
  weekEnd: string;
  days: WeekDay[];
}

export interface PrivateSessionRequest {
  id: string;
  startTime: string;
  endTime: string;
  sessionType: PrivateSessionType;
  status: "pending" | "approved" | "rejected" | "cancelled";
  note?: string;
  responseNote?: string;
  instructor: { userId: string; fullName?: string };
}

function unwrap<T>(res: any): T {
  return (res?.data?.data ?? res?.data) as T;
}

export function useInstructorOptions() {
  return useQuery({
    queryKey: ["private-instructors"],
    queryFn: async () => {
      const res = await apiClient.get("/private-sessions/instructors");
      const d = unwrap<any>(res);
      return (Array.isArray(d) ? d : d?.items ?? []) as InstructorOption[];
    },
    staleTime: 1000 * 60 * 10,
  });
}

export function useInstructorWeek(instructorUserId?: string, weekStart?: string) {
  return useQuery({
    queryKey: ["instructor-week", instructorUserId, weekStart],
    enabled: Boolean(instructorUserId),
    queryFn: async () => {
      const res = await apiClient.get(
        `/private-sessions/instructors/${instructorUserId}/week`,
        { params: { weekStart } }
      );
      return unwrap<InstructorWeek>(res);
    },
    staleTime: 1000 * 15,
  });
}

export function useMyPrivateRequests() {
  return useQuery({
    queryKey: ["my-private-requests"],
    queryFn: async () => {
      const res = await apiClient.get("/private-sessions/my");
      const d = unwrap<any>(res);
      return (Array.isArray(d) ? d : []) as PrivateSessionRequest[];
    },
    staleTime: 1000 * 15,
  });
}

export function useRequestPrivateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      instructorUserId: string;
      startTime: string;
      endTime: string;
      sessionType: PrivateSessionType;
      note?: string;
    }) => {
      const res = await apiClient.post("/private-sessions", payload);
      return unwrap<PrivateSessionRequest>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructor-week"] });
      queryClient.invalidateQueries({ queryKey: ["my-private-requests"] });
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
    },
  });
}

export function useCancelPrivateRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.patch(`/private-sessions/${id}/cancel`);
      return unwrap<PrivateSessionRequest>(res);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["instructor-week"] });
      queryClient.invalidateQueries({ queryKey: ["my-private-requests"] });
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
    },
  });
}
