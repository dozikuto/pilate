import { useState, useEffect } from 'react'
import { Save, Building2, CreditCard, Shield, Database, Download, Upload } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input, NumberInput } from '@/components/ui/Input'
import { parseNumberInput } from '@/lib/numberInput'
import toast from 'react-hot-toast'
import { api } from '@/lib/axios'

export default function SettingsPage() {
  const [studioName, setStudioName] = useState('')
  const [studioAddress, setStudioAddress] = useState('')
  const [studioPhone, setStudioPhone] = useState('')
  const [studioEmail, setStudioEmail] = useState('')
  const [cancelHoursLimit, setCancelHoursLimit] = useState('2')
  const [autoPromoteWaitlist, setAutoPromoteWaitlist] = useState(true)
  const [backups, setBackups] = useState<any[]>([])
  const [selectedBackup, setSelectedBackup] = useState('')
  const [busy, setBusy] = useState(false)

  async function refresh() {
    const [config, backupList] = await Promise.all([api.get('/system/config'), api.get('/system/backups')])
    const c = config.data
    setStudioName(c.studioName)
    setStudioAddress(c.studioAddress ?? c.address)
    setStudioPhone(c.studioPhone ?? c.hotline)
    setStudioEmail(c.studioEmail ?? c.email)
    setCancelHoursLimit(String(c.cancelHoursLimit ?? 2))
    setAutoPromoteWaitlist(c.autoPromoteWaitlist !== false)
    setBackups(backupList.data)
  }
  useEffect(() => { refresh().catch(() => toast.error('Không tải được cấu hình hệ thống')) }, [])

  const handleSaveSettings = async () => {
    const hours = parseNumberInput(cancelHoursLimit)
    if (!Number.isInteger(hours) || hours < 0 || hours > 168) {
      toast.error('Thời gian hủy lớp phải là số giờ nguyên từ 0 đến 168')
      return
    }
    setBusy(true)
    try {
      await api.patch('/system/config', {
        studioName,
        address: studioAddress,
        hotline: studioPhone,
        email: studioEmail,
        cancelHoursLimit: hours,
        autoPromoteWaitlist,
      })
      await refresh(); toast.success('Đã lưu cấu hình hệ thống')
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Không lưu được cấu hình') }
    finally { setBusy(false) }
  }
  const handleBackup = async () => {
    setBusy(true)
    try {
      const { data } = await api.post('/system/backup')
      const file = await api.get('/system/backups/' + data.backupId + '/download', { responseType: 'blob' })
      const url = URL.createObjectURL(file.data)
      const link = document.createElement('a'); link.href = url; link.download = data.filename; link.click(); URL.revokeObjectURL(url)
      setSelectedBackup(data.backupId); await refresh(); toast.success('Đã tạo và tải bản sao lưu dữ liệu')
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Không tạo được bản sao lưu') }
    finally { setBusy(false) }
  }
  const handleRestore = async () => {
    if (!selectedBackup) { toast.error('Chọn bản sao lưu cần khôi phục'); return }
    if (!window.confirm('Khôi phục sẽ thay thế dữ liệu hiện tại bằng bản sao lưu đã chọn. Tiếp tục?')) return
    setBusy(true)
    try { await api.post('/system/restore/' + selectedBackup); await refresh(); toast.success('Đã khôi phục dữ liệu') }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Không khôi phục được dữ liệu') }
    finally { setBusy(false) }
  }

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
              <NumberInput
                aria-label="Thời gian hủy lớp tối thiểu (giờ)"
                min={0}
                max={168}
                value={cancelHoursLimit}
                onValueChange={setCancelHoursLimit}
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
            <input
              type="checkbox"
              aria-label="Tự động đôn học viên từ Waitlist"
              checked={autoPromoteWaitlist}
              onChange={(e) => setAutoPromoteWaitlist(e.target.checked)}
              className="w-4 h-4 text-primary rounded cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-primary font-bold text-base pb-3 border-b border-gray-100">
          <CreditCard className="w-5 h-5" />
          <span>Cổng Thanh Toán</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          <span>Sao Lưu & Khôi Phục Dữ Liệu</span>
        </div>

        <select className="border rounded-lg p-2 w-full" aria-label="Bản sao lưu" value={selectedBackup} onChange={e => setSelectedBackup(e.target.value)}>
          <option value="">Chọn bản sao lưu</option>
          {backups.map(b => <option key={b.backupId} value={b.backupId}>{b.filename} — {new Date(b.createdAt).toLocaleString('vi-VN')}</option>)}
        </select>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border rounded-xl flex items-center justify-between bg-gray-50">
            <div>
              <div className="font-semibold text-sm text-gray-900">Sao lưu tự động CSDL</div>
              <div className="text-xs text-gray-500 mt-0.5">{backups[0] ? 'Gần nhất: ' + new Date(backups[0].createdAt).toLocaleString('vi-VN') + ' (' + backups[0].sizeBytes + ' bytes)' : 'Chưa có bản sao lưu'}</div>
            </div>
            <Button variant="outline" size="sm" disabled={busy} onClick={handleBackup} className="flex items-center gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" /> Sao lưu ngay
            </Button>
          </div>

          <div className="p-4 border rounded-xl flex items-center justify-between bg-gray-50">
            <div>
              <div className="font-semibold text-sm text-gray-900">Khôi phục điểm dữ liệu</div>
              <div className="text-xs text-gray-500 mt-0.5">Khôi phục dữ liệu từ bản sao lưu JSON của hệ thống</div>
            </div>
            <Button variant="outline" size="sm" disabled={busy || !selectedBackup} onClick={handleRestore} className="flex items-center gap-1.5 text-xs text-red-600 border-red-200 hover:bg-red-50">
              <Upload className="w-3.5 h-3.5" /> Khôi phục
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button disabled={busy} onClick={handleSaveSettings} className="flex items-center gap-2">
          <Save className="w-4 h-4" />
          Lưu Cài Đặt
        </Button>
      </div>
    </div>
  )
}
