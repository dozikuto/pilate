import { useState, useEffect } from 'react'
import { Plus, Award, Phone, Mail, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Input, NumberInput } from '@/components/ui/Input'
import { parseNumberInput } from '@/lib/numberInput'
import { formatCurrency } from '@/lib/utils'
import api from '@/lib/axios'
import toast from 'react-hot-toast'

interface InstructorItem {
  id: string
  name: string
  email: string
  phone: string
  specializations: string[]
  bio: string
  hourlyRate: number
  status: 'active' | 'inactive'
}

export default function InstructorsPage() {
  const [instructors, setInstructors] = useState<InstructorItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<InstructorItem | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingInstructor, setEditingInstructor] = useState<InstructorItem | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    hourlyRate: '400000',
    specializations: 'Reformer, Mat, Cadillac',
    bio: '',
  })

  const isUuid = (str: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

  const fetchInstructors = async () => {
    setLoading(true)
    setLoadError('')
    try {
      const res = await api.get('/instructors?limit=100')
      const data = res.data?.data || res.data
      const items = Array.isArray(data) ? data : data?.items || []
      const mapped = items.filter((ins: any) => ins.user?.isActive !== false).map((ins: any) => ({
          id: ins.id,
          name: ins.user?.fullName || ins.name || 'HLV Pilates',
          email: ins.user?.email || ins.email || '—',
          phone: ins.user?.phone || ins.phone || '—',
          specializations: ins.specializations || [],
          bio: ins.bio || 'Chưa có thông tin giới thiệu.',
          hourlyRate: Number(ins.hourlyRate ?? 0),
          status: ins.user?.isActive === false ? 'inactive' : 'active',
        }))
      setInstructors(mapped)
    } catch {
      setInstructors([])
      setLoadError('Không tải được danh sách huấn luyện viên. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInstructors()
  }, [])

  const handleOpenAdd = () => {
    setEditingInstructor(null)
    setFormData({
      name: '',
      email: '',
      phone: '',
      hourlyRate: '400000',
      specializations: 'Reformer, Mat, Cadillac',
      bio: '',
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (ins: InstructorItem) => {
    setEditingInstructor(ins)
    setFormData({
      name: ins.name,
      email: ins.email,
      phone: ins.phone,
      hourlyRate: String(ins.hourlyRate),
      specializations: ins.specializations.join(', '),
      bio: ins.bio,
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (saving) return
    const hourlyRate = parseNumberInput(formData.hourlyRate)
    if (!Number.isFinite(hourlyRate) || hourlyRate < 0) {
      toast.error('Vui lòng nhập thù lao từ 0 đồng')
      return
    }
    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập họ và tên HLV')
      return
    }

    const specs = formData.specializations
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    setSaving(true)
    try {
      const payload = {
        fullName: formData.name.trim(),
        phone: formData.phone,
        hourlyRate,
        specializations: specs,
        bio: formData.bio,
      }
      if (editingInstructor) {
        if (!isUuid(editingInstructor.id)) throw new Error('HLV không hợp lệ. Vui lòng tải lại trang.')
        await api.patch(`/instructors/${editingInstructor.id}`, payload)
      } else {
        await api.post('/instructors', {
          ...payload,
          email: formData.email || `coach.${Date.now()}@pilatesms.vn`,
        })
      }
      await fetchInstructors()
      toast.success(editingInstructor ? 'Cập nhật thông tin HLV thành công!' : 'Thêm huấn luyện viên thành công!')
      setIsModalOpen(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Có lỗi xảy ra khi lưu HLV')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (ins: InstructorItem) => {
    if (deletingId) return
    setDeletingId(ins.id)
    try {
      if (!isUuid(ins.id)) throw new Error('HLV không hợp lệ. Vui lòng tải lại trang.')
      await api.delete(`/instructors/${ins.id}`)
      setInstructors((prev) => prev.filter((i) => i.id !== ins.id))
      await fetchInstructors()
      toast.success('Xóa Huấn luyện viên thành công!')
      setDeleteTarget(null)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Có lỗi xảy ra khi xóa HLV')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Đội Ngũ Huấn Luyện Viên</h1>
          <p className="text-gray-500 text-sm mt-1">
            Quản lý giáo viên, phân bổ lịch dạy và biểu phí thù lao
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Thêm HLV Mới
        </Button>
      </div>

      {loading && <p role="status" className="text-sm text-gray-500">Đang tải danh sách huấn luyện viên...</p>}
      {loadError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {loadError} <button className="ml-2 underline" onClick={fetchInstructors}>Thử lại</button>
      </div>}
      {!loading && !loadError && instructors.length === 0 && <p className="rounded-xl border border-gray-200 bg-white p-6 text-gray-500">Chưa có huấn luyện viên đang hoạt động.</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {instructors.map((ins) => (
          <div
            key={ins.id}
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 text-primary font-bold text-xl flex items-center justify-center border-2 border-primary/20">
                  {ins.name.split(' ').slice(-1)[0][0]}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{ins.name}</h3>
                </div>
              </div>

              <p className="text-xs text-gray-600 leading-relaxed min-h-[36px] mb-4">
                {ins.bio}
              </p>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {ins.specializations.map((spec, idx) => (
                  <Badge key={idx} variant="info" className="text-[10px]">
                    {spec}
                  </Badge>
                ))}
              </div>

              <div className="space-y-1.5 text-xs text-gray-500 border-t border-gray-50 pt-3">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  <span>{ins.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  <span>{ins.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-3.5 h-3.5 text-gray-400" />
                  <span>Thù lao: <strong>{formatCurrency(ins.hourlyRate)}/giờ</strong></span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                onClick={() => handleOpenEdit(ins)}
              >
                <Edit className="w-3.5 h-3.5" />
                Sửa
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700"
                onClick={() => setDeleteTarget(ins)}
                aria-label={`Xóa HLV ${ins.name}`}
                disabled={deletingId !== null}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {deleteTarget && <Modal open onClose={() => { if (!deletingId) setDeleteTarget(null) }} title="Xóa huấn luyện viên">
        <p className="py-4 text-sm text-gray-700">Xóa HLV <strong>{deleteTarget.name}</strong> khỏi danh sách đang hoạt động? Lịch dạy và lịch sử học viên được giữ lại.</p>
        <ModalFooter>
          <Button variant="outline" disabled={!!deletingId} onClick={() => setDeleteTarget(null)}>Hủy</Button>
          <Button variant="danger" loading={!!deletingId} onClick={() => handleDelete(deleteTarget)}>Xác nhận xóa</Button>
        </ModalFooter>
      </Modal>}
      {isModalOpen && (
        <Modal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingInstructor ? 'Chỉnh Sửa Thông Tin HLV' : 'Thêm Huấn Luyện Viên Mới'}
        >
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Họ và tên *</label>
              <Input
                placeholder="Ví dụ: Trần Mai Lan"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
                <Input
                  type="email"
                  placeholder="coach@pilatesms.vn"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!!editingInstructor}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Số điện thoại</label>
                <Input
                  placeholder="0901234567"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Thù lao theo giờ (VNĐ)</label>
                <NumberInput
                  aria-label="Thù lao theo giờ (VNĐ)"
                  min={0}
                  value={formData.hourlyRate}
                  onValueChange={(hourlyRate) => setFormData({ ...formData, hourlyRate })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Chuyên môn chính (cách nhau bởi dấu phẩy)</label>
                <Input
                  placeholder="Reformer, Mat, Trị liệu..."
                  value={formData.specializations}
                  onChange={(e) => setFormData({ ...formData, specializations: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Tiểu sử & Chứng chỉ</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                rows={3}
                placeholder="Số năm kinh nghiệm, các chứng nhận quốc tế..."
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              />
            </div>
          </div>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editingInstructor ? 'Lưu Thay Đổi' : 'Lưu HLV'}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  )
}
