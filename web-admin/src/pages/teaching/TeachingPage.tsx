import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { CalendarDays, BookOpen, TrendingUp, RefreshCw, Plus, Users, CheckCircle2, MapPin, Clock, Pencil, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/axios'
import { useAuthStore } from '@/store/auth.store'
import { useTeachingData, type TeachingSchedule, type TeachingStudent, type WorkoutPlanRecord } from '@/hooks/useTeaching'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import TeachingPlanModal, { teachingError, type PlanEditorState } from './TeachingPlanModal'

const today = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10)
const time = (value: string) => new Date(value).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' })
const stamp = (value: string) => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
const statuses = {
  scheduled: 'Sắp bắt đầu',
  in_progress: 'Đang diễn ra',
  completed: 'Đã hoàn tất ca',
  cancelled: 'Đã hủy',
}
function getScheduleLiveStatus(s: Pick<TeachingSchedule, 'startTime' | 'endTime' | 'status'>): keyof typeof statuses {
  if (s.status === 'cancelled') return 'cancelled'
  const now = Date.now()
  const start = Date.parse(s.startTime)
  const end = Date.parse(s.endTime)
  if (now >= end) return 'completed'
  if (now >= start && now < end) return 'in_progress'
  return 'scheduled'
}
type Tab = 'schedules' | 'plans' | 'progress'
const tabs = [
  { id: 'schedules' as Tab, label: 'Lịch dạy', icon: CalendarDays },
  { id: 'plans' as Tab, label: 'Giáo án', icon: BookOpen },
  { id: 'progress' as Tab, label: 'Tiến độ học viên', icon: TrendingUp },
]

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500 text-sm">{children}</div>
}
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return <div role="alert" className="rounded-xl bg-red-50 border border-red-100 p-6 text-center space-y-3">
    <p className="text-sm text-red-700">Không tải được dữ liệu giảng dạy.</p>
    <Button variant="outline" size="sm" onClick={onRetry}>Thử lại</Button>
  </div>
}
function RecordContent({ record }: { record: WorkoutPlanRecord }) {
  return <div className="space-y-3 text-sm">
    <div className="flex flex-wrap gap-2 text-xs text-gray-500">
      <span>Học viên: <strong className="text-gray-700">{record.memberName}</strong></span>
      <span>· HLV: <strong className="text-gray-700">{record.instructorName}</strong></span>
      <span>· {stamp(record.updatedAt)}</span>
    </div>
    {record.className && <p className="text-xs text-primary">{record.className}{record.scheduleStartTime ? ' · ' + stamp(record.scheduleStartTime) : ''}</p>}
    {record.exercises && <div><p className="text-xs font-semibold text-gray-500 mb-1">Bài tập</p><p className="whitespace-pre-line text-gray-700">{record.exercises}</p></div>}
    {record.progressNotes && <div><p className="text-xs font-semibold text-gray-500 mb-1">Nhận xét tiến độ</p><p className="whitespace-pre-line text-gray-700">{record.progressNotes}</p></div>}
    {record.feedback && <div className="bg-blue-50 rounded-lg p-3"><p className="text-xs font-semibold text-primary mb-1">Đánh giá của HLV</p><p className="whitespace-pre-line text-gray-700">{record.feedback}</p></div>}
  </div>
}

export default function TeachingPage() {
  const user = useAuthStore(s => s.user)!
  const isCoach = user.role === 'instructor'
  const canWrite = user.role === 'admin' || isCoach
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('schedules')
  const [date, setDate] = useState(today)
  const [instructorId, setInstructorId] = useState('')
  const [memberId, setMemberId] = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [selectedEvalCoachId, setSelectedEvalCoachId] = useState<string>('all')
  const [rosterId, setRosterId] = useState<string | null>(null)
  const [editor, setEditor] = useState<PlanEditorState | null>(null)
  const filterInstructor = isCoach ? user.id : instructorId || undefined
  const schedulesQuery = useTeachingData<TeachingSchedule>('schedules', { date, instructorId: filterInstructor })
  const studentsQuery = useTeachingData<TeachingStudent>('students', { instructorId: filterInstructor })
  const plansQuery = useTeachingData<WorkoutPlanRecord>('workout-plans', { instructorId: filterInstructor, memberId: memberId || undefined })

  const students = studentsQuery.data ?? []
  const filteredStudents = students.filter(s => !memberId || s.id === memberId)
  const activeStudent = filteredStudents.find(s => s.id === selectedStudentId) ?? filteredStudents[0] ?? null

  const studentProgressQuery = useTeachingData<WorkoutPlanRecord>(
    'students/' + (activeStudent?.id ?? '') + '/progress',
    {},
    tab === 'progress' && !!activeStudent?.id,
  )

  const instructorsQuery = useQuery({
    queryKey: ['teaching', 'instructors'],
    queryFn: async () => (await api.get<Array<{ userId: string; fullName: string }>>('/instructors/options')).data,
    staleTime: 0,
  })
  const schedules = schedulesQuery.data ?? []
  const records = plansQuery.data ?? []
  const roster = schedules.find(s => s.id === rosterId)
  const rosterLiveStatus = roster ? getScheduleLiveStatus(roster) : 'scheduled'
  const instructors = (instructorsQuery.data ?? []).map(i => ({ value: i.userId, label: i.fullName }))
  const activeQuery = tab === 'schedules' ? schedulesQuery : tab === 'progress' ? studentsQuery : plansQuery
  const totalEnrolled = schedules.reduce((sum, s) => sum + s.currentEnrolled, 0)
  const attended = schedules.reduce((sum, s) => sum + s.attendedCount, 0)

  async function refresh() {
    await Promise.all(['teaching', 'schedules', 'members', 'checkins', 'reports'].map(key =>
      queryClient.invalidateQueries({ queryKey: [key] })))
  }
  const checkInMutation = useMutation({
    mutationFn: async ({ scheduleId, memberId, bookingId }: { scheduleId: string; memberId: string; bookingId: string }) =>
      api.post('/teaching/schedules/' + scheduleId + '/check-in', { memberId, bookingId }),
    onSuccess: async () => { await refresh(); toast.success('Đã điểm danh học viên') },
    onError: err => toast.error(teachingError(err)),
  })
  const openEditor = (mode: 'plan' | 'feedback', extra: Partial<PlanEditorState> = {}) =>
    setEditor({ mode, instructorId: filterInstructor, ...extra })
  const visiblePlans = records.filter(p => !!p.exercises.trim())

  const studentEvaluations = (studentProgressQuery.data ?? []).filter(
    r => !!(r.progressNotes?.trim() || r.feedback?.trim() || r.title?.trim()),
  )
  const coachesInEvaluations = Array.from(
    new Map(studentEvaluations.map(r => [r.instructorId, r.instructorName || 'Huấn luyện viên'])).entries(),
  ).map(([id, name]) => ({
    id,
    name,
    count: studentEvaluations.filter(r => r.instructorId === id).length,
  }))
  const visibleEvaluations = selectedEvalCoachId === 'all'
    ? studentEvaluations
    : studentEvaluations.filter(r => r.instructorId === selectedEvalCoachId)

  return <div className="space-y-6">
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Giảng dạy & HLV</h1>
        <p className="text-sm text-gray-500 mt-1">Theo dõi ca dạy, điểm danh và đánh giá tiến độ tập luyện của từng học viên</p>
      </div>
      <div className="flex items-end gap-3">
        {isCoach ? <p className="text-sm font-semibold text-primary pb-2">{user.name}</p> :
          <Select label="Huấn luyện viên" value={instructorId} placeholder="" className="min-w-52"
            options={[{ value: '', label: 'Tất cả huấn luyện viên' }, ...instructors]}
            onChange={value => { setInstructorId(value); setMemberId(''); setRosterId(null) }} />}
        <Button variant="outline" onClick={() => refresh()} disabled={activeQuery.isFetching}>
          <RefreshCw size={16} className={activeQuery.isFetching ? 'animate-spin' : ''} />Làm mới
        </Button>
      </div>
    </div>
    <nav aria-label="Chức năng giảng dạy" className="flex flex-wrap gap-1 rounded-xl bg-white p-1 border border-gray-100">
      {tabs.map(item => <button key={item.id} type="button" aria-pressed={tab === item.id} onClick={() => setTab(item.id)}
        className={'flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ' + (tab === item.id ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50')}>
        <item.icon size={17} />{item.label}
      </button>)}
    </nav>

    {tab === 'schedules' && <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-end gap-3">
          <Input label="Ngày dạy" type="date" value={date} onChange={e => { if (e.target.value) { setDate(e.target.value); setRosterId(null) } }} />
          <Button variant="outline" onClick={() => { setDate(today()); setRosterId(null) }}>Hôm nay</Button>
        </div>
        <Link to="/schedule" className="text-sm font-semibold text-primary hover:underline">Xem Lớp & lịch học →</Link>
      </div>
      {!schedulesQuery.isError && !schedulesQuery.isLoading && <div className="grid sm:grid-cols-3 gap-4">
        {[{ title: 'Ca dạy trong ngày', value: schedules.length, icon: CalendarDays },
          { title: 'Lượt đăng ký', value: totalEnrolled, icon: Users },
          { title: 'Đã điểm danh', value: attended, icon: CheckCircle2 }].map(stat =>
          <div key={stat.title} className="rounded-xl border border-gray-100 bg-white p-5 flex justify-between items-center">
            <div><p className="text-xs font-semibold text-gray-500">{stat.title}</p><p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p></div>
            <stat.icon className="text-primary/60" size={25} />
          </div>)}
      </div>}
      {schedulesQuery.isError ? <ErrorState onRetry={() => { schedulesQuery.refetch() }} /> : schedulesQuery.isLoading ?
        <Empty>Đang tải lịch dạy…</Empty> : schedules.length === 0 ?
        <Empty>Chưa có ca dạy trong ngày đã chọn. Các ca được xếp tại Lớp & lịch học sẽ xuất hiện ở đây.</Empty> :
        <div className="rounded-xl bg-white border border-gray-100 divide-y divide-gray-100">
          {schedules.map(s => {
            const liveStatus = getScheduleLiveStatus(s)
            return <article key={s.id} className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="bg-primary/5 rounded-xl p-3 text-center min-w-20"><p className="text-base font-bold text-primary">{time(s.startTime)}</p><p className="text-xs text-gray-500 mt-1">{time(s.endTime)}</p></div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap"><h2 className="font-bold text-gray-900">{s.className}</h2>
                    <Badge variant={liveStatus === 'completed' ? 'success' : liveStatus === 'in_progress' ? 'warning' : liveStatus === 'cancelled' ? 'danger' : 'default'}>
                      {statuses[liveStatus]}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">HLV: <strong>{s.instructorName}</strong></p>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><MapPin size={14} />{s.roomName}</span>
                    <span className="flex items-center gap-1"><Clock size={14} />{Math.round((Date.parse(s.endTime) - Date.parse(s.startTime)) / 60000)} phút</span>
                    <span>Sĩ số: <strong>{s.currentEnrolled}/{s.maxCapacity}</strong></span>
                    <span>Đã điểm danh: <strong>{s.attendedCount}/{s.currentEnrolled}</strong></span>
                  </div>
                  {s.notes && <p className="text-xs text-gray-500">{s.notes}</p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setRosterId(s.id)}><Users size={15} />Học viên & điểm danh ({s.currentEnrolled})</Button>
              </div>
            </article>
          })}
        </div>}
      <p className="text-xs text-gray-400">Lịch dạy và trạng thái ca tập tự động cập nhật theo thời gian thực.</p>
    </>}

    {tab === 'plans' && <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Select label="Lọc học viên" value={memberId} placeholder="" className="min-w-64"
          options={[{ value: '', label: 'Tất cả học viên' }, ...students.map(s => ({ value: s.id, label: s.fullName }))]} onChange={setMemberId} />
        {canWrite && <Button disabled={studentsQuery.isLoading || studentsQuery.isError || students.length === 0}
          onClick={() => openEditor('plan', { memberId: memberId || undefined })}>
          <Plus size={16} />Tạo giáo án
        </Button>}
      </div>
      {plansQuery.isError ? <ErrorState onRetry={() => { plansQuery.refetch() }} /> : plansQuery.isLoading ?
        <Empty>Đang tải giáo án…</Empty> : visiblePlans.length === 0 ?
        <Empty>Chưa có giáo án được lưu cho bộ lọc này.</Empty> :
        <div className="grid lg:grid-cols-2 gap-4">{visiblePlans.map(record =>
          <article className="rounded-xl border border-gray-100 bg-white p-5 space-y-4" key={record.id}>
            <div className="flex items-start justify-between gap-3"><h2 className="font-bold text-gray-900">{record.title}</h2>
              {canWrite && <Button size="sm" variant="ghost" onClick={() => openEditor('plan', { record })}><Pencil size={14} />Chỉnh sửa</Button>}
            </div>
            <RecordContent record={record} />
          </article>)}</div>}
    </>}

    {tab === 'progress' && <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Select label="Tìm nhanh học viên" value={memberId} placeholder="" className="min-w-64"
          options={[{ value: '', label: 'Tất cả học viên (' + students.length + ')' }, ...students.map(s => ({ value: s.id, label: s.fullName }))]}
          onChange={val => { setMemberId(val); setSelectedStudentId(val || null); setSelectedEvalCoachId('all') }} />
        {canWrite && activeStudent && (
          <Button onClick={() => openEditor('feedback', { memberId: activeStudent.id })}>
            <Plus size={16} />Thêm đánh giá cho {activeStudent.fullName}
          </Button>
        )}
      </div>

      {studentsQuery.isError ? <ErrorState onRetry={() => { studentsQuery.refetch() }} /> : studentsQuery.isLoading ?
        <Empty>Đang tải danh sách học viên…</Empty> : filteredStudents.length === 0 ?
        <Empty>Chưa có học viên trong phạm vi đã chọn.</Empty> :
        <div className="grid lg:grid-cols-12 gap-5 items-start">
          {/* Cột trái: Danh sách từng học viên để bấm chọn */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Danh sách học viên</span>
              <span className="text-xs text-gray-400">{filteredStudents.length} học viên</span>
            </div>
            <div className="divide-y divide-gray-100 max-h-[560px] overflow-y-auto">
              {filteredStudents.map(s => {
                const isSelected = activeStudent?.id === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { setSelectedStudentId(s.id); setSelectedEvalCoachId('all') }}
                    className={
                      'w-full text-left p-4 transition-colors flex items-start justify-between gap-3 ' +
                      (isSelected ? 'bg-primary/5 border-l-4 border-primary' : 'hover:bg-gray-50')
                    }
                  >
                    <div className="min-w-0">
                      <p className={'font-semibold truncate ' + (isSelected ? 'text-primary' : 'text-gray-900')}>{s.fullName}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{s.phone || s.email}</p>
                      {s.lastProgress && (
                        <p className="text-xs text-gray-400 mt-1 truncate">
                          HLV {s.lastProgress.instructorName}: {s.lastProgress.progressNotes || s.lastProgress.feedback || s.lastProgress.title}
                        </p>
                      )}
                    </div>
                    <Badge variant={isSelected ? 'info' : 'default'}>{s.totalSessionsAttended} buổi</Badge>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Cột phải: Chi tiết đánh giá của từng HLV cho học viên đang chọn */}
          <div className="lg:col-span-8 space-y-4">
            {activeStudent && (
              <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{activeStudent.fullName}</h2>
                    <p className="text-xs text-gray-500 mt-1">
                      {activeStudent.phone || activeStudent.email} · Đã tham gia <strong>{activeStudent.totalSessionsAttended}</strong> buổi tập
                    </p>
                    {activeStudent.goals && <p className="text-xs text-gray-600 mt-1">Mục tiêu: {activeStudent.goals}</p>}
                    {activeStudent.healthNotes && <p className="text-xs text-amber-700 mt-1">Lưu ý sức khỏe: {activeStudent.healthNotes}</p>}
                  </div>
                  {canWrite && (
                    <Button size="sm" variant="outline" onClick={() => openEditor('feedback', { memberId: activeStudent.id })}>
                      <Plus size={15} />Ghi nhận đánh giá
                    </Button>
                  )}
                </div>

                {/* Bộ lọc theo từng HLV đã đánh giá học viên này */}
                {coachesInEvaluations.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 mr-1">Đánh giá theo HLV:</span>
                    <button
                      type="button"
                      onClick={() => setSelectedEvalCoachId('all')}
                      className={
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ' +
                        (selectedEvalCoachId === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
                      }
                    >
                      Tất cả HLV ({studentEvaluations.length})
                    </button>
                    {coachesInEvaluations.map(coach => (
                      <button
                        key={coach.id}
                        type="button"
                        onClick={() => setSelectedEvalCoachId(coach.id)}
                        className={
                          'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ' +
                          (selectedEvalCoachId === coach.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
                        }
                      >
                        HLV {coach.name} ({coach.count})
                      </button>
                    ))}
                  </div>
                )}

                {studentProgressQuery.isError ? (
                  <ErrorState onRetry={() => { studentProgressQuery.refetch() }} />
                ) : studentProgressQuery.isLoading ? (
                  <Empty>Đang tải đánh giá của huấn luyện viên…</Empty>
                ) : visibleEvaluations.length === 0 ? (
                  <Empty>Chưa có đánh giá tiến độ nào từ huấn luyện viên cho học viên này.</Empty>
                ) : (
                  <div className="space-y-4">
                    {visibleEvaluations.map(record => (
                      <article key={record.id} className="rounded-xl border border-gray-100 bg-gray-50/60 p-4 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-semibold">
                                <UserCheck size={14} />HLV: {record.instructorName || 'Huấn luyện viên'}
                              </span>
                              <span className="text-xs text-gray-400">{stamp(record.updatedAt)}</span>
                            </div>
                            <h3 className="font-bold text-gray-900 text-sm pt-1">{record.title}</h3>
                            {record.className && (
                              <p className="text-xs text-primary">
                                Buổi tập: {record.className}{record.scheduleStartTime ? ' · ' + stamp(record.scheduleStartTime) : ''}
                              </p>
                            )}
                          </div>
                          {canWrite && (!isCoach || record.instructorId === user.id) && (
                            <Button size="sm" variant="ghost" onClick={() => openEditor('feedback', { record })}>
                              <Pencil size={14} />Chỉnh sửa
                            </Button>
                          )}
                        </div>

                        {record.progressNotes && (
                          <div className="bg-white rounded-lg p-3 border border-gray-100">
                            <p className="text-xs font-semibold text-gray-500 mb-1">Nhận xét tiến độ tập luyện</p>
                            <p className="text-sm text-gray-700 whitespace-pre-line">{record.progressNotes}</p>
                          </div>
                        )}

                        {record.feedback && (
                          <div className="bg-blue-50/70 rounded-lg p-3 border border-blue-100">
                            <p className="text-xs font-semibold text-primary mb-1">Đánh giá & lời khuyên của HLV</p>
                            <p className="text-sm text-gray-700 whitespace-pre-line">{record.feedback}</p>
                          </div>
                        )}

                        {record.exercises && (
                          <div className="bg-white rounded-lg p-3 border border-gray-100">
                            <p className="text-xs font-semibold text-gray-500 mb-1">Bài tập đã áp dụng</p>
                            <p className="text-sm text-gray-700 whitespace-pre-line">{record.exercises}</p>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>}
    </>}

    {roster && <Modal open size="lg" title={'Học viên & điểm danh — ' + roster.className} onClose={() => { if (!checkInMutation.isPending) setRosterId(null) }}>
      <div className="space-y-4">
        <div className="rounded-xl bg-gray-50 p-4 text-sm space-y-1">
          <p><strong>{time(roster.startTime)} – {time(roster.endTime)}</strong> · {roster.roomName} · <Badge variant={rosterLiveStatus === 'completed' ? 'success' : rosterLiveStatus === 'in_progress' ? 'warning' : 'default'}>{statuses[rosterLiveStatus]}</Badge></p>
          <p>HLV: {roster.instructorName} · Sĩ số: {roster.currentEnrolled}/{roster.maxCapacity} · Đã điểm danh: {roster.attendedCount}</p>
        </div>
        {roster.students.length === 0 ? <p className="py-6 text-center text-sm text-gray-500">Chưa có học viên đặt chỗ.</p> :
          <div className="divide-y divide-gray-100">{roster.students.map(s => <div key={s.bookingId} className="py-4 flex items-start justify-between gap-4">
            <div className="space-y-1"><p className="font-semibold text-gray-900">{s.fullName}</p>
              <p className="text-xs text-gray-500">{s.phone || s.email}{s.spotNumber ? ' · Chỗ #' + s.spotNumber : ''}</p>
              {s.healthNotes && <p className="text-xs text-amber-700">Lưu ý sức khỏe: {s.healthNotes}</p>}
              {s.checkInTime && <p className="text-xs text-emerald-700">Điểm danh lúc {stamp(s.checkInTime)}</p>}
            </div>
            {s.status === 'attended' ? <Badge variant="success">Đã điểm danh</Badge> :
              <Button size="sm" variant="outline" disabled={checkInMutation.isPending}
                onClick={() => checkInMutation.mutate({ scheduleId: roster.id, memberId: s.memberId, bookingId: s.bookingId })}>Điểm danh</Button>}
          </div>)}</div>}
      </div>
      <ModalFooter><Button variant="outline" disabled={checkInMutation.isPending} onClick={() => setRosterId(null)}>Đóng</Button></ModalFooter>
    </Modal>}

    {editor && <TeachingPlanModal editor={editor} students={students} instructors={instructors} schedules={schedules} onClose={() => setEditor(null)} />}
  </div>
}
