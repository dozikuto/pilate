import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Download, TrendingUp, Users, Calendar, DollarSign, Award, Building2, Star, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'
import api from '@/lib/axios'
import toast from 'react-hot-toast'

interface MonthlyRecord {
  month: string
  revenue: number
  members: number
  classes: number
}

const chartColors = ['#1A3A5C', '#2563EB', '#38BDF8', '#F59E0B']

export default function ReportsPage() {
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()))
  const [reportTab, setReportTab] = useState<'revenue' | 'members' | 'classes' | 'instructors' | 'rooms'>('revenue')
  const [monthlyData, setMonthlyData] = useState<MonthlyRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [packageDistribution, setPackageDistribution] = useState<any[]>([])
  const [instructorPerformanceData, setInstructorPerformance] = useState<any[]>([])
  const [roomUtilizationData, setRoomUtilization] = useState<any[]>([])
  const [reportError, setReportError] = useState(false)
  const [growthRate, setGrowthRate] = useState('Chưa có số liệu tăng trưởng')

  const fetchYearlyReport = useCallback(async (year: string) => {
    setLoading(true); setReportError(false)
    try {
      const res = await api.get('/reports/yearly', {
        params: { year },
      })
      const payload = res.data?.data ?? res.data
      if (payload?.monthlyData && Array.isArray(payload.monthlyData)) {
        setMonthlyData(payload.monthlyData)
        setPackageDistribution((payload.packageDistribution ?? []).map((p: any, i: number) => ({ ...p, color: chartColors[i % chartColors.length] })))
        setInstructorPerformance(payload.instructorPerformance ?? []); setRoomUtilization(payload.roomUtilization ?? [])
        if (!payload.growthRate) setGrowthRate('Chưa có số liệu tăng trưởng')
        if (payload.growthRate) {
          setGrowthRate(`${payload.growthRate} so với cùng kỳ`)
        }
      } else if (Array.isArray(payload)) {
        setMonthlyData(payload)
      } else {
        throw new Error('Fallback')
      }
    } catch {
      setReportError(true); setMonthlyData([]); setPackageDistribution([]); setInstructorPerformance([]); setRoomUtilization([])
      setGrowthRate('Không tải được số liệu'); toast.error('Không tải được báo cáo từ máy chủ')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchYearlyReport(selectedYear)
  }, [selectedYear, fetchYearlyReport])

  const totalYearRevenue = monthlyData.reduce((sum, d) => sum + d.revenue, 0)
  const totalNewMembers = monthlyData.reduce((sum, d) => sum + d.members, 0)
  const totalClassesCount = monthlyData.reduce((sum, d) => sum + d.classes, 0)

  const handleExport = () => {
    if (reportError || loading) { toast.error('Chưa có báo cáo hợp lệ để xuất'); return }
    try {
      const headers = ['Tháng', 'Doanh thu (VNĐ)', 'Học viên mới (người)', 'Số ca lớp học']
      const rows = monthlyData.map((d) => [
        `"${d.month}"`,
        d.revenue,
        d.members,
        d.classes,
      ])
      const csvContent =
        '\uFEFF' +
        [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Bao_cao_tong_hop_PilatesMS_Nam_${selectedYear}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success(`Đã xuất báo cáo năm ${selectedYear} thành công!`)
    } catch {
      toast.error('Không thể xuất file báo cáo')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Báo Cáo & Thống Kê</h1>
          <p className="text-gray-500 text-sm mt-1">
            Phân tích số liệu kinh doanh, học viên, hiệu suất HLV và tỷ lệ lấp đầy phòng tập theo từng năm
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-40">
            <Select
              options={[
                { value: '2026', label: 'Năm 2026' },
                { value: '2025', label: 'Năm 2025' },
                { value: '2024', label: 'Năm 2024' },
                { value: '2023', label: 'Năm 2023' },
              ]}
              value={selectedYear}
              onChange={(val) => {
                if (val) {
                  setSelectedYear(val)
                }
              }}
            />
          </div>
          <Button variant="outline" onClick={handleExport} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Xuất CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
              <RefreshCw className="w-5 h-5 text-primary animate-spin" />
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">
              Tổng Doanh Thu ({selectedYear})
            </span>
            <div className="p-2 bg-blue-50 text-primary rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 mt-2">
            {formatCurrency(totalYearRevenue)}
          </div>
          <span className="text-xs text-green-600 font-semibold mt-1 inline-block">
            ↑ {growthRate}
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
              <RefreshCw className="w-5 h-5 text-primary animate-spin" />
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">
              Học Viên Mới ({selectedYear})
            </span>
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 mt-2">{totalNewMembers} người</div>
          <span className="text-xs text-green-600 font-semibold mt-1 inline-block">
            ↑ +12.3% tăng trưởng
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
          {loading && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
              <RefreshCw className="w-5 h-5 text-primary animate-spin" />
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">
              Buổi Học Tổ Chức ({selectedYear})
            </span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 mt-2">{totalClassesCount} buổi</div>
          <span className="text-xs text-green-600 font-semibold mt-1 inline-block">
            Tỷ lệ lấp đầy trung bình: 82%
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1 bg-white p-1 rounded-xl border">
        <button
          onClick={() => setReportTab('revenue')}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm rounded-lg transition-colors ${
            reportTab === 'revenue'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Doanh Thu ({selectedYear})
        </button>
        <button
          onClick={() => setReportTab('members')}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm rounded-lg transition-colors ${
            reportTab === 'members'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Users className="w-4 h-4" /> Học Viên & Gói Tập
        </button>
        <button
          onClick={() => setReportTab('instructors')}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm rounded-lg transition-colors ${
            reportTab === 'instructors'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Award className="w-4 h-4" /> Hiệu Suất HLV
        </button>
        <button
          onClick={() => setReportTab('rooms')}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm rounded-lg transition-colors ${
            reportTab === 'rooms'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Building2 className="w-4 h-4" /> Lấp Đầy Phòng Tập
        </button>
      </div>

      {/* Chart Section */}
      {reportTab === 'revenue' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Biểu Đồ Tăng Trưởng Doanh Thu Theo Tháng (Năm {selectedYear})
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Đơn vị tính: VNĐ • Dữ liệu tính từ tháng 1 đến tháng 12
              </p>
            </div>
            <Badge variant="info">Năm {selectedYear}</Badge>
          </div>
          <div className="h-80 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#9CA3AF" />
                <YAxis
                  stroke="#9CA3AF"
                  tickFormatter={(val) => `${(val / 1000000).toFixed(0)}Tr`}
                />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Doanh thu']}
                  labelFormatter={(lbl) => `Tháng ${lbl}`}
                  contentStyle={{ backgroundColor: '#1A3A5C', color: '#fff', borderRadius: '12px' }}
                />
                <Bar dataKey="revenue" fill="#1A3A5C" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {reportTab === 'members' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-gray-900">
              Học Viên Đăng Ký Mới Theo Tháng (Năm {selectedYear})
            </h2>
            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="month" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    formatter={(value: any) => [`${value} học viên`, 'Học viên mới']}
                    contentStyle={{ backgroundColor: '#1A3A5C', color: '#fff', borderRadius: '12px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="members"
                    stroke="#2563EB"
                    strokeWidth={3}
                    dot={{ fill: '#2563EB', r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-gray-900">Tỷ Lệ Tiêu Thụ Các Gói Tập</h2>
            <div className="h-72 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={packageDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {packageDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any) => [`${value}%`, 'Thị phần']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {reportTab === 'instructors' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-gray-900">
            Bảng Đánh Giá Hiệu Suất Giảng Dạy & Chuyên Cần HLV ({selectedYear})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Huấn Luyện Viên</th>
                  <th className="px-4 py-3">Tổng Giờ Đứng Lớp</th>
                  <th className="px-4 py-3">Lượt Học Viên Phục Vụ</th>
                  <th className="px-4 py-3">Tỷ Lệ Chuyên Cần Lớp</th>
                  <th className="px-4 py-3 text-right">Đánh Giá Trung Bình</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {instructorPerformanceData.map((ins, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3.5 font-bold text-gray-900">{ins.name}</td>
                    <td className="px-4 py-3.5 font-mono text-primary font-semibold">{ins.hours} giờ</td>
                    <td className="px-4 py-3.5">{ins.students} lượt</td>
                    <td className="px-4 py-3.5">
                      <span className="text-green-600 font-bold">{ins.attendance}%</span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-amber-500">
                      ⭐ {ins.rating}/5.0
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reportTab === 'rooms' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-gray-900">
            Tỷ Lệ Khai Thác & Lấp Đầy Phòng Tập ({selectedYear})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            {roomUtilizationData.map((rm, idx) => (
              <div key={idx} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 space-y-2">
                <div className="text-sm font-bold text-gray-900">{rm.name}</div>
                <div className="text-2xl font-black text-primary">{rm.occupancy}%</div>
                <div className="text-xs text-gray-500">Tổng giờ hoạt động: {rm.hours}h</div>
                <div className="text-xs text-gray-400">Sức chứa tối đa: {rm.capacity} máy</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
