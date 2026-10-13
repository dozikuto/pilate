import { useEffect, useState } from 'react'
import { CalendarClock, Check, X, Search, RotateCw } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { api } from '@/lib/axios'
import toast from 'react-hot-toast'

type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

interface PrivateRequest {
  id: string
  startTime: string
  endTime: string
  sessionType: string
  status: RequestStatus
  note?: string
  responseNote?: string
  createdAt: string
  member: { userId: string; fullName?: string; phone?: string; email?: string }
  instructor: { userId: string; fullName?: string }
}

const TYPE_LABEL: Record<string, string> = {
  private_1v1: '1 vs 1',
  semi_private_1v2: '1 vs 2',
  small_group_1v3: '1 vs 3',
  small_group_1v4: '1 vs 4',
}

const STATUS_META: Record<RequestStatus, { label: string; cls: string }> = {
  pending: { label: 'Chờ duyệt', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  approved: { label: 'Đã xác nhận', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  rejected: { label: 'Từ chối', cls: 'bg-red-100 text-red-800 border-red-200' },
  cancelled: { label: 'Học viên hủy', cls: 'bg-gray-100 text-gray-600 border-gray-200' },
}

function formatSlot(start: string, end: string) {
  const s = new Date(start)
  const e = new Date(end)
  const date = s.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
  const t = (d: Date) => d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  return `${date} · ${t(s)} - ${t(e)}`
}

export default function PrivateSessionsPage() {
  const [items, setItems] = useState<PrivateRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<RequestStatus | 'all'>('pending')
  const [search, setSearch] = useState('')
  const [action, setAction] = useState<{ item: PrivateRequest; status: RequestStatus } | null>(null)
  const [responseNote, setResponseNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchItems = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true)
      const res = await api.get('/private-sessions')
      const data = res.data?.data ?? res.data
      setItems(Array.isArray(data) ? data : [])
    } catch {
      if (!silent) toast.error('Không thể tải danh sách đề nghị tập riêng')
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchItems()
    const timer = setInterval(() => {
      fetchItems(true)
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  const submitAction = async () => {
    if (!action) return
    try {
      setIsSubmitting(true)
      await api.patch(`/private-sessions/${action.item.id}/status`, {
        status: action.status,
        responseNote: responseNote.trim() || undefined,
      })
      toast.success(action.status === 'approved' ? 'Đã xác nhận lịch tập riêng' : 'Đã từ chối đề nghị')
      setAction(null)
      setResponseNote('')
      fetchItems()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Cập nhật thất bại')
    } finally {
      setIsSubmitting(false)
    }
  }

  const keyword = search.trim().toLowerCase()
  const filtered = items.filter((r) => {
    const matchStatus = filter === 'all' || r.status === filter
    const matchSearch =
      !keyword ||
      r.member.fullName?.toLowerCase().includes(keyword) ||
      r.member.phone?.includes(keyword) ||
      r.instructor.fullName?.toLowerCase().includes(keyword)
    return matchStatus && matchSearch
  })

  const countBy = (s: RequestStatus) => items.filter((r) => r.status === s).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarClock className="text-primary-600" size={28} />
            Đề nghị tập riêng
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Học viên chọn khung giờ trống của huấn luyện viên trên app để đề nghị tập riêng 1 vs 1 đến 1 vs 4.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchItems()}
          disabled={isLoading}
          className="flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RotateCw size={15} className={isLoading ? 'animate-spin' : ''} />
          <span>Làm mới dữ liệu</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['pending', 'approved', 'rejected', 'cancelled'] as RequestStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`text-left bg-white p-4 rounded-xl border shadow-sm transition ${
              filter === s ? 'border-primary-500 ring-1 ring-primary-500' : 'border-gray-200'
            }`}
          >
            <span className="text-xs font-medium text-gray-500">{STATUS_META[s].label}</span>
            <div className="text-2xl font-bold text-gray-900 mt-1">{countBy(s)}</div>
          </button>
        ))}
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo học viên, SĐT hoặc huấn luyện viên..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as RequestStatus | 'all')}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="pending">Chờ duyệt</option>
          <option value="approved">Đã xác nhận</option>
          <option value="rejected">Từ chối</option>
          <option value="cancelled">Học viên hủy</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3">Học viên</th>
                <th className="px-4 py-3">Huấn luyện viên</th>
                <th className="px-4 py-3">Khung giờ</th>
                <th className="px-4 py-3">Hình thức</th>
                <th className="px-4 py-3">Ghi chú</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">Đang tải...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">Không có đề nghị nào</td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{r.member.fullName || '-'}</div>
                      <div className="text-xs text-gray-400">{r.member.phone || r.member.email}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-800">{r.instructor.fullName || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatSlot(r.startTime, r.endTime)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-semibold">
                        {TYPE_LABEL[r.sessionType] ?? r.sessionType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs max-w-xs">
                      {r.note || '-'}
                      {r.responseNote && <div className="text-primary-700 mt-1">Phản hồi: {r.responseNote}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={STATUS_META[r.status].cls}>{STATUS_META[r.status].label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status === 'pending' ? (
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => setAction({ item: r, status: 'approved' })}
                            className="p-1.5 rounded border border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                            title="Xác nhận"
                          >
                            <Check size={15} />
                          </button>
                          <button
                            onClick={() => setAction({ item: r, status: 'rejected' })}
                            className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50"
                            title="Từ chối"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={Boolean(action)}
        onClose={() => setAction(null)}
        title={action?.status === 'approved' ? 'Xác nhận lịch tập riêng' : 'Từ chối đề nghị'}
      >
        {action && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              {action.item.member.fullName} · HLV {action.item.instructor.fullName}
              <br />
              {formatSlot(action.item.startTime, action.item.endTime)} ·{' '}
              {TYPE_LABEL[action.item.sessionType]}
            </p>
            <textarea
              rows={3}
              value={responseNote}
              onChange={(e) => setResponseNote(e.target.value)}
              placeholder={
                action.status === 'approved'
                  ? 'VD: Hẹn bạn tại Phòng VIP 01, vui lòng đến trước 10 phút'
                  : 'VD: HLV bận việc đột xuất, mời bạn chọn khung giờ khác'
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        )}
        <ModalFooter className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setAction(null)}>Đóng</Button>
          <Button
            variant={action?.status === 'approved' ? 'primary' : 'danger'}
            onClick={submitAction}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Đang lưu...' : action?.status === 'approved' ? 'Xác nhận' : 'Từ chối'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
