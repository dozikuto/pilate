import { useState } from 'react'
import { Plus, Star, Award, Phone, Mail, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/utils'

interface InstructorItem {
  id: string
  name: string
  email: string
  phone: string
  specializations: string[]
  bio: string
  rating: number
  totalClasses: number
  hourlyRate: number
  status: 'active' | 'inactive'
}

const mockInstructors: InstructorItem[] = [
  {
    id: 'i1',
    name: 'Trần Mai Lan',
    email: 'coach.lan@pilatesms.vn',
    phone: '0909333444',
    specializations: ['Reformer', 'Cadillac', 'Phục hồi sau sinh'],
    bio: '6 năm kinh nghiệm giảng dạy Pilates Reformer, tốt nghiệp STOTT Pilates Comprehensive.',
    rating: 4.9,
    totalClasses: 320,
    hourlyRate: 400000,
    status: 'active',
  },
  {
    id: 'i2',
    name: 'Vũ Quốc Huy',
    email: 'coach.huy@pilatesms.vn',
    phone: '0909555666',
    specializations: ['Trị liệu cột sống', 'Reformer nâng cao', 'Matwork'],
    bio: 'Chuyên gia vật lý trị liệu & Pilates thoái hóa cột sống, Balanced Body Master.',
    rating: 4.8,
    totalClasses: 280,
    hourlyRate: 450000,
    status: 'active',
  },
  {
    id: 'i3',
    name: 'Nguyễn Bích Phương',
    email: 'coach.phuong@pilatesms.vn',
    phone: '0909777888',
    specializations: ['Cadillac', 'Wunda Chair', 'Barre Pilates'],
    bio: 'Huấn luyện viên tràn đầy năng lượng với phong cách tập luyện kết hợp Cardio và Pilates.',
    rating: 5.0,
    totalClasses: 195,
    hourlyRate: 380000,
    status: 'active',
  },
]

export default function InstructorsPage() {
  const [instructors] = useState(mockInstructors)
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Đội Ngũ Huấn Luyện Viên</h1>
          <p className="text-gray-500 text-sm mt-1">
            Quản lý giáo viên, phân bổ lịch dạy và biểu phí thù lao
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Thêm HLV Mới
        </Button>
      </div>

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
                  <div className="flex items-center gap-1 text-yellow-500 text-xs mt-0.5">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span className="font-bold text-gray-700">{ins.rating}</span>
                    <span className="text-gray-400">({ins.totalClasses} lớp)</span>
                  </div>
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
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Edit className="w-3.5 h-3.5" />
                Sửa
              </Button>
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
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
          title="Thêm Huấn Luyện Viên Mới"
        >
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Họ và tên</label>
              <Input placeholder="Ví dụ: Trần Mai Lan" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
                <Input type="email" placeholder="coach@pilatesms.vn" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Số điện thoại</label>
                <Input placeholder="0901234567" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Thù lao theo giờ (VNĐ)</label>
                <Input type="number" defaultValue={400000} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Chuyên môn chính</label>
                <Input placeholder="Reformer, Mat, Trị liệu..." />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Tiểu sử & Chứng chỉ</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                rows={2}
                placeholder="Số năm kinh nghiệm, các chứng nhận quốc tế..."
              />
            </div>
          </div>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button onClick={() => setIsModalOpen(false)}>Lưu HLV</Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  )
}
