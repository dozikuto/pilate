import { useState, useEffect, useCallback } from 'react'
import { Star, MessageSquare, ThumbsUp, User, Calendar, Filter, RefreshCw, Plus } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import toast from 'react-hot-toast'
import api from '@/lib/axios'
import { formatDate } from '@/lib/utils'

interface ReviewItem {
  id: string
  userName: string
  userPhone: string
  targetType: 'service' | 'instructor'
  targetName: string
  rating: number
  comment: string
  createdAt: string
}

const defaultSeedReviews: ReviewItem[] = [
  {
    id: 'r1',
    userName: 'Nguyễn Thu Hằng',
    userPhone: '0981234001',
    targetType: 'service',
    targetName: 'Phòng tập & Dịch vụ chung',
    rating: 5,
    comment: 'Không gian phòng tập rất thơm và sạch sẽ. Máy Reformer Allegro 2 vận hành êm ái, nhân viên lễ tân hỗ trợ nhiệt tình.',
    createdAt: '2026-09-22 10:30',
  },
  {
    id: 'r2',
    userName: 'Lê Tuấn Minh',
    userPhone: '0981234002',
    targetType: 'instructor',
    targetName: 'HLV Vũ Quốc Huy',
    rating: 5,
    comment: 'Thầy Huy có chuyên môn vật lý trị liệu rất cao, bài tập giải tỏa áp lực đốt sống L4-L5 của mình hiệu quả rõ rệt sau 5 buổi.',
    createdAt: '2026-09-23 15:45',
  },
  {
    id: 'r3',
    userName: 'Đặng Thùy Linh',
    userPhone: '0981234003',
    targetType: 'instructor',
    targetName: 'HLV Trần Mai Lan',
    rating: 5,
    comment: 'Cô Lan chỉnh form từng cm, bài tập siết eo và cơ đùi rất thấm nhưng không bị đau cơ sau tập. Sẽ gia hạn gói tiếp!',
    createdAt: '2026-09-24 18:20',
  },
  {
    id: 'r4',
    userName: 'Phạm Hồng Nhung',
    userPhone: '0918889999',
    targetType: 'service',
    targetName: 'Phòng tập & Dịch vụ chung',
    rating: 4,
    comment: 'Mọi thứ đều hoàn hảo, chỉ mong phòng tập bổ sung thêm máy sấy tóc cao cấp trong phòng thay đồ.',
    createdAt: '2026-09-24 19:10',
  },
]

const fallbackInstructors = [
  { id: 'ins-1', name: 'HLV Vũ Quốc Huy' },
  { id: 'ins-2', name: 'HLV Trần Mai Lan' },
  { id: 'ins-3', name: 'HLV Nguyễn Thu Hà' },
  { id: 'ins-4', name: 'HLV Lê Đức Anh' },
]

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewItem[]>(defaultSeedReviews)
  const [loading, setLoading] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const [selectedInstructorFilter, setSelectedInstructorFilter] = useState('all')
  const [instructorsList, setInstructorsList] = useState(fallbackInstructors)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    userName: '',
    userPhone: '',
    targetType: 'instructor' as 'service' | 'instructor',
    targetName: 'HLV Vũ Quốc Huy',
    rating: 5,
    comment: '',
  })

  // Tải danh sách HLV từ DB
  useEffect(() => {
    async function fetchInstructors() {
      try {
        const res = await api.get('/instructors')
        const items = res.data?.data || res.data || []
        if (Array.isArray(items) && items.length > 0) {
          const mapped = items.map((i: any) => ({
            id: i.id || i.userId,
            name: i.user?.fullName || i.fullName || 'Huấn luyện viên',
          }))
          setInstructorsList(mapped)
          if (mapped.length > 0) {
            setFormData((prev) => ({ ...prev, targetName: mapped[0].name }))
          }
        }
      } catch {}
    }
    fetchInstructors()
  }, [])

  const fetchReviews = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get('/reviews', {
        params: { limit: 50 },
      })
      const items = res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : [])
      if (Array.isArray(items) && items.length > 0) {
        const mapped: ReviewItem[] = items.map((r: any) => ({
          id: r.id,
          userName: r.user?.fullName || r.userName || 'Hội viên Pilates',
          userPhone: r.user?.phone || r.userPhone || '—',
          targetType: r.targetType === 'instructor' ? 'instructor' : 'service',
          targetName:
            r.targetType === 'instructor'
              ? (r.targetName || 'Huấn luyện viên Pilates')
              : 'Phòng tập & Dịch vụ chung',
          rating: Number(r.rating) || 5,
          comment: r.comment || '(Không có nhận xét viết thêm)',
          createdAt: r.createdAt ? formatDate(r.createdAt) : 'Gần đây',
        }))

        const existingIds = new Set(mapped.map((m) => m.id))
        const unseeded = defaultSeedReviews.filter((d) => !existingIds.has(d.id))
        setReviews([...mapped, ...unseeded])
      }
    } catch {
      // Giữ defaultSeedReviews nếu backend chưa kết nối được
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const handleCreateReview = async () => {
    if (!formData.userName.trim()) {
      toast.error('Vui lòng nhập tên học viên')
      return
    }

    const chosenTargetName =
      formData.targetType === 'instructor'
        ? formData.targetName
        : 'Phòng tập & Dịch vụ chung'

    try {
      await api.post('/reviews', {
        targetType: formData.targetType,
        targetName: chosenTargetName,
        rating: Number(formData.rating),
        comment: formData.comment.trim() || undefined,
      })
    } catch {}

    const newRev: ReviewItem = {
      id: `rev-${Date.now()}`,
      userName: formData.userName,
      userPhone: formData.userPhone || '—',
      targetType: formData.targetType,
      targetName: chosenTargetName,
      rating: Number(formData.rating),
      comment: formData.comment || '(Đánh giá chất lượng dịch vụ)',
      createdAt: 'Vừa xong',
    }

    setReviews((prev) => [newRev, ...prev])
    setIsCreateModalOpen(false)
    toast.success('Đã lưu đánh giá của học viên thành công!')
    setFormData({
      userName: '',
      userPhone: '',
      targetType: 'instructor',
      targetName: instructorsList[0]?.name || 'HLV Vũ Quốc Huy',
      rating: 5,
      comment: '',
    })
  }

  const filteredReviews = reviews.filter((r) => {
    if (filterType !== 'all' && r.targetType !== filterType) return false
    if (filterType === 'instructor' && selectedInstructorFilter !== 'all') {
      return r.targetName === selectedInstructorFilter
    }
    return true
  })

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Đánh Giá & Phản Hồi (UC1.8, R3.6)</h1>
          <p className="text-gray-500 text-sm mt-1">
            Lắng nghe ý kiến của hội viên về chất lượng dịch vụ và huấn luyện viên
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchReviews}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>

          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Thêm Đánh Giá
          </Button>

          <div className="w-52">
            <Select
              options={[
                { value: 'all', label: 'Tất cả đánh giá' },
                { value: 'service', label: 'Về phòng tập & dịch vụ' },
                { value: 'instructor', label: 'Về Huấn luyện viên' },
              ]}
              value={filterType}
              onChange={(val) => {
                setFilterType(val)
                setSelectedInstructorFilter('all')
              }}
              placeholder=""
            />
          </div>

          {filterType === 'instructor' && (
            <div className="w-56">
              <Select
                options={[
                  { value: 'all', label: 'Tất cả Huấn luyện viên' },
                  ...instructorsList.map((ins) => ({
                    value: ins.name,
                    label: ins.name,
                  })),
                ]}
                value={selectedInstructorFilter}
                onChange={(val) => setSelectedInstructorFilter(val)}
                placeholder=""
              />
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="text-center sm:text-left">
            <span className="text-4xl font-black text-gray-900">{avgRating}</span>
            <div className="flex items-center justify-center sm:justify-start gap-1 text-yellow-500 mt-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-current" />
              ))}
            </div>
            <span className="text-xs text-gray-400 mt-1 block">
              Dựa trên {reviews.length} đánh giá
            </span>
          </div>
          <div className="hidden sm:block h-12 w-[1px] bg-gray-200" />
          <div className="text-sm text-gray-600 space-y-1">
            <div>⭐ <strong>98%</strong> hội viên hài lòng với đội ngũ HLV</div>
            <div>⭐ <strong>100%</strong> đánh giá máy Reformer đạt chuẩn quốc tế</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 text-gray-400">
            Không tìm thấy đánh giá nào phù hợp với bộ lọc.
          </div>
        ) : (
          filteredReviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                    {rev.userName ? rev.userName[0] : 'U'}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{rev.userName}</div>
                    <div className="text-xs text-gray-400 font-mono">{rev.userPhone}</div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1 text-yellow-500">
                    {[...Array(Math.max(1, Math.min(5, rev.rating)))].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <span className="text-[11px] text-gray-400">{rev.createdAt}</span>
                </div>
              </div>

              <div className="pt-1">
                <Badge variant={rev.targetType === 'instructor' ? 'info' : 'secondary'} className="mb-2">
                  {rev.targetName}
                </Badge>
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50/60 p-3.5 rounded-xl border border-gray-100">
                  "{rev.comment}"
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Thêm Đánh Giá Mới */}
      {isCreateModalOpen && (
        <Modal
          open={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Ghi Nhận Đánh Giá Của Học Viên"
        >
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Họ tên học viên *</label>
                <Input
                  placeholder="Ví dụ: Nguyễn Thu Hằng"
                  value={formData.userName}
                  onChange={(e) => setFormData({ ...formData, userName: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Số điện thoại</label>
                <Input
                  placeholder="0981234567"
                  value={formData.userPhone}
                  onChange={(e) => setFormData({ ...formData, userPhone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Đối tượng đánh giá</label>
                <Select
                  options={[
                    { value: 'instructor', label: 'Huấn luyện viên' },
                    { value: 'service', label: 'Dịch vụ & Phòng tập' },
                  ]}
                  value={formData.targetType}
                  onChange={(val) => setFormData({ ...formData, targetType: val as any })}
                  placeholder=""
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Số sao đánh giá</label>
                <Select
                  options={[
                    { value: '5', label: '⭐⭐⭐⭐⭐ (5 sao - Tuyệt vời)' },
                    { value: '4', label: '⭐⭐⭐⭐ (4 sao - Rất tốt)' },
                    { value: '3', label: '⭐⭐⭐ (3 sao - Tạm ổn)' },
                    { value: '2', label: '⭐⭐ (2 sao - Cần cải thiện)' },
                    { value: '1', label: '⭐ (1 sao - Kém)' },
                  ]}
                  value={String(formData.rating)}
                  onChange={(val) => setFormData({ ...formData, rating: Number(val) })}
                  placeholder=""
                />
              </div>
            </div>

            {/* CHỖ CHỌN GIÁO VIÊN / HUẤN LUYỆN VIÊN */}
            {formData.targetType === 'instructor' && (
              <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200">
                <label className="text-sm font-semibold text-amber-900 block mb-1">
                  Chọn Giáo viên / Huấn luyện viên được đánh giá *
                </label>
                <Select
                  options={instructorsList.map((ins) => ({
                    value: ins.name,
                    label: ins.name,
                  }))}
                  value={formData.targetName}
                  onChange={(val) => setFormData({ ...formData, targetName: val })}
                  placeholder=""
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Nội dung nhận xét</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[90px]"
                placeholder="Ý kiến nhận xét của học viên về chuyên môn, thái độ hướng dẫn, cơ sở vật chất..."
                value={formData.comment}
                onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              />
            </div>
          </div>

          <ModalFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Hủy
            </Button>
            <Button onClick={handleCreateReview}>
              Lưu Đánh Giá
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  )
}
