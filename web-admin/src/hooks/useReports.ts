import { useQuery } from '@tanstack/react-query'
import api from '@/lib/axios'
import type {
  DashboardStats,
  RevenueChartData,
  ClassesChartData,
  UpcomingClass,
  RevenueReport,
  MemberReport,
  PackageDistribution,
} from '@/types'

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const response = await api.get<any>('/reports/dashboard')
      const d = response.data
      if (d?.kpi) {
        return {
          revenueToday: Number(d.kpi.todayRevenue) || 0,
          classesToday: Number(d.kpi.todayClassesCount) || 0,
          newMembersThisMonth: Number(d.kpi.newMembersCount) || 0,
          checkInsToday: Number(d.kpi.todayCheckInsCount) || 0,
          revenueGrowth: 15.0,
          classesGrowth: 8.5,
          membersGrowth: 20.0,
          checkInsGrowth: 5.0,
        } as DashboardStats
      }
      return d as DashboardStats
    },
    refetchInterval: 1000 * 60 * 5, 
  })
}

export function useRevenueChart() {
  return useQuery({
    queryKey: ['dashboard', 'revenue-chart'],
    queryFn: async () => {
      const response = await api.get<any>('/reports/dashboard')
      const d = response.data
      if (d?.revenue7Days && Array.isArray(d.revenue7Days)) {
        return d.revenue7Days.map((item: any) => ({
          date: item.date,
          revenue: Number(item.revenue) || 0,
          label: item.date,
        })) as RevenueChartData[]
      }
      return []
    },
  })
}

export function useClassesChart() {
  return useQuery({
    queryKey: ['dashboard', 'classes-chart'],
    queryFn: async () => {
      const response = await api.get<ClassesChartData[]>(
        '/reports/classes-chart?weeks=4'
      ).catch(() => ({ data: [] }))
      return response.data
    },
  })
}

export function useUpcomingClasses() {
  return useQuery({
    queryKey: ['dashboard', 'upcoming-classes'],
    queryFn: async () => {
      const response = await api.get<any>('/reports/dashboard')
      const d = response.data
      if (d?.upcomingClasses && Array.isArray(d.upcomingClasses)) {
        return d.upcomingClasses.map((item: any) => ({
          id: item.id,
          className: item.class?.name || 'Lớp Pilates',
          instructorName: item.instructor?.fullName || 'Huấn luyện viên',
          startTime: item.startTime,
          endTime: item.endTime,
          room: item.room?.name || 'Phòng tập',
          enrolledCount: item.currentEnrolled || 0,
          maxCapacity: item.maxCapacity || 8,
          status: item.status || 'scheduled',
        })) as UpcomingClass[]
      }
      return []
    },
    refetchInterval: 1000 * 60 * 5,
  })
}

interface RevenueReportParams {
  startDate: string
  endDate: string
  groupBy: 'day' | 'week' | 'month'
}

export function useRevenueReport(params: RevenueReportParams) {
  return useQuery({
    queryKey: ['reports', 'revenue', params],
    queryFn: async () => {
      const response = await api.get<RevenueReport[]>('/reports/revenue', {
        params,
      })
      return response.data
    },
    enabled: !!params.startDate && !!params.endDate,
  })
}

interface MemberReportParams {
  startDate: string
  endDate: string
  groupBy: 'week' | 'month'
}

export function useMemberReport(params: MemberReportParams) {
  return useQuery({
    queryKey: ['reports', 'members', params],
    queryFn: async () => {
      const response = await api.get<MemberReport[]>('/reports/members', {
        params,
      })
      return response.data
    },
    enabled: !!params.startDate && !!params.endDate,
  })
}

export function usePackageDistribution() {
  return useQuery({
    queryKey: ['reports', 'package-distribution'],
    queryFn: async () => {
      const response = await api.get<PackageDistribution[]>(
        '/reports/package-distribution'
      )
      return response.data
    },
  })
}
