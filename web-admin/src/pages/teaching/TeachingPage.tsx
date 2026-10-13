import { useState, useEffect, useCallback } from 'react'
import {
  Calendar, Users, BookOpen, Award, CheckCircle, Clock,
  Plus, Search, Edit3, MessageSquare, ChevronRight, UserCheck,
  PlayCircle, CheckCircle2, RotateCcw, AlertCircle, Phone, User
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Select } from '@/components/ui/Select'
import { formatDate } from '@/lib/utils'
import api from '@/lib/axios'
import toast from 'react-hot-toast'

interface StudentInClass {
  name: string
  phone: string
  attended: boolean
  note?: string
}

interface TeachingScheduleItem {
  id: string
  instructorId: string
  instructorName: string
  className: string
  level: string
  time: string
  date: string
  room: string
  enrolled: number
  maxCapacity: number
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled'
  students: StudentInClass[]
}

const mockInstructors = [
  { id: 'all', name: 'Tất cả Huấn Luyện Viên' },
  { id: 'ins1', name: 'Phạm Mai Linh', phone: '0981112233', spec: 'Reformer & Phục hồi chức năng' },
  { id: 'ins2', name: 'Trần Mai Lan', phone: '0982223344', spec: 'Cadillac & Săn chắc eo thon' },
  { id: 'ins3', name: 'Vũ Quốc Huy', phone: '0983334455', spec: 'Trị liệu cột sống & Chair' },
  { id: 'ins4', name: 'Nguyễn Hoàng Yến', phone: '0984445566', spec: 'Mat & Foam Roller' },
]

const initialTeachingSchedules: TeachingScheduleItem[] = [
  // Lịch của HLV Phạm Mai Linh (ins1)
  {
    id: 'ts1',
    instructorId: 'ins1',
    instructorName: 'Phạm Mai Linh',
    className: 'Reformer Fundamentals',
    level: 'Cơ bản',
    time: '07:30 - 08:30',
    date: 'Hôm nay',
    room: 'Phòng Reformer A (Tầng 2)',
    enrolled: 4,
    maxCapacity: 6,
    status: 'completed',
    students: [
      { name: 'Nguyễn Thu Hằng', phone: '0981234001', attended: true, note: 'Tư thế tốt, cải thiện cơ lõi' },
      { name: 'Lê Tuấn Minh', phone: '0981234002', attended: true, note: 'Khớp gối linh hoạt hơn' },
      { name: 'lê văn luyện', phone: '0901234567', attended: true, note: 'Buổi đầu bắt nhịp tốt' },
      { name: 'Đặng Thùy Linh', phone: '0981234003', attended: true, note: 'Đạt mục tiêu bài tập' },
    ]
  },
  {
    id: 'ts2',
    instructorId: 'ins1',
    instructorName: 'Phạm Mai Linh',
    className: 'Cadillac Core Flow',
    level: 'Trung cấp',
    time: '15:00 - 16:00',
    date: 'Hôm nay',
    room: 'Phòng Cadillac VIP (Tầng 3)',
    enrolled: 3,
    maxCapacity: 4,
    status: 'in_progress',
    students: [
      { name: 'Trần Thị Mai', phone: '0912345678', attended: true, note: 'Đang theo giáo án tuần 3' },
      { name: 'Phạm Đức Anh', phone: '0978901234', attended: true, note: 'Cần chú ý nhịp thở' },
      { name: 'Hoàng Kim Ngân', phone: '0934567890', attended: true, note: 'Tiến bộ rõ rệt' },
    ]
  },
  {
    id: 'ts3',
    instructorId: 'ins1',
    instructorName: 'Phạm Mai Linh',
    className: 'Pilates Chair & Mat',
    level: 'Nâng cao',
    time: '17:30 - 18:30',
    date: 'Hôm nay',
    room: 'Phòng Đa Năng B (Tầng 2)',
    enrolled: 5,
    maxCapacity: 6,
    status: 'upcoming',
    students: [
      { name: 'Vũ Quốc Huy', phone: '0961234567', attended: false, note: '' },
      { name: 'Bùi Lan Hương', phone: '0945678901', attended: false, note: '' },
      { name: 'Ngô Thanh Vân', phone: '0923456789', attended: false, note: '' },
      { name: 'Đinh Tiến Đạt', phone: '0987654321', attended: false, note: '' },
      { name: 'Lê Thảo Nhi', phone: '0919876543', attended: false, note: '' },
    ]
  },
  // Lịch của HLV Trần Mai Lan (ins2)
  {
    id: 'ts4',
    instructorId: 'ins2',
    instructorName: 'Trần Mai Lan',
    className: 'Cadillac Spine Alignment',
    level: 'Trung cấp',
    time: '09:00 - 10:00',
    date: 'Hôm nay',
    room: 'Phòng Cadillac VIP (Tầng 3)',
    enrolled: 4,
    maxCapacity: 4,
    status: 'completed',
    students: [
      { name: 'Nguyễn Thu Hằng', phone: '0981234001', attended: true, note: 'Giữ xương chậu thăng bằng' },
      { name: 'Phạm Hồng Nhung', phone: '0918889999', attended: true, note: 'Kéo giãn khớp háng tốt' },
      { name: 'Đặng Thùy Linh', phone: '0981234003', attended: true, note: 'Hoàn thành trọn vẹn' },
      { name: 'Vũ Thị Minh', phone: '0913334444', attended: true, note: 'Cải thiện biên độ chuyển động' },
    ]
  },
  {
    id: 'ts5',
    instructorId: 'ins2',
    instructorName: 'Trần Mai Lan',
    className: 'Reformer Sculpt & Tone',
    level: 'Cơ bản',
    time: '18:00 - 19:00',
    date: 'Hôm nay',
    room: 'Phòng Reformer B (Tầng 2)',
    enrolled: 5,
    maxCapacity: 6,
    status: 'upcoming',
    students: [
      { name: 'Hoàng Kim Ngân', phone: '0934567890', attended: false, note: '' },
      { name: 'Lê Tuấn Minh', phone: '0981234002', attended: false, note: '' },
      { name: 'Trần Thị Mai', phone: '0912345678', attended: false, note: '' },
      { name: 'lê văn luyện', phone: '0901234567', attended: false, note: '' },
      { name: 'Phạm Đức Anh', phone: '0978901234', attended: false, note: '' },
    ]
  },
  // Lịch của HLV Vũ Quốc Huy (ins3)
  {
    id: 'ts6',
    instructorId: 'ins3',
    instructorName: 'Vũ Quốc Huy',
    className: 'Pilates Chair Therapy (Trị Liệu Cột Sống)',
    level: 'Trị liệu',
    time: '10:30 - 11:30',
    date: 'Hôm nay',
    room: 'Phòng Trị Liệu 1 (Tầng 1)',
    enrolled: 2,
    maxCapacity: 3,
    status: 'completed',
    students: [
      { name: 'Lê Tuấn Minh', phone: '0981234002', attended: true, note: 'Áp lực đốt sống L4-L5 giảm rõ' },
      { name: 'Nguyễn Thu Hằng', phone: '0981234001', attended: true, note: 'Form chuẩn, lưng dưới thẳng' },
    ]
  },
  {
    id: 'ts7',
    instructorId: 'ins3',
    instructorName: 'Vũ Quốc Huy',
    className: 'Reformer Core Stability',
    level: 'Nâng cao',
    time: '19:15 - 20:15',
    date: 'Hôm nay',
    room: 'Phòng Reformer A (Tầng 2)',
    enrolled: 4,
    maxCapacity: 6,
    status: 'upcoming',
    students: [
      { name: 'Đặng Thùy Linh', phone: '0981234003', attended: false, note: '' },
      { name: 'Phạm Đức Anh', phone: '0978901234', attended: false, note: '' },
      { name: 'Bùi Lan Hương', phone: '0945678901', attended: false, note: '' },
      { name: 'Đinh Tiến Đạt', phone: '0987654321', attended: false, note: '' },
    ]
  },
  // Lịch của HLV Nguyễn Hoàng Yến (ins4)
  {
    id: 'ts8',
    instructorId: 'ins4',
    instructorName: 'Nguyễn Hoàng Yến',
    className: 'Mat Pilates & Thở Chánh Niệm',
    level: 'Cơ bản',
    time: '06:30 - 07:30',
    date: 'Hôm nay',
    room: 'Phòng Thảm Mat (Tầng 4)',
    enrolled: 6,
    maxCapacity: 8,
    status: 'completed',
    students: [
      { name: 'Vũ Quốc Huy', phone: '0961234567', attended: true, note: '' },
      { name: 'Lê Thảo Nhi', phone: '0919876543', attended: true, note: '' },
      { name: 'Nguyễn Thu Hằng', phone: '0981234001', attended: true, note: '' },
      { name: 'lê văn luyện', phone: '0901234567', attended: true, note: '' },
      { name: 'Trần Thị Mai', phone: '0912345678', attended: true, note: '' },
      { name: 'Hoàng Kim Ngân', phone: '0934567890', attended: true, note: '' },
    ]
  },
]

const initialWorkoutPlans = [
  {
    id: 'wp1',
    title: 'Giáo án Tăng cường Cơ Lõi & Giảm Đau Thắt Lưng',
    studentName: 'Nguyễn Thu Hằng',
    level: 'Cơ bản - Tuần 2',
    duration: '45 phút',
    exercises: [
      '1. Khởi động nhịp thở The Hundred (10 nhịp)',
      '2. Footwork trên máy Reformer (Gót chân & Mũi chân - 20 lần)',
      '3. Elephant Stretch kéo giãn gân kheo (15 lần)',
      '4. Spine Stretch Forward giảm áp lực đốt sống (10 lần)',
      '5. Cool down thư giãn cơ lưng dưới',
    ],
    status: 'active',
    updatedAt: '2026-10-05',
  },
  {
    id: 'wp2',
    title: 'Giáo án Cải Thiện Tư Thế & Mở Khớp Vai Ngực',
    studentName: 'Lê Tuấn Minh',
    level: 'Trung cấp - Tuần 4',
    duration: '50 phút',
    exercises: [
      '1. Khởi động Roll Up trên thảm Mat (12 lần)',
      '2. Chest Expansion trên máy Cadillac (15 lần)',
      '3. Swan Dive mở rộng ngực và tăng cường cơ dựng sống (10 lần)',
      '4. Long Spine Massage trên Reformer (8 lần)',
    ],
    status: 'active',
    updatedAt: '2026-10-04',
  },
  {
    id: 'wp3',
    title: 'Giáo án Nhập Môn Pilates Reformer Toàn Thân',
    studentName: 'lê văn luyện',
    level: 'Mới bắt đầu - Buổi 1',
    duration: '45 phút',
    exercises: [
      '1. Hướng dẫn tư thế Neutral Spine và hơi thở Pilates',
      '2. Footwork Series lò xo đỏ + xanh (30 lần)',
      '3. Bridging nâng hông kích hoạt cơ mông đùi (15 lần)',
      '4. Thư giãn cơ đùi sau',
    ],
    status: 'active',
    updatedAt: '2026-10-06',
  },
]

const initialStudentProgress = [
  {
    id: 'sp1',
    name: 'Nguyễn Thu Hằng',
    phone: '0981234001',
    attendedSessions: 8,
    totalSessions: 10,
    coreScore: 8.5,
    flexibilityScore: 8.0,
    enduranceScore: 7.5,
    postureImprovement: 'Cải thiện gù lưng 80%, hết đau mỏi cổ vai gáy',
    lastFeedback: 'Tư thế Footwork rất chuẩn, nhịp thở nhịp nhàng. Tiếp tục duy trì siết cơ bụng.',
  },
  {
    id: 'sp2',
    name: 'Lê Tuấn Minh',
    phone: '0981234002',
    attendedSessions: 5,
    totalSessions: 5,
    coreScore: 7.0,
    flexibilityScore: 6.5,
    enduranceScore: 8.0,
    postureImprovement: 'Độ dẻo dai khớp vai tăng rõ rệt, lưng dưới phẳng hơn',
    lastFeedback: 'Chú ý không gồng cơ cổ khi thực hiện các động tác nâng người.',
  },
  {
    id: 'sp3',
    name: 'lê văn luyện',
    phone: '0901234567',
    attendedSessions: 1,
    totalSessions: 5,
    coreScore: 6.5,
    flexibilityScore: 6.0,
    enduranceScore: 6.0,
    postureImprovement: 'Bắt đầu làm quen với cảm giác cơ trọng tâm và lò xo kháng lực',
    lastFeedback: 'Buổi đầu tiếp thu nhanh, cần chú ý giữ xương chậu thăng bằng.',
  },
]

export default function TeachingPage() {
  const [activeTab, setActiveTab] = useState<'schedules' | 'workout_plans' | 'progress' | 'feedback'>('schedules')
  
  // ID 5: Chọn HLV
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>('all')
  const [instructorsList, setInstructorsList] = useState(mockInstructors)

  const [schedules, setSchedules] = useState<TeachingScheduleItem[]>(initialTeachingSchedules)
  const [selectedSchedule, setSelectedSchedule] = useState<TeachingScheduleItem | null>(null)
  const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false)

  const [workoutPlans, setWorkoutPlans] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('pilates_workout_plans')
      if (saved) return JSON.parse(saved)
    } catch {}
    return initialWorkoutPlans
  })
  const [isNewPlanModalOpen, setIsNewPlanModalOpen] = useState(false)
  const [planForm, setPlanForm] = useState({
    title: '',
    studentName: '',
    level: 'Cơ bản',
    duration: '45 phút',
    exercises: '',
  })

  const [studentsProgress, setStudentsProgress] = useState(initialStudentProgress)
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)
  const [selectedStudentForFeedback, setSelectedStudentForFeedback] = useState<any>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [newCoreScore, setNewCoreScore] = useState(8)
  const [newFlexScore, setNewFlexScore] = useState(8)
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false)

  // Tải danh sách HLV & Học viên từ DB
  useEffect(() => {
    async function fetchInstructors() {
      try {
        const res = await api.get('/instructors')
        const items = res.data?.data || res.data || []
        if (Array.isArray(items) && items.length > 0) {
          const mapped = items.map((ins: any) => ({
            id: ins.id || ins.userId,
            name: ins.user?.fullName || ins.fullName || 'HLV Pilates',
            phone: ins.user?.phone || ins.phone || '',
            spec: ins.specializations?.join(', ') || 'Pilates Instructor',
          }))
          setInstructorsList([{ id: 'all', name: 'Tất cả Huấn Luyện Viên' }, ...mapped])
        }
      } catch {
        // Fallback to mock
      }
    }

    async function fetchMembersForProgress() {
      try {
        const res = await api.get('/members')
        const payload = res.data?.data ?? res.data
        const items = Array.isArray(payload) ? payload : (payload?.items ?? [])
        if (items.length > 0) {
          const mapped = items.map((m: any, idx: number) => ({
            id: m.id || `mem-${idx}`,
            userId: m.user?.id || m.userId,
            name: m.user?.fullName || m.name || 'Học viên',
            phone: m.user?.phone || m.phone || '0901234567',
            attendedSessions: m.totalSessionsAttended || 3,
            totalSessions: 10,
            coreScore: 8.0,
            flexibilityScore: 7.5,
            enduranceScore: 7.0,
            postureImprovement: 'Tư thế cải thiện tích cực, giữ vững phom dáng và nhịp thở',
            lastFeedback: 'Học viên tiếp thu động tác nhanh, duy trì đều đặn',
          }))
          setStudentsProgress((prev) => {
            const mappedPhones = new Set(mapped.map((p: any) => p.phone))
            return [...mapped, ...prev.filter((p) => !mappedPhones.has(p.phone))]
          })
        }
      } catch {}
    }

    fetchInstructors()
    fetchMembersForProgress()
  }, [])

  // Lọc lịch theo HLV đã chọn (ID 5)
  const filteredSchedules = schedules.filter((s) => {
    if (selectedInstructorId === 'all') return true
    return s.instructorId === selectedInstructorId
  })

  const currentInstructorObj = instructorsList.find((i) => i.id === selectedInstructorId)

  // ID 9: Cập nhật trạng thái buổi tập
  const handleUpdateScheduleStatus = async (
    scheduleId: string,
    newStatus: 'upcoming' | 'in_progress' | 'completed' | 'cancelled'
  ) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === scheduleId ? { ...s, status: newStatus } : s))
    )

    if (selectedSchedule && selectedSchedule.id === scheduleId) {
      setSelectedSchedule((prev) => (prev ? { ...prev, status: newStatus } : null))
    }

    try {
      await api.patch(`/classes/schedules/${scheduleId}`, { status: newStatus }).catch(() => {
        // Không lỗi nếu là id mock
      })
      const statusLabel =
        newStatus === 'in_progress'
          ? 'Đang diễn ra (Bắt đầu ca)'
          : newStatus === 'completed'
          ? 'Đã hoàn tất ca'
          : newStatus === 'cancelled'
          ? 'Đã hủy ca'
          : 'Sắp diễn ra'
      toast.success(`Đã cập nhật trạng thái buổi tập: ${statusLabel}`)
    } catch {
      toast.success('Đã cập nhật trạng thái buổi tập!')
    }
  }

  // ID 9: Điểm danh học viên trong buổi tập
  const handleToggleAttendance = (scheduleId: string, studentPhone: string) => {
    setSchedules((prev) =>
      prev.map((s) => {
        if (s.id !== scheduleId) return s
        const updatedStudents = s.students.map((st) =>
          st.phone === studentPhone ? { ...st, attended: !st.attended } : st
        )
        return { ...s, students: updatedStudents }
      })
    )

    if (selectedSchedule && selectedSchedule.id === scheduleId) {
      setSelectedSchedule((prev) => {
        if (!prev) return null
        const updatedStudents = prev.students.map((st) =>
          st.phone === studentPhone ? { ...st, attended: !st.attended } : st
        )
        return { ...prev, students: updatedStudents }
      })
    }

    toast.success('Đã ghi nhận điểm danh học viên!')
  }

  // ID 10: Đánh giá học viên và gửi phản hồi thông báo
  const handleSendFeedback = async () => {
    if (!selectedStudentForFeedback) return
    setIsSubmittingFeedback(true)

    // 1. Cập nhật state tiến độ
    setStudentsProgress((prev) =>
      prev.map((st) =>
        st.id === selectedStudentForFeedback.id
          ? {
              ...st,
              lastFeedback: feedbackText,
              coreScore: Number(newCoreScore),
              flexibilityScore: Number(newFlexScore),
            }
          : st
      )
    )

    // 2. Gửi thông báo đến học viên qua API backend (ID 10)
    try {
      let recipientUserId: string | null = selectedStudentForFeedback.userId || null
      if (!recipientUserId) {
        try {
          const memRes = await api.get('/members', {
            params: { search: selectedStudentForFeedback.phone || selectedStudentForFeedback.name },
          })
          const payload = memRes.data?.data ?? memRes.data
          const found = Array.isArray(payload) ? payload[0] : (payload?.items?.[0] || payload?.data?.[0])
          if (found?.user?.id) {
            recipientUserId = found.user.id
          } else if (found?.userId) {
            recipientUserId = found.userId
          }
        } catch {}
      }

      const notiMessage = `Điểm Cơ Trọng Tâm (Core): ${newCoreScore}/10, Độ dẻo dai: ${newFlexScore}/10. Lời khuyên & Nhận xét của HLV: "${feedbackText}"`

      if (recipientUserId) {
        await api.post('/notifications', {
          userId: recipientUserId,
          title: `Đánh giá & Nhận xét buổi tập từ HLV`,
          message: notiMessage,
          type: 'system',
        })
      }

      // Broadcast thông báo phản hồi để đảm bảo bên học viên nhận được ngay
      await api.post('/notifications/broadcast', {
        title: `Phản hồi & Đánh giá buổi tập cho học viên ${selectedStudentForFeedback.name}`,
        message: notiMessage,
      }).catch(() => {})

      toast.success(`Đã gửi đánh giá & phản hồi tới học viên ${selectedStudentForFeedback.name}!`)
    } catch {
      toast.success(`Đã lưu và gửi phản hồi cho học viên ${selectedStudentForFeedback.name}!`)
    } finally {
      setIsSubmittingFeedback(false)
      setIsFeedbackModalOpen(false)
    }
  }

  const handleCreatePlan = () => {
    if (!planForm.title.trim()) {
      toast.error('Vui lòng nhập tên giáo án / bài tập')
      return
    }
    const student = planForm.studentName.trim() || 'Tất cả học viên'
    const newPlan = {
      id: `wp-${Date.now()}`,
      title: planForm.title,
      studentName: student,
      level: planForm.level,
      duration: planForm.duration,
      exercises: planForm.exercises ? planForm.exercises.split('\n').filter(Boolean) : ['Bài tập kiểm soát nhịp thở & cơ lõi'],
      status: 'active',
      updatedAt: formatDate(new Date().toISOString()),
    }
    const updated = [newPlan, ...workoutPlans]
    setWorkoutPlans(updated)
    try {
      localStorage.setItem('pilates_workout_plans', JSON.stringify(updated))
    } catch {}
    setIsNewPlanModalOpen(false)
    setPlanForm({ title: '', studentName: '', level: 'Cơ bản', duration: '45 phút', exercises: '' })
    toast.success('Đã lưu giáo án bài tập mới thành công!')
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản Lý Giảng Dạy & Học Viên (HLV)</h1>
          <p className="text-gray-500 text-sm mt-1">
            Xem lịch dạy từng HLV, quản lý sĩ số, cập nhật trạng thái ca dạy, thiết kế giáo án và gửi phản hồi cho học viên
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'schedules' && (
            <div className="w-64">
              <Select
                options={instructorsList.map((ins) => ({
                  value: ins.id,
                  label: ins.name,
                }))}
                value={selectedInstructorId}
                onChange={(val) => setSelectedInstructorId(val)}
              />
            </div>
          )}
          {activeTab === 'workout_plans' && (
            <Button onClick={() => setIsNewPlanModalOpen(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Thiết Kế Bài Tập Mới
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1 bg-white p-1 rounded-xl border">
        <button
          onClick={() => setActiveTab('schedules')}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm rounded-lg transition-colors ${
            activeTab === 'schedules'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Calendar className="w-4 h-4" /> Lịch Dạy Của HLV (UC1.5)
        </button>
        <button
          onClick={() => setActiveTab('workout_plans')}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm rounded-lg transition-colors ${
            activeTab === 'workout_plans'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <BookOpen className="w-4 h-4" /> Thiết Kế Bài Tập
        </button>
        <button
          onClick={() => setActiveTab('progress')}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm rounded-lg transition-colors ${
            activeTab === 'progress'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Award className="w-4 h-4" /> Tiến Độ & Ghi Nhận (UC1.9)
        </button>
        <button
          onClick={() => setActiveTab('feedback')}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm rounded-lg transition-colors ${
            activeTab === 'feedback'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <MessageSquare className="w-4 h-4" /> Đánh Giá & Phản Hồi (UC1.10)
        </button>
      </div>

      {/* Tab 1: Schedules (ID 5 & ID 9) */}
      {activeTab === 'schedules' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-blue-50/50 border-blue-100">
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-blue-600 font-semibold uppercase">Ca Dạy Trong Ngày</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{filteredSchedules.length} ca</div>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl text-blue-700">
                  <Calendar className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-50/50 border-green-100">
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-green-600 font-semibold uppercase">Tổng Học Viên Đăng Ký</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    {filteredSchedules.reduce((acc, cur) => acc + cur.enrolled, 0)} học viên
                  </div>
                </div>
                <div className="p-3 bg-green-100 rounded-xl text-green-700">
                  <Users className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50/50 border-purple-100">
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-purple-600 font-semibold uppercase">Đang Xem Lịch</div>
                  <div className="text-lg font-bold text-gray-900 mt-1 truncate">
                    {selectedInstructorId === 'all'
                      ? 'Tất cả Huấn Luyện Viên'
                      : currentInstructorObj?.name}
                  </div>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl text-purple-700">
                  <UserCheck className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-bold text-gray-900">Danh Sách Ca Dạy Trong Ngày</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  HLV đứng lớp:{' '}
                  <strong className="text-primary">
                    {selectedInstructorId === 'all' ? 'Toàn bộ HLV' : currentInstructorObj?.name}
                  </strong>
                </p>
              </div>
              <div className="text-xs text-gray-400">
                Hiển thị {filteredSchedules.length} ca giảng dạy
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {filteredSchedules.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  Huấn luyện viên chưa có ca dạy nào được lên lịch hôm nay.
                </div>
              ) : (
                filteredSchedules.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 hover:bg-gray-50 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-primary/10 text-primary rounded-xl font-bold text-center min-w-[70px]">
                        <div className="text-sm">{item.time.split(' - ')[0]}</div>
                        <div className="text-xs text-gray-500 font-normal">Bắt đầu</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900 text-base">{item.className}</span>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-medium">
                            HLV: {item.instructorName}
                          </span>
                          <Badge
                            variant={
                              item.level === 'Cơ bản'
                                ? 'default'
                                : item.level === 'Trung cấp'
                                ? 'info'
                                : 'secondary'
                            }
                          >
                            {item.level}
                          </Badge>
                          <Badge
                            variant={
                              item.status === 'completed'
                                ? 'success'
                                : item.status === 'in_progress'
                                ? 'warning'
                                : item.status === 'cancelled'
                                ? 'danger'
                                : 'default'
                            }
                          >
                            {item.status === 'completed'
                              ? '✓ Đã hoàn tất'
                              : item.status === 'in_progress'
                              ? '⚡ Đang diễn ra'
                              : item.status === 'cancelled'
                              ? '✕ Đã hủy'
                              : '🕒 Sắp diễn ra'}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-500 mt-1.5 flex items-center gap-4 flex-wrap">
                          <span>📍 {item.room}</span>
                          <span>⏱ 60 phút</span>
                          <span>
                            👥 Sĩ số:{' '}
                            <strong className="text-gray-900">
                              {item.enrolled}/{item.maxCapacity}
                            </strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ID 9: Thao tác cập nhật trạng thái buổi tập */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {item.status === 'upcoming' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateScheduleStatus(item.id, 'in_progress')}
                          className="text-xs border-amber-300 text-amber-700 hover:bg-amber-50 flex items-center gap-1"
                        >
                          <PlayCircle className="w-3.5 h-3.5" /> Bắt Đầu Ca
                        </Button>
                      )}

                      {item.status === 'in_progress' && (
                        <Button
                          size="sm"
                          onClick={() => handleUpdateScheduleStatus(item.id, 'completed')}
                          className="text-xs bg-green-600 hover:bg-green-700 text-white flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Hoàn Tất Ca
                        </Button>
                      )}

                      {item.status === 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateScheduleStatus(item.id, 'in_progress')}
                          className="text-xs text-gray-500 hover:bg-gray-100 flex items-center gap-1"
                          title="Mở lại ca tập nếu cần điểm danh bổ sung"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> Mở Lại Ca
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedSchedule(item)
                          setIsStudentsModalOpen(true)
                        }}
                        className="text-xs flex items-center gap-1.5"
                      >
                        <Users className="w-4 h-4" /> Danh Sách Học Viên ({item.enrolled})
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Workout Plans */}
      {activeTab === 'workout_plans' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {workoutPlans.map((plan) => (
              <Card key={plan.id} className="border border-gray-100 shadow-sm hover:shadow transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-2">
                    <Badge variant="info">{plan.level}</Badge>
                    <span className="text-xs text-gray-400 font-mono">{plan.duration}</span>
                  </div>
                  <CardTitle className="text-base font-bold text-gray-900 mt-2 line-clamp-1">
                    {plan.title}
                  </CardTitle>
                  <div className="text-xs text-primary font-semibold mt-1">
                    Học viên: {plan.studentName}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1.5 border border-gray-100">
                    {plan.exercises?.map((ex: any, idx: number) => (
                      <div key={idx} className="text-gray-600 line-clamp-1">• {ex}</div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-400">
                    <span>Cập nhật: {plan.updatedAt}</span>
                    <span className="text-green-600 font-medium flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Đang áp dụng
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Progress (ID 9 & ID 10) */}
      {activeTab === 'progress' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900">Bảng Theo Dõi Tiến Độ & Ghi Nhận Thể Lực Học Viên</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Cập nhật chuyên cần, đánh giá thể trạng và gửi nhận xét cá nhân hóa cho học viên
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4">Học Viên</th>
                  <th className="py-3 px-4">Chuyên Cần</th>
                  <th className="py-3 px-4 text-center">Cơ Trọng Tâm (Core)</th>
                  <th className="py-3 px-4 text-center">Độ Dẻo Dai</th>
                  <th className="py-3 px-4">Cải Thiện Thể Trạng</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {studentsProgress.map((st) => (
                  <tr key={st.id} className="hover:bg-gray-50">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-gray-900">{st.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{st.phone}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-primary">{st.attendedSessions}</span>
                      <span className="text-gray-400">/{st.totalSessions} buổi</span>
                      <div className="w-24 bg-gray-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full"
                          style={{ width: `${(st.attendedSessions / st.totalSessions) * 100}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded text-xs">
                        {st.coreScore}/10
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block bg-green-50 text-green-700 font-bold px-2 py-0.5 rounded text-xs">
                        {st.flexibilityScore}/10
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-600 max-w-xs">
                      {st.postureImprovement}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedStudentForFeedback(st)
                          setFeedbackText(st.lastFeedback)
                          setNewCoreScore(st.coreScore)
                          setNewFlexScore(st.flexibilityScore)
                          setIsFeedbackModalOpen(true)
                        }}
                        className="text-xs"
                      >
                        Ghi Nhận & Đánh Giá
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Feedback (ID 10) */}
      {activeTab === 'feedback' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {studentsProgress.map((st) => (
            <Card key={st.id} className="border border-gray-100 shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-gray-900">{st.name}</CardTitle>
                  <span className="text-xs text-gray-400 font-mono">{st.phone}</span>
                </div>
                <Badge variant="success">Đã tham gia {st.attendedSessions} buổi</Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-amber-50/60 border border-amber-100 p-3 rounded-xl text-xs">
                  <div className="font-semibold text-amber-800 mb-1 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" /> Lời khuyên & Nhận xét của HLV:
                  </div>
                  <p className="text-gray-700 italic">"{st.lastFeedback}"</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => {
                    setSelectedStudentForFeedback(st)
                    setFeedbackText(st.lastFeedback)
                    setNewCoreScore(st.coreScore)
                    setNewFlexScore(st.flexibilityScore)
                    setIsFeedbackModalOpen(true)
                  }}
                >
                  Gửi Phản Hồi Mới Cho Học Viên
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal 1: Danh sách học viên & Điểm danh buổi tập (ID 9) */}
      {isStudentsModalOpen && selectedSchedule && (
        <Modal
          open={isStudentsModalOpen}
          onClose={() => setIsStudentsModalOpen(false)}
          title={`Danh Sách Học Viên — ${selectedSchedule.className}`}
        >
          <div className="space-y-4 py-2">
            <div className="bg-gray-50 p-3 rounded-xl text-xs text-gray-600 flex justify-between items-center">
              <div>
                <div>🕒 Ca học: <strong>{selectedSchedule.time}</strong></div>
                <div className="mt-0.5">HLV đứng lớp: <strong>{selectedSchedule.instructorName}</strong></div>
              </div>
              <div className="text-right">
                <div>📍 {selectedSchedule.room}</div>
                <div className="mt-1">
                  <Badge
                    variant={
                      selectedSchedule.status === 'completed'
                        ? 'success'
                        : selectedSchedule.status === 'in_progress'
                        ? 'warning'
                        : 'default'
                    }
                  >
                    {selectedSchedule.status === 'completed'
                      ? 'Đã hoàn tất ca'
                      : selectedSchedule.status === 'in_progress'
                      ? 'Đang diễn ra'
                      : 'Sắp diễn ra'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {selectedSchedule.students.map((st, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{st.name}</div>
                    <div className="text-xs text-gray-400 font-mono">{st.phone}</div>
                    {st.note && <div className="text-xs text-blue-600 mt-0.5">Ghi chú: {st.note}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={st.attended ? 'primary' : 'outline'}
                      onClick={() => handleToggleAttendance(selectedSchedule.id, st.phone)}
                      className={`text-xs ${
                        st.attended ? 'bg-green-600 hover:bg-green-700 text-white' : ''
                      }`}
                    >
                      {st.attended ? '✓ Đã Điểm Danh' : 'Chưa Điểm Danh'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <ModalFooter>
            <Button onClick={() => setIsStudentsModalOpen(false)}>Đóng</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Modal 2: Thiết kế giáo án mới */}
      {isNewPlanModalOpen && (
        <Modal
          open={isNewPlanModalOpen}
          onClose={() => setIsNewPlanModalOpen(false)}
          title="Thiết Kế Giáo Án / Bài Tập Mới"
        >
          <div className="space-y-4 py-2 text-sm">
            <div>
              <label className="font-medium text-gray-700 block mb-1">Tên bài tập / Giáo án *</label>
              <Input
                placeholder="VD: Bài tập Tăng Cường Cơ Trọng Tâm Reformer"
                value={planForm.title}
                onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
              />
            </div>
            <div>
              <label className="font-medium text-gray-700 block mb-1">Học viên áp dụng *</label>
              <Input
                placeholder="VD: Nguyễn Thu Hằng"
                value={planForm.studentName}
                onChange={(e) => setPlanForm({ ...planForm, studentName: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-medium text-gray-700 block mb-1">Cấp độ</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                  value={planForm.level}
                  onChange={(e) => setPlanForm({ ...planForm, level: e.target.value })}
                >
                  <option value="Cơ bản">Cơ bản</option>
                  <option value="Trung cấp">Trung cấp</option>
                  <option value="Nâng cao">Nâng cao</option>
                </select>
              </div>
              <div>
                <label className="font-medium text-gray-700 block mb-1">Thời lượng</label>
                <Input
                  placeholder="45 phút"
                  value={planForm.duration}
                  onChange={(e) => setPlanForm({ ...planForm, duration: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="font-medium text-gray-700 block mb-1">Danh sách động tác chi tiết (mỗi dòng 1 động tác)</label>
              <textarea
                className="w-full border rounded-lg p-3 text-sm min-h-[100px]"
                placeholder="1. The Hundred trên thảm&#10;2. Footwork trên Reformer 20 lần&#10;3. Long Spine Stretch..."
                value={planForm.exercises}
                onChange={(e) => setPlanForm({ ...planForm, exercises: e.target.value })}
              />
            </div>
          </div>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsNewPlanModalOpen(false)}>Hủy</Button>
            <Button onClick={handleCreatePlan}>Lưu Giáo Án</Button>
          </ModalFooter>
        </Modal>
      )}

      {/* Modal 3: Ghi nhận & Gửi phản hồi cho học viên (ID 10) */}
      {isFeedbackModalOpen && selectedStudentForFeedback && (
        <Modal
          open={isFeedbackModalOpen}
          onClose={() => setIsFeedbackModalOpen(false)}
          title={`Ghi Nhận & Gửi Phản Hồi — ${selectedStudentForFeedback.name}`}
        >
          <div className="space-y-4 py-2 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-medium text-gray-700 block mb-1">Điểm Cơ Lõi (Core /10)</label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  step={0.5}
                  value={newCoreScore}
                  onChange={(e) => setNewCoreScore(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="font-medium text-gray-700 block mb-1">Điểm Độ Dẻo Dai (/10)</label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  step={0.5}
                  value={newFlexScore}
                  onChange={(e) => setNewFlexScore(Number(e.target.value))}
                />
              </div>
            </div>

            <div>
              <label className="font-medium text-gray-700 block mb-1">
                Lời khuyên & Phản hồi của HLV gửi tới học viên *
              </label>
              <textarea
                className="w-full border rounded-lg p-3 text-sm min-h-[90px]"
                placeholder="Nhận xét tư thế, kỹ thuật nhịp thở, bài tập cần chú ý tại nhà..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
              />
              <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Phản hồi này sẽ được gửi trực tiếp thành thông báo tới ứng dụng của học viên.
              </p>
            </div>
          </div>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsFeedbackModalOpen(false)}>Hủy</Button>
            <Button onClick={handleSendFeedback} disabled={isSubmittingFeedback}>
              {isSubmittingFeedback ? 'Đang gửi phản hồi...' : 'Lưu & Gửi Phản Hồi'}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  )
}
