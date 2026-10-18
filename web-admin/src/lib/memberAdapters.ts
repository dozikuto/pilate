import type { Member, MemberPackage, Booking, CheckIn } from "@/types";

export interface MemberDetail extends Member {
  packages: MemberPackage[];
  bookings: Booking[];
  checkIns: CheckIn[];
}

export function adaptMemberDetail(raw: any): MemberDetail {
  const name = raw.name || raw.user?.fullName || "Học viên";
  const today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
  const packages: MemberPackage[] = (
    Array.isArray(raw.memberPackages) ? raw.memberPackages : []
  )
    .map((mp: any) => {
      const total = Number(mp.package?.totalSessions ?? mp.totalSessions ?? 0);
      const remaining = Number(mp.remainingSessions ?? 0);
      const expiry = mp.expiryDate ?? mp.endDate;
      return {
        id: mp.id,
        memberId: mp.memberId ?? raw.id,
        packageId: mp.packageId ?? mp.package?.id,
        packageName: mp.package?.name ?? mp.packageName ?? "Gói tập Pilates",
        packageType: mp.package?.type ?? mp.packageType ?? "session_based",
        totalSessions: total,
        usedSessions: Math.max(0, total - remaining),
        remainingSessions: remaining,
        attendedSessions: mp.attendedSessions,
        reservedSessions: mp.reservedSessions,
        forfeitedSessions: mp.forfeitedSessions,
        otherUsedSessions: mp.otherUsedSessions,
        privateSessionEnabled: mp.package?.privateSessionEnabled,
        privateSessionType: mp.package?.privateSessionType,
        preferredInstructorId: mp.preferredInstructorId,
        preferredInstructor: mp.preferredInstructor,
        duoPartnerPackageId: mp.duoPartnerPackageId,
        duoPartner: mp.duoPartner,
        startDate: mp.startDate,
        endDate: expiry,
        purchaseDate: mp.createdAt ?? mp.purchaseDate,
        price: Number(mp.package?.price ?? mp.price ?? 0),
        status:
          mp.status === "active" && expiry && expiry.slice(0, 10) < today
            ? "expired"
            : mp.status,
      };
    })
    .sort((a: MemberPackage, b: MemberPackage) =>
      (b.purchaseDate ?? "").localeCompare(a.purchaseDate ?? ""),
    );
  const total = packages.reduce((sum, p) => sum + p.totalSessions, 0);
  const remaining = packages.reduce((sum, p) => sum + p.remainingSessions, 0);
  const bookings: Booking[] = (
    Array.isArray(raw.bookings) ? raw.bookings : []
  ).map((b: any) => ({
    id: b.id,
    memberId: b.memberId ?? raw.id,
    memberName: name,
    scheduleId: b.scheduleId ?? b.schedule?.id,
    className: b.schedule?.class?.name ?? b.className ?? "Lớp Pilates",
    instructorName:
      b.schedule?.instructor?.fullName ?? b.instructorName ?? "Chưa có HLV",
    startTime: b.schedule?.startTime ?? b.startTime,
    endTime: b.schedule?.endTime ?? b.endTime,
    status: b.status === "no_show" ? "no-show" : b.status,
    bookedAt: b.bookedAt,
  }));
  const checkIns: CheckIn[] = (Array.isArray(raw.checkIns) ? raw.checkIns : [])
    .map((ci: any) => ({
      id: ci.id,
      memberId: ci.memberId ?? raw.id,
      memberName: name,
      scheduleId: ci.scheduleId,
      className: ci.schedule?.class?.name ?? ci.className,
      checkInTime: ci.checkInTime,
      checkOutTime: ci.checkOutTime,
      method: ci.method,
    }))
    .sort((a: CheckIn, b: CheckIn) =>
      (b.checkInTime ?? "").localeCompare(a.checkInTime ?? ""),
    );
  return {
    id: raw.id,
    code:
      raw.code ||
      raw.qrCode ||
      `HV-${String(raw.id).slice(0, 6).toUpperCase()}`,
    name,
    phone: raw.phone ?? raw.user?.phone ?? "",
    email: raw.email ?? raw.user?.email ?? "",
    dateOfBirth: raw.dateOfBirth ?? undefined,
    gender: raw.gender ?? undefined,
    address: raw.address ?? undefined,
    avatar: raw.user?.avatarUrl,
    healthNotes: raw.healthNotes,
    goals: raw.goals,
    emergencyContact: raw.emergencyContact ?? raw.emergencyContactName,
    emergencyPhone: raw.emergencyPhone ?? raw.emergencyContactPhone,
    joinDate: raw.joinDate ?? raw.createdAt,
    status:
      raw.status ??
      (raw.user?.isActive === false
        ? "inactive"
        : packages.length && !packages.some((p) => p.status === "active")
          ? "expired"
          : "active"),
    totalSessions: raw.totalSessions ?? total,
    remainingSessions: raw.remainingSessions ?? remaining,
    usedSessions: raw.usedSessions ?? Math.max(0, total - remaining),
    currentPackage:
      raw.currentPackage ??
      packages.find((p) => p.status === "active") ??
      packages[0],
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    packages,
    bookings,
    checkIns,
  };
}
