import { useQuery } from '@tanstack/react-query'
import api from '@/lib/axios'

export interface TeachingStudentBooking {
  bookingId: string
  memberId: string
  fullName: string
  phone: string
  email: string
  healthNotes: string
  spotNumber: number | null
  status: 'confirmed' | 'attended'
  checkInTime: string | null
}
export interface TeachingSchedule {
  id: string
  instructorId: string
  instructorName: string
  className: string
  roomId: string
  roomName: string
  level: string
  startTime: string
  endTime: string
  currentEnrolled: number
  attendedCount: number
  maxCapacity: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  notes: string
  students: TeachingStudentBooking[]
}
export interface WorkoutPlanRecord {
  id: string
  memberId: string
  memberName: string
  instructorId: string
  instructorName: string
  scheduleId: string | null
  className?: string
  scheduleStartTime?: string
  title: string
  exercises: string
  progressNotes: string
  feedback: string
  coreScore: number | null
  flexibilityScore: number | null
  createdAt: string
  updatedAt: string
}
export interface TeachingStudent {
  id: string
  fullName: string
  phone: string
  email: string
  healthNotes: string
  goals: string
  totalSessionsAttended: number
  totalSessions: number
  lastProgress: WorkoutPlanRecord | null
  lastFeedback: WorkoutPlanRecord | null
}

export function useTeachingData<T>(resource: string, params: Record<string, string | undefined> = {}, enabled = true) {
  return useQuery({
    queryKey: ['teaching', resource, params],
    queryFn: async () => (await api.get<T[]>(`/teaching/${resource}`, { params })).data,
    enabled,
    staleTime: 0,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  })
}
