
export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: "student" | "instructor" | "admin";
  avatarUrl?: string;
  memberCode: string;
  healthNote?: string;
  createdAt: string;
}

export interface ClassSchedule {
  id: string;
  className: string;
  instructor: Instructor;
  startTime: string; 
  endTime: string;
  room: string;
  capacity: number;
  enrolled: number;
  status: "available" | "nearly_full" | "full";
  isBooked?: boolean;
}

export interface Instructor {
  id: string;
  fullName: string;
  avatarUrl?: string;
  specialization?: string;
}

export interface Package {
  id: string;
  name: string;
  description: string;
  totalSessions: number;
  validDays: number;
  price: number;
  category: "beginner" | "intermediate" | "advanced" | "unlimited";
}

export interface MemberPackage {
  id: string;
  package?: Package;
  packageName?: string;
  packageType?: string;
  purchasedAt?: string;
  purchaseDate?: string;
  startDate?: string;
  expiresAt?: string;
  expiryDate?: string;
  price?: number;
  totalSessions: number;
  usedSessions: number;
  remainingSessions: number;
  status: "active" | "expired" | "paused" | string;
}

export interface AttendanceRecord {
  id: string;
  classSchedule: ClassSchedule;
  checkedInAt: string;
  status: "present" | "absent" | "late";
}

export interface DashboardStats {
  remainingSessions: number;
  packageExpiresAt: string | null;
  totalAttended: number;
  nextClass: ClassSchedule | null;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success";
  isRead: boolean;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
