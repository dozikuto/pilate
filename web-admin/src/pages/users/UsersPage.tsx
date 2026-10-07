import { useState } from 'react'
import {
  Users, Shield, UserPlus, Search, Edit2, Lock,
  Unlock, Check, Save, AlertCircle, Key
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Modal, ModalFooter } from '@/components/ui/Modal'

interface UserAccount {
  id: string
  fullName: string
  email: string
  phone: string
  role: 'admin' | 'receptionist' | 'instructor' | 'member'
  isActive: boolean
  createdAt: string
}

const initialUsers: UserAccount[] = [
  {
    id: 'u1',
    fullName: 'Quản Trị Viên Hệ Thống',
    email: 'admin@pilatesms.vn',
    phone: '0901000001',
    role: 'admin',
    isActive: true,
    createdAt: '2026-09-01',
  },
  {
    id: 'u2',
    fullName: 'Lễ Tân Thu Ngân (Ca Sáng)',
    email: 'letan.sang@pilatesms.vn',
    phone: '0902000002',
    role: 'receptionist',
    isActive: true,
    createdAt: '2026-09-05',
  },
  {
    id: 'u3',
    fullName: 'Lễ Tân Thu Ngân (Ca Chiều)',
    email: 'letan.chieu@pilatesms.vn',
    phone: '0902000003',
    role: 'receptionist',
    isActive: true,
    createdAt: '2026-09-10',
  },
  {
    id: 'u4',
    fullName: 'HLV Phạm Mai Linh',
    email: 'linh.pham@pilatesms.vn',
    phone: '0903000004',
    role: 'instructor',
    isActive: true,
    createdAt: '2026-09-02',
  },
  {
    id: 'u5',
    fullName: 'HLV Trần Quốc Hưng',
    email: 'hung.tran@pilatesms.vn',
    phone: '0903000005',
    role: 'instructor',
    isActive: true,
    createdAt: '2026-09-03',
  },
  {
    id: 'u6',
    fullName: 'Nguyễn Thu Hằng',
    email: 'hang.nguyen@gmail.com',
    phone: '0981234001',
    role: 'member',
    isActive: true,
    createdAt: '2026-09-15',
  },
  {
    id: 'u7',
    fullName: 'Lê Tuấn Minh',
    email: 'minh.le@gmail.com',
    phone: '0981234002',
    role: 'member',
    isActive: true,
    createdAt: '2026-09-18',
  },
  {
    id: 'u8',
    fullName: 'lê văn luyện',
    email: '322@gmail.com',
    phone: '0901234567',
    role: 'member',
    isActive: true,
    createdAt: '2026-09-29',
  },
]

interface PermissionGroup {
  groupName: string
  permissions: {
    key: string
    label: string
    admin: boolean
    receptionist: boolean
    instructor: boolean
    member: boolean
  }[]
}

const initialPermissions: PermissionGroup[] = [
  {
    groupName: '1. Quản lý Hội viên & Hồ sơ',
    permissions: [
      { key: 'view_members', label: 'Xem danh sách & hồ sơ hội viên', admin: true, receptionist: true, instructor: true, member: false },
      { key: 'create_member', label: 'Tạo tài khoản hội viên mới', admin: true, receptionist: true, instructor: false, member: false },
      { key: 'edit_member', label: 'Chỉnh sửa thông tin hội viên', admin: true, receptionist: true, instructor: false, member: false },
      { key: 'delete_member', label: 'Khóa / Xóa hội viên', admin: true, receptionist: false, instructor: false, member: false },
    ],
  },
  {
    groupName: '2. Lịch học & Đặt chỗ (Schedule)',
    permissions: [
      { key: 'view_schedule', label: 'Xem lịch học toàn studio', admin: true, receptionist: true, instructor: true, member: true },
      { key: 'create_schedule', label: 'Xếp lịch & mở ca học mới', admin: true, receptionist: true, instructor: false, member: false },
      { key: 'checkin_qr', label: 'Quét QR điểm danh học viên', admin: true, receptionist: true, instructor: true, member: false },
      { key: 'cancel_schedule', label: 'Hủy ca học & hoàn tiền/buổi', admin: true, receptionist: false, instructor: false, member: false },
    ],
  },
  {
    groupName: '3. Gói tập & Thanh toán (POS)',
    permissions: [
      { key: 'sell_package', label: 'Đăng ký & gán gói tập cho học viên', admin: true, receptionist: true, instructor: false, member: false },
      { key: 'collect_money', label: 'Thu tiền & xác nhận thanh toán', admin: true, receptionist: true, instructor: false, member: false },
      { key: 'print_invoice', label: 'In hóa đơn / Phiếu thu tiền', admin: true, receptionist: true, instructor: false, member: false },
      { key: 'manage_packages', label: 'Tạo & sửa giá gói tập', admin: true, receptionist: false, instructor: false, member: false },
    ],
  },
  {
    groupName: '4. Giảng dạy & Đánh giá (HLV)',
    permissions: [
      { key: 'view_my_class', label: 'Xem lịch dạy cá nhân', admin: true, receptionist: false, instructor: true, member: false },
      { key: 'design_workout', label: 'Thiết kế giáo án & bài tập', admin: true, receptionist: false, instructor: true, member: false },
      { key: 'update_progress', label: 'Ghi nhận buổi tập & thể lực', admin: true, receptionist: false, instructor: true, member: false },
      { key: 'send_feedback', label: 'Chấm điểm & gửi phản hồi học viên', admin: true, receptionist: false, instructor: true, member: false },
    ],
  },
  {
    groupName: '5. Thiết bị, Cửa hàng & Bảo trì',
    permissions: [
      { key: 'view_equipment', label: 'Xem danh sách thiết bị phòng tập', admin: true, receptionist: true, instructor: true, member: false },
      { key: 'schedule_maintenance', label: 'Lên lịch bảo trì & gửi thông báo', admin: true, receptionist: false, instructor: false, member: false },
      { key: 'manage_products', label: 'Quản lý kho hàng & bán lẻ sản phẩm', admin: true, receptionist: true, instructor: false, member: false },
    ],
  },
  {
    groupName: '6. Báo cáo & Thống kê Doanh thu',
    permissions: [
      { key: 'view_revenue', label: 'Xem báo cáo doanh thu & KPIs', admin: true, receptionist: false, instructor: false, member: false },
      { key: 'view_instructor_rep', label: 'Xem báo cáo hiệu suất HLV', admin: true, receptionist: false, instructor: false, member: false },
      { key: 'export_reports', label: 'Xuất file Excel / PDF báo cáo', admin: true, receptionist: false, instructor: false, member: false },
    ],
  },
  {
    groupName: '7. Quản trị Hệ thống & Cấu hình',
    permissions: [
      { key: 'manage_users', label: 'Quản lý tài khoản & phân quyền', admin: true, receptionist: false, instructor: false, member: false },
      { key: 'system_settings', label: 'Cài đặt Studio & Cổng thanh toán', admin: true, receptionist: false, instructor: false, member: false },
      { key: 'backup_restore', label: 'Sao lưu & Phục hồi CSDL', admin: true, receptionist: false, instructor: false, member: false },
    ],
  },
]

export default function UsersPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users')
  const [users, setUsers] = useState<UserAccount[]>(initialUsers)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'receptionist' as any,
    password: '',
  })

  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>(initialPermissions)
  const [isSavedSuccess, setIsSavedSuccess] = useState(false)

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone.includes(searchTerm)
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="default">Quản trị viên</Badge>
      case 'receptionist':
        return <Badge variant="info">Lễ tân / Thu ngân</Badge>
      case 'instructor':
        return <Badge variant="warning">Huấn luyện viên</Badge>
      case 'member':
        return <Badge variant="secondary">Hội viên</Badge>
      default:
        return <Badge variant="default">{role}</Badge>
    }
  }

  const handleOpenAdd = () => {
    setEditingUser(null)
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      role: 'receptionist',
      password: '',
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (user: UserAccount) => {
    setEditingUser(user)
    setFormData({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      password: '',
    })
    setIsModalOpen(true)
  }

  const handleSaveUser = () => {
    if (!formData.fullName || !formData.email) return

    if (editingUser) {
      setUsers(
        users.map((u) =>
          u.id === editingUser.id
            ? { ...u, fullName: formData.fullName, email: formData.email, phone: formData.phone, role: formData.role }
            : u
        )
      )
    } else {
      const newUser: UserAccount = {
        id: `u-${Date.now()}`,
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        isActive: true,
        createdAt: new Date().toISOString().split('T')[0],
      }
      setUsers([newUser, ...users])
    }

    setIsModalOpen(false)
  }

  const handleToggleActive = (id: string) => {
    setUsers(
      users.map((u) => (u.id === id ? { ...u, isActive: !u.isActive } : u))
    )
  }

  const handleTogglePermission = (groupIndex: number, permIndex: number, roleKey: 'admin' | 'receptionist' | 'instructor' | 'member') => {
    const updated = [...permissionGroups]
    updated[groupIndex].permissions[permIndex][roleKey] = !updated[groupIndex].permissions[permIndex][roleKey]
    setPermissionGroups(updated)
    setIsSavedSuccess(false)
  }

  const handleSavePermissions = () => {
    setIsSavedSuccess(true)
    setTimeout(() => setIsSavedSuccess(false), 3000)
  }

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Quản Trị Người Dùng & Phân Quyền</h1>
          <p className="text-gray-500 text-sm mt-1">
            Quản lý tài khoản nhân viên, phân quyền hạn chi tiết và cấu hình vai trò trong hệ thống
          </p>
        </div>
        {activeTab === 'users' && (
          <Button onClick={handleOpenAdd} className="flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Thêm Tài Khoản Mới
          </Button>
        )}
        {activeTab === 'roles' && (
          <Button onClick={handleSavePermissions} className="flex items-center gap-2">
            <Save className="w-4 h-4" /> Lưu Ma Trận Phân Quyền
          </Button>
        )}
      </div>

      <div className="flex border-b border-gray-200 gap-2 bg-white p-1 rounded-xl border">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-5 py-2.5 font-medium text-sm rounded-lg transition-colors ${
            activeTab === 'users'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Users className="w-4 h-4" /> Danh Sách Tài Khoản ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 px-5 py-2.5 font-medium text-sm rounded-lg transition-colors ${
            activeTab === 'roles'
              ? 'bg-primary text-white shadow-sm'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Shield className="w-4 h-4" /> Quản Lý Vai Trò & Phân Quyền (Roles)
        </button>
      </div>

      {activeTab === 'users' && (
        <div className="space-y-4">
          
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tìm theo tên, email, SĐT..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <select
                className="border rounded-lg px-3 py-2 text-sm bg-white"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              >
                <option value="all">Tất cả vai trò</option>
                <option value="admin">Quản trị viên</option>
                <option value="receptionist">Lễ tân</option>
                <option value="instructor">Huấn luyện viên</option>
                <option value="member">Hội viên</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs border-b border-gray-100">
                  <tr>
                    <th className="py-3 px-4">Họ Và Tên</th>
                    <th className="py-3 px-4">Email Đăng Nhập</th>
                    <th className="py-3 px-4">Số Điện Thoại</th>
                    <th className="py-3 px-4">Vai Trò</th>
                    <th className="py-3 px-4 text-center">Trạng Thái</th>
                    <th className="py-3 px-4 text-center">Ngày Tạo</th>
                    <th className="py-3 px-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="py-3.5 px-4 font-bold text-gray-900">{user.fullName}</td>
                      <td className="py-3.5 px-4 font-mono text-xs text-gray-600">{user.email}</td>
                      <td className="py-3.5 px-4 font-mono text-xs">{user.phone}</td>
                      <td className="py-3.5 px-4">{getRoleBadge(user.role)}</td>
                      <td className="py-3.5 px-4 text-center">
                        <Badge variant={user.isActive ? 'success' : 'secondary'}>
                          {user.isActive ? 'Hoạt động' : 'Đã khóa'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-center text-xs text-gray-400">
                        {user.createdAt}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEdit(user)}
                            className="h-8 w-8 p-0"
                            title="Sửa thông tin / Đổi vai trò"
                          >
                            <Edit2 className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleActive(user.id)}
                            className="h-8 w-8 p-0"
                            title={user.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                          >
                            {user.isActive ? (
                              <Lock className="w-4 h-4 text-amber-600" />
                            ) : (
                              <Unlock className="w-4 h-4 text-green-600" />
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="space-y-4">
          {isSavedSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded-xl text-sm flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600" /> Đã lưu cấu hình ma trận phân quyền thành công!
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <div>
                <h2 className="font-bold text-gray-900 text-base">Ma Trận Phân Quyền Vai Trò (Permission Matrix)</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Tích chọn các chức năng được phép thao tác tương ứng với từng nhóm vai trò
                </p>
              </div>
              <Button size="sm" onClick={handleSavePermissions} className="flex items-center gap-1.5">
                <Save className="w-4 h-4" /> Lưu Thay Đổi
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-100/70 text-gray-700 uppercase text-xs border-b border-gray-200 font-bold">
                  <tr>
                    <th className="py-3 px-4 w-1/2">Chức Năng & Quyền Hạn</th>
                    <th className="py-3 px-4 text-center w-1/8">Quản Trị Viên (Admin)</th>
                    <th className="py-3 px-4 text-center w-1/8">Lễ Tân / Thu Ngân</th>
                    <th className="py-3 px-4 text-center w-1/8">Huấn Luyện Viên (HLV)</th>
                    <th className="py-3 px-4 text-center w-1/8">Hội Viên (Member)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {permissionGroups.map((group, gIdx) => (
                    <>
                      <tr key={`group-${gIdx}`} className="bg-gray-50/80 font-bold text-primary text-xs">
                        <td colSpan={5} className="py-2.5 px-4 tracking-wide uppercase">
                          {group.groupName}
                        </td>
                      </tr>
                      {group.permissions.map((perm, pIdx) => (
                        <tr key={perm.key} className="hover:bg-blue-50/30">
                          <td className="py-3 px-4 text-gray-800 font-medium pl-6">
                            • {perm.label}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={perm.admin}
                              onChange={() => handleTogglePermission(gIdx, pIdx, 'admin')}
                              className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={perm.receptionist}
                              onChange={() => handleTogglePermission(gIdx, pIdx, 'receptionist')}
                              className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={perm.instructor}
                              onChange={() => handleTogglePermission(gIdx, pIdx, 'instructor')}
                              className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={perm.member}
                              onChange={() => handleTogglePermission(gIdx, pIdx, 'member')}
                              className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary cursor-pointer"
                            />
                          </td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <Modal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingUser ? 'Chỉnh Sửa Tài Khoản' : 'Thêm Tài Khoản Mới'}
        >
          <div className="space-y-4 py-2 text-sm">
            <div>
              <label className="font-medium text-gray-700 block mb-1">Họ và tên *</label>
              <Input
                placeholder="VD: Trần Thị Hương"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-medium text-gray-700 block mb-1">Email đăng nhập *</label>
                <Input
                  type="email"
                  placeholder="huong.tran@pilatesms.vn"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="font-medium text-gray-700 block mb-1">Số điện thoại</label>
                <Input
                  placeholder="0912345678"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-medium text-gray-700 block mb-1">Vai trò hệ thống *</label>
                <select
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                >
                  <option value="admin">Quản trị viên (Admin)</option>
                  <option value="receptionist">Lễ tân / Thu ngân</option>
                  <option value="instructor">Huấn luyện viên (HLV)</option>
                  <option value="member">Hội viên (Member)</option>
                </select>
              </div>
              <div>
                <label className="font-medium text-gray-700 block mb-1">
                  {editingUser ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu khởi tạo *'}
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
            </div>
          </div>
          <ModalFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Hủy</Button>
            <Button onClick={handleSaveUser}>Lưu Tài Khoản</Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  )
}
