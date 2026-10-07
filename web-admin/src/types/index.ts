
export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  refreshToken: string
  user: {
    id: string
    name: string
    email: string
    role: 'admin' | 'manager' | 'instructor'
    avatar?: string
  }
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PaginationParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export type MemberStatus = 'active' | 'inactive' | 'expired'

export interface Member {
  id: string
  code: string
  name: string
  phone: string
  email: string
  dateOfBirth?: string
  gender?: 'male' | 'female' | 'other'
  address?: string
  avatar?: string
  healthNotes?: string
  emergencyContact?: string
  emergencyPhone?: string
  joinDate: string
  status: MemberStatus
  currentPackage?: MemberPackage
  totalSessions: number
  usedSessions: number
  remainingSessions: number
  createdAt: string
  updatedAt: string
}

export interface CreateMemberDto {
  name: string
  phone: string
  email: string
  dateOfBirth?: string
  gender?: 'male' | 'female' | 'other'
  address?: string
  healthNotes?: string
  emergencyContact?: string
  emergencyPhone?: string
}

export interface UpdateMemberDto extends Partial<CreateMemberDto> {}

export type PackageType = 'session' | 'monthly' | 'yearly'
export type PackageStatus = 'active' | 'inactive'

export interface Package {
  id: string
  name: string
  type: PackageType
  sessions?: number
  durationDays?: number
  price: number
  description?: string
  features: string[]
  status: PackageStatus
  color?: string
  createdAt: string
  updatedAt: string
}

export interface CreatePackageDto {
  name: string
  type: PackageType
  sessions?: number
  totalSessions?: number
  durationDays?: number
  price: number
  description?: string
  features?: string[]
  color?: string
  isActive?: boolean
}

export interface MemberPackage {
  id: string
  memberId: string
  packageId: string
  packageName: string
  packageType: PackageType
  totalSessions: number
  usedSessions: number
  remainingSessions: number
  startDate: string
  endDate?: string
  purchaseDate: string
  price: number
  status: 'active' | 'expired' | 'cancelled'
}

export type InstructorStatus = 'active' | 'inactive'

export interface Instructor {
  id: string
  name: string
  phone: string
  email: string
  avatar?: string
  specializations: string[]
  bio?: string
  experience?: number
  status: InstructorStatus
  rating?: number
  totalClasses?: number
  createdAt: string
}

export interface CreateInstructorDto {
  name: string
  phone: string
  email: string
  specializations: string[]
  bio?: string
  experience?: number
}

export type ClassType = 'group' | 'private' | 'semi-private'
export type ClassLevel = 'beginner' | 'intermediate' | 'advanced' | 'all'

export interface PilatesClass {
  id: string
  name: string
  type: ClassType
  level: ClassLevel
  instructorId: string
  instructorName: string
  maxCapacity: number
  description?: string
  duration: number 
  color?: string
  status: 'active' | 'inactive'
  createdAt: string
}

export interface CreateClassDto {
  name: string
  type: ClassType
  level: ClassLevel
  instructorId: string
  maxCapacity: number
  description?: string
  duration: number
  color?: string
}

export type ScheduleStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled'

export interface Schedule {
  id: string
  classId: string
  className: string
  classType: ClassType
  instructorId: string
  instructorName: string
  startTime: string
  endTime: string
  room?: string
  maxCapacity: number
  enrolledCount: number
  status: ScheduleStatus
  notes?: string
  color?: string
}

export interface CreateScheduleDto {
  classId: string
  instructorId: string
  startTime: string
  endTime: string
  roomId?: string
  room?: string
  maxCapacity?: number
  notes?: string
  isRecurring?: boolean
  recurrence?: 'none' | 'daily' | 'weekly'
  recurrenceEndDate?: string
}

export type BookingStatus = 'confirmed' | 'cancelled' | 'attended' | 'no-show'

export interface Booking {
  id: string
  memberId: string
  memberName: string
  scheduleId: string
  className: string
  instructorName: string
  startTime: string
  endTime: string
  status: BookingStatus
  bookedAt: string
}

export interface CheckIn {
  id: string
  memberId: string
  memberName: string
  scheduleId?: string
  className?: string
  checkInTime: string
  checkOutTime?: string
  method: 'qr' | 'manual' | 'card'
}

export type PaymentMethod = 'cash' | 'bank_transfer' | 'card' | 'momo' | 'vnpay'
export type TransactionStatus = 'completed' | 'pending' | 'failed' | 'refunded'

export interface Transaction {
  id: string
  memberId: string
  memberName: string
  memberPhone: string
  packageId: string
  packageName: string
  amount: number
  paymentMethod: PaymentMethod
  status: TransactionStatus
  transactionDate: string
  notes?: string
  invoiceNumber: string
}

export interface CreateTransactionDto {
  memberId: string
  packageId: string
  amount: number
  paymentMethod: PaymentMethod
  notes?: string
}

export type EquipmentStatus = 'good' | 'maintenance' | 'broken'

export interface Equipment {
  id: string
  name: string
  category: string
  brand?: string
  model?: string
  quantity: number
  purchaseDate?: string
  lastMaintenanceDate?: string
  nextMaintenanceDate?: string
  status: EquipmentStatus
  notes?: string
}

export interface DashboardStats {
  revenueToday: number
  classesToday: number
  newMembersThisMonth: number
  checkInsToday: number
  revenueGrowth: number
  classesGrowth: number
  membersGrowth: number
  checkInsGrowth: number
}

export interface RevenueChartData {
  date: string
  revenue: number
  label: string
}

export interface ClassesChartData {
  week: string
  count: number
}

export interface UpcomingClass {
  id: string
  className: string
  instructorName: string
  startTime: string
  endTime: string
  room: string
  enrolledCount: number
  maxCapacity: number
  status: ScheduleStatus
}

export interface RevenueReport {
  period: string
  revenue: number
  transactions: number
  growth: number
}

export interface MemberReport {
  period: string
  newMembers: number
  activeMembers: number
  churnedMembers: number
}

export interface PackageDistribution {
  packageName: string
  count: number
  percentage: number
  color: string
}
