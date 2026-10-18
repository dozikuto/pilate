import { useState, useEffect } from 'react'
import { Plus, Tag, Calendar, Percent, DollarSign, CheckCircle2, XCircle, Search, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { formatCurrency } from '@/lib/utils'
import { api } from '@/lib/axios'
import toast from 'react-hot-toast'

interface PromotionItem {
  id: string
  code: string
  name: string
  description: string
  discountPercent?: number | string
  discountAmount?: number | string
  minOrderAmount: number | string
  startDate: string
  endDate: string
  isActive: boolean
}

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<PromotionItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discountType: 'percent' as 'percent' | 'amount',
    discountValue: '10',
    minOrderAmount: '1000000',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '2026-12-31',
  })

  const handleDiscountValueChange = (val: string) => {
    if (val === '') {
      setFormData((prev) => ({ ...prev, discountValue: '' }))
      return
    }
    const clean = val.replace(/\D/g, '')
    const sanitized = clean.replace(/^0+(?=\d)/, '')
    setFormData((prev) => ({ ...prev, discountValue: sanitized }))
  }

  const handleMinOrderAmountChange = (val: string) => {
    if (val === '') {
      setFormData((prev) => ({ ...prev, minOrderAmount: '' }))
      return
    }
    const clean = val.replace(/\D/g, '')
    const sanitized = clean.replace(/^0+(?=\d)/, '')
    setFormData((prev) => ({ ...prev, minOrderAmount: sanitized }))
  }

  const fetchPromotions = async () => {
    try {
      setIsLoading(true)
      const res = await api.get('/promotions')
      const items = res.data?.items || res.data?.data || (Array.isArray(res.data) ? res.data : [])
      setPromotions(Array.isArray(items) ? items : [])
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách khuyến mãi:', err)
      toast.error('Không thể tải danh sách khuyến mãi')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPromotions()
  }, [])

  const handleCreate = async () => {
    if (!formData.code.trim()) {
      toast.error('Vui lòng nhập mã khuyến mãi')
      return
    }
    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên chương trình')
      return
    }
    const discountNum = Number(formData.discountValue)
    if (!formData.discountValue || isNaN(discountNum) || discountNum <= 0) {
      toast.error('Vui lòng nhập mức giảm hợp lệ')
      return
    }
    if (formData.discountType === 'percent' && discountNum > 100) {
      toast.error('Mức giảm theo % không được vượt quá 100%')
      return
    }

    try {
      setIsSubmitting(true)
      const payload = {
        code: formData.code.trim().toUpperCase(),
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        discountPercent: formData.discountType === 'percent' ? discountNum : 0,
        discountAmount: formData.discountType === 'amount' ? discountNum : 0,
        minOrderAmount: Number(formData.minOrderAmount) || 0,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
      }

      await api.post('/promotions', payload)
      toast.success('Tạo mã khuyến mãi thành công!')
      setIsModalOpen(false)
      setFormData({
        code: '',
        name: '',
        description: '',
        discountType: 'percent',
        discountValue: '10',
        minOrderAmount: '1000000',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '2026-12-31',
      })
      await fetchPromotions()
    } catch (err: any) {
      console.error('Lỗi tạo khuyến mãi:', err)
      const message = err.response?.data?.message || err.message || 'Lỗi khi tạo khuyến mãi'
      toast.error(typeof message === 'string' ? message : JSON.stringify(message))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/promotions/${id}/toggle`)
      toast.success(currentStatus ? 'Đã tạm dừng mã khuyến mãi' : 'Đã kích hoạt lại mã khuyến mãi')
      setPromotions((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isActive: !item.isActive } : item))
      )
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể đổi trạng thái')
    }
  }

  const handleDelete = async (id: string, code: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa mã khuyến mãi ${code}?`)) return
    try {
      await api.delete(`/promotions/${id}`)
      toast.success('Đã xóa mã khuyến mãi')
      setPromotions((prev) => prev.filter((item) => item.id !== id))
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể xóa mã khuyến mãi')
    }
  }

  const filteredPromos = promotions.filter(
    (p) =>
      p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatShortDate = (dateStr: string) => {
    if (!dateStr) return '—'
    return dateStr.split('T')[0]
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Chương Trình Khuyến Mãi</h1>
          <p className="text-gray-500 text-sm mt-1">
            Quản lý mã giảm giá, voucher và các chiến dịch ưu đãi cho học viên
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Tạo Mã Khuyến Mãi
        </Button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Tìm theo mã hoặc tên chương trình..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin mb-2 text-primary" />
          <p className="text-sm">Đang tải danh sách khuyến mãi...</p>
        </div>
      ) : filteredPromos.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-gray-100 shadow-sm">
          <Tag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-gray-900">Không tìm thấy mã khuyến mãi nào</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            {searchTerm ? 'Không có mã nào khớp với từ khóa tìm kiếm.' : 'Chưa có chương trình khuyến mãi nào được tạo.'}
          </p>
          <Button onClick={() => setIsModalOpen(true)} className="mt-4" size="sm">
            <Plus className="w-4 h-4 mr-1.5" /> Tạo mã đầu tiên
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPromos.map((promo) => {
            const pct = Number(promo.discountPercent || 0)
            const amt = Number(promo.discountAmount || 0)
            return (
              <div
                key={promo.id}
                className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-base bg-primary/10 text-primary px-3 py-1 rounded-lg border border-primary/20">
                      {promo.code}
                    </span>
                    {promo.isActive ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 px-2.5 py-0.5 rounded-full border border-green-200">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Đang chạy
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-50 px-2.5 py-0.5 rounded-full border border-gray-200">
                        <XCircle className="w-3.5 h-3.5" /> Đã tắt
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-gray-900 text-base">{promo.name}</h3>
                    <p className="text-xs text-gray-500 mt-1 min-h-[32px] line-clamp-2">
                      {promo.description || 'Ưu đãi đặc biệt áp dụng cho đơn đăng ký gói tập'}
                    </p>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-1.5 text-xs text-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Mức giảm:</span>
                      <strong className="text-primary text-sm font-bold">
                        {pct > 0 ? `${pct}%` : formatCurrency(amt)}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Đơn tối thiểu:</span>
                      <span>{formatCurrency(Number(promo.minOrderAmount || 0))}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-gray-200/60 text-gray-500">
                      <span>Thời gian:</span>
                      <span>
                        {formatShortDate(promo.startDate)} → {formatShortDate(promo.endDate)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 mt-5 pt-3 border-t border-gray-100">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => handleToggleActive(promo.id, promo.isActive)}
                  >
                    {promo.isActive ? 'Tạm dừng mã' : 'Kích hoạt lại'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2"
                    title="Xóa mã"
                    onClick={() => handleDelete(promo.id, promo.code)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {isModalOpen && (
        <Modal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Tạo Chương Trình Khuyến Mãi Mới"
        >
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Mã khuyến mãi (Code) <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Ví dụ: PILATESVIP20"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Tên chương trình <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Ví dụ: Tri ân khách hàng thân thiết"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Mô tả ưu đãi</label>
              <Input
                placeholder="Ví dụ: Giảm ngay 10% khi đăng ký các gói từ 10 buổi"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Hình thức giảm</label>
                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    type="button"
                    className={`flex-1 py-2 text-xs font-medium transition-colors ${
                      formData.discountType === 'percent'
                        ? 'bg-primary text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        discountType: 'percent',
                        discountValue: prev.discountType === 'percent' ? prev.discountValue : '10',
                      }))
                    }
                  >
                    Theo phần trăm (%)
                  </button>
                  <button
                    type="button"
                    className={`flex-1 py-2 text-xs font-medium transition-colors ${
                      formData.discountType === 'amount'
                        ? 'bg-primary text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        discountType: 'amount',
                        discountValue: prev.discountType === 'amount' ? prev.discountValue : '200000',
                      }))
                    }
                  >
                    Số tiền (VNĐ)
                  </button>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  {formData.discountType === 'percent' ? 'Mức giảm (%)' : 'Số tiền giảm (VNĐ)'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder={formData.discountType === 'percent' ? 'Ví dụ: 10' : 'Ví dụ: 200000'}
                  value={formData.discountValue}
                  onChange={(e) => handleDiscountValueChange(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Đơn tối thiểu (VNĐ)</label>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="Ví dụ: 1000000"
                value={formData.minOrderAmount}
                onChange={(e) => handleMinOrderAmountChange(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Ngày bắt đầu</label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Ngày kết thúc</label>
                <Input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
          </div>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting} className="flex items-center gap-2">
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Lưu Khuyến Mãi
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  )
}
