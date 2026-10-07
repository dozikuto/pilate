import { useState } from 'react'
import {
  Calendar, Users, BookOpen, Award, CheckCircle, Clock,
  Plus, Search, Edit3, MessageSquare, ChevronRight, UserCheck
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { formatDate } from '@/lib/utils'

const initialTeachingSchedules = [
  {
    id: 'ts1',
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
  
  const [schedules, setSchedules] = useState(initialTeachingSchedules)
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null)
  const [isStudentsModalOpen, setIsStudentsModalOpen] = useState(false)

  const [workoutPlans, setWorkoutPlans] = useState(initialWorkoutPlans)
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

  const handleCreatePlan = () => {
    if (!planForm.title || !planForm.studentName) return
    const newPlan = {
      id: `wp-${Date.now()}`,
      title: planForm.title,
      studentName: planForm.studentName,
      level: planForm.level,
      duration: planForm.duration,
      exercises: planForm.exercises.split('\n').filter(Boolean),
      status: 'active',
      updatedAt: formatDate(new Date().toISOString()),
    }
    setWorkoutPlans([newPlan, ...workoutPlans])
    setIsNewPlanModalOpen(false)
    setPlanForm({ title: '', studentName: '', level: 'Cơ bản', duration: '45 phút', exercises: '' })
  }

  const handleSendFeedback = () => {
    if (!selectedStudentForFeedback) return
    setStudentsProgress(prev =>
      prev.map(st =>
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
    setIsFeedbackModalOpen(false)
  }

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản Lý Giảng Dạy & Học Viên (HLV)</h1>
          <p className="text-gray-500 text-sm mt-1">
            Xem lịch dạy, quản lý học viên, thiết kế giáo án bài tập, ghi nhận buổi tập và đánh giá tiến độ
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'workout_plans' && (
            <Button onClick={() => setIsNewPlanModalOpen(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" /> Thiết Kế Bài Tập Mới
            </Button>
          )}
        </div>
      </div>

      <div className="flex border-b border-gray-200 gap-1 bg-white p-1 rounded-xl border">
        <button
          onClick={() => setActiveTab('schedules')}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm rounded-lg transition-colors ${
            activeTab === 'schedules'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Calendar className="w-4 h-4" /> Lịch Dạy Của HLV
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
          <Award className="w-4 h-4" /> Tiến Độ & Ghi Nhận
        </button>
        <button
          onClick={() => setActiveTab('feedback')}
          className={`flex items-center gap-2 px-4 py-2.5 font-medium text-sm rounded-lg transition-colors ${
            activeTab === 'feedback'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <MessageSquare className="w-4 h-4" /> Đánh Giá & Phản Hồi
        </button>
      </div>

      {activeTab === 'schedules' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-blue-50/50 border-blue-100">
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-blue-600 font-semibold uppercase">Ca Dạy Hôm Nay</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">3 ca</div>
                </div>
                <div className="p-3 bg-blue-100 rounded-xl text-blue-700">
                  <Calendar className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-50/50 border-green-100">
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-green-600 font-semibold uppercase">Tổng Học Viên Hôm Nay</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">12 học viên</div>
                </div>
                <div className="p-3 bg-green-100 rounded-xl text-green-700">
                  <Users className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50/50 border-purple-100">
              <CardContent className="pt-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-purple-600 font-semibold uppercase">Tỷ Lệ Điểm Danh</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">94%</div>
                </div>
                <div className="p-3 bg-purple-100 rounded-xl text-purple-700">
                  <UserCheck className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Danh Sách Ca Dạy Trong Ngày</h2>
              <span className="text-xs text-gray-500">HLV đứng lớp: Phạm Mai Linh</span>
            </div>
            <div className="divide-y divide-gray-100">
              {schedules.map((item) => (
                <div key={item.id} className="p-4 hover:bg-gray-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 text-primary rounded-xl font-bold text-center min-w-[70px]">
                      <div className="text-sm">{item.time.split(' - ')[0]}</div>
                      <div className="text-xs text-gray-500 font-normal">Bắt đầu</div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 text-base">{item.className}</span>
                        <Badge variant={item.level === 'Cơ bản' ? 'default' : item.level === 'Trung cấp' ? 'info' : 'secondary'}>
                          {item.level}
                        </Badge>
                        <Badge variant={item.status === 'completed' ? 'success' : item.status === 'in_progress' ? 'warning' : 'default'}>
                          {item.status === 'completed' ? 'Đã hoàn tất' : item.status === 'in_progress' ? 'Đang diễn ra' : 'Sắp diễn ra'}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 flex items-center gap-4">
                        <span>📍 {item.room}</span>
                        <span>⏱ Thời lượng: 60 phút</span>
                        <span>👥 Sĩ số: <strong className="text-gray-900">{item.enrolled}/{item.maxCapacity}</strong></span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSchedule(item)
                        setIsStudentsModalOpen(true)
                      }}
                      className="flex items-center gap-1.5"
                    >
                      <Users className="w-4 h-4" /> Danh Sách Học Viên ({item.enrolled})
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
                    <div className="font-semibold text-gray-700 mb-1">Các động tác chính:</div>
                    {plan.exercises.map((ex, idx) => (
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

      {activeTab === 'progress' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Bảng Theo Dõi Tiến Độ & Ghi Nhận Thể Lực Học Viên</h2>
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

      {activeTab === 'feedback' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {studentsProgress.map((st) => (
            <Card key={st.id} className="border border-gray-100 shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-gray-900">{st.name}</CardTitle>
                  <span className="text-xs text-gray-400 font-mono">{st.phone}</span>
                </div>
                <Badge variant="success">Đã hoàn thành {st.attendedSessions} buổi</Badge>
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

      {isStudentsModalOpen && selectedSchedule && (
        <Modal
          open={isStudentsModalOpen}
          onClose={() => setIsStudentsModalOpen(false)}
          title={`Danh Sách Học Viên — ${selectedSchedule.className}`}
        >
          <div className="space-y-4 py-2">
            <div className="bg-gray-50 p-3 rounded-xl text-xs text-gray-600 flex justify-between">
              <span>🕒 Ca học: <strong>{selectedSchedule.time}</strong></span>
              <span>📍 {selectedSchedule.room}</span>
            </div>

            <div className="divide-y divide-gray-100">
              {selectedSchedule.students.map((st: any, idx: number) => (
                <div key={idx} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{st.name}</div>
                    <div className="text-xs text-gray-400">{st.phone}</div>
                    {st.note && <div className="text-xs text-blue-600 mt-0.5">Ghi chú: {st.note}</div>}
                  </div>
                  <Badge variant={st.attended ? 'success' : 'secondary'}>
                    {st.attended ? '✓ Đã điểm danh' : 'Chưa điểm danh'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
          <ModalFooter>
            <Button onClick={() => setIsStudentsModalOpen(false)}>Đóng</Button>
          </ModalFooter>
        </Modal>
      )}

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
                  className="w-full border rounded-lg px-3 py-2 text-sm"
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
              <label className="font-medium text-gray-700 block mb-1">Lời khuyên & Phản hồi của HLV gửi tới học viên *</label>
              <textarea
                className="w-full border rounded-lg p-3 text-sm min-h-[90px]"
                placeholder="Nhận xét tư thế, kỹ thuật nhịp thở, bài tập cần chú ý tại nhà..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
              />
            </div>
          </div>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsFeedbackModalOpen(false)}>Hủy</Button>
            <Button onClick={handleSendFeedback}>Lưu & Gửi Phản Hồi</Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  )
}
