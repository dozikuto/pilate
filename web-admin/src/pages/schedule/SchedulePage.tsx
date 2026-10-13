import { useState } from 'react'
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  MapPin,
  Users,
  Trash2,
  CheckCircle,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/axios'
import { useSchedules, useCreateSchedule, useDeleteSchedule } from '@/hooks/useSchedules'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'

interface FormScheduleState {
  classId: string
  instructorId: string
  roomId: string
  startTime: string
  endTime: string
  maxCapacity: number
  notes: string
}

export default function SchedulePage() {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  })

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<any | null>(null)

  const { data: rawSchedules, isLoading: schedulesLoading } = useSchedules({
    date: selectedDate,
  } as any)

  const createSchedule = useCreateSchedule()
  const deleteSchedule = useDeleteSchedule()

  const { data: classesData } = useQuery({
    queryKey: ['classes-list'],
    queryFn: async () => {
      const res = await api.get<any>('/classes')
      const d = res.data?.data ?? res.data
      return Array.isArray(d) ? d : (d?.items ?? [])
    },
  })

  const { data: instructorsData } = useQuery({
    queryKey: ['instructors-list'],
    queryFn: async () => {
      const res = await api.get<any>('/instructors')
      const d = res.data?.data ?? res.data
      return Array.isArray(d) ? d : (d?.items ?? [])
    },
  })

  const [formData, setFormData] = useState<FormScheduleState>({
    classId: '',
    instructorId: '',
    roomId: 'abd40778-e804-4237-8d66-2ee8dce7456f',
    startTime: '09:00',
    endTime: '09:55',
    maxCapacity: 8,
    notes: '',
  })

  const daysOfWeek = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
  const today = new Date(selectedDate)
  const dayName = isNaN(today.getTime()) ? '' : daysOfWeek[today.getDay()]

  const handlePrevDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    setSelectedDate(`${y}-${m}-${day}`)
  }

  const handleNextDay = () => {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 1)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    setSelectedDate(`${y}-${m}-${day}`)
  }

  const handleGoToday = () => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    setSelectedDate(`${y}-${m}-${d}`)
  }

  const schedulesList: any[] = Array.isArray(rawSchedules)
    ? rawSchedules
    : (rawSchedules as any)?.data || (rawSchedules as any)?.items || []

  const formattedSchedules = schedulesList
    .filter((s: any) => s.status !== 'cancelled' && s.scheduleStatus !== 'cancelled')
    .map((s: any) => {
    const startDate = new Date(s.startTime)
    const endDate = new Date(s.endTime)

    const startH = isNaN(startDate.getTime())
      ? '09:00'
      : startDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
    const endH = isNaN(endDate.getTime())
      ? '09:55'
      : endDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })

    const enrolled = s.currentEnrolled ?? s.enrolled ?? s.bookings?.filter((b: any) => b.status === 'confirmed').length ?? 0
    const cap = s.maxCapacity ?? s.capacity ?? 8
    const isPrivate = s.class?.type === 'private' || s.className?.toLowerCase().includes('private')

    return {
      id: s.id,
      className: s.className || s.class?.name || 'Lớp Pilates',
      classType: isPrivate ? 'Cá nhân (1:1)' : 'Lớp Nhóm',
      instructorName: s.instructor?.fullName || 'HLV Pilates',
      roomName: typeof s.room === 'string' ? s.room : s.room?.name || 'Phòng tập',
      startTime: startH,
      endTime: endH,
      currentEnrolled: enrolled,
      maxCapacity: cap,
      status: s.status || 'scheduled',
      color: isPrivate ? '#7C3AED' : s.className?.includes('Cột Sống') ? '#2563EB' : '#1A3A5C',
      bookings: s.bookings || [],
    }
  })

  const handleCreateSubmit = () => {
    if (!formData.classId) {
      alert('Vui lòng chọn lớp học')
      return
    }
    if (!formData.instructorId) {
      alert('Vui lòng chọn huấn luyện viên')
      return
    }

    const startIso = new Date(`${selectedDate}T${formData.startTime}:00+07:00`).toISOString()
    const endIso = new Date(`${selectedDate}T${formData.endTime}:00+07:00`).toISOString()

    createSchedule.mutate(
      {
        classId: formData.classId,
        instructorId: formData.instructorId,
        roomId: formData.roomId,
        startTime: startIso,
        endTime: endIso,
        maxCapacity: Number(formData.maxCapacity) || 8,
        notes: formData.notes,
        isRecurring: false,
      },
      {
        onSuccess: () => {
          setIsAddModalOpen(false)
        },
      }
    )
  }

  const handleDeleteSchedule = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn hủy lịch học này?')) {
      deleteSchedule.mutate(id, {
        onSuccess: () => {
          setSelectedSchedule(null)
        },
      })
    }
  }

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lịch Học & Đặt Chỗ</h1>
          <p className="text-gray-500 text-sm mt-1">
            Quản lý và điều phối các buổi học đồng bộ trực tiếp với hệ thống học viên
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Tạo Lịch Học Mới
        </Button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevDay}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
            <CalendarIcon className="w-4 h-4 text-primary" />
            <span className="font-semibold text-gray-800">{dayName},</span>
            <span className="text-gray-600">{selectedDate}</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleNextDay}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={handleGoToday}>
          Hôm nay
        </Button>
      </div>

      {schedulesLoading ? (
        <div className="bg-white p-12 rounded-xl text-center border border-gray-100">
          <p className="text-gray-400 text-sm">Đang tải lịch học...</p>
        </div>
      ) : formattedSchedules.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {formattedSchedules.map((item) => {
            const isFull = item.currentEnrolled >= item.maxCapacity
            return (
              <div
                key={item.id}
                onClick={() => setSelectedSchedule(item)}
                className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4"
                style={{ borderLeftColor: item.color }}
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg text-gray-900">{item.className}</span>
                    <Badge variant={item.classType.includes('Nhóm') ? 'default' : 'secondary'}>
                      {item.classType}
                    </Badge>
                    {isFull && <Badge variant="danger">Đã đầy chỗ</Badge>}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5 font-semibold text-gray-800">
                      <Clock className="w-4 h-4 text-primary" />
                      {item.startTime} – {item.endTime}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <User className="w-4 h-4 text-gray-400" />
                      HLV: <strong className="text-gray-700">{item.instructorName}</strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {item.roomName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm font-semibold text-gray-700">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span>{item.currentEnrolled} / {item.maxCapacity} học viên</span>
                    </div>
                    <div className="w-32 bg-gray-200 rounded-full h-2 mt-1.5 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${
                          isFull ? 'bg-red-500' : 'bg-primary'
                        }`}
                        style={{
                          width: `${Math.min((item.currentEnrolled / item.maxCapacity) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Chi tiết & Sĩ số
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-xl text-center border border-gray-100">
          <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-800 mb-1">
            Không có ca lịch học nào trong ngày {selectedDate}
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            Bấm "Tạo Lịch Học Mới" để thêm ca học mới vào hệ thống
          </p>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Tạo Lịch Học
          </Button>
        </div>
      )}

      {selectedSchedule && (
        <Modal
          open={!!selectedSchedule}
          onClose={() => setSelectedSchedule(null)}
          title={`Chi tiết lớp: ${selectedSchedule.className}`}
        >
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div>
                <span className="text-gray-500 block text-xs">Thời gian:</span>
                <span className="font-bold text-gray-900">
                  {selectedSchedule.startTime} – {selectedSchedule.endTime}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">Huấn luyện viên:</span>
                <span className="font-bold text-gray-900">
                  {selectedSchedule.instructorName}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">Phòng tập:</span>
                <span className="font-bold text-gray-900">{selectedSchedule.roomName}</span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">Sĩ số hiện tại:</span>
                <span className="font-bold text-gray-900">
                  {selectedSchedule.currentEnrolled} / {selectedSchedule.maxCapacity} chỗ
                </span>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm text-gray-800 mb-2">
                Học viên đã đặt chỗ ({selectedSchedule.bookings?.length || 0}):
              </h4>
              {selectedSchedule.bookings && selectedSchedule.bookings.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedSchedule.bookings.map((b: any, idx: number) => {
                    const studentName = b.member?.user?.fullName || b.member?.name || 'Học viên'
                    const studentPhone = b.member?.user?.phone || b.member?.phone || ''
                    return (
                      <div
                        key={b.id || idx}
                        className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="font-semibold text-gray-800">{studentName}</span>
                          {studentPhone && <span className="text-gray-400 font-mono">({studentPhone})</span>}
                        </div>
                        <Badge variant="success">Đã xác nhận</Badge>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Chưa có học viên nào đặt chỗ cho lớp này.</p>
              )}
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm text-gray-800 mb-2">Sơ đồ máy tập (Spot map):</h4>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: selectedSchedule.maxCapacity }).map((_, i) => {
                  const isBooked = i < selectedSchedule.currentEnrolled
                  return (
                    <div
                      key={i}
                      className={`p-2.5 text-center rounded-lg border text-xs font-semibold ${
                        isBooked
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-green-50 text-green-700 border-green-200'
                      }`}
                    >
                      Máy #{i + 1}
                      <span className="block font-normal text-[10px] mt-0.5">
                        {isBooked ? 'Đã đặt' : 'Còn trống'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <ModalFooter>
            <Button variant="outline" onClick={() => setSelectedSchedule(null)}>
              Đóng
            </Button>
            <Button
              variant="danger"
              disabled={deleteSchedule.isPending}
              onClick={() => handleDeleteSchedule(selectedSchedule.id)}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Hủy Buổi Học
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {isAddModalOpen && (
        <Modal
          open={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title={`Tạo Lịch Học Mới — Ngày ${selectedDate}`}
        >
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Chọn lớp học *</label>
              <Select
                value={formData.classId}
                onChange={(val) => {
                  const clsId = val
                  const found = classesData?.find((c: any) => c.id === clsId)
                  setFormData((prev) => ({
                    ...prev,
                    classId: clsId,
                    instructorId: found?.defaultInstructorId || prev.instructorId,
                    roomId: found?.defaultRoomId || prev.roomId,
                    maxCapacity: found?.defaultMaxCapacity || prev.maxCapacity,
                  }))
                }}
                options={[
                  { value: '', label: '-- Chọn lớp học --' },
                  ...(classesData?.map((c: any) => ({
                    value: c.id,
                    label: `${c.name} (${c.type === 'private' ? '1:1' : 'Nhóm'})`,
                  })) || []),
                ]}
                placeholder="Chọn lớp học..."
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Huấn luyện viên *</label>
              <Select
                value={formData.instructorId}
                onChange={(val) => setFormData((prev) => ({ ...prev, instructorId: val }))}
                options={[
                  { value: '', label: '-- Chọn huấn luyện viên --' },
                  ...(instructorsData?.map((inst: any) => ({
                    value: inst.userId || inst.user?.id || inst.id,
                    label: inst.user?.fullName || inst.fullName || 'Huấn luyện viên',
                  })) || []),
                ]}
                placeholder="Chọn huấn luyện viên..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Giờ bắt đầu</label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Giờ kết thúc</label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Sĩ số tối đa</label>
              <Input
                type="number"
                value={formData.maxCapacity}
                onChange={(e) => setFormData((prev) => ({ ...prev, maxCapacity: Number(e.target.value) || 8 }))}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Ghi chú</label>
              <Input
                placeholder="Ví dụ: Nhớ mang vớ chống trượt..."
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Hủy
            </Button>
            <Button disabled={createSchedule.isPending} onClick={handleCreateSubmit}>
              {createSchedule.isPending ? 'Đang tạo...' : 'Tạo Lịch Học'}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  )
}
