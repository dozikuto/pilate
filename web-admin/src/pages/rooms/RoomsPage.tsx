import { useState, useEffect } from 'react'
import {
  Plus,
  DoorOpen,
  Users,
  User,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Sparkles,
  Building2,
  Layers,
  LayoutGrid,
  List,
  Power,
  ShieldCheck,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { api } from '@/lib/axios'
import toast from 'react-hot-toast'

export type RoomType = 'private_1v1' | 'semi_private_1v2' | 'small_group_1v3' | 'small_group_1v4' | 'group'
export type RoomStatus = 'available' | 'in_use' | 'maintenance'

export interface BranchItem {
  id: string
  name: string
  address?: string
}

export interface RoomItem {
  id: string
  branchId: string
  name: string
  roomType: RoomType
  capacity: number
  status: RoomStatus
  isActive: boolean
  amenities: string
  description: string
  createdAt?: string
  branch?: {
    id: string
    name: string
  }
}

const PRESET_MODES: {
  type: RoomType
  label: string
  shortLabel: string
  defaultCapacity: number
  description: string
  badgeClass: string
  accentColor: string
}[] = [
  {
    type: 'private_1v1',
    label: '1 vs 1 (VIP Kèm riêng)',
    shortLabel: '1 vs 1 VIP',
    defaultCapacity: 1,
    description: '1 Huấn luyện viên kèm 1 Học viên. Không gian riêng tư, trang thiết bị tối tân.',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    accentColor: 'border-purple-500 bg-purple-50/50',
  },
  {
    type: 'semi_private_1v2',
    label: '1 vs 2 (Bán cá nhân / Duo)',
    shortLabel: '1 vs 2 Duo',
    defaultCapacity: 2,
    description: '1 Huấn luyện viên kèm 2 Học viên (bạn bè, cặp đôi, người thân).',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    accentColor: 'border-blue-500 bg-blue-50/50',
  },
  {
    type: 'small_group_1v3',
    label: '1 vs 3 (Nhóm nhỏ 3 người)',
    shortLabel: '1 vs 3 Mini',
    defaultCapacity: 3,
    description: 'Phòng tập nhóm nhỏ tối đa 3 học viên, HLV theo sát kỹ thuật từng người.',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    accentColor: 'border-amber-500 bg-amber-50/50',
  },
  {
    type: 'small_group_1v4',
    label: '1 vs 4 (Nhóm nhỏ 4 người)',
    shortLabel: '1 vs 4 Mini',
    defaultCapacity: 4,
    description: 'Phòng tập nhóm 4 học viên, tối ưu chi phí và không khí tập luyện sôi nổi.',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
    accentColor: 'border-orange-500 bg-orange-50/50',
  },
  {
    type: 'group',
    label: 'Lớp nhóm tiêu chuẩn (5+ người)',
    shortLabel: 'Nhóm (5+)',
    defaultCapacity: 8,
    description: 'Phòng tập nhóm số lượng lớn từ 5 đến 20 học viên, dàn máy Reformer đồng bộ.',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    accentColor: 'border-emerald-500 bg-emerald-50/50',
  },
]

const QUICK_AMENITIES = [
  'Reformer chuyên dụng',
  'Cadillac Studio',
  'Wunda Chair',
  'Ladder Barrel',
  'Spine Corrector',
  'Gương soi toàn thân',
  'Thảm tập cao cấp',
  'Dụng cụ bổ trợ (Vòng, Bóng, Dây)',
  'Hệ thống âm thanh Bluetooth',
  'Máy lạnh 2 chiều & Máy lọc không khí',
]

export default function RoomsPage() {
  const [rooms, setRooms] = useState<RoomItem[]>([])
  const [branches, setBranches] = useState<BranchItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  const [searchTerm, setSearchTerm] = useState('')
  const [filterBranchId, setFilterBranchId] = useState<string>('all')
  const [filterRoomType, setFilterRoomType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<RoomItem | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    branchId: '',
    name: '',
    roomType: 'private_1v1' as RoomType,
    capacity: '1',
    status: 'available' as RoomStatus,
    isActive: true,
    amenities: '',
    description: '',
  })

  const fetchBranches = async () => {
    try {
      const res = await api.get('/branches')
      const items = res.data?.data || (Array.isArray(res.data) ? res.data : [])
      setBranches(items)
      if (items.length > 0 && !formData.branchId) {
        setFormData((prev) => ({ ...prev, branchId: items[0].id }))
      }
    } catch (err) {
      console.error('Lỗi khi tải chi nhánh:', err)
    }
  }

  const fetchRooms = async () => {
    try {
      setIsLoading(true)
      const res = await api.get('/rooms')
      const items = res.data?.data || (Array.isArray(res.data) ? res.data : [])
      setRooms(items)
    } catch (err) {
      console.error('Lỗi khi tải danh sách phòng tập:', err)
      toast.error('Không thể tải danh sách phòng tập')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchBranches()
    fetchRooms()
  }, [])

  const handleCapacityChange = (val: string) => {
    if (val === '') {
      setFormData((prev) => ({ ...prev, capacity: '' }))
      return
    }
    const clean = val.replace(/\D/g, '')
    const sanitized = clean.replace(/^0+(?=\d)/, '')
    setFormData((prev) => ({ ...prev, capacity: sanitized }))
  }

  const adjustCapacity = (delta: number) => {
    const current = Number(formData.capacity) || 0
    const nextVal = Math.max(1, current + delta)
    setFormData((prev) => ({ ...prev, capacity: String(nextVal) }))
  }

  const handleSelectRoomType = (type: RoomType) => {
    const preset = PRESET_MODES.find((m) => m.type === type)
    setFormData((prev) => ({
      ...prev,
      roomType: type,
      capacity: preset ? String(preset.defaultCapacity) : prev.capacity,
    }))
  }

  const handleAddAmenity = (amenity: string) => {
    const currentList = formData.amenities
      ? formData.amenities.split(',').map((s) => s.trim()).filter(Boolean)
      : []
    if (currentList.includes(amenity)) {
      setFormData((prev) => ({
        ...prev,
        amenities: currentList.filter((item) => item !== amenity).join(', '),
      }))
    } else {
      setFormData((prev) => ({
        ...prev,
        amenities: [...currentList, amenity].join(', '),
      }))
    }
  }

  const handleOpenCreateModal = () => {
    setEditingRoom(null)
    setFormData({
      branchId: branches[0]?.id || '',
      name: '',
      roomType: 'private_1v1',
      capacity: '1',
      status: 'available',
      isActive: true,
      amenities: 'Reformer chuyên dụng, Thảm tập cao cấp, Gương soi toàn thân',
      description: '',
    })
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (room: RoomItem) => {
    setEditingRoom(room)
    setFormData({
      branchId: room.branchId,
      name: room.name,
      roomType: room.roomType,
      capacity: String(room.capacity || 1),
      status: room.status,
      isActive: room.isActive,
      amenities: room.amenities || '',
      description: room.description || '',
    })
    setIsModalOpen(true)
  }

  const handleSaveRoom = async () => {
    if (!formData.name.trim()) {
      toast.error('Vui lòng nhập tên phòng tập')
      return
    }
    const capNum = Number(formData.capacity)
    if (!formData.capacity || isNaN(capNum) || capNum < 1) {
      toast.error('Sức chứa phòng tập phải từ 1 người trở lên')
      return
    }

    try {
      setIsSubmitting(true)
      const payload = {
        branchId: formData.branchId || undefined,
        name: formData.name.trim(),
        roomType: formData.roomType,
        capacity: capNum,
        status: formData.status,
        isActive: formData.isActive,
        amenities: formData.amenities.trim(),
        description: formData.description.trim(),
      }

      if (editingRoom) {
        await api.patch(`/rooms/${editingRoom.id}`, payload)
        toast.success('Cập nhật phòng tập thành công')
      } else {
        await api.post('/rooms', payload)
        toast.success('Thêm phòng tập mới thành công')
      }

      setIsModalOpen(false)
      fetchRooms()
    } catch (err: any) {
      console.error('Lỗi khi lưu phòng tập:', err)
      toast.error(err.response?.data?.message || 'Có lỗi xảy ra khi lưu phòng tập')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleActive = async (room: RoomItem) => {
    try {
      await api.patch(`/rooms/${room.id}/toggle`)
      toast.success(room.isActive ? 'Đã tạm dừng hoạt động phòng tập' : 'Đã kích hoạt phòng tập')
      fetchRooms()
    } catch (err: any) {
      console.error('Lỗi khi đổi trạng thái phòng:', err)
      toast.error('Không thể thay đổi trạng thái hoạt động')
    }
  }

  const handleQuickStatusChange = async (room: RoomItem, newStatus: RoomStatus) => {
    try {
      await api.patch(`/rooms/${room.id}`, { status: newStatus })
      toast.success('Đã cập nhật tình trạng phòng')
      fetchRooms()
    } catch (err) {
      toast.error('Không thể cập nhật tình trạng')
    }
  }

  const handleDeleteRoom = async () => {
    if (!deleteConfirmId) return
    try {
      await api.delete(`/rooms/${deleteConfirmId}`)
      toast.success('Đã xóa phòng tập thành công')
      setDeleteConfirmId(null)
      fetchRooms()
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Không thể xóa phòng tập')
    }
  }

  const filteredRooms = rooms.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.description && r.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.amenities && r.amenities.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesBranch = filterBranchId === 'all' || r.branchId === filterBranchId
    const matchesType = filterRoomType === 'all' || r.roomType === filterRoomType
    const matchesStatus = filterStatus === 'all' || r.status === filterStatus
    return matchesSearch && matchesBranch && matchesType && matchesStatus
  })

  const totalCount = rooms.length
  const count1v1 = rooms.filter((r) => r.roomType === 'private_1v1').length
  const countSmallGroup = rooms.filter((r) =>
    ['semi_private_1v2', 'small_group_1v3', 'small_group_1v4'].includes(r.roomType)
  ).length
  const countGroup = rooms.filter((r) => r.roomType === 'group').length
  const countAvailable = rooms.filter((r) => r.status === 'available' && r.isActive).length

  const getRoomTypePreset = (type: RoomType) => {
    return PRESET_MODES.find((m) => m.type === type) || PRESET_MODES[4]
  }

  const renderStatusBadge = (status: RoomStatus) => {
    switch (status) {
      case 'available':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 flex items-center gap-1 font-medium">
            <CheckCircle2 size={12} className="text-emerald-600" /> Sẵn sàng
          </Badge>
        )
      case 'in_use':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 flex items-center gap-1 font-medium">
            <Users size={12} className="text-blue-600" /> Đang có lớp
          </Badge>
        )
      case 'maintenance':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 flex items-center gap-1 font-medium">
            <Wrench size={12} className="text-amber-600" /> Đang bảo trì
          </Badge>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DoorOpen className="text-primary-600" size={28} />
            Quản lý Phòng tập
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Thiết lập phòng tập theo mô hình 1 vs 1 (HLV kèm riêng), 1 vs 2, 1 vs 3, 1 vs 4 hoặc nhóm lớp tiêu chuẩn.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
            className="flex items-center gap-1.5"
          >
            {viewMode === 'grid' ? <List size={16} /> : <LayoutGrid size={16} />}
            <span>{viewMode === 'grid' ? 'Dạng bảng' : 'Dạng lưới'}</span>
          </Button>
          <Button onClick={handleOpenCreateModal} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700">
            <Plus size={18} />
            <span>Thêm phòng tập mới</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Tổng phòng</span>
            <DoorOpen size={18} className="text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">{totalCount}</div>
          <span className="text-xs text-gray-500">Toàn hệ thống studio</span>
        </div>

        <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-700">1 vs 1 (VIP Kèm riêng)</span>
            <User size={18} className="text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-900 mt-2">{count1v1}</div>
          <span className="text-xs text-purple-600">Sức chứa: 1 người / HLV</span>
        </div>

        <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-700">Nhóm nhỏ (2 - 4 người)</span>
            <Users size={18} className="text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-900 mt-2">{countSmallGroup}</div>
          <span className="text-xs text-blue-600">1vs2, 1vs3, 1vs4 mini</span>
        </div>

        <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">Lớp nhóm (5+ người)</span>
            <Layers size={18} className="text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-900 mt-2">{countGroup}</div>
          <span className="text-xs text-emerald-600">Quy mô lớn tiêu chuẩn</span>
        </div>

        <div className="bg-teal-50/60 p-4 rounded-xl border border-teal-200 shadow-sm col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-teal-700">Sẵn sàng hoạt động</span>
            <CheckCircle2 size={18} className="text-teal-600" />
          </div>
          <div className="text-2xl font-bold text-teal-900 mt-2">{countAvailable}</div>
          <span className="text-xs text-teal-600">Tỷ lệ: {totalCount ? Math.round((countAvailable / totalCount) * 100) : 0}%</span>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên phòng, mô tả hoặc thiết bị..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {branches.length > 1 && (
          <select
            value={filterBranchId}
            onChange={(e) => setFilterBranchId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Tất cả chi nhánh</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        )}

        <select
          value={filterRoomType}
          onChange={(e) => setFilterRoomType(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">Tất cả mô hình tập</option>
          <option value="private_1v1">1 vs 1 (VIP Kèm riêng)</option>
          <option value="semi_private_1v2">1 vs 2 (Bán cá nhân)</option>
          <option value="small_group_1v3">1 vs 3 (Nhóm nhỏ 3 người)</option>
          <option value="small_group_1v4">1 vs 4 (Nhóm nhỏ 4 người)</option>
          <option value="group">Lớp nhóm tiêu chuẩn (5+)</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="available">Sẵn sàng</option>
          <option value="in_use">Đang có lớp</option>
          <option value="maintenance">Đang bảo trì</option>
        </select>
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-gray-500">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-3"></div>
          <p className="text-sm">Đang tải danh sách phòng tập...</p>
        </div>
      ) : filteredRooms.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <DoorOpen size={48} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-base font-semibold text-gray-700">Không tìm thấy phòng tập phù hợp</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            Chưa có phòng tập nào khớp với bộ lọc tìm kiếm hoặc bạn chưa khởi tạo phòng tập.
          </p>
          <Button onClick={handleOpenCreateModal} className="mt-4 inline-flex items-center gap-2">
            <Plus size={16} /> Thêm phòng tập ngay
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => {
            const preset = getRoomTypePreset(room.roomType)
            const amenitiesList = room.amenities
              ? room.amenities.split(',').map((s) => s.trim()).filter(Boolean)
              : []

            return (
              <div
                key={room.id}
                className={`bg-white rounded-xl border transition-all duration-200 hover:shadow-md flex flex-col justify-between overflow-hidden ${
                  room.isActive ? 'border-gray-200' : 'border-gray-200 opacity-60 bg-gray-50'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${preset.badgeClass}`}>
                          {preset.shortLabel}
                        </span>
                        {renderStatusBadge(room.status)}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mt-2 flex items-center gap-2">
                        {room.name}
                        {!room.isActive && (
                          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-normal">
                            Tạm dừng
                          </span>
                        )}
                      </h3>
                      {room.branch?.name && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <Building2 size={12} />
                          {room.branch.name}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="inline-flex flex-col items-center justify-center bg-gray-50 border border-gray-200 px-3 py-1 rounded-lg">
                        <span className="text-xs text-gray-500">Sức chứa</span>
                        <span className="text-lg font-extrabold text-primary-900 leading-tight">
                          {room.capacity}
                          <span className="text-xs font-normal text-gray-500 ml-0.5">người</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50/80 rounded-lg p-2.5 my-3 text-xs text-gray-600 border border-gray-100">
                    <p className="font-medium text-gray-700 flex items-center gap-1.5 mb-1">
                      <Info size={13} className="text-primary-600" />
                      {preset.label}
                    </p>
                    <p className="text-gray-500 leading-relaxed">{preset.description}</p>
                  </div>

                  {room.description && (
                    <p className="text-xs text-gray-600 mb-3 italic bg-white p-2 rounded border border-gray-100">
                      "{room.description}"
                    </p>
                  )}

                  {amenitiesList.length > 0 && (
                    <div className="mt-3">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                        Thiết bị & Tiện ích:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {amenitiesList.map((item, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md border border-gray-200"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      title={room.status === 'available' ? 'Phòng sẵn sàng' : 'Chuyển sang Sẵn sàng'}
                      onClick={() => handleQuickStatusChange(room, 'available')}
                      className={`p-1.5 rounded text-xs font-medium border transition-colors ${
                        room.status === 'available'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <CheckCircle2 size={14} />
                    </button>
                    <button
                      type="button"
                      title={room.status === 'in_use' ? 'Đang có lớp' : 'Chuyển sang Đang có lớp'}
                      onClick={() => handleQuickStatusChange(room, 'in_use')}
                      className={`p-1.5 rounded text-xs font-medium border transition-colors ${
                        room.status === 'in_use'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <Users size={14} />
                    </button>
                    <button
                      type="button"
                      title={room.status === 'maintenance' ? 'Đang bảo trì' : 'Chuyển sang Bảo trì'}
                      onClick={() => handleQuickStatusChange(room, 'maintenance')}
                      className={`p-1.5 rounded text-xs font-medium border transition-colors ${
                        room.status === 'maintenance'
                          ? 'bg-amber-600 text-white border-amber-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      <Wrench size={14} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(room)}
                      title={room.isActive ? 'Tạm ngưng phòng' : 'Kích hoạt lại'}
                      className={`p-1.5 rounded border text-xs ${
                        room.isActive
                          ? 'text-gray-500 hover:text-amber-600 hover:bg-amber-50 border-gray-200'
                          : 'text-emerald-600 hover:bg-emerald-50 border-emerald-200'
                      }`}
                    >
                      <Power size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(room)}
                      className="p-1.5 rounded border border-gray-200 text-gray-600 hover:text-primary-600 hover:bg-white"
                      title="Chỉnh sửa cấu hình phòng"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(room.id)}
                      className="p-1.5 rounded border border-gray-200 text-gray-600 hover:text-red-600 hover:bg-red-50"
                      title="Xóa phòng"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3">Tên phòng</th>
                  <th className="px-4 py-3">Mô hình đào tạo</th>
                  <th className="px-4 py-3">Sức chứa</th>
                  <th className="px-4 py-3">Chi nhánh</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Tiện ích chính</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredRooms.map((room) => {
                  const preset = getRoomTypePreset(room.roomType)
                  return (
                    <tr key={room.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        {room.name}
                        {room.description && (
                          <div className="text-xs text-gray-400 font-normal truncate max-w-xs">
                            {room.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${preset.badgeClass}`}>
                          {preset.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900">
                        {room.capacity} <span className="text-xs font-normal text-gray-500">học viên</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {room.branch?.name || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {renderStatusBadge(room.status)}
                          {!room.isActive && (
                            <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-xs">
                              Tạm tắt
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                        {room.amenities || '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(room)}
                            className="p-1 rounded text-gray-500 hover:text-amber-600 hover:bg-gray-100"
                            title={room.isActive ? 'Tắt hoạt động' : 'Bật hoạt động'}
                          >
                            <Power size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(room)}
                            className="p-1 rounded text-gray-500 hover:text-primary-600 hover:bg-gray-100"
                            title="Sửa phòng"
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(room.id)}
                            className="p-1 rounded text-gray-500 hover:text-red-600 hover:bg-red-50"
                            title="Xóa phòng"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL THÊM / CHỈNH SỬA PHÒNG TẬP */}
      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRoom ? 'Chỉnh sửa phòng tập & sức chứa' : 'Thêm phòng tập mới'}
        size="xl"
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Chi nhánh áp dụng <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.branchId}
                onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tên phòng tập <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="VD: Phòng VIP 01 - Cadillac Solo"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
              <span>Hình thức tập & Chế độ đào tạo</span>
              <span className="text-xs text-primary-600 font-normal">
                (Bấm chọn để áp dụng tự động sức chứa tương ứng)
              </span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {PRESET_MODES.map((mode) => {
                const isSelected = formData.roomType === mode.type
                return (
                  <div
                    key={mode.type}
                    onClick={() => handleSelectRoomType(mode.type)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? `border-primary-600 bg-primary-50/50 shadow-sm ring-1 ring-primary-500`
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-xs text-gray-900">{mode.shortLabel}</span>
                      <span className={`text-[11px] px-1.5 py-0.2 rounded font-medium ${mode.badgeClass}`}>
                        {mode.defaultCapacity} người
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 line-clamp-2 leading-tight">
                      {mode.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Sức chứa (Số học viên) <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => adjustCapacity(-1)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 bg-white font-bold text-gray-600 hover:bg-gray-100"
                >
                  -
                </button>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formData.capacity}
                  onChange={(e) => handleCapacityChange(e.target.value)}
                  className="w-16 h-9 text-center border border-gray-300 rounded-lg text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                />
                <button
                  type="button"
                  onClick={() => adjustCapacity(1)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 bg-white font-bold text-gray-600 hover:bg-gray-100"
                >
                  +
                </button>
              </div>
              <p className="text-[11px] text-gray-500 mt-1">Học viên tối đa trong 1 ca</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Tình trạng phòng
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as RoomStatus })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="available">Sẵn sàng phục vụ</option>
                <option value="in_use">Đang có lớp tập</option>
                <option value="maintenance">Đang bảo trì thiết bị</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Trạng thái vận hành
              </label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="room-is-active"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                />
                <label htmlFor="room-is-active" className="text-xs text-gray-700 font-medium cursor-pointer">
                  Kích hoạt phòng tập
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Tiện ích & Thiết bị trong phòng
            </label>
            <Input
              placeholder="VD: Reformer chuyên dụng, Cadillac Studio, Thảm cao cấp..."
              value={formData.amenities}
              onChange={(e) => setFormData({ ...formData, amenities: e.target.value })}
            />
            <div className="mt-2">
              <span className="text-[11px] font-medium text-gray-500 block mb-1">
                Gợi ý nhanh (Bấm để thêm/bỏ):
              </span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_AMENITIES.map((am, idx) => {
                  const isChecked = formData.amenities.includes(am)
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAddAmenity(am)}
                      className={`text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                        isChecked
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      {isChecked ? '✓ ' : '+ '}
                      {am}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Mô tả chi tiết / Vị trí phòng
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="VD: Phòng nằm tại tầng 2 khu VIP, view kính thoáng mát, cách âm tốt..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <ModalFooter className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsModalOpen(false)}>
            Hủy bỏ
          </Button>
          <Button onClick={handleSaveRoom} disabled={isSubmitting} className="bg-primary-600 hover:bg-primary-700">
            {isSubmitting ? 'Đang lưu...' : editingRoom ? 'Lưu cập nhật' : 'Tạo phòng tập'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* CONFIRM DELETE MODAL */}
      <Modal
        open={Boolean(deleteConfirmId)}
        onClose={() => setDeleteConfirmId(null)}
        title="Xác nhận xóa phòng tập"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Bạn có chắc chắn muốn xóa phòng tập này? Hành động này không thể hoàn tác nếu phòng tập chưa có dữ liệu lịch học liên kết.
          </p>
        </div>
        <ModalFooter className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
            Hủy
          </Button>
          <Button variant="danger" onClick={handleDeleteRoom}>
            Xóa phòng tập
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
