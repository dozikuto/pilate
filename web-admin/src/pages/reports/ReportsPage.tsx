import { useState } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Download, TrendingUp, Users, Calendar, DollarSign, Award, Building2, Star } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency } from '@/lib/utils'

const monthlyData = [
  { month: 'T1', revenue: 45000000, members: 15, classes: 120 },
  { month: 'T2', revenue: 52000000, members: 18, classes: 135 },
  { month: 'T3', revenue: 61000000, members: 22, classes: 150 },
  { month: 'T4', revenue: 58000000, members: 20, classes: 145 },
  { month: 'T5', revenue: 73000000, members: 28, classes: 180 },
  { month: 'T6', revenue: 85000000, members: 35, classes: 210 },
  { month: 'T7', revenue: 79000000, members: 30, classes: 195 },
  { month: 'T8', revenue: 92000000, members: 40, classes: 230 },
  { month: 'T9', revenue: 98000000, members: 42, classes: 245 },
]

const packageDistribution = [
  { name: 'Gói 10 Buổi', value: 45, color: '#1A3A5C' },
  { name: 'Gói 20 Buổi', value: 25, color: '#2563EB' },
  { name: 'Gói Trải Nghiệm 5B', value: 18, color: '#38BDF8' },
  { name: 'Gói Tháng Unlimited', value: 12, color: '#F59E0B' },
]

const instructorPerformanceData = [
  { name: 'HLV Mai Linh', hours: 68, students: 142, rating: 4.9, attendance: 96 },
  { name: 'HLV Quốc Hưng', hours: 54, students: 115, rating: 4.8, attendance: 92 },
  { name: 'HLV Hoàng Yến', hours: 46, students: 98, rating: 4.9, attendance: 94 },
  { name: 'HLV Anh Thư', hours: 38, students: 82, rating: 4.7, attendance: 89 },
]

const roomUtilizationData = [
  { name: 'Phòng Reformer 1', occupancy: 88, hours: 160, capacity: 6 },
  { name: 'Phòng Cadillac VIP', occupancy: 78, hours: 96, capacity: 4 },
  { name: 'Phòng Đa Năng 2', occupancy: 65, hours: 84, capacity: 8 },
  { name: 'Phòng Thảm Mat', occupancy: 54, hours: 60, capacity: 10 },
]

export default function ReportsPage() {
  const [selectedYear, setSelectedYear] = useState('2026')
  const [reportTab, setReportTab] = useState<'revenue' | 'members' | 'classes' | 'instructors' | 'rooms'>('revenue')

  const totalYearRevenue = monthlyData.reduce((sum, d) => sum + d.revenue, 0)
  const totalNewMembers = monthlyData.reduce((sum, d) => sum + d.members, 0)
  const totalClassesCount = monthlyData.reduce((sum, d) => sum + d.classes, 0)

  const handleExport = () => {
    alert('Đang tạo và tải xuống file Báo cáo tổng hợp PDF/Excel...')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Báo Cáo & Thống Kê</h1>
          <p className="text-gray-500 text-sm mt-1">
            Phân tích số liệu kinh doanh, học viên, hiệu suất HLV và tỷ lệ lấp đầy phòng tập
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            options={[
              { value: '2026', label: 'Năm 2026' },
              { value: '2025', label: 'Năm 2025' },
            ]}
            value={selectedYear}
            onChange={(val) => setSelectedYear(val)}
          />
          <Button variant="outline" onClick={handleExport} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Xuất PDF/Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Tổng Doanh Thu</span>
            <div className="p-2 bg-blue-50 text-primary rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 mt-2">
            {formatCurrency(totalYearRevenue)}
          </div>
          <span className="text-xs text-green-600 font-semibold mt-1 inline-block">
            ↑ +18.5% so với cùng kỳ
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Học Viên Mới</span>
            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 mt-2">{totalNewMembers} người</div>
          <span className="text-xs text-green-600 font-semibold mt-1 inline-block">
            ↑ +12.3% tăng trưởng
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Tổng Buổi Học Tổ Chức</span>
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

      <div className="flex border-b border-gray-200 gap-2 bg-white p-1 rounded-xl border overflow-x-auto">
        <button
          onClick={() => setReportTab('revenue')}
          className={`flex items-center gap-2 px-4 py-2 font-medium text-sm rounded-lg whitespace-nowrap transition-colors ${
            reportTab === 'revenue'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <TrendingUp className="w-4 h-4" /> Báo Cáo Doanh Thu
        </button>
        <button
          onClick={() => setReportTab('members')}
          className={`flex items-center gap-2 px-4 py-2 font-medium text-sm rounded-lg whitespace-nowrap transition-colors ${
            reportTab === 'members'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Users className="w-4 h-4" /> Học Viên & Gói Tập
        </button>
        <button
          onClick={() => setReportTab('classes')}
          className={`flex items-center gap-2 px-4 py-2 font-medium text-sm rounded-lg whitespace-nowrap transition-colors ${
            reportTab === 'classes'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Calendar className="w-4 h-4" /> Số Lượng Lớp Học
        </button>
        <button
          onClick={() => setReportTab('instructors')}
          className={`flex items-center gap-2 px-4 py-2 font-medium text-sm rounded-lg whitespace-nowrap transition-colors ${
            reportTab === 'instructors'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Award className="w-4 h-4" /> Hiệu Suất HLV
        </button>
        <button
          onClick={() => setReportTab('rooms')}
          className={`flex items-center gap-2 px-4 py-2 font-medium text-sm rounded-lg whitespace-nowrap transition-colors ${
            reportTab === 'rooms'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Building2 className="w-4 h-4" /> Sử Dụng Phòng Tập
        </button>
      </div>

      {reportTab === 'revenue' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900">Biểu Đồ Doanh Thu Theo Tháng (VNĐ)</h2>
            <span className="text-xs text-gray-400">Đơn vị: VNĐ</span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis
                  tickFormatter={(val) => `${(val / 1000000).toFixed(0)}Tr`}
                />
                <Tooltip
                  formatter={(value: any) => [formatCurrency(Number(value)), 'Doanh thu']}
                />
                <Bar dataKey="revenue" fill="#1A3A5C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {reportTab === 'members' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-gray-900">Tăng Trưởng Học Viên Mới</h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="members" stroke="#2563EB" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-gray-900">Cơ Cấu Gói Tập Được Mua (%)</h2>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={packageDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {packageDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {reportTab === 'classes' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-gray-900">Số Lượng Buổi Tập Tổ Chức Hàng Tháng</h2>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="classes" fill="#38BDF8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {reportTab === 'instructors' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-gray-900">Số Giờ Giảng Dạy & Số Học Viên / Tháng</h2>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={instructorPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="hours" name="Số giờ dạy" fill="#1A3A5C" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="students" name="Số lượt học viên" fill="#38BDF8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-gray-900">Bảng Xếp Hạng Đánh Giá & Chuyên Cần</h2>
              <div className="divide-y divide-gray-100">
                {instructorPerformanceData.map((inst, idx) => (
                  <div key={idx} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-900 text-sm flex items-center gap-2">
                        {inst.name}
                        <span className="text-xs font-normal text-amber-500 flex items-center gap-0.5">
                          <Star className="w-3.5 h-3.5 fill-amber-400" /> {inst.rating}/5.0
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        Tổng dạy: {inst.hours} giờ • {inst.students} lượt học viên
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="success">Tỷ lệ có mặt: {inst.attendance}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {reportTab === 'rooms' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-gray-900">Tỷ Lệ Lấp Đầy Theo Phòng Tập (%)</h2>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roomUtilizationData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis unit="%" />
                    <Tooltip formatter={(val: any) => [`${val}%`, 'Tỷ lệ lấp đầy']} />
                    <Bar dataKey="occupancy" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-gray-900">Thống Kê Khung Giờ Cao Điểm</h2>
              <div className="space-y-3 text-sm">
                <div className="p-3 bg-red-50 rounded-xl border border-red-100 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-red-800">17:30 - 19:30 (Khung Giờ Vàng)</div>
                    <div className="text-xs text-red-600 mt-0.5">Tỷ lệ đặt kín chỗ: 96% (Cần mở thêm ca)</div>
                  </div>
                  <Badge variant="danger">Cao điểm</Badge>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-blue-800">07:30 - 09:30 (Sáng sớm)</div>
                    <div className="text-xs text-blue-600 mt-0.5">Tỷ lệ đặt kín chỗ: 82% (Ổn định)</div>
                  </div>
                  <Badge variant="default">Ổn định</Badge>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-gray-800">12:00 - 14:00 (Buổi trưa)</div>
                    <div className="text-xs text-gray-500 mt-0.5">Tỷ lệ đặt kín chỗ: 45% (Khuyến mãi giờ trưa)</div>
                  </div>
                  <Badge variant="secondary">Thấp</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
