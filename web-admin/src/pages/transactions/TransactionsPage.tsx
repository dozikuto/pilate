import { useState, useEffect } from 'react'
import {
  Search, Filter, Download, ArrowUpRight, CheckCircle2,
  Clock, AlertCircle, Printer, FileText, X, Check
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { formatCurrency, formatDate } from '@/lib/utils'
import { api } from '@/lib/axios'

interface TxItem {
  id: string
  code: string
  memberName: string
  memberPhone: string
  packageName: string
  amount: number
  paymentMethod: 'vietqr' | 'cash' | 'transfer' | 'vnpay'
  paymentStatus: 'completed' | 'pending' | 'failed'
  createdAt: string
}

const mockTransactions: TxItem[] = [
  {
    id: 't0',
    code: 'TX-20260929-322',
    memberName: 'lê văn luyện',
    memberPhone: '0901234567',
    packageName: 'Gói Trải Nghiệm 5 Buổi',
    amount: 1500000,
    paymentMethod: 'vietqr',
    paymentStatus: 'completed',
    createdAt: '2026-09-29 10:15:00',
  },
  {
    id: 't1',
    code: 'TX-20260922-001',
    memberName: 'Nguyễn Thu Hằng',
    memberPhone: '0981234001',
    packageName: 'Gói Tiêu Chuẩn 10 Buổi',
    amount: 2800000,
    paymentMethod: 'vietqr',
    paymentStatus: 'completed',
    createdAt: '2026-09-22 09:15:00',
  },
  {
    id: 't2',
    code: 'TX-20260922-002',
    memberName: 'Lê Tuấn Minh',
    memberPhone: '0981234002',
    packageName: 'Gói Trải Nghiệm 5 Buổi',
    amount: 1500000,
    paymentMethod: 'transfer',
    paymentStatus: 'completed',
    createdAt: '2026-09-22 10:45:00',
  },
  {
    id: 't3',
    code: 'TX-20260921-003',
    memberName: 'Đặng Thùy Linh',
    memberPhone: '0981234003',
    packageName: 'Gói Tháng Không Giới Hạn',
    amount: 3900000,
    paymentMethod: 'vnpay',
    paymentStatus: 'completed',
    createdAt: '2026-09-21 15:20:00',
  },
  {
    id: 't4',
    code: 'TX-20260921-004',
    memberName: 'Trần Văn Hoàng',
    memberPhone: '0909555777',
    packageName: 'Gói Chuyên Sâu 20 Buổi',
    amount: 5200000,
    paymentMethod: 'vietqr',
    paymentStatus: 'pending',
    createdAt: '2026-09-21 16:30:00',
  },
  {
    id: 't5',
    code: 'TX-20260920-005',
    memberName: 'Phạm Hồng Nhung',
    memberPhone: '0918889999',
    packageName: 'Gói Tiêu Chuẩn 10 Buổi',
    amount: 2800000,
    paymentMethod: 'cash',
    paymentStatus: 'completed',
    createdAt: '2026-09-20 11:10:00',
  },
]

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TxItem[]>(mockTransactions)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)
  const [selectedTxForInvoice, setSelectedTxForInvoice] = useState<TxItem | null>(null)

  useEffect(() => {
    api.get('/transactions')
      .then((res) => {
        const items = res.data?.data?.items || res.data?.data
        if (Array.isArray(items) && items.length > 0) {
          const mapped: TxItem[] = items.map((it: any) => ({
            id: it.id,
            code: it.referenceCode || `TX-${it.id.slice(0, 8).toUpperCase()}`,
            memberName: it.member?.user?.fullName || it.memberName || 'Học viên',
            memberPhone: it.member?.user?.phone || it.memberPhone || '—',
            packageName: it.package?.name || it.packageName || 'Gói tập Pilates',
            amount: Number(it.finalAmount || it.amount || 0),
            paymentMethod: it.paymentMethod || 'vietqr',
            paymentStatus: it.paymentStatus || 'completed',
            createdAt: it.createdAt ? it.createdAt.replace('T', ' ').slice(0, 19) : 'Hôm nay',
          }))
          setTransactions(mapped)
        }
      })
      .catch(() => {})
  }, [])

  const totalAmount = transactions
    .filter((t) => t.paymentStatus === 'completed')
    .reduce((sum, t) => sum + t.amount, 0)

  const getMethodBadge = (m: string) => {
    switch (m) {
      case 'vietqr':
        return <Badge variant="default">VietQR</Badge>
      case 'cash':
        return <Badge variant="secondary">Tiền mặt</Badge>
      case 'transfer':
        return <Badge variant="info">Chuyển khoản</Badge>
      case 'vnpay':
        return <Badge variant="default">VNPay</Badge>
      default:
        return <Badge variant="info">{m}</Badge>
    }
  }

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'completed':
        return (
          <Badge variant="success" className="flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Thành công
          </Badge>
        )
      case 'pending':
        return (
          <Badge variant="warning" className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> Chờ xử lý
          </Badge>
        )
      case 'failed':
        return (
          <Badge variant="danger" className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Thất bại
          </Badge>
        )
      default:
        return <Badge variant="default">{s}</Badge>
    }
  }

  const filtered = transactions.filter((t) => {
    const matchSearch =
      t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.memberPhone.includes(searchTerm)
    const matchStatus = statusFilter === 'all' || t.paymentStatus === statusFilter
    return matchSearch && matchStatus
  })

  const handleOpenInvoice = (tx: TxItem) => {
    setSelectedTxForInvoice(tx)
    setIsInvoiceModalOpen(true)
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExportCSV = () => {
    const headers = ['Mã GD', 'Học viên', 'SĐT', 'Gói tập', 'Số tiền (VND)', 'Phương thức', 'Trạng thái', 'Thời gian']
    const rows = filtered.map(t => [
      t.code,
      `"${t.memberName}"`,
      t.memberPhone,
      `"${t.packageName}"`,
      t.amount,
      t.paymentMethod,
      t.paymentStatus,
      t.createdAt,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `GiaoDich_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản Lý Giao Dịch & Hóa Đơn</h1>
          <p className="text-gray-500 text-sm mt-1">
            Theo dõi dòng tiền thanh toán gói tập, tra cứu biên lai và xuất hóa đơn dịch vụ
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportCSV} className="flex items-center gap-2">
            <Download className="w-4 h-4" /> Xuất Bảng Kê (CSV)
          </Button>
        </div>
      </div>

      <div className="bg-primary text-white p-6 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
        <div>
          <span className="text-xs uppercase tracking-wider text-blue-200 font-semibold">
            Tổng Doanh Thu Đã Thu
          </span>
          <div className="text-3xl font-black mt-1">{formatCurrency(totalAmount)}</div>
          <p className="text-xs text-blue-200 mt-1">
            Tính trên {transactions.filter((t) => t.paymentStatus === 'completed').length} giao dịch thành công
          </p>
        </div>
        <div className="p-3 bg-white/10 rounded-xl">
          <ArrowUpRight className="w-8 h-8 text-white" />
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Tìm theo mã GD, tên hoặc số điện thoại..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            options={[
              { value: 'all', label: 'Tất cả trạng thái' },
              { value: 'completed', label: 'Thành công' },
              { value: 'pending', label: 'Chờ xử lý' },
            ]}
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">Mã Giao Dịch</th>
                <th className="px-5 py-3.5">Học Viên</th>
                <th className="px-5 py-3.5">Gói Tập</th>
                <th className="px-5 py-3.5">Số Tiền</th>
                <th className="px-5 py-3.5">Phương Thức</th>
                <th className="px-5 py-3.5">Trạng Thái</th>
                <th className="px-5 py-3.5">Thời Gian</th>
                <th className="px-5 py-3.5 text-right">Hóa Đơn</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filtered.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50/80 transition-colors">
                  <td className="px-5 py-4 font-mono font-semibold text-xs text-primary">
                    {tx.code}
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-gray-900">{tx.memberName}</div>
                    <div className="text-xs text-gray-400">{tx.memberPhone}</div>
                  </td>
                  <td className="px-5 py-4 font-medium text-gray-800">{tx.packageName}</td>
                  <td className="px-5 py-4 font-bold text-gray-900">
                    {formatCurrency(tx.amount)}
                  </td>
                  <td className="px-5 py-4">{getMethodBadge(tx.paymentMethod)}</td>
                  <td className="px-5 py-4">{getStatusBadge(tx.paymentStatus)}</td>
                  <td className="px-5 py-4 text-xs text-gray-500">{tx.createdAt}</td>
                  <td className="px-5 py-4 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenInvoice(tx)}
                      className="text-xs flex items-center gap-1.5 ml-auto border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      <Printer className="w-3.5 h-3.5" /> In Hóa Đơn
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isInvoiceModalOpen && selectedTxForInvoice && (
        <Modal
          open={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          title="Hóa Đơn Thanh Toán Dịch Vụ"
        >
          <div className="p-4 bg-white border border-gray-200 rounded-xl space-y-4 print:border-none print:p-0" id="printable-invoice">
            
            <div className="flex justify-between items-start border-b border-gray-200 pb-4">
              <div>
                <div className="text-lg font-black text-primary tracking-wide">PILATESMS STUDIO</div>
                <div className="text-xs text-gray-500 mt-0.5">Hệ Thống Phòng Tập Pilates Chuẩn Quốc Tế</div>
                <div className="text-xs text-gray-400 mt-1">123 Nguyễn Thị Minh Khai, P. Bến Thành, Q.1, TP.HCM</div>
                <div className="text-xs text-gray-400">Hotline: 1900 1234 | Email: contact@pilatesms.vn</div>
              </div>
              <div className="text-right">
                <Badge variant="success" className="text-xs uppercase px-2.5 py-1">
                  ĐÃ THANH TOÁN
                </Badge>
                <div className="text-xs font-mono text-gray-400 mt-1.5">Số HĐ: INV-{selectedTxForInvoice.code}</div>
                <div className="text-xs text-gray-500 mt-0.5">Ngày: {selectedTxForInvoice.createdAt}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 p-3 rounded-lg border border-gray-100">
              <div>
                <span className="text-gray-400 uppercase font-semibold">Khách Hàng:</span>
                <div className="font-bold text-gray-900 text-sm mt-0.5">{selectedTxForInvoice.memberName}</div>
                <div className="text-gray-500 mt-0.5">Số ĐT: {selectedTxForInvoice.memberPhone}</div>
              </div>
              <div className="text-right">
                <span className="text-gray-400 uppercase font-semibold">Phương Thức:</span>
                <div className="font-bold text-gray-900 mt-0.5 uppercase">{selectedTxForInvoice.paymentMethod}</div>
                <div className="text-gray-500 mt-0.5">Thu ngân: Lễ tân PilatesMS</div>
              </div>
            </div>

            <table className="w-full text-xs text-left">
              <thead className="bg-gray-100 text-gray-600 font-bold uppercase">
                <tr>
                  <th className="py-2 px-2.5">Nội Dung Dịch Vụ</th>
                  <th className="py-2 px-2.5 text-center">SL</th>
                  <th className="py-2 px-2.5 text-right">Đơn Giá</th>
                  <th className="py-2 px-2.5 text-right">Thành Tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                <tr>
                  <td className="py-2.5 px-2.5 font-medium">
                    {selectedTxForInvoice.packageName}
                    <div className="text-[11px] text-gray-400">Dịch vụ tập luyện có HLV hướng dẫn chuyên sâu</div>
                  </td>
                  <td className="py-2.5 px-2.5 text-center">1</td>
                  <td className="py-2.5 px-2.5 text-right">{formatCurrency(selectedTxForInvoice.amount)}</td>
                  <td className="py-2.5 px-2.5 text-right font-bold">{formatCurrency(selectedTxForInvoice.amount)}</td>
                </tr>
              </tbody>
            </table>

            <div className="border-t border-gray-200 pt-3 flex justify-between items-center text-sm">
              <span className="font-bold text-gray-700">TỔNG CỘNG THANH TOÁN:</span>
              <span className="text-lg font-black text-primary">{formatCurrency(selectedTxForInvoice.amount)}</span>
            </div>

            <div className="pt-2 border-t border-dashed border-gray-200 flex justify-between items-end text-center text-[11px] text-gray-400">
              <div>
                <div>Người Mua Hàng</div>
                <div className="h-10"></div>
                <div className="font-medium text-gray-600">{selectedTxForInvoice.memberName}</div>
              </div>
              <div className="italic text-gray-400">
                Cảm ơn Quý khách đã tin tưởng và đồng hành cùng PilatesMS!
              </div>
              <div>
                <div>Đại Diện PilatesMS</div>
                <div className="h-10 flex items-center justify-center font-serif text-blue-700 font-bold italic">
                  [Đã Ký Điện Tử]
                </div>
                <div className="font-medium text-gray-600">Bộ phận Thu Ngân</div>
              </div>
            </div>
          </div>

          <ModalFooter>
            <Button variant="outline" onClick={() => setIsInvoiceModalOpen(false)}>
              Đóng
            </Button>
            <Button onClick={handlePrint} className="flex items-center gap-1.5">
              <Printer className="w-4 h-4" /> In / Tải PDF
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  )
}
