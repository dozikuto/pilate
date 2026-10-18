import type { ClassSchedule, MemberPackage } from "@/types";
import {
  isSessionPackage,
  packageUnavailable,
  scheduleUnavailable,
  studioDate,
} from "./packageBooking";

export const WEEKDAYS = [
  { value: 1, label: "Thứ 2" },
  { value: 2, label: "Thứ 3" },
  { value: 3, label: "Thứ 4" },
  { value: 4, label: "Thứ 5" },
  { value: 5, label: "Thứ 6" },
  { value: 6, label: "Thứ 7" },
  { value: 0, label: "Chủ nhật" },
];
export interface WeeklyBookingRule {
  startDate: string;
  endDate: string;
  weekdays: number[];
  count: number;
  startTime?: string;
  classId?: string;
  instructorId?: string;
}
export function shiftStudioDate(day: string, count: number) {
  return new Date(new Date(`${day}T00:00:00Z`).getTime() + count * 86400000)
    .toISOString()
    .slice(0, 10);
}
function validDate(day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(day) &&
    Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === day
  );
}
export function weeklyRuleError(rule: WeeklyBookingRule, maxCount: number) {
  if (
    !validDate(rule.startDate) ||
    !validDate(rule.endDate) ||
    rule.endDate < rule.startDate
  )
    return "Chọn ngày bắt đầu và kết thúc hợp lệ";
  if ((Date.parse(rule.endDate) - Date.parse(rule.startDate)) / 86400000 > 365)
    return "Mỗi lần tìm lịch trong tối đa 1 năm";
  if (
    !rule.weekdays.length ||
    rule.weekdays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)
  )
    return "Chọn ít nhất một thứ trong tuần";
  if (!Number.isInteger(rule.count) || rule.count < 1 || rule.count > maxCount)
    return `Chọn từ 1 đến ${Math.max(0, maxCount)} buổi phù hợp số buổi còn lại`;
  if (rule.startTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(rule.startTime))
    return "Giờ bắt đầu cần có dạng HH:mm";
  return "";
}
export function planWeeklyBookings(
  schedules: ClassSchedule[],
  memberPackage: MemberPackage,
  rule: WeeklyBookingRule,
  existing: ClassSchedule[] = [],
) {
  const maxCount = Math.max(
    0,
    Math.min(
      100 - existing.length,
      isSessionPackage(memberPackage)
        ? memberPackage.remainingSessions - existing.length
        : 100,
    ),
  );
  const chosen: ClassSchedule[] = [];
  const skipped: { date: string; reason: string }[] = [];
  const error =
    packageUnavailable(memberPackage) || weeklyRuleError(rule, maxCount);
  if (error) return { chosen, skipped, error };
  const booked = schedules.filter((s) => s.isBooked);
  const ordered = [...schedules].sort(
    (a, b) =>
      Date.parse(a.startTime) - Date.parse(b.startTime) ||
      a.id.localeCompare(b.id),
  );
  const overlaps = (a: ClassSchedule, b: ClassSchedule) =>
    Date.parse(a.startTime) < Date.parse(b.endTime) &&
    Date.parse(a.endTime) > Date.parse(b.startTime);
  for (
    let date = rule.startDate;
    date <= rule.endDate && chosen.length < rule.count;
    date = shiftStudioDate(date, 1)
  ) {
    if (!rule.weekdays.includes(new Date(`${date}T00:00:00Z`).getUTCDay()))
      continue;
    if (existing.some((s) => studioDate(s.startTime) === date)) {
      skipped.push({
        date,
        reason: "Ngày này đã có buổi trong danh sách đang chọn",
      });
      continue;
    }
    const candidates = ordered.filter(
      (s) =>
        studioDate(s.startTime) === date &&
        (!rule.classId || s.class?.id === rule.classId) &&
        (!rule.instructorId || s.instructor.id === rule.instructorId) &&
        (!rule.startTime ||
          new Date(Date.parse(s.startTime) + 7 * 3600000)
            .toISOString()
            .slice(11, 16) === rule.startTime),
    );
    let reason = "Chưa có lịch học khớp bộ lọc vào ngày này";
    let found = false;
    for (const candidate of candidates) {
      const unavailable = scheduleUnavailable(candidate, memberPackage);
      if (unavailable) {
        reason = unavailable;
        continue;
      }
      if (
        [...existing, ...chosen, ...booked].some(
          (s) => s.id === candidate.id || overlaps(s, candidate),
        )
      ) {
        reason = "Trùng giờ với một buổi đã đặt hoặc đang chọn";
        continue;
      }
      chosen.push(candidate);
      found = true;
      break;
    }
    if (!found) skipped.push({ date, reason });
  }
  return { chosen, skipped, error: "" };
}
