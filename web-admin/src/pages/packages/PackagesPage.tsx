import { useState } from 'react'
import toast from 'react-hot-toast'
import { Plus, Check, Edit, Trash2, Tag, Calendar, Dumbbell } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { formatCurrency } from '@/lib/utils'

interface PackageItem {
  id: string
  name: string
  type: string
  totalSessions?: number
  durationDays: number
  price: number
  description: string
  features: string[]
  isPopular?: boolean
  isActive: boolean
}

const mockPackages: PackageItem[] = [
  {
    id: 'p1',
    name: 'Gói Trải Nghiệm 5 Buổi',
    type: 'Theo buổi',
    totalSessions: 5,
    durationDays: 30,
    price: 1500000,
    description: 'Lựa chọn hoàn hảo để bắt đầu làm quen với phương pháp Pilates Reformer.',
    features: [
      '5 buổi tập lớp nhóm bất kỳ',
      'Thời hạn sử dụng 30 ngày',
      'Được mượn vớ tập miễn phí buổi đầu',
      'Đo chỉ số InBody định kỳ',
    ],
    isActive: true,
  },
  {
    id: 'p2',
    name: 'Gói Tiêu Chuẩn 10 Buổi',
    type: 'Theo buổi',
    totalSessions: 10,
    durationDays: 60,
    price: 2800000,
    description: 'Gói tập phổ biến nhất, giúp định hình thói quen và cải thiện vóc dáng rõ rệt.',
    features: [
      '10 buổi tập lớp nhóm Reformer/Mat',
      'Thời hạn sử dụng 60 ngày',
      'Bảo lưu tối đa 14 ngày khi bận',
      'Tặng 1 buổi phân tích cột sống 1:1',
    ],
    isPopular: true,
    isActive: true,
  },
  {
    id: 'p3',
    name: 'Gói Chuyên Sâu 20 Buổi',
    type: 'Theo buổi',
    totalSessions: 20,
    durationDays: 90,
    price: 5200000,
    description: 'Dành cho học viên muốn duy trì tập luyện lâu dài với chi phí tiết kiệm nhất.',
    features: [
      '20 buổi tập toàn diện trên mọi máy',
      'Thời hạn sử dụng 90 ngày',
      'Bảo lưu tối đa 30 ngày',
      'Ưu tiên đặt chỗ giờ cao điểm',
      'Tặng bình nước PilatesMS',
    ],
    isActive: true,
  },
  {
    id: 'p4',
    name: 'Gói Tháng Không Giới Hạn',
    type: 'Theo thời gian',
    durationDays: 30,
    price: 3900000,
    description: 'Tập không giới hạn số buổi trong tháng, thỏa sức đam mê luyện tập mỗi ngày.',
    features: [
      'Tập không giới hạn số buổi',
      'Thời hạn sử dụng 30 ngày',
      'Đặt tối đa 1 lớp/ngày',
      'Miễn phí tủ đồ cá nhân riêng',
    ],
    isActive: true,
  },
]

import { usePackages, useCreatePackage, useDeletePackage } from '@/hooks/usePackages'
import { PageLoader } from '@/components/shared/LoadingSpinner'

export default function PackagesPage() {
  const { data: apiPackages, isLoading } = usePackages()
  const createPackage = useCreatePackage()
  const deletePackage = useDeletePackage()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: 'session_based',
    price: 2500000,
    totalSessions: 10,
    durationDays: 60,
    description: '',
  })

  const [deletedMockIds, setDeletedMockIds] = useState<string[]>([])

  const apiItems: any[] = Array.isArray(apiPackages)
    ? apiPackages
    : (apiPackages as any)?.items || (apiPackages as any)?.data || []

  const isUuid = (str: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

  const packages = (apiItems.length > 0)
    ? apiItems.map((p: any) => ({
        id: p.id,
        name: p.name,
        type: p.type === 'unlimited' ? 'Theo thời gian' : 'Theo buổi',
        totalSessions: p.totalSessions,
        durationDays: p.durationDays || 30,
        price: Number(p.price) || 0,
        description: p.description || 'Gói tập chất lượng cao tại PilatesMS',
        features: [
          p.totalSessions ? `${p.totalSessions} buổi tập tại studio` : 'Tập không giới hạn số buổi',
          `Thời hạn sử dụng ${p.durationDays || 30} ngày`,
          'Giảng viên hướng dẫn tận tình',
          'Đầy đủ tiện ích thảm & máy tập',
        ],
        isActive: p.isActive,
        isPopular: p.name?.includes('10'),
      }))
    : mockPackages.filter((m) => !deletedMockIds.includes(m.id))

  const handleCreate = async () => {
    if (!formData.name.trim()) return
    await createPackage.mutateAsync({
      name: formData.name,
      type: formData.type as any,
      price: Number(formData.price),
      totalSessions: Number(formData.totalSessions),
      durationDays: Number(formData.durationDays),
      description: formData.description,
      isActive: true,
    })
    setIsModalOpen(false)
    setFormData({
      name: '',
      type: 'session_based',
      price: 2500000,
      totalSessions: 10,
      durationDays: 60,
      description: '',
    })
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gói Tập & Thẻ Thành Viên</h1>
          <p className="text-gray-500 text-sm mt-1">
            Thiết lập các gói thẻ thành viên, số buổi và chính sách giá
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Tạo Gói Mới
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className={`bg-white rounded-2xl border p-6 flex flex-col justify-between transition-all relative ${
              pkg.isPopular
                ? 'border-primary shadow-lg ring-2 ring-primary/10'
                : 'border-gray-100 shadow-sm hover:shadow-md'
            }`}
          >
            {pkg.isPopular && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[11px] font-bold py-0.5 px-3 rounded-full uppercase tracking-wider">
                Phổ biến nhất
              </span>
            )}

            <div>
              <div className="mb-4">
                <Badge variant="secondary" className="mb-2">
                  {pkg.type}
                </Badge>
                <h3 className="font-bold text-lg text-gray-900">{pkg.name}</h3>
                <p className="text-xs text-gray-500 mt-1 min-h-[36px] line-clamp-2">
                  {pkg.description}
                </p>
              </div>

              <div className="mb-6">
                <span className="text-2xl font-black text-gray-900">
                  {formatCurrency(pkg.price)}
                </span>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1.5 font-medium">
                  {pkg.totalSessions && (
                    <span className="flex items-center gap-1">
                      <Dumbbell className="w-3.5 h-3.5 text-primary" />
                      {pkg.totalSessions} buổi
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    {pkg.durationDays} ngày
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 border-t border-gray-100 pt-4 mb-6">
                {pkg.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-gray-600">
                    <Check className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-gray-100">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-red-500 hover:text-red-700 hover:bg-red-50 flex items-center justify-center gap-1"
                onClick={() => {
                  if (confirm(`Bạn có chắc muốn xóa gói "${pkg.name}"?`)) {
                    if (isUuid(pkg.id)) {
                      deletePackage.mutate(pkg.id)
                    } else {
                      setDeletedMockIds((prev) => [...prev, pkg.id])
                      toast.success('Xóa gói tập thành công!')
                    }
                  }
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa gói
              </Button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <Modal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Tạo Gói Tập Mới"
        >
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Tên gói tập</label>
              <Input
                placeholder="Ví dụ: Gói Mùa Hè 15 Buổi"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Loại gói</label>
                <Select
                  value={formData.type}
                  onChange={(val) => setFormData({ ...formData, type: val })}
                  options={[
                    { value: 'session_based', label: 'Theo số buổi' },
                    { value: 'unlimited', label: 'Theo thời gian (tháng)' },
                  ]}
                  placeholder="Chọn loại gói..."
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Giá bán (VNĐ)</label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Số buổi</label>
                <Input
                  type="number"
                  value={formData.totalSessions}
                  onChange={(e) => setFormData({ ...formData, totalSessions: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Hạn dùng (ngày)</label>
                <Input
                  type="number"
                  value={formData.durationDays}
                  onChange={(e) => setFormData({ ...formData, durationDays: Number(e.target.value) })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Mô tả tóm tắt</label>
              <textarea
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                rows={2}
                placeholder="Mô tả ưu đãi của gói..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreate} loading={createPackage.isPending}>
              Lưu Gói Tập
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  )
}
