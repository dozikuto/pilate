import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import {
  DollarSign,
  Calendar,
  Users,
  Activity,
  Clock,
  User,
  MapPin,
} from 'lucide-react'
import { StatsCard } from '@/components/shared/StatsCard'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { PageLoader } from '@/components/shared/LoadingSpinner'
import {
  useDashboardStats,
  useRevenueChart,
  useClassesChart,
  useUpcomingClasses,
} from '@/hooks/useReports'
import { formatCurrency, formatTime } from '@/lib/utils'

const mockStats = {
  revenueToday: 15500000,
  classesToday: 8,
  newMembersThisMonth: 24,
  checkInsToday: 47,
  revenueGrowth: 12.5,
  classesGrowth: 5,
  membersGrowth: 20,
  checkInsGrowth: -3.2,
}

const mockRevenueChart = [
  { date: '2024-12-16', revenue: 8500000, label: '16/12' },
  { date: '2024-12-17', revenue: 12000000, label: '17/12' },
  { date: '2024-12-18', revenue: 9500000, label: '18/12' },
  { date: '2024-12-19', revenue: 14000000, label: '19/12' },
  { date: '2024-12-20', revenue: 11000000, label: '20/12' },
  { date: '2024-12-21', revenue: 13500000, label: '21/12' },
  { date: '2024-12-22', revenue: 15500000, label: '22/12' },
]

const mockClassesChart = [
  { week: 'Tuần 1', count: 28 },
  { week: 'Tuần 2', count: 35 },
  { week: 'Tuần 3', count: 31 },
  { week: 'Tuần 4', count: 40 },
]

const mockUpcomingClasses = [
  {
    id: '1',
    className: 'Pilates Core',
    instructorName: 'Nguyễn Thị Mai',
    startTime: new Date(Date.now() + 30 * 60000).toISOString(),
    endTime: new Date(Date.now() + 90 * 60000).toISOString(),
    room: 'Phòng 1',
    enrolledCount: 8,
    maxCapacity: 10,
    status: 'scheduled' as const,
  },
  {
    id: '2',
    className: 'Pilates Reformer',
    instructorName: 'Trần Văn Nam',
    startTime: new Date(Date.now() + 90 * 60000).toISOString(),
    endTime: new Date(Date.now() + 150 * 60000).toISOString(),
    room: 'Phòng 2',
    enrolledCount: 4,
    maxCapacity: 6,
    status: 'scheduled' as const,
  },
  {
    id: '3',
    className: 'Yoga & Pilates',
    instructorName: 'Lê Thị Hoa',
    startTime: new Date(Date.now() + 180 * 60000).toISOString(),
    endTime: new Date(Date.now() + 240 * 60000).toISOString(),
    room: 'Phòng 3',
    enrolledCount: 12,
    maxCapacity: 15,
    status: 'scheduled' as const,
  },
  {
    id: '4',
    className: 'Private Session',
    instructorName: 'Nguyễn Thị Mai',
    startTime: new Date(Date.now() + 270 * 60000).toISOString(),
    endTime: new Date(Date.now() + 330 * 60000).toISOString(),
    room: 'Phòng 1',
    enrolledCount: 1,
    maxCapacity: 1,
    status: 'confirmed' as const,
  },
  {
    id: '5',
    className: 'Pilates Flow',
    instructorName: 'Phạm Văn Đức',
    startTime: new Date(Date.now() + 360 * 60000).toISOString(),
    endTime: new Date(Date.now() + 420 * 60000).toISOString(),
    room: 'Phòng 2',
    enrolledCount: 9,
    maxCapacity: 12,
    status: 'scheduled' as const,
  },
]

function formatVNDShort(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return value.toString()
}

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats()
  const { data: revenueChart } = useRevenueChart()
  const { data: classesChart } = useClassesChart()
  const { data: upcomingClasses } = useUpcomingClasses()

  const displayStats = stats ?? mockStats
  const displayRevenue = revenueChart ?? mockRevenueChart
  const displayClasses = classesChart ?? mockClassesChart
  const displayUpcoming = upcomingClasses ?? mockUpcomingClasses

  if (statsLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tổng quan hoạt động hôm nay —{' '}
          {new Date().toLocaleDateString('vi-VN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          title="Doanh thu hôm nay"
          value={displayStats.revenueToday}
          format="currency"
          icon={<DollarSign size={24} />}
          iconBgClass="bg-emerald-50"
          iconColorClass="text-emerald-600"
          growth={displayStats.revenueGrowth}
        />
        <StatsCard
          title="Lớp học hôm nay"
          value={displayStats.classesToday}
          format="number"
          icon={<Calendar size={24} />}
          iconBgClass="bg-blue-50"
          iconColorClass="text-blue-600"
          growth={displayStats.classesGrowth}
        />
        <StatsCard
          title="Học viên mới tháng này"
          value={displayStats.newMembersThisMonth}
          format="number"
          icon={<Users size={24} />}
          iconBgClass="bg-purple-50"
          iconColorClass="text-purple-600"
          growth={displayStats.membersGrowth}
          growthLabel="so với tháng trước"
        />
        <StatsCard
          title="Check-in hôm nay"
          value={displayStats.checkInsToday}
          format="number"
          icon={<Activity size={24} />}
          iconBgClass="bg-orange-50"
          iconColorClass="text-orange-600"
          growth={displayStats.checkInsGrowth}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Doanh thu 7 ngày gần nhất</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={displayRevenue}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={formatVNDShort}
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'Doanh thu']}
                  labelStyle={{ fontWeight: 600, color: '#1e293b' }}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                />
                <Bar
                  dataKey="revenue"
                  fill="#1A3A5C"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lớp học 4 tuần gần nhất</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart
                data={displayClasses}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip
                  formatter={(value: number) => [value, 'Số lớp']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Số lớp học"
                  stroke="#C0392B"
                  strokeWidth={2}
                  dot={{ fill: '#C0392B', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lớp học sắp diễn ra hôm nay</CardTitle>
            <Badge variant="info">{displayUpcoming.length} lớp</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {displayUpcoming.map((cls) => {
              const fillPercent = (cls.enrolledCount / cls.maxCapacity) * 100
              const isFull = cls.enrolledCount >= cls.maxCapacity

              return (
                <div
                  key={cls.id}
                  className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  
                  <div className="flex items-center gap-1.5 text-gray-500 min-w-[100px]">
                    <Clock size={14} />
                    <span className="text-sm font-medium">
                      {formatTime(cls.startTime)} – {formatTime(cls.endTime)}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {cls.className}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <User size={12} />
                        {cls.instructorName}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-gray-500">
                        <MapPin size={12} />
                        {cls.room}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 min-w-[100px]">
                    <span className="text-xs text-gray-500">
                      {cls.enrolledCount}/{cls.maxCapacity} học viên
                    </span>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isFull ? 'bg-accent' : fillPercent > 70 ? 'bg-yellow-400' : 'bg-emerald-400'
                        }`}
                        style={{ width: `${fillPercent}%` }}
                      />
                    </div>
                  </div>

                  <Badge
                    variant={
                      cls.status === 'scheduled'
                        ? 'info'
                        : cls.status === 'ongoing'
                        ? 'success'
                        : 'default'
                    }
                  >
                    {cls.status === 'scheduled'
                      ? 'Sắp diễn ra'
                      : cls.status === 'ongoing'
                      ? 'Đang học'
                      : cls.status}
                  </Badge>
                </div>
              )
            })}

            {displayUpcoming.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                Không có lớp học nào hôm nay
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
