import { useState, useEffect } from 'react'
import {
  Plus, Wrench, CheckCircle2, AlertTriangle, XCircle, Calendar,
  Hash, Bell, Send, Check, ShieldAlert, Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import api from '@/lib/axios'
import toast from 'react-hot-toast'

interface EqItem {
  id: string
  name: string
  type: string
  serialNumber: string
  roomName: string
  status: 'available' | 'in_use' | 'maintenance' | 'broken'
  purchaseDate: string
  lastMaintenance: string
  nextMaintenance: string
}

interface MaintenanceSchedule {
  id: string
  equipmentId: string
  equipmentName: string
  scheduledDate: string
  technician: string
  description: string
  status: 'scheduled' | 'in_progress' | 'completed'
  notificationSent: boolean
}

const mockEquipment: EqItem[] = [
  {
    id: 'e1',
    name: 'Máy Reformer Allegro 2 #01',
    type: 'Reformer',
    serialNumber: 'REF-2024-001',
    roomName: 'Phòng Reformer 1',
    status: 'available',
    purchaseDate: '2024-01-10',
    lastMaintenance: '2024-06-10',
    nextMaintenance: '2024-12-10',
  },
  {
    id: 'e2',
    name: 'Máy Reformer Allegro 2 #02',
    type: 'Reformer',
    serialNumber: 'REF-2024-002',
    roomName: 'Phòng Reformer 1',
    status: 'available',
    purchaseDate: '2024-01-10',
    lastMaintenance: '2024-06-10',
    nextMaintenance: '2024-12-10',
  },
  {
    id: 'e3',
    name: 'Máy Reformer Allegro 2 #03',
    type: 'Reformer',
    serialNumber: 'REF-2024-003',
    roomName: 'Phòng Reformer 1',
    status: 'maintenance',
    purchaseDate: '2024-01-10',
    lastMaintenance: '2024-09-15',
    nextMaintenance: '2024-10-15',
  },
  {
    id: 'e4',
    name: 'Cadillac Trapeze Table Studio',
    type: 'Cadillac',
    serialNumber: 'CAD-2024-001',
    roomName: 'Phòng VIP Private',
    status: 'available',
    purchaseDate: '2024-02-15',
    lastMaintenance: '2024-08-15',
    nextMaintenance: '2025-02-15',
  },
  {
    id: 'e5',
    name: 'Ghế Wunda Chair Balanced Body',
    type: 'Chair',
    serialNumber: 'CHA-2024-001',
    roomName: 'Phòng Đa Năng 2',
    status: 'broken',
    purchaseDate: '2024-03-01',
    lastMaintenance: '2024-07-01',
    nextMaintenance: '2024-09-30',
  },
  {
    id: 'e6',
    name: 'Thang Khung Ladder Barrel Pro',
    type: 'Barrel',
    serialNumber: 'BAR-2024-001',
    roomName: 'Phòng Đa Năng 2',
    status: 'available',
    purchaseDate: '2024-03-01',
    lastMaintenance: '2024-09-01',
    nextMaintenance: '2025-03-01',
  },
]

const initialMaintenanceSchedules: MaintenanceSchedule[] = [
  {
    id: 'ms1',
    equipmentId: 'e3',
    equipmentName: 'Máy Reformer Allegro 2 #03',
    scheduledDate: '2026-10-10',
    technician: 'Kỹ thuật viên Balanced Body VN',
    description: 'Thay thế lò xo kháng lực đỏ và bôi trơn ray trượt bánh xe',
    status: 'in_progress',
    notificationSent: true,
  },
  {
    id: 'ms2',
    equipmentId: 'e5',
    equipmentName: 'Ghế Wunda Chair Balanced Body',
    scheduledDate: '2026-10-12',
    technician: 'Đội bảo trì thiết bị nội bộ',
    description: 'Sửa chốt bàn đạp và thay đệm da bị sờn rách',
    status: 'scheduled',
    notificationSent: true,
  },
  {
    id: 'ms3',
    equipmentId: 'e4',
    equipmentName: 'Cadillac Trapeze Table Studio',
    scheduledDate: '2026-10-25',
    technician: 'Chuyên gia bảo dưỡng định kỳ',
    description: 'Kiểm tra độ võng của khung thép và độ an toàn móc treo Trapeze',
    status: 'scheduled',
    notificationSent: false,
  },
]

export default function EquipmentPage() {
  const [activeTab, setActiveTab] = useState<'equipment' | 'maintenance'>('equipment')
  const [equipment, setEquipment] = useState<EqItem[]>(mockEquipment)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState({
    name: '',
    type: 'Reformer',
    serialNumber: '',
    roomName: '',
    status: 'available' as EqItem['status'],
    purchaseDate: '',
    nextMaintenance: '',
  })

  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>(initialMaintenanceSchedules)
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false)
  const [maintenanceForm, setMaintenanceForm] = useState({
    equipmentId: '',
    scheduledDate: '',
    technician: '',
    description: '',
  })
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null)

  const filtered = equipment.filter((eq) => {
    if (filterStatus !== 'all' && eq.status !== filterStatus) return false
    if (filterType !== 'all' && eq.type !== filterType) return false
    return true
  })

  const getStatusBadge = (status: EqItem['status']) => {
    switch (status) {
      case 'available':
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Sẵn sàng
          </Badge>
        )
      case 'in_use':
        return (
          <Badge variant="info" className="flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Đang dùng
          </Badge>
        )
      case 'maintenance':
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <Wrench className="w-3 h-3" /> Bảo trì
          </Badge>
        )
      case 'broken':
        return (
          <Badge variant="danger" className="flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Hỏng
          </Badge>
        )
    }
  }

  useEffect(() => {
    api.get('/equipment')
      .then((res) => {
        const data = res.data?.data || res.data
        const items = Array.isArray(data) ? data : data?.items || []
        if (items.length > 0) {
          setEquipment(
            items.map((eq: any) => ({
              id: eq.id,
              name: eq.name,
              type: eq.type ? (eq.type.charAt(0).toUpperCase() + eq.type.slice(1)) : 'Reformer',
              serialNumber: eq.serialNumber || 'REF-2024-001',
              roomName: eq.branch?.name || 'Phòng Reformer 1',
              status: eq.status || 'available',
              purchaseDate: eq.purchaseDate ? eq.purchaseDate.split('T')[0] : '2024-01-10',
              lastMaintenance: eq.lastMaintenanceDate ? eq.lastMaintenanceDate.split('T')[0] : '2024-06-10',
              nextMaintenance: eq.nextMaintenanceDate ? eq.nextMaintenanceDate.split('T')[0] : '2024-12-10',
            }))
          )
        }
      })
      .catch(() => {})
  }, [])

  const handleAddEquipment = async () => {
    if (!form.name || !form.serialNumber) {
      toast.error('Vui lòng nhập tên thiết bị và mã seri')
      return
    }
    const newItem: EqItem = {
      id: `e-${Date.now()}`,
      name: form.name,
      type: form.type,
      serialNumber: form.serialNumber,
      roomName: form.roomName || 'Phòng Chung',
      status: form.status,
      purchaseDate: form.purchaseDate || new Date().toISOString().split('T')[0],
      lastMaintenance: new Date().toISOString().split('T')[0],
      nextMaintenance: form.nextMaintenance || '2027-01-01',
    }
    try {
      const res = await api.post('/equipment', {
        name: form.name,
        type: form.type as any,
        serialNumber: form.serialNumber,
        status: form.status,
        purchaseDate: form.purchaseDate || new Date().toISOString().split('T')[0],
        nextMaintenanceDate: form.nextMaintenance || '2027-01-01',
      })
      const saved = res.data?.data || res.data
      if (saved?.id) newItem.id = saved.id
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không lưu được thiết bị vào hệ thống')
      return
    }
    setEquipment([newItem, ...equipment])
    setIsModalOpen(false)
    toast.success('Đã lưu thiết bị mới thành công!')
  }

  const handleCreateMaintenance = async () => {
    if (!maintenanceForm.equipmentId || !maintenanceForm.scheduledDate) {
      toast.error('Vui lòng chọn thiết bị và ngày bảo trì')
      return
    }
    const selectedEq = equipment.find((e) => e.id === maintenanceForm.equipmentId)
    const newSchedule: MaintenanceSchedule = {
      id: `ms-${Date.now()}`,
      equipmentId: maintenanceForm.equipmentId,
      equipmentName: selectedEq?.name || 'Thiết bị Pilates',
      scheduledDate: maintenanceForm.scheduledDate,
      technician: maintenanceForm.technician || 'Kỹ thuật viên bảo trì',
      description: maintenanceForm.description || 'Bảo dưỡng định kỳ',
      status: 'scheduled',
      notificationSent: false,
    }
    setSchedules([newSchedule, ...schedules])
    setEquipment(equipment.map(e => e.id === maintenanceForm.equipmentId ? { ...e, status: 'maintenance' } : e))
    try {
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(maintenanceForm.equipmentId)) {
        await api.patch(`/equipment/${maintenanceForm.equipmentId}`, {
          status: 'maintenance',
          nextMaintenanceDate: maintenanceForm.scheduledDate,
        })
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không lưu được lịch bảo trì vào hệ thống')
      return
    }
    setIsMaintenanceModalOpen(false)
    setMaintenanceForm({ equipmentId: '', scheduledDate: '', technician: '', description: '' })
    toast.success('Đã lên lịch bảo trì thiết bị thành công!')
  }

  const [sendingNoticeId, setSendingNoticeId] = useState<string | null>(null)

  const handleSendNotification = async (scheduleId: string) => {
    const sch = schedules.find((s) => s.id === scheduleId)
    if (!sch) return

    setSendingNoticeId(scheduleId)
    try {
      await api.post('/notifications/broadcast', {
        title: `[Thông Báo Bảo Trì Thiết Bị] ${sch.equipmentName}`,
        message: `Kính gửi Bộ phận Lễ tân, Huấn luyện viên và Hội viên: Thiết bị ${sch.equipmentName} (${sch.description || 'Bảo dưỡng định kỳ'}) sẽ được tiến hành bảo dưỡng vào ngày ${sch.scheduledDate}. Vui lòng sắp xếp và điều phối phòng tập phù hợp.`,
        equipmentName: sch.equipmentName,
      })

      setSchedules(
        schedules.map((s) => (s.id === scheduleId ? { ...s, notificationSent: true } : s))
      )
      toast.success(`Đã phát thông báo bảo trì thành công tới Lễ tân, Huấn luyện viên và Học viên!`)
      setNoticeMessage(`Đã phát thông báo bảo trì thành công cho ${sch.equipmentName} đến toàn thể Lễ tân, HLV và học viên!`)
      setTimeout(() => setNoticeMessage(null), 5000)
    } catch {
      toast.error('Gửi thông báo thất bại, vui lòng thử lại!')
    } finally {
      setSendingNoticeId(null)
    }
  }

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản Lý Thiết Bị & Bảo Trì</h1>
          <p className="text-gray-500 text-sm mt-1">
            Theo dõi tình trạng máy Reformer, Cadillac, ghế tập và lên lịch bảo trì định kỳ
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'equipment' && (
            <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Thêm Thiết Bị Mới
            </Button>
          )}
          {activeTab === 'maintenance' && (
            <Button onClick={() => setIsMaintenanceModalOpen(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Lên Lịch Bảo Trì Mới
            </Button>
          )}
        </div>
      </div>

      <div className="flex border-b border-gray-200 gap-2 bg-white p-1 rounded-xl border">
        <button
          onClick={() => setActiveTab('equipment')}
          className={`flex items-center gap-2 px-5 py-2.5 font-medium text-sm rounded-lg transition-colors ${
            activeTab === 'equipment'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Hash className="w-4 h-4" /> Danh Sách Thiết Bị ({equipment.length})
        </button>
        <button
          onClick={() => setActiveTab('maintenance')}
          className={`flex items-center gap-2 px-5 py-2.5 font-medium text-sm rounded-lg transition-colors ${
            activeTab === 'maintenance'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Wrench className="w-4 h-4" /> Lịch Bảo Trì & Thông Báo ({schedules.length})
        </button>
      </div>

      {noticeMessage && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-sm flex items-center gap-2">
          <Bell className="w-4 h-4 text-blue-600" /> {noticeMessage}
        </div>
      )}

      {activeTab === 'equipment' && (
        <div className="space-y-4">
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between text-xs text-gray-500 font-semibold uppercase">
                <span>Tổng Thiết Bị</span>
                <Hash className="w-4 h-4 text-primary" />
              </div>
              <div className="text-2xl font-black text-gray-900 mt-2">{equipment.length}</div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between text-xs text-green-600 font-semibold uppercase">
                <span>Sẵn Sàng</span>
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              </div>
              <div className="text-2xl font-black text-green-600 mt-2">
                {equipment.filter((e) => e.status === 'available').length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between text-xs text-amber-600 font-semibold uppercase">
                <span>Đang Bảo Trì</span>
                <Wrench className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-amber-600 mt-2">
                {equipment.filter((e) => e.status === 'maintenance').length}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between text-xs text-red-600 font-semibold uppercase">
                <span>Cần Sửa Chữa</span>
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-2xl font-black text-red-600 mt-2">
                {equipment.filter((e) => e.status === 'broken').length}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Tên Thiết Bị</th>
                    <th className="px-5 py-3.5">Mã Serial</th>
                    <th className="px-5 py-3.5">Loại</th>
                    <th className="px-5 py-3.5">Phòng Đặt</th>
                    <th className="px-5 py-3.5">Trạng Thái</th>
                    <th className="px-5 py-3.5">Bảo Trì Tiếp Theo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {filtered.map((eq) => (
                    <tr key={eq.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-bold text-gray-900">{eq.name}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{eq.serialNumber}</td>
                      <td className="px-5 py-3.5">
                        <span className="font-medium bg-gray-100 px-2 py-0.5 rounded text-xs">{eq.type}</span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">{eq.roomName}</td>
                      <td className="px-5 py-3.5">{getStatusBadge(eq.status)}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-gray-500">{eq.nextMaintenance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'maintenance' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-gray-900">Kế Hoạch & Lịch Bảo Trì Thiết Bị Định Kỳ</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Phát thông báo bảo trì sẽ gửi cảnh báo đến toàn bộ lễ tân và HLV, tạm khóa thiết bị để bảo dưỡng
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3.5">Thiết Bị Cần Bảo Trì</th>
                    <th className="px-5 py-3.5">Ngày Hẹn</th>
                    <th className="px-5 py-3.5">Đơn Vị Kỹ Thuật</th>
                    <th className="px-5 py-3.5">Nội Dung Bảo Trì</th>
                    <th className="px-5 py-3.5 text-center">Trạng Thái</th>
                    <th className="px-5 py-3.5 text-right">Thông Báo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {schedules.map((sch) => (
                    <tr key={sch.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3.5 font-bold text-gray-900">{sch.equipmentName}</td>
                      <td className="px-5 py-3.5 font-mono text-xs text-primary font-semibold">
                        {sch.scheduledDate}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-600">{sch.technician}</td>
                      <td className="px-5 py-3.5 text-xs text-gray-700 max-w-xs">{sch.description}</td>
                      <td className="px-5 py-3.5 text-center">
                        <Badge
                          variant={
                            sch.status === 'completed'
                              ? 'success'
                              : sch.status === 'in_progress'
                              ? 'warning'
                              : 'default'
                          }
                        >
                          {sch.status === 'completed'
                            ? 'Đã xong'
                            : sch.status === 'in_progress'
                            ? 'Đang thực hiện'
                            : 'Đã lên lịch'}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {sch.notificationSent ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                            <Check className="w-3.5 h-3.5" /> Đã thông báo
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={sendingNoticeId === sch.id}
                            onClick={() => handleSendNotification(sch.id)}
                            className="text-xs flex items-center gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50 ml-auto"
                          >
                            {sendingNoticeId === sch.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            Phát Thông Báo
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Thêm Thiết Bị Mới">
          <div className="space-y-4 py-2 text-sm">
            <div>
              <label className="font-medium text-gray-700 block mb-1">Tên thiết bị *</label>
              <Input
                placeholder="VD: Máy Reformer Allegro 2 #05"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-medium text-gray-700 block mb-1">Loại thiết bị</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="Reformer">Reformer</option>
                  <option value="Cadillac">Cadillac</option>
                  <option value="Chair">Chair</option>
                  <option value="Barrel">Barrel</option>
                  <option value="SpineCorrector">Spine Corrector</option>
                </select>
              </div>
              <div>
                <label className="font-medium text-gray-700 block mb-1">Mã Serial *</label>
                <Input
                  placeholder="REF-2024-005"
                  value={form.serialNumber}
                  onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="font-medium text-gray-700 block mb-1">Phòng đặt máy</label>
              <Input
                placeholder="Phòng Reformer 1"
                value={form.roomName}
                onChange={(e) => setForm({ ...form, roomName: e.target.value })}
              />
            </div>
          </div>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button onClick={handleAddEquipment}>Lưu Thiết Bị</Button>
          </ModalFooter>
        </Modal>
      )}

      {isMaintenanceModalOpen && (
        <Modal
          open={isMaintenanceModalOpen}
          onClose={() => setIsMaintenanceModalOpen(false)}
          title="Lên Lịch Bảo Trì Thiết Bị Mới"
        >
          <div className="space-y-4 py-2 text-sm">
            <div>
              <label className="font-medium text-gray-700 block mb-1">Chọn thiết bị bảo dưỡng *</label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                value={maintenanceForm.equipmentId}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, equipmentId: e.target.value })}
              >
                <option value="">-- Chọn thiết bị --</option>
                {equipment.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.name} ({eq.serialNumber})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-medium text-gray-700 block mb-1">Ngày hẹn bảo trì *</label>
                <Input
                  type="date"
                  value={maintenanceForm.scheduledDate}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, scheduledDate: e.target.value })}
                />
              </div>
              <div>
                <label className="font-medium text-gray-700 block mb-1">Đơn vị / Kỹ thuật viên</label>
                <Input
                  placeholder="Kỹ thuật Balanced Body"
                  value={maintenanceForm.technician}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, technician: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="font-medium text-gray-700 block mb-1">Nội dung bảo trì chi tiết</label>
              <textarea
                className="w-full border rounded-lg p-3 text-sm min-h-[70px]"
                placeholder="Thay lò xo, tra dầu trục trượt, kiểm tra an toàn móc khóa..."
                value={maintenanceForm.description}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
              />
            </div>
          </div>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsMaintenanceModalOpen(false)}>Hủy</Button>
            <Button onClick={handleCreateMaintenance}>Lên Lịch & Cập Nhật Trạng Thái</Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  )
}
