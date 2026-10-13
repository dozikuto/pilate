import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Search, Filter } from 'lucide-react'
import { useMembers, useCreateMember } from '@/hooks/useMembers'
import { DataTable, type Column } from '@/components/shared/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { formatDate } from '@/lib/utils'
import type { Member } from '@/types'
import { useDebounce } from '@/hooks/useDebounce'

const mockMembers: Member[] = [
  {
    id: '1', code: 'HV001', name: 'Nguyễn Thị Lan', phone: '0901234567',
    email: 'lan.nguyen@gmail.com', joinDate: '2024-01-15', status: 'active',
    totalSessions: 20, usedSessions: 12, remainingSessions: 8,
    currentPackage: { id: 'p1', memberId: '1', packageId: 'pk1', packageName: 'Gói 20 Buổi',
      packageType: 'session', totalSessions: 20, usedSessions: 12, remainingSessions: 8,
      startDate: '2024-01-15', purchaseDate: '2024-01-15', price: 4000000, status: 'active' },
    createdAt: '2024-01-15', updatedAt: '2024-12-01',
  },
  {
    id: '2', code: 'HV002', name: 'Trần Văn Minh', phone: '0912345678',
    email: 'minh.tran@gmail.com', joinDate: '2024-02-20', status: 'active',
    totalSessions: 10, usedSessions: 10, remainingSessions: 0,
    createdAt: '2024-02-20', updatedAt: '2024-11-15',
  },
  {
    id: '3', code: 'HV003', name: 'Phạm Thị Hương', phone: '0923456789',
    email: 'huong.pham@email.com', joinDate: '2024-03-10', status: 'expired',
    totalSessions: 8, usedSessions: 8, remainingSessions: 0,
    createdAt: '2024-03-10', updatedAt: '2024-10-10',
  },
  {
    id: '4', code: 'HV004', name: 'Lê Thị Mai', phone: '0934567890',
    email: 'mai.le@gmail.com', joinDate: '2024-04-05', status: 'active',
    totalSessions: 30, usedSessions: 5, remainingSessions: 25,
    createdAt: '2024-04-05', updatedAt: '2024-12-10',
  },
  {
    id: '5', code: 'HV005', name: 'Hoàng Văn Tú', phone: '0945678901',
    email: 'tu.hoang@gmail.com', joinDate: '2024-05-12', status: 'inactive',
    totalSessions: 15, usedSessions: 7, remainingSessions: 8,
    createdAt: '2024-05-12', updatedAt: '2024-09-20',
  },
  {
    id: '6', code: 'HV006', name: 'Võ Thị Thanh', phone: '0956789012',
    email: 'thanh.vo@gmail.com', joinDate: '2024-06-18', status: 'active',
    totalSessions: 20, usedSessions: 15, remainingSessions: 5,
    createdAt: '2024-06-18', updatedAt: '2024-12-18',
  },
]

const memberSchema = z.object({
  name: z.string().min(2, 'Họ tên phải có ít nhất 2 ký tự'),
  phone: z
    .string()
    .regex(/^0\d{9}$/, 'Số điện thoại không hợp lệ (VD: 0901234567)'),
  email: z.string().email('Email không hợp lệ'),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  address: z.string().optional(),
  healthNotes: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
})

type MemberFormData = z.infer<typeof memberSchema>

const statusOptions = [
  { label: 'Tất cả trạng thái', value: 'all' },
  { label: 'Hoạt động', value: 'active' },
  { label: 'Không hoạt động', value: 'inactive' },
  { label: 'Hết hạn', value: 'expired' },
]

export default function MembersPage() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [modalOpen, setModalOpen] = useState(false)

  const debouncedSearch = useDebounce(search, 400)

  const { data, isLoading } = useMembers({
    page,
    limit: 10,
    search: debouncedSearch,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  })

  const createMember = useCreateMember()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MemberFormData>({ resolver: zodResolver(memberSchema) })

  const handleCloseModal = useCallback(() => {
    setModalOpen(false)
    reset()
  }, [reset])

  const onSubmit = (formData: MemberFormData) => {
    createMember.mutate(formData, {
      onSuccess: handleCloseModal,
    })
  }

  const apiItems = Array.isArray(data?.data)
    ? data.data
    : Array.isArray((data as any)?.items)
    ? (data as any).items
    : null
  const rawList: Member[] = apiItems !== null ? apiItems : mockMembers

  const members = rawList.filter((m: Member) => {
    if (statusFilter && statusFilter !== 'all' && m.status !== statusFilter) return false
    if (debouncedSearch) {
      const s = debouncedSearch.toLowerCase()
      const matchName = m.name?.toLowerCase().includes(s)
      const matchPhone = m.phone?.includes(s)
      const matchEmail = m.email?.toLowerCase().includes(s)
      if (!matchName && !matchPhone && !matchEmail) return false
    }
    return true
  })
  const total = statusFilter !== 'all' || debouncedSearch ? members.length : (data?.total ?? members.length)
  const totalPages = Math.max(1, Math.ceil(total / 10))

  const columns: Column<Member>[] = [
    {
      key: 'code',
      header: 'Mã HV',
      width: '90px',
      render: (value) => (
        <span className="text-xs font-mono text-gray-500">{String(value)}</span>
      ),
    },
    {
      key: 'name',
      header: 'Họ tên',
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
            {row.name.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{row.name}</p>
            <p className="text-xs text-gray-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Số điện thoại',
      render: (value) => (
        <span className="text-sm font-mono">{String(value)}</span>
      ),
    },
    {
      key: 'currentPackage',
      header: 'Gói tập',
      render: (_, row) =>
        row.currentPackage ? (
          <span className="text-sm">{row.currentPackage.packageName}</span>
        ) : (
          <span className="text-xs text-gray-400">Chưa có gói</span>
        ),
    },
    {
      key: 'remainingSessions',
      header: 'Buổi còn lại',
      align: 'center',
      render: (_, row) => (
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-semibold">
            {row.remainingSessions}/{row.totalSessions}
          </span>
          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{
                width: `${row.totalSessions > 0 ? (row.remainingSessions / row.totalSessions) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'joinDate',
      header: 'Ngày tham gia',
      render: (value) => <span className="text-sm">{formatDate(String(value))}</span>,
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (value) => {
        const v = String(value)
        return (
          <Badge
            variant={v === 'active' ? 'success' : v === 'inactive' ? 'default' : 'danger'}
          >
            {v === 'active' ? 'Hoạt động' : v === 'inactive' ? 'Không HĐ' : 'Hết hạn'}
          </Badge>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Học viên</h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý danh sách học viên ({total} học viên)
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          Thêm học viên
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, SĐT, email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <Select
            options={statusOptions}
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v)
              setPage(1)
            }}
            placeholder=""
            className="w-48"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <DataTable
          columns={columns}
          data={members}
          loading={isLoading}
          onRowClick={(row) => navigate(`/members/${row.id}`)}
          page={page}
          totalPages={totalPages}
          total={total}
          limit={10}
          onPageChange={setPage}
          emptyMessage="Không tìm thấy học viên nào"
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        title="Thêm học viên mới"
        size="xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input
                {...register('name')}
                label="Họ và tên"
                placeholder="Nguyễn Thị Lan"
                error={errors.name?.message}
                required
              />
            </div>
            <Input
              {...register('phone')}
              label="Số điện thoại"
              placeholder="0901234567"
              error={errors.phone?.message}
              required
            />
            <Input
              {...register('email')}
              label="Email"
              placeholder="lan@email.com"
              type="email"
              error={errors.email?.message}
              required
            />
            <Input
              {...register('dateOfBirth')}
              label="Ngày sinh"
              type="date"
              error={errors.dateOfBirth?.message}
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Giới tính
              </label>
              <select
                {...register('gender')}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value="">Chọn giới tính</option>
                <option value="female">Nữ</option>
                <option value="male">Nam</option>
                <option value="other">Khác</option>
              </select>
            </div>
            <div className="col-span-2">
              <Input
                {...register('address')}
                label="Địa chỉ"
                placeholder="123 Đường ABC, Quận 1, TP.HCM"
                error={errors.address?.message}
              />
            </div>
            <Input
              {...register('emergencyContact')}
              label="Người liên hệ khẩn cấp"
              placeholder="Nguyễn Văn B"
              error={errors.emergencyContact?.message}
            />
            <Input
              {...register('emergencyPhone')}
              label="SĐT khẩn cấp"
              placeholder="0912345678"
              error={errors.emergencyPhone?.message}
            />
            <div className="col-span-2 flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">
                Ghi chú sức khỏe
              </label>
              <textarea
                {...register('healthNotes')}
                placeholder="Dị ứng, chấn thương cũ, lưu ý đặc biệt..."
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
              />
            </div>
          </div>
          <ModalFooter>
            <Button variant="outline" type="button" onClick={handleCloseModal}>
              Hủy
            </Button>
            <Button type="submit" loading={createMember.isPending}>
              Thêm học viên
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  )
}
