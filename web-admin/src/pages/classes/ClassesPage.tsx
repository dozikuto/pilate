import { useState, useEffect } from 'react'
import { Plus, Clock, Users, DollarSign, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { formatCurrency } from '@/lib/utils'
import api from '@/lib/axios'
import toast from 'react-hot-toast'

interface ClassItem {
  id: string
  name: string
  level: string
  type: string
  duration: number
  price: number
  maxCapacity: number
  description: string
  isActive: boolean
}

const mockClasses: ClassItem[] = [
  {
    id: 'c1',
    name: 'Reformer Fundamentals',
    level: 'Căn bản (Beginner)',
    type: 'Lớp Nhóm',
    duration: 55,
    price: 300000,
    maxCapacity: 8,
    description: 'Làm quen với máy Reformer, kiểm soát hơi thở và tư thế xương chậu trung tính.',
    isActive: true,
  },
  {
    id: 'c2',
    name: 'Pilates Cột Sống & Phục Hồi',
    level: 'Mọi cấp độ (All levels)',
    type: 'Lớp Nhóm',
    duration: 55,
    price: 350000,
    maxCapacity: 8,
    description: 'Giảm áp lực cột sống, trị liệu đau vai gáy và cải thiện độ linh hoạt của cơ lưng.',
    isActive: true,
  },
  {
    id: 'c3',
    name: 'Cadillac Private 1:1',
    level: 'Cá nhân hóa',
    type: 'Lớp Kèm Riêng',
    duration: 60,
    price: 800000,
    maxCapacity: 1,
    description: 'Buổi tập 1 kèm 1 chuyên sâu theo phác đồ thể trạng cá nhân của từng học viên.',
    isActive: true,
  },
  {
    id: 'c4',
    name: 'Reformer Jumpboard Cardio',
    level: 'Trung cấp (Intermediate)',
    type: 'Lớp Nhóm',
    duration: 55,
    price: 320000,
    maxCapacity: 8,
    description: 'Kết hợp máy Reformer và tấm bật Jumpboard giúp đốt mỡ và tăng cường tim mạch.',
    isActive: true,
  },
]

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>(mockClasses)
  const [loading, setLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    type: 'group',
    level: 'beginner',
    duration: 55,
    maxCapacity: 8,
    price: 300000,
    description: '',
  })

  const isUuid = (str: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

  const fetchClasses = async () => {
    setLoading(true)
    try {
      const res = await api.get('/classes')
      const data = res.data?.data || res.data
      const items = Array.isArray(data) ? data : data?.items || []
      if (items.length > 0) {
        const mapped = items.map((c: any) => ({
          id: c.id,
          name: c.name,
          level:
            c.level === 'beginner'
              ? 'Căn bản (Beginner)'
              : c.level === 'intermediate'
              ? 'Trung cấp (Intermediate)'
              : c.level === 'advanced'
              ? 'Nâng cao (Advanced)'
              : 'Mọi cấp độ (All levels)',
          type: c.type === 'private' ? 'Lớp Kèm Riêng' : 'Lớp Nhóm',
          duration: c.durationMinutes || 55,
          price: Number(c.price) || 300000,
          maxCapacity: c.defaultMaxCapacity || 8,
          description: c.description || 'Chương trình luyện tập Pilates chất lượng cao',
          isActive: c.isActive !== false,
        }))
        setClasses(mapped)
      }
    } catch {
      // fallback to mock
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClasses()
  }, [])

  const handleOpenAdd = () => {
    setEditingClass(null)
    setFormData({
      name: '',
      type: 'group',
      level: 'beginner',
      duration: 55,
      maxCapacity: 8,
      price: 300000,
      description: '',
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (cls: ClassItem) => {
    setEditingClass(cls)
    setFormData({
      name: cls.name,
      type: cls.type === 'Lớp Kèm Riêng' ? 'private' : 'group',
      level:
        cls.level.includes('Beginner')
          ? 'beginner'
          : cls.level.includes('Intermediate')
          ? 'intermediate'
          : cls.level.includes('Advanced')
          ? 'advanced'
          : 'all',
      duration: cls.duration,
      maxCapacity: cls.maxCapacity,
      price: cls.price,
      description: cls.description,
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên lớp học')
      return
    }

    const payload = {
      name: formData.name,
      type: formData.type as any,
      level: formData.level as any,
      durationMinutes: Number(formData.duration),
      defaultMaxCapacity: Number(formData.maxCapacity),
      price: Number(formData.price),
      description: formData.description,
    }

    try {
      if (editingClass) {
        if (isUuid(editingClass.id)) {
          await api.patch(`/classes/${editingClass.id}`, payload)
        }
        setClasses((prev) =>
          prev.map((c) =>
            c.id === editingClass.id
              ? {
                  ...c,
                  name: formData.name,
                  type: formData.type === 'private' ? 'Lớp Kèm Riêng' : 'Lớp Nhóm',
                  level:
                    formData.level === 'beginner'
                      ? 'Căn bản (Beginner)'
                      : formData.level === 'intermediate'
                      ? 'Trung cấp (Intermediate)'
                      : formData.level === 'advanced'
                      ? 'Nâng cao (Advanced)'
                      : 'Mọi cấp độ (All levels)',
                  duration: Number(formData.duration),
                  maxCapacity: Number(formData.maxCapacity),
                  price: Number(formData.price),
                  description: formData.description,
                }
              : c
          )
        )
        toast.success('Cập nhật thông tin lớp học thành công!')
      } else {
        let createdId = `c-${Date.now()}`
        const res = await api.post('/classes', payload)
        const saved = res.data?.data || res.data
        if (saved?.id) createdId = saved.id
        const newClass: ClassItem = {
          id: createdId,
          name: formData.name,
          type: formData.type === 'private' ? 'Lớp Kèm Riêng' : 'Lớp Nhóm',
          level:
            formData.level === 'beginner'
              ? 'Căn bản (Beginner)'
              : formData.level === 'intermediate'
              ? 'Trung cấp (Intermediate)'
              : formData.level === 'advanced'
              ? 'Nâng cao (Advanced)'
              : 'Mọi cấp độ (All levels)',
          duration: Number(formData.duration),
          maxCapacity: Number(formData.maxCapacity),
          price: Number(formData.price),
          description: formData.description || 'Chương trình tập luyện Pilates',
          isActive: true,
        }
        setClasses((prev) => [newClass, ...prev])
        toast.success('Thêm lớp học mới thành công!')
      }
      setIsModalOpen(false)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Có lỗi xảy ra khi lưu lớp học')
    }
  }

  const handleDelete = async (cls: ClassItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa lớp "${cls.name}"?`)) return
    try {
      if (isUuid(cls.id)) {
        await api.delete(`/classes/${cls.id}`)
      }
      setClasses((prev) => prev.filter((c) => c.id !== cls.id))
      toast.success('Xóa lớp học thành công!')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Có lỗi xảy ra khi xóa lớp học')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Danh Mục Lớp Học</h1>
          <p className="text-gray-500 text-sm mt-1">
            Quản lý các chương trình tập luyện và thiết lập giá lớp
          </p>
        </div>
        <Button onClick={handleOpenAdd} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Thêm Lớp Mới
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {classes.map((cls) => (
          <div
            key={cls.id}
            className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{cls.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="default">{cls.type}</Badge>
                    <Badge variant="info">{cls.level}</Badge>
                  </div>
                </div>
                <span className="text-lg font-bold text-primary">
                  {formatCurrency(cls.price)}
                </span>
              </div>

              <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                {cls.description}
              </p>

              <div className="flex items-center gap-6 text-sm text-gray-500 pt-2 border-t border-gray-50">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-gray-400" />
                  {cls.duration} phút
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-gray-400" />
                  Tối đa {cls.maxCapacity} chỗ
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                onClick={() => handleOpenEdit(cls)}
              >
                <Edit className="w-3.5 h-3.5" />
                Chỉnh sửa
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700"
                onClick={() => handleDelete(cls)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <Modal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingClass ? 'Chỉnh Sửa Lớp Học' : 'Tạo Lớp Học Mới'}
        >
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Tên lớp học *</label>
              <Input
                placeholder="Ví dụ: Reformer Core & Glutes"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Hình thức</label>
                <Select
                  options={[
                    { value: 'group', label: 'Lớp Nhóm' },
                    { value: 'private', label: 'Lớp Cá Nhân (1:1)' },
                  ]}
                  value={formData.type}
                  onChange={(val) => setFormData({ ...formData, type: val })}
                  placeholder="Chọn hình thức..."
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Trình độ</label>
                <Select
                  options={[
                    { value: 'beginner', label: 'Căn bản' },
                    { value: 'intermediate', label: 'Trung cấp' },
                    { value: 'advanced', label: 'Nâng cao' },
                    { value: 'all', label: 'Mọi cấp độ' },
                  ]}
                  value={formData.level}
                  onChange={(val) => setFormData({ ...formData, level: val })}
                  placeholder="Chọn trình độ..."
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Thời lượng (phút)</label>
                <Input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Sĩ số tối đa</label>
                <Input
                  type="number"
                  value={formData.maxCapacity}
                  onChange={(e) => setFormData({ ...formData, maxCapacity: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Giá lẻ (VNĐ)</label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Mô tả chi tiết</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                rows={3}
                placeholder="Mô tả nội dung bài tập, đối tượng phù hợp..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleSave}>
              {editingClass ? 'Lưu Thay Đổi' : 'Lưu Lớp Học'}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  )
}
