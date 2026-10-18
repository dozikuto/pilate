import type { ClassSchedule, MemberPackage } from "@/types";

export const trainingModes: Record<
  string,
  { label: string; capacity: number }
> = {
  private_1v1: { label: "Tập riêng 1:1", capacity: 1 },
  semi_private_1v2: { label: "Tập đôi 1:2", capacity: 2 },
  small_group_1v3: { label: "Tập riêng 1:3", capacity: 3 },
  small_group_1v4: { label: "Tập riêng 1:4", capacity: 4 },
};
export function studioDate(value: string | Date = new Date()) {
  return new Date(new Date(value).getTime() + 7 * 3600000)
    .toISOString()
    .slice(0, 10);
}
export function isSessionPackage(mp: MemberPackage) {
  return (
    (mp.packageType ?? mp.package?.type ?? mp.package?.category) ===
    "session_based"
  );
}
export function packageUnavailable(mp: MemberPackage) {
  if (mp.status !== "active")
    return "Gói chưa được kích hoạt hoặc đã ngừng sử dụng";
  if (mp.startDate && mp.startDate.slice(0, 10) > studioDate())
    return "Gói chưa đến ngày bắt đầu";
  const expiry = mp.expiryDate ?? mp.expiresAt;
  if (expiry && expiry.slice(0, 10) < studioDate()) return "Gói đã hết hạn";
  if (isSessionPackage(mp) && mp.remainingSessions <= 0)
    return "Không còn buổi có thể đặt thêm. Bạn vẫn có thể xem các lịch đã đặt.";
  return "";
}
export function packageConfiguration(mp: MemberPackage) {
  const p = mp.package;
  return p?.privateSessionEnabled
    ? `${trainingModes[p.privateSessionType ?? ""]?.label ?? "Tập riêng"} · ${p.privateSessionDurationMinutes} phút/buổi`
    : "Tập lớp theo lịch chung";
}

// Availability (full, expired, already booked) is separate from the kind of
// session a package grants. Incompatible sessions should never enter the picker.
export function scheduleMatchesPackage(
  schedule: ClassSchedule,
  mp?: MemberPackage,
) {
  if (!mp) return false;
  const privateClass =
    schedule.class?.type === "private" ||
    schedule.class?.type === "semi_private";
  const config = mp.package;
  if (Boolean(config?.privateSessionEnabled) !== privateClass) return false;
  if (!privateClass) return schedule.class?.type === "group";
  const minutes =
    (Date.parse(schedule.endTime) - Date.parse(schedule.startTime)) / 60000;
  return (
    trainingModes[config?.privateSessionType ?? ""]?.capacity ===
      schedule.capacity && minutes === config?.privateSessionDurationMinutes
  );
}
export function scheduleUnavailable(
  schedule: ClassSchedule,
  mp?: MemberPackage,
  allowWaitlist = false,
) {
  if (schedule.isBooked) return "Bạn đã đặt buổi này";
  if (schedule.isWaitlisted) return "Bạn đã trong danh sách chờ (Waitlist)";
  if (
    new Date(schedule.startTime) <= new Date() ||
    (schedule.scheduleStatus && schedule.scheduleStatus !== "scheduled")
  )
    return "Buổi học đã bắt đầu hoặc không còn mở đặt chỗ";
  if (!allowWaitlist && schedule.enrolled >= schedule.capacity)
    return "Buổi học đã đủ chỗ";
  if (schedule.class?.isActive === false) return "Lớp học đã ngừng hoạt động";
  if (!mp) return "Chọn gói tập để đặt buổi";
  if (
    mp.package?.privateSessionEnabled &&
    mp.package.privateSessionType === "semi_private_1v2"
  ) {
    if (!mp.duoPartnerPackageId)
      return "Liên hệ lễ tân để ghép người tập cùng cho gói 1:2";
    if (schedule.duoAvailableForMember === false)
      return "Ca này đã được một cặp học viên khác đặt";
  }
  const unavailable = packageUnavailable(mp);
  if (unavailable) return unavailable;
  const expiry = mp.expiryDate ?? mp.expiresAt;
  if (expiry && studioDate(schedule.startTime) > expiry.slice(0, 10))
    return "Buổi học nằm sau ngày hết hạn gói";
  const p = mp.package;
  const isPrivate =
    schedule.class?.type !== "group" && Boolean(schedule.class?.type);
  if (Boolean(p?.privateSessionEnabled) !== isPrivate)
    return p?.privateSessionEnabled
      ? "Gói chỉ dùng cho lớp tập riêng"
      : "Buổi này cần gói tập riêng";
  if (isPrivate) {
    if (
      trainingModes[p?.privateSessionType ?? ""]?.capacity !== schedule.capacity
    )
      return "Hình thức tập không khớp cấu hình gói";
    const duration =
      (new Date(schedule.endTime).getTime() -
        new Date(schedule.startTime).getTime()) /
      60000;
    if (duration !== p?.privateSessionDurationMinutes)
      return `Gói yêu cầu ${p?.privateSessionDurationMinutes} phút/buổi`;
  }
  return "";
}
