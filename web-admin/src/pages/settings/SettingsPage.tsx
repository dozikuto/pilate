import { useState } from 'react'
import { Save, Building2, Bell, Shield, Smartphone, Database, Download, Upload, History } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export default function SettingsPage() {
  const [studioName, setStudioName] = useState('PilatesMS Studio')
  const [studioAddress, setStudioAddress] = useState('123 Nguyễn Thị Minh Khai, Bến Thành, Quận 1, TP.HCM')
  const [studioPhone, setStudioPhone] = useState('028 3812 3456')
  const [studioEmail, setStudioEmail] = useState('contact@pilatesms.vn')
  const [cancelHoursLimit, setCancelHoursLimit] = useState(2)

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cài Đặt Hệ Thống</h1>
        <p className="text-gray-500 text-sm mt-1">
          Cấu hình thông tin phòng tập, chính sách đặt hủy lớp và kết nối tích hợp
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-primary font-bold text-base pb-3 border-b border-gray-100">
          <Building2 className="w-5 h-5" />
          <span>Thông Tin Phòng Tập</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Tên Thương Hiệu Studio</label>
            <Input value={studioName} onChange={(e) => setStudioName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Số điện thoại Hotline</label>
            <Input value={studioPhone} onChange={(e) => setStudioPhone(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Email liên hệ</label>
            <Input value={studioEmail} onChange={(e) => setStudioEmail(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Địa chỉ trụ sở chính</label>
            <Input value={studioAddress} onChange={(e) => setStudioAddress(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-primary font-bold text-base pb-3 border-b border-gray-100">
          <Shield className="w-5 h-5" />
          <span>Chính Sách Đặt & Hủy Lớp</span>
        </div>

        <div className="space-y-4 text-sm text-gray-700">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <div className="font-semibold text-gray-900">Thời gian hủy lớp tối thiểu (No-show policy)</div>
              <div className="text-xs text-gray-500 mt-0.5">
                Nếu học viên hủy trễ hơn số giờ này, hệ thống sẽ tự động trừ 1 buổi trong gói
              </div>
            </div>
            <div className="w-28 flex items-center gap-1.5">
              <Input
                type="number"
                value={cancelHoursLimit}
                onChange={(e) => setCancelHoursLimit(Number(e.target.value))}
              />
              <span className="text-xs font-semibold text-gray-500">Giờ</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <div className="font-semibold text-gray-900">Tự động đôn học viên từ Waitlist</div>
              <div className="text-xs text-gray-500 mt-0.5">
                Khi có người hủy lớp, tự động chuyển người đầu danh sách chờ sang lớp chính thức
              </div>
            </div>
            <input type="checkbox" defaultChecked className="w-4 h-4 text-primary rounded" />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-primary font-bold text-base pb-3 border-b border-gray-100">
          <Bell className="w-5 h-5" />
          <span>Cổng Thông Báo & Tích Hợp</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-500 text-white font-bold flex items-center justify-center text-xs">
                Zalo
              </div>
              <div>
                <div className="font-semibold text-sm">Zalo Official Account</div>
                <div className="text-xs text-green-600 font-medium">Đã kết nối</div>
              </div>
            </div>
            <Button variant="outline" size="sm">Cấu hình</Button>
          </div>

          <div className="p-4 border rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-500 text-white font-bold flex items-center justify-center text-xs">
                VietQR
              </div>
              <div>
                <div className="font-semibold text-sm">Cổng VietQR Tự Động</div>
                <div className="text-xs text-green-600 font-medium">Đang hoạt động</div>
              </div>
            </div>
            <Button variant="outline" size="sm">Cấu hình</Button>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-primary font-bold text-base pb-3 border-b border-gray-100">
          <Database className="w-5 h-5" />
          <span>Sao Lưu & Khôi Phục Dữ Liệu (R7.6, R7.7)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-xl flex items-center justify-between bg-gray-50">
            <div>
              <div className="font-semibold text-sm text-gray-900">Sao lưu tự động CSDL</div>
              <div className="text-xs text-gray-500 mt-0.5">Bản sao lưu gần nhất: Hôm nay 04:00 AM (1.5 MB)</div>
            </div>
            <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" /> Sao lưu ngay
            </Button>
          </div>

          <div className="p-4 border rounded-xl flex items-center justify-between bg-gray-50">
            <div>
              <div className="font-semibold text-sm text-gray-900">Khôi phục điểm dữ liệu</div>
              <div className="text-xs text-gray-500 mt-0.5">Phục hồi lại trạng thái hệ thống từ file .sql</div>
            </div>
            <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-xs text-red-600 border-red-200 hover:bg-red-50">
              <Upload className="w-3.5 h-3.5" /> Khôi phục
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-primary font-bold text-base pb-3 border-b border-gray-100">
          <History className="w-5 h-5" />
          <span>Nhật Ký Thao Tác Hệ Thống (R7.5)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 uppercase border-b border-gray-100">
              <tr>
                <th className="py-2.5 px-3">Thời gian</th>
                <th className="py-2.5 px-3">Người thực hiện</th>
                <th className="py-2.5 px-3">Hành động</th>
                <th className="py-2.5 px-3">Tài nguyên</th>
                <th className="py-2.5 px-3">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              <tr>
                <td className="py-2.5 px-3 font-mono text-gray-400">14:55:00</td>
                <td className="py-2.5 px-3 font-semibold">Admin (admin@pilatesms.vn)</td>
                <td className="py-2.5 px-3"><span className="bg-blue-50 text-blue-700 font-semibold px-2 py-0.5 rounded">CONFIG_UPDATE</span></td>
                <td className="py-2.5 px-3">System</td>
                <td className="py-2.5 px-3 text-gray-500">Cập nhật thông tin phòng tập</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono text-gray-400">11:15:20</td>
                <td className="py-2.5 px-3 font-semibold">Lễ tân (letan@pilatesms.vn)</td>
                <td className="py-2.5 px-3"><span className="bg-green-50 text-green-700 font-semibold px-2 py-0.5 rounded">CHECK_IN</span></td>
                <td className="py-2.5 px-3">Booking</td>
                <td className="py-2.5 px-3 text-gray-500">QR Check-in học viên Nguyễn Thu Hằng</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono text-gray-400">09:30:12</td>
                <td className="py-2.5 px-3 font-semibold">Học viên (hang.nguyen@gmail.com)</td>
                <td className="py-2.5 px-3"><span className="bg-purple-50 text-purple-700 font-semibold px-2 py-0.5 rounded">BOOKING</span></td>
                <td className="py-2.5 px-3">ClassSchedule</td>
                <td className="py-2.5 px-3 text-gray-500">Đặt chỗ lớp Reformer Fundamentals</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button className="flex items-center gap-2">
          <Save className="w-4 h-4" />
          Lưu Cài Đặt
        </Button>
      </div>
    </div>
  )
}
