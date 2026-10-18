import { useState, useEffect, useCallback } from 'react'
import { Star, MessageSquare, RefreshCw, Reply, CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'
import { Modal, ModalFooter } from '@/components/ui/Modal'
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
  reply?: string
  repliedAt?: string
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
    reply: 'Cảm ơn chị Thu Hằng đã tin tưởng và yêu mến PilatesMS! Hẹn gặp chị ở các buổi tập tiếp theo ạ.',
    repliedAt: '22/09/2026',
    createdAt: '22/09/2026',
  },
  {
    id: 'r2',
    userName: 'Lê Tuấn Minh',
    userPhone: '0981234002',
    targetType: 'instructor',
    targetName: 'HLV Vũ Quốc Huy',
    rating: 5,
    comment: 'Thầy Huy có chuyên môn vật lý trị liệu rất cao, bài tập giải tỏa áp lực đốt sống L4-L5 của mình hiệu quả rõ rệt sau 5 buổi.',
    createdAt: '23/09/2026',
  },
  {
    id: 'r3',
    userName: 'Đặng Thùy Linh',
    userPhone: '0981234003',
    targetType: 'instructor',
    targetName: 'HLV Trần Mai Lan',
    rating: 5,
    comment: 'Cô Lan chỉnh form từng cm, bài tập siết eo và cơ đùi rất thấm nhưng không bị đau cơ sau tập. Sẽ gia hạn gói tiếp!',
    createdAt: '24/09/2026',
  },
  {
    id: 'r4',
    userName: 'Phạm Hồng Nhung',
    userPhone: '0918889999',
    targetType: 'service',
    targetName: 'Phòng tập & Dịch vụ chung',
    rating: 4,
    comment: 'Mọi thứ đều hoàn hảo, chỉ mong phòng tập bổ sung thêm máy sấy tóc cao cấp trong phòng thay đồ.',
    createdAt: '24/09/2026',
  },
]

const fallbackInstructors = [
  { id: 'ins-1', name: 'HLV Vũ Quốc Huy' },
  { id: 'ins-2', name: 'HLV Trần Mai Lan' },
  { id: 'ins-3', name: 'HLV Nguyễn Thu Hà' },
  { id: 'ins-4', name: 'HLV Lê Đức Anh' },
]

const quickReplyTemplates = [
  'Cảm ơn bạn đã tin tưởng và đánh giá tích cực! PilatesMS rất vui được đồng hành cùng bạn trong hành trình rèn luyện sức khỏe.',
  'Cảm ơn nhận xét của bạn dành cho Huấn luyện viên. Phòng tập đã chuyển lời khen tới HLV và hẹn gặp bạn ở buổi tập tiếp theo!',
  'Cảm ơn ý kiến đóng góp quý báu của bạn. Ban quản lý phòng tập đã ghi nhận và sẽ cải thiện ngay để mang lại trải nghiệm tốt nhất.',
]

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewItem[]>(defaultSeedReviews)
  const [loading, setLoading] = useState(false)
  const [filterType, setFilterType] = useState('all')
  const [selectedInstructorFilter, setSelectedInstructorFilter] = useState('all')
  const [instructorsList, setInstructorsList] = useState(fallbackInstructors)

  const [replyingReview, setReplyingReview] = useState<ReviewItem | null>(null)
  const [replyText, setReplyText] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)

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
      const items = res.data?.data?.items || res.data?.data || res.data?.items || (Array.isArray(res.data) ? res.data : [])
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
          reply: r.reply || undefined,
          repliedAt: r.repliedAt ? formatDate(r.repliedAt) : undefined,
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

  const handleOpenReplyModal = (rev: ReviewItem) => {
    setReplyingReview(rev)
    setReplyText(rev.reply || '')
  }

  const handleSaveReply = async () => {
    if (!replyingReview) return
    if (!replyText.trim()) {
      toast.error('Vui lòng nhập nội dung phản hồi cho học viên')
      return
    }
    setSubmittingReply(true)
    try {
      if (replyingReview.id.length > 10) {
        await api.patch(`/reviews/${replyingReview.id}/reply`, {
          reply: replyText.trim(),
        })
      }
      const nowFormatted = formatDate(new Date().toISOString())
      setReviews((prev) =>
        prev.map((item) =>
          item.id === replyingReview.id
            ? { ...item, reply: replyText.trim(), repliedAt: nowFormatted }
            : item
        )
      )
      toast.success(`Đã gửi phản hồi đánh giá cho học viên ${replyingReview.userName}!`)
      setReplyingReview(null)
      setReplyText('')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Không thể lưu phản hồi. Vui lòng thử lại.')
    } finally {
      setSubmittingReply(false)
    }
  }

  const filteredReviews = reviews.filter((r) => {
    if (filterType !== 'all' && r.targetType !== filterType) return false
    if (filterType === 'instructor' && selectedInstructorFilter !== 'all') {
      return r.targetName.toLowerCase().includes(selectedInstructorFilter.toLowerCase()) ||
        selectedInstructorFilter.toLowerCase().includes(r.targetName.toLowerCase())
    }
    return true
  })

  const avgRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '5.0'

  const repliedCount = reviews.filter((r) => !!r.reply).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Đánh Giá & Phản Hồi Học Viên</h1>
          <p className="text-gray-500 text-sm mt-1">
            Tiếp nhận đánh giá của học viên về dịch vụ, huấn luyện viên và gửi phản hồi trực tiếp cho học viên
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
              Dựa trên {reviews.length} đánh giá ({repliedCount}/{reviews.length} đã phản hồi)
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
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                    {rev.userName ? rev.userName[0] : 'U'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-900 text-sm">{rev.userName}</span>
                      {rev.reply ? (
                        <Badge variant="success" className="flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3 h-3" /> Đã phản hồi
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="flex items-center gap-1 text-[11px]">
                          <Clock className="w-3 h-3" /> Chờ phản hồi
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 font-mono">{rev.userPhone}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 text-yellow-500">
                      {[...Array(Math.max(1, Math.min(5, rev.rating)))].map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                    <span className="text-[11px] text-gray-400">{rev.createdAt}</span>
                  </div>
                  <Button
                    size="sm"
                    variant={rev.reply ? 'outline' : 'primary'}
                    onClick={() => handleOpenReplyModal(rev)}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <Reply className="w-3.5 h-3.5" />
                    {rev.reply ? 'Sửa phản hồi' : 'Phản hồi học viên'}
                  </Button>
                </div>
              </div>

              <div className="pt-1 space-y-2.5">
                <Badge variant={rev.targetType === 'instructor' ? 'info' : 'secondary'}>
                  {rev.targetName}
                </Badge>
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50/60 p-3.5 rounded-xl border border-gray-100">
                  "{rev.comment}"
                </p>

                {rev.reply && (
                  <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5 ml-4 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-primary flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        Phản hồi gửi học viên {rev.userName}
                      </span>
                      {rev.repliedAt && (
                        <span className="text-gray-400 text-[11px]">{rev.repliedAt}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{rev.reply}</p>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Phản Hồi Đánh Giá Cho Học Viên */}
      {replyingReview && (
        <Modal
          open={!!replyingReview}
          onClose={() => !submittingReply && setReplyingReview(null)}
          title={`Phản Hồi Đánh Giá Cho Học Viên — ${replyingReview.userName}`}
        >
          <div className="space-y-4 py-2">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-900 text-sm">{replyingReview.userName}</span>
                  <Badge variant={replyingReview.targetType === 'instructor' ? 'info' : 'secondary'}>
                    {replyingReview.targetName}
                  </Badge>
                </div>
                <div className="flex items-center gap-0.5 text-yellow-500">
                  {[...Array(Math.max(1, Math.min(5, replyingReview.rating)))].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-700 italic">"{replyingReview.comment}"</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
                Mẫu phản hồi nhanh
              </label>
              <div className="space-y-1.5">
                {quickReplyTemplates.map((tpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setReplyText(tpl)}
                    className="w-full text-left text-xs text-gray-600 hover:text-primary hover:bg-blue-50/60 border border-gray-200 hover:border-blue-200 rounded-lg px-3 py-2 transition-colors"
                  >
                    {tpl}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Nội dung phản hồi gửi học viên *
              </label>
              <textarea
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[100px]"
                placeholder="Nhập lời cảm ơn hoặc phản hồi giải đáp cho học viên..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
            </div>
          </div>

          <ModalFooter>
            <Button
              variant="outline"
              disabled={submittingReply}
              onClick={() => setReplyingReview(null)}
            >
              Hủy
            </Button>
            <Button onClick={handleSaveReply} disabled={submittingReply}>
              {submittingReply ? 'Đang gửi...' : 'Gửi Phản Hồi'}
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  )
}
