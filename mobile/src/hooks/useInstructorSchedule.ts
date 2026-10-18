import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/axios";

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

export interface WeekDay {
  date: string;
  weekday: number;
  classes: WeekClass[];
  totalClasses: number;
  availableClasses: number;
}

export interface InstructorWeek {
  instructor: { userId: string; fullName: string; avatarUrl?: string };
  weekStart: string;
  weekEnd: string;
  days: WeekDay[];
}

function unwrap<T>(res: any): T {
  return (res?.data?.data ?? res?.data) as T;
}

export function useInstructorOptions() {
  return useQuery({
    queryKey: ["instructor-options"],
    queryFn: async () => {
      const res = await apiClient.get("/instructors/options");
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
        `/instructors/${instructorUserId}/week`,
        { params: { weekStart } }
      );
      return unwrap<InstructorWeek>(res);
    },
    staleTime: 1000 * 15,
  });
}
