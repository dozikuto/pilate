import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '@/lib/axios'
import { useAuthStore } from '@/store/auth.store'
import { Input, Textarea } from '@/components/ui/Input'
import { Select, type SelectOption } from '@/components/ui/Select'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { TeachingStudent, TeachingSchedule, WorkoutPlanRecord } from '@/hooks/useTeaching'

export function teachingError(error: any): string {
  const body = error?.response?.data
  return Array.isArray(body?.errors) ? body.errors.join(', ') : body?.message || error?.message || 'Không lưu được dữ liệu. Vui lòng thử lại.'
}

export interface PlanEditorState {
  mode: 'plan' | 'feedback'
  record?: WorkoutPlanRecord
  memberId?: string
  instructorId?: string
  scheduleId?: string
}

export default function TeachingPlanModal({ editor, students, instructors, schedules, onClose }: {
  editor: PlanEditorState
  students: TeachingStudent[]
  instructors: SelectOption[]
  schedules: TeachingSchedule[]
  onClose: () => void
}) {
  const user = useAuthStore(s => s.user)!
  const queryClient = useQueryClient()
  const record = editor.record
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    memberId: record?.memberId ?? editor.memberId ?? '',
    instructorId: record?.instructorId ?? editor.instructorId ?? user.id,
    scheduleId: record?.scheduleId ?? editor.scheduleId ?? '',
    title: record?.title ?? (editor.mode === 'feedback' ? 'Đánh giá tiến độ buổi tập' : ''),
    exercises: record?.exercises ?? '',
    progressNotes: record?.progressNotes ?? '',
    feedback: record?.feedback ?? '',
  })
  const authors = [...instructors]
  if (!authors.some(i => i.value === user.id)) authors.push({ value: user.id, label: `${user.name} (người ghi nhận)` })
  if (record && !authors.some(i => i.value === record.instructorId)) authors.push({ value: record.instructorId, label: record.instructorName })
  const availableSchedules = schedules.filter(s => s.instructorId === form.instructorId && s.students.some(m => m.memberId === form.memberId))
    .map(s => ({ value: s.id, label: `${s.className} · ${new Date(s.startTime).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}` }))
  if (record?.scheduleId && !availableSchedules.some(s => s.value === record.scheduleId)) {
    availableSchedules.push({ value: record.scheduleId, label: `${record.className ?? 'Buổi học đã liên kết'} · ${record.scheduleStartTime ? new Date(record.scheduleStartTime).toLocaleDateString('vi-VN') : ''}` })
  }
  const save = useMutation({
    mutationFn: async () => {
      if (!form.memberId || !form.instructorId || !form.title.trim()) throw new Error('Vui lòng chọn học viên, huấn luyện viên đánh giá và nhập tiêu đề')
      if (editor.mode === 'plan' && !form.exercises.trim()) throw new Error('Vui lòng nhập nội dung bài tập')
      if (editor.mode === 'feedback' && !form.progressNotes.trim() && !form.feedback.trim()) {
        throw new Error('Vui lòng nhập nhận xét tiến độ hoặc đánh giá của huấn luyện viên')
      }
      const payload = {
        ...form,
        title: form.title.trim(),
        scheduleId: form.scheduleId || null,
        coreScore: null,
        flexibilityScore: null,
      }
      if (record) await api.patch(`/teaching/workout-plans/${record.id}`, payload)
      else await api.post('/teaching/workout-plans', payload)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['teaching'] })
      toast.success(editor.mode === 'plan' ? 'Đã lưu giáo án' : 'Đã lưu đánh giá tiến độ của HLV')
      onClose()
    },
    onError: err => setError(teachingError(err)),
  })
  return <Modal open onClose={() => { if (!save.isPending) onClose() }} size="lg"
    title={editor.mode === 'plan' ? (record ? 'Chỉnh sửa giáo án' : 'Tạo giáo án') : (record ? 'Chỉnh sửa đánh giá của HLV' : 'Thêm đánh giá tiến độ của HLV')}>
    <form onSubmit={event => { event.preventDefault(); setError(''); save.mutate() }}>
      <fieldset disabled={save.isPending} className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Select label="Học viên" required value={form.memberId} options={students.map(s => ({ value: s.id, label: `${s.fullName} · ${s.phone || s.email}` }))}
            onChange={memberId => setForm({ ...form, memberId, scheduleId: '' })} />
          <Select label="Huấn luyện viên đánh giá" required value={form.instructorId} options={authors} disabled={user.role === 'instructor'}
            onChange={instructorId => setForm({ ...form, instructorId, scheduleId: '' })} />
        </div>
        <Select label="Buổi học liên quan" value={form.scheduleId} options={[{ value: '', label: 'Không gắn với buổi học cụ thể' }, ...availableSchedules]}
          placeholder="" onChange={scheduleId => setForm({ ...form, scheduleId })} />
        <Input label="Tiêu đề" required maxLength={200} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
        {editor.mode === 'plan' && <Textarea label="Nội dung bài tập" required rows={5} maxLength={20000} value={form.exercises}
          placeholder="Mỗi dòng một bài tập, kèm số lần hoặc thời lượng" onChange={e => setForm({ ...form, exercises: e.target.value })} />}
        <Textarea label="Nhận xét tiến độ tập luyện" rows={3} maxLength={10000}
          placeholder="Ghi nhận sự tiến bộ, tư thế, nhịp thở hoặc khả năng thực hiện động tác của học viên..."
          value={form.progressNotes} onChange={e => setForm({ ...form, progressNotes: e.target.value })} />
        <Textarea label="Đánh giá & lời khuyên của HLV" rows={3} maxLength={10000}
          placeholder="Đánh giá chi tiết của huấn luyện viên và hướng dẫn cho các buổi tiếp theo..."
          value={form.feedback} onChange={e => setForm({ ...form, feedback: e.target.value })} />
        {error && <p role="alert" className="text-sm text-red-700 bg-red-50 p-3 rounded-lg">{error}</p>}
      </fieldset>
      <ModalFooter>
        <Button type="button" variant="outline" disabled={save.isPending} onClick={onClose}>Hủy</Button>
        <Button type="submit" loading={save.isPending}>Lưu {editor.mode === 'plan' ? 'giáo án' : 'đánh giá'}</Button>
      </ModalFooter>
    </form>
  </Modal>
}
