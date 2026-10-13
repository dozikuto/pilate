import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Calendar,
  BookOpen,
  Package,
  CreditCard,
  UserCheck,
  Dumbbell,
  BarChart3,
  Settings,
  X,
  ChevronRight,
  Tag,
  Star,
  GraduationCap,
  ShoppingBag,
  Shield,
  DoorOpen,
  CalendarClock,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  path: string
  icon: React.ReactNode
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} /> },
  { label: 'Học viên', path: '/members', icon: <Users size={20} /> },
  { label: 'Lịch học', path: '/schedule', icon: <Calendar size={20} /> },
  { label: 'Lớp học', path: '/classes', icon: <BookOpen size={20} /> },
  { label: 'Phòng tập', path: '/rooms', icon: <DoorOpen size={20} /> },
  { label: 'Đề nghị tập riêng', path: '/private-sessions', icon: <CalendarClock size={20} /> },
  { label: 'Giảng dạy & HLV', path: '/teaching', icon: <GraduationCap size={20} /> },
  { label: 'Gói tập', path: '/packages', icon: <Package size={20} /> },
  { label: 'Cửa hàng & Sp', path: '/products', icon: <ShoppingBag size={20} /> },
  { label: 'Khuyến mãi', path: '/promotions', icon: <Tag size={20} /> },
  { label: 'Giao dịch', path: '/transactions', icon: <CreditCard size={20} /> },
  { label: 'Đánh giá', path: '/reviews', icon: <Star size={20} /> },
  { label: 'Giáo viên', path: '/instructors', icon: <UserCheck size={20} /> },
  { label: 'Thiết bị & Bảo trì', path: '/equipment', icon: <Dumbbell size={20} /> },
  { label: 'Báo cáo', path: '/reports', icon: <BarChart3 size={20} /> },
  { label: 'Người dùng & Quyền', path: '/users', icon: <Shield size={20} /> },
  { label: 'Cài đặt', path: '/settings', icon: <Settings size={20} /> },
]

interface SidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onMobileClose: () => void
}

export default function Sidebar({
  collapsed,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const location = useLocation()

  return (
    <>
      
      <aside
        className={cn(
          'fixed top-0 left-0 h-full z-30 flex flex-col bg-primary transition-all duration-300',
          'hidden lg:flex',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        <SidebarContent
          collapsed={collapsed}
          location={location.pathname}
        />
      </aside>

      <aside
        className={cn(
          'fixed top-0 left-0 h-full z-50 flex flex-col bg-primary w-64',
          'lg:hidden',
          'transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <Logo />
          <button
            onClick={onMobileClose}
            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
          {navItems.map((item) => (
            <NavItem
              key={item.path}
              item={item}
              collapsed={false}
              active={location.pathname.startsWith(item.path)}
              onClick={onMobileClose}
            />
          ))}
        </nav>
      </aside>
    </>
  )
}

function SidebarContent({
  collapsed,
  location,
}: {
  collapsed: boolean
  location: string
}) {
  return (
    <>
      
      <div
        className={cn(
          'flex items-center h-16 border-b border-white/10 px-4 flex-shrink-0',
          collapsed ? 'justify-center' : 'gap-3'
        )}
      >
        {collapsed ? (
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm">
            P
          </div>
        ) : (
          <Logo />
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
        {navItems.map((item) => (
          <NavItem
            key={item.path}
            item={item}
            collapsed={collapsed}
            active={location.startsWith(item.path)}
          />
        ))}
      </nav>

      {!collapsed && (
        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-white/40 text-center">
            PilatesMS v1.0.0
          </div>
        </div>
      )}
    </>
  )
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
        P
      </div>
      <div>
        <div className="text-white font-semibold text-sm leading-tight">
          PilatesMS
        </div>
        <div className="text-white/50 text-xs leading-tight">Admin</div>
      </div>
    </div>
  )
}

function NavItem({
  item,
  collapsed,
  active,
  onClick,
}: {
  item: NavItem
  collapsed: boolean
  active: boolean
  onClick?: () => void
}) {
  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={cn(
        'flex items-center gap-3 mx-2 mb-0.5 rounded-lg transition-all duration-150',
        collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5',
        active
          ? 'bg-white/15 text-white'
          : 'text-white/60 hover:text-white hover:bg-white/10'
      )}
    >
      <span className="flex-shrink-0">{item.icon}</span>
      {!collapsed && (
        <>
          <span className="flex-1 text-sm font-medium">{item.label}</span>
          {active && <ChevronRight size={14} className="opacity-60" />}
        </>
      )}
    </NavLink>
  )
}
