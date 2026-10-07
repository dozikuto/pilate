import { useState } from 'react'
import { Star, MessageSquare, ThumbsUp, User, Calendar, Filter } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Select } from '@/components/ui/Select'

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

const mockReviews: ReviewItem[] = [
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

export default function ReviewsPage() {
  const [reviews] = useState(mockReviews)
  const [filterType, setFilterType] = useState('all')

  const filteredReviews = reviews.filter((r) => {
    if (filterType === 'all') return true
    return r.targetType === filterType
  })

  const avgRating = (
    reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
  ).toFixed(1)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Đánh Giá & Phản Hồi (UC1.8, R3.6)</h1>
          <p className="text-gray-500 text-sm mt-1">
            Lắng nghe ý kiến của hội viên về chất lượng dịch vụ và huấn luyện viên
          </p>
        </div>
        <div className="w-56">
          <Select
            options={[
              { value: 'all', label: 'Tất cả đánh giá' },
              { value: 'service', label: 'Về phòng tập & dịch vụ' },
              { value: 'instructor', label: 'Về Huấn luyện viên' },
            ]}
            value={filterType}
            onChange={(val) => setFilterType(val)}
          />
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
        {filteredReviews.map((rev) => (
          <div
            key={rev.id}
            className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                  {rev.userName[0]}
                </div>
                <div>
                  <div className="font-bold text-gray-900 text-sm">{rev.userName}</div>
                  <div className="text-xs text-gray-400">{rev.userPhone}</div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1">
                <div className="flex items-center gap-1 text-yellow-500">
                  {[...Array(rev.rating)].map((_, i) => (
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
        ))}
      </div>
    </div>
  )
}
