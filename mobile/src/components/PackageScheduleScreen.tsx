import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import {
  useSchedules,
  useBookPackageSchedules,
  useCancelBooking,
} from "@/hooks/useSchedules";
import { useMyPackages, usePackagePreferences } from "@/hooks/usePackages";
import { useInstructorOptions } from "@/hooks/useInstructorSchedule";
import { formatTime } from "@/lib/utils";
import { confirmAlert } from "@/lib/alert";
import {
  studioDate,
  packageUnavailable,
  packageConfiguration,
  scheduleUnavailable,
  scheduleMatchesPackage,
  isSessionPackage,
} from "@/lib/packageBooking";
import type { ClassSchedule, MemberPackage } from "@/types";
import WeeklyBookingPlanner from "./WeeklyBookingPlanner";

function shiftDate(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00+07:00`);
  date.setUTCDate(date.getUTCDate() + amount);
  return studioDate(date);
}
function startOfWeekMonday(day: string) {
  const date = new Date(`${day}T12:00:00+07:00`);
  const dow = date.getUTCDay(); // 0=CN, 1=T2 ... 6=T7
  const diff = dow === 0 ? -6 : 1 - dow;
  return shiftDate(day, diff);
}
function dateLabel(day: string) {
  return new Date(`${day}T12:00:00+07:00`).toLocaleDateString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}
function weekdayName(day: string) {
  const dow = new Date(`${day}T12:00:00+07:00`).getUTCDay();
  const names = [
    "Chủ nhật",
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
  ];
  return names[dow] ?? "";
}
function vnHour(iso: string) {
  const d = new Date(new Date(iso).getTime() + 7 * 3600000);
  return d.getUTCHours();
}
function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((v) => v[0])
    .join("")
    .toUpperCase();
}
const overlaps = (a: ClassSchedule, b: ClassSchedule) =>
  Date.parse(a.startTime) < Date.parse(b.endTime) &&
  Date.parse(a.endTime) > Date.parse(b.startTime);
const errorText = (err: any, fallback: string) => {
  const value = err?.response?.data?.message;
  return Array.isArray(value) ? value.join(". ") : (value ?? fallback);
};

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6:00 -> 21:00

function MiniMonthCalendar({
  activeDate,
  weekDays,
  scheduleDates,
  onSelectDate,
}: {
  activeDate: string;
  weekDays: string[];
  scheduleDates: Set<string>;
  onSelectDate: (day: string) => void;
}) {
  const [viewYearMonth, setViewYearMonth] = useState(() =>
    activeDate.slice(0, 7),
  );
  useEffect(() => {
    setViewYearMonth(activeDate.slice(0, 7));
  }, [activeDate]);

  const [year, month] = viewYearMonth.split("-").map(Number);
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1, 12, 0, 0));
  const firstDow = firstOfMonth.getUTCDay(); // 0=CN, 1=T2...
  const offset = firstDow === 0 ? 6 : firstDow - 1;
  const startCellDate = shiftDate(
    `${year}-${String(month).padStart(2, "0")}-01`,
    -offset,
  );
  const cells = Array.from({ length: 42 }, (_, i) =>
    shiftDate(startCellDate, i),
  );
  const today = studioDate();

  function shiftMonth(delta: number) {
    const d = new Date(Date.UTC(year, month - 1 + delta, 1, 12, 0, 0));
    const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    setViewYearMonth(ym);
  }

  return (
    <View className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      <View className="bg-[#1A3A5C] px-4 py-3 flex-row items-center justify-between">
        <Text className="text-white font-bold text-sm">
          Tháng {String(month).padStart(2, "0")}-{year}
        </Text>
        <View className="flex-row items-center gap-1">
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Tháng trước"
            onPress={() => shiftMonth(-1)}
            className="p-1"
          >
            <Ionicons name="chevron-back" size={16} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Tháng sau"
            onPress={() => shiftMonth(1)}
            className="p-1"
          >
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
      <View className="p-3">
        <View className="flex-row mb-2">
          {["T2", "T3", "T4", "T5", "T6", "T7", "Cn"].map((lbl) => (
            <View key={lbl} className="flex-1 items-center">
              <Text className="text-[11px] font-semibold text-gray-400">
                {lbl}
              </Text>
            </View>
          ))}
        </View>
        {Array.from({ length: 6 }, (_, row) => (
          <View key={row} className="flex-row my-0.5">
            {cells.slice(row * 7, row * 7 + 7).map((cellDay) => {
              const inMonth = cellDay.slice(0, 7) === viewYearMonth;
              const isSelected = cellDay === activeDate;
              const inWeek = weekDays.includes(cellDay);
              const isToday = cellDay === today;
              const hasClass = scheduleDates.has(cellDay);
              return (
                <TouchableOpacity
                  key={cellDay}
                  onPress={() => onSelectDate(cellDay)}
                  className={`flex-1 items-center justify-center py-1.5 rounded-lg ${
                    isSelected
                      ? "bg-[#C0392B]"
                      : inWeek
                        ? "bg-blue-50"
                        : ""
                  }`}
                >
                  <Text
                    className={`text-xs ${
                      isSelected
                        ? "text-white font-bold"
                        : !inMonth
                          ? "text-gray-300"
                          : isToday
                            ? "text-[#C0392B] font-bold"
                            : "text-gray-700 font-medium"
                    }`}
                  >
                    {Number(cellDay.slice(8, 10))}
                  </Text>
                  {hasClass && !isSelected && (
                    <View className="w-1 h-1 rounded-full bg-[#1A3A5C] mt-0.5" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

export default function PackageScheduleScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const isWide = windowWidth >= 960;
  const params = useLocalSearchParams<{
    memberPackageId?: string;
    instructorId?: string;
    date?: string;
    scheduleId?: string;
  }>();
  const [weekStart, setWeekStart] = useState(() =>
    startOfWeekMonday(studioDate()),
  );
  const [day, setDay] = useState(studioDate());
  const [viewMode, setViewMode] = useState<"timetable" | "day">("timetable");
  const [packageId, setPackageId] = useState("");
  const [instructorId, setInstructorId] = useState("");
  const [selected, setSelected] = useState<ClassSchedule[]>([]);
  const [activeSlot, setActiveSlot] = useState<ClassSchedule | null>(null);
  const [review, setReview] = useState(false);
  const [packagePicker, setPackagePicker] = useState(false);
  const [weeklyOpen, setWeeklyOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [cancelId, setCancelId] = useState("");
  const packagesQuery = useMyPackages();
  const schedulesQuery = useSchedules(weekStart, shiftDate(weekStart, 6));
  const instructorsQuery = useInstructorOptions();
  const preferences = usePackagePreferences();
  const book = useBookPackageSchedules();
  const cancel = useCancelBooking();
  const packages: MemberPackage[] = packagesQuery.data ?? [];
  const schedules: ClassSchedule[] = schedulesQuery.data ?? [];
  const instructors = instructorsQuery.data ?? [];
  const current = packages.find((p) => p.id === packageId);
  const limited = current ? isSessionPackage(current) : true;
  const limit = current ? (limited ? current.remainingSessions : 100) : 0;
  const after = Math.max(0, limit - selected.length);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => shiftDate(weekStart, i)),
    [weekStart],
  );

  // Filter schedules by selected instructor (and package compatibility)
  const instructorSchedules = useMemo(
    () =>
      schedules.filter(
        (s) => !instructorId || s.instructor.id === instructorId,
      ),
    [schedules, instructorId],
  );

  const matching = useMemo(
    () =>
      instructorSchedules.filter((s) => scheduleMatchesPackage(s, current)),
    [instructorSchedules, current],
  );

  const scheduleDates = useMemo(
    () => new Set(matching.map((s) => studioDate(s.startTime))),
    [matching],
  );

  const daySchedules = useMemo(
    () => matching.filter((s) => studioDate(s.startTime) === day),
    [matching, day],
  );

  const selectedInstructorObj = instructors.find(
    (ins) => ins.userId === instructorId,
  );

  const unavailable = (s: ClassSchedule, allowWaitlist = false) =>
    scheduleUnavailable(s, current, allowWaitlist) ||
    (schedules.some(
      (other) => other.isBooked && other.id !== s.id && overlaps(other, s),
    )
      ? "Bạn đã có lịch trùng giờ"
      : "");
  const selectionError = book.isPending
    ? ""
    : selected
        .map((s) => unavailable(schedules.find((v) => v.id === s.id) ?? s))
        .find(Boolean) ||
      (selected.length > limit
        ? "Số buổi đã chọn vượt số buổi còn có thể đặt"
        : "");

  useEffect(() => {
    if (params.memberPackageId) {
      setPackageId(params.memberPackageId);
      setSelected([]);
    }
  }, [params.memberPackageId]);
  useEffect(() => {
    if (
      (!packageId || !packages.some((p) => p.id === packageId)) &&
      packages.length
    )
      setPackageId(
        packages.find((p) => p.id === params.memberPackageId)?.id ??
          packages.find((p) => !packageUnavailable(p))?.id ??
          packages[0].id,
      );
  }, [packages, packageId, params.memberPackageId]);
  useEffect(() => {
    if (current) {
      const targetInstructor =
        params.instructorId ??
        current.preferredInstructorId ??
        instructors[0]?.userId ??
        "";
      setInstructorId(targetInstructor);
    }
  }, [current?.id, params.instructorId, instructors.length]);
  useEffect(() => {
    if (params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)) {
      setWeekStart(startOfWeekMonday(params.date));
      setDay(params.date);
    }
  }, [params.date]);
  useEffect(() => {
    if (params.scheduleId && schedules.length > 0) {
      const found = schedules.find((s) => s.id === params.scheduleId);
      if (found) {
        setActiveSlot(found);
      }
    }
  }, [params.scheduleId, schedules]);

  function selectDateFromCalendar(targetDay: string) {
    setDay(targetDay);
    setWeekStart(startOfWeekMonday(targetDay));
  }
  function changeWeek(amount: number) {
    const next = shiftDate(weekStart, amount);
    setWeekStart(next);
    setDay(next);
  }
  function toggle(s: ClassSchedule) {
    setError("");
    setMessage("");
    if (selected.some((v) => v.id === s.id)) {
      setSelected(selected.filter((v) => v.id !== s.id));
      return;
    }
    const reason = unavailable(s);
    if (reason) {
      setError(reason);
      return;
    }
    if (selected.length >= Math.min(limit, 100)) {
      setError(`Bạn có thể chọn tối đa ${Math.min(limit, 100)} buổi.`);
      return;
    }
    if (selected.some((v) => overlaps(v, s))) {
      setError("Buổi này trùng giờ với một buổi đã chọn.");
      return;
    }
    setSelected([...selected, s]);
  }
  async function bookSingleScheduleNow(s: ClassSchedule) {
    if (!current) return;
    const isFullClass = s.enrolled >= s.capacity;
    const reason = unavailable(s, true);
    if (reason) {
      setError(reason);
      return;
    }
    setError("");
    setMessage("");
    try {
      const result = await book.mutateAsync({
        memberPackageId: current.id,
        scheduleIds: [s.id],
      });
      setSelected((prev) => prev.filter((item) => item.id !== s.id));
      setActiveSlot(null);
      await Promise.all([packagesQuery.refetch(), schedulesQuery.refetch()]);
      if ((result.waitlistedCount && result.waitlistedCount > 0) || isFullClass) {
        setMessage(
          `Đã đăng ký vào Danh sách chờ (Waitlist) ca ${dateLabel(studioDate(s.startTime))} · ${formatTime(s.startTime)}. Khi có học viên hủy, hệ thống sẽ tự động đôn bạn vào lớp chính thức!`,
        );
      } else {
        setMessage(
          `Đăng ký lịch thành công (${dateLabel(studioDate(s.startTime))} · ${formatTime(s.startTime)}).${
            limited ? ` Còn có thể đặt ${result.remainingSessions} buổi.` : ""
          }`,
        );
      }
    } catch (err) {
      setError(errorText(err, "Không thể đăng ký lịch này. Vui lòng thử lại."));
      await Promise.all([packagesQuery.refetch(), schedulesQuery.refetch()]);
    }
  }
  async function savePreference() {
    if (!current) return;
    setError("");
    try {
      await preferences.mutateAsync({
        id: current.id,
        preferredInstructorId: instructorId || null,
      });
      setMessage(instructorId ? "Đã lưu HLV ưu tiên." : "Đã bỏ HLV ưu tiên.");
    } catch (err) {
      setError(errorText(err, "Không lưu được HLV ưu tiên."));
    }
  }
  async function confirmBooking() {
    if (!current || selectionError || !selected.length) return;
    setError("");
    try {
      const result = await book.mutateAsync({
        memberPackageId: current.id,
        scheduleIds: selected.map((s) => s.id),
      });
      setSelected([]);
      setReview(false);
      await Promise.all([packagesQuery.refetch(), schedulesQuery.refetch()]);
      setMessage(
        `Đã đặt ${result.bookedCount} buổi.${limited ? ` Còn có thể đặt ${result.remainingSessions} buổi.` : ""}`,
      );
    } catch (err) {
      setReview(false);
      setError(errorText(err, "Không thể đặt lịch. Vui lòng thử lại."));
      await Promise.all([packagesQuery.refetch(), schedulesQuery.refetch()]);
    }
  }
  function cancelBooking(s: ClassSchedule) {
    const cancelHours = current?.cancelHoursLimit ?? 2;
    const hoursLeft = (Date.parse(s.startTime) - Date.now()) / 3600000;
    const isLate = !s.isWaitlisted && hoursLeft < cancelHours;
    const roundedHours = Math.max(0, Math.round(hoursLeft * 10) / 10);

    const alertTitle = s.isWaitlisted
      ? "Rời khỏi Danh sách chờ (Waitlist)"
      : isLate
        ? "⚠️ Cảnh báo hủy trễ (No-show policy)"
        : "Xác nhận hủy lịch đã đặt";

    const alertBody = s.isWaitlisted
      ? `Bạn muốn rời khỏi danh sách chờ của ca ${s.className} (${formatTime(s.startTime)})?`
      : isLate
        ? `Ca học sẽ bắt đầu sau khoảng ${roundedHours} giờ nữa (quy định hủy tối thiểu trước ${cancelHours} giờ).\n\nTheo chính sách No-show, hủy trễ hơn ${cancelHours} giờ sẽ KHÔNG được hoàn buổi (tự động trừ 1 buổi trong gói). Bạn có chắc chắn muốn hủy?`
        : `Bạn đang hủy trước giờ học ${roundedHours} giờ (đáp ứng quy định tối thiểu ${cancelHours} giờ).\n\nHệ thống sẽ hoàn lại 1 buổi vào gói tập của bạn.`;

    confirmAlert(
      alertTitle,
      alertBody,
      async () => {
        setCancelId(s.id);
        setError("");
        try {
          const res = await cancel.mutateAsync(s.id);
          setActiveSlot(null);
          await Promise.all([packagesQuery.refetch(), schedulesQuery.refetch()]);
          setMessage(
            res?.message ||
              (s.isWaitlisted
                ? "Đã rời khỏi danh sách chờ."
                : isLate
                  ? "Đã hủy lịch trễ hạn quy định — Hệ thống đã trừ 1 buổi trong gói."
                  : "Đã hủy lịch đúng hạn và hoàn lại 1 buổi vào gói tập."),
          );
        } catch (err) {
          setError(errorText(err, "Không hủy được lịch."));
        } finally {
          setCancelId("");
        }
      },
    );
  }
  const refresh = () =>
    Promise.all([packagesQuery.refetch(), schedulesQuery.refetch()]);

  return (
    <SafeAreaView className="flex-1 bg-[#F5F7FA]" edges={["top"]}>
      <View className="bg-[#1A3A5C] px-5 py-4">
        <View
          style={{ width: "100%", maxWidth: 1220, alignSelf: "center" }}
          className="flex-row items-center justify-between"
        >
          <View>
            <Text className="text-xl font-bold text-white">
              Đặt lịch tập theo Giáo viên
            </Text>
            <Text className="text-xs text-blue-200 mt-1">
              Chọn gói tập → Chọn giáo viên (HLV) → Bấm vào lịch dạy trên thời
              khóa biểu để đăng ký nếu đủ điều kiện
            </Text>
          </View>
          <TouchableOpacity
            accessibilityRole="button"
            onPress={() => router.push("/(tabs)/my-packages")}
            className="bg-white/15 px-3 py-2 rounded-xl flex-row items-center gap-1.5"
          >
            <Ionicons name="card-outline" size={16} color="#FFFFFF" />
            <Text className="text-white text-xs font-semibold">Gói của tôi</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={
              packagesQuery.isRefetching && schedulesQuery.isRefetching
            }
            onRefresh={refresh}
          />
        }
      >
        <View style={{ width: "100%", maxWidth: 1220, alignSelf: "center" }}>
          {packagesQuery.isLoading ? (
            <View className="bg-white rounded-2xl p-8 items-center border border-gray-200">
              <ActivityIndicator color="#1A3A5C" />
              <Text className="text-sm text-gray-500 mt-2">
                Đang tải thông tin gói tập...
              </Text>
            </View>
          ) : packagesQuery.isError ? (
            <View className="bg-white rounded-2xl p-5 border border-red-200">
              <Text className="font-bold text-red-700 text-base">
                Không tải được gói tập
              </Text>
              <Text className="text-xs text-gray-600 mt-1">
                Vui lòng kiểm tra kết nối hoặc đăng nhập lại tài khoản học viên.
              </Text>
              <View className="flex-row gap-2 mt-3">
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => packagesQuery.refetch()}
                  className="bg-[#1A3A5C] px-4 py-2.5 rounded-xl"
                >
                  <Text className="text-white text-xs font-bold">
                    Nhấn để thử lại
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityRole="button"
                  onPress={() => router.push("/(auth)/login")}
                  className="border border-gray-300 px-4 py-2.5 rounded-xl"
                >
                  <Text className="text-gray-700 text-xs font-semibold">
                    Đăng nhập lại
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : !current ? (
            <View className="bg-white rounded-2xl p-6 border border-gray-200">
              <Text className="font-bold text-[#1A3A5C] text-base">
                Bạn cần gói tập để đặt lịch
              </Text>
              <Text className="text-gray-500 mt-2 text-sm">
                Đăng ký gói tập và hoàn tất thanh toán để nhận số buổi và chọn
                lịch học với giáo viên.
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => router.push("/(tabs)/my-packages")}
                className="mt-4 bg-[#1A3A5C] rounded-xl py-3 items-center"
              >
                <Text className="text-white font-bold">Xem & đăng ký gói tập</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* BƯỚC 1: GÓI TẬP ĐANG DÙNG */}
              <View className="bg-white rounded-2xl border border-gray-200 p-4 mb-3 shadow-sm">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-3">
                    <View className="flex-row items-center gap-2">
                      <View className="bg-blue-50 px-2.5 py-0.5 rounded-md">
                        <Text className="text-[11px] font-bold text-[#1A3A5C]">
                          1. Gói tập sử dụng
                        </Text>
                      </View>
                      <Text className="text-xs text-emerald-700 font-semibold">
                        {current.status === "active"
                          ? "● Đang hoạt động"
                          : "● Ngừng sử dụng"}
                      </Text>
                    </View>
                    <Text className="font-bold text-[#1A3A5C] text-lg mt-1">
                      {current.packageName ?? current.package?.name}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5">
                      Điều kiện gói: {packageConfiguration(current)}
                    </Text>
                  </View>
                  {packages.length > 1 && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      onPress={() => setPackagePicker(true)}
                      disabled={book.isPending}
                      className="border border-[#1A3A5C] bg-blue-50/50 rounded-xl px-3.5 py-2"
                    >
                      <Text className="text-[#1A3A5C] font-bold text-xs">
                        Đổi gói ({packages.length})
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <View className="flex-row bg-gray-50 rounded-xl p-3 mt-3">
                  <View className="flex-1 items-center border-r border-gray-200">
                    <Text className="text-lg font-bold text-[#1A3A5C]">
                      {current.attendedSessions ?? 0}
                    </Text>
                    <Text className="text-[11px] text-gray-500">Đã tập</Text>
                  </View>
                  <View className="flex-1 items-center border-r border-gray-200">
                    <Text className="text-lg font-bold text-[#1A3A5C]">
                      {current.reservedSessions ?? 0}
                    </Text>
                    <Text className="text-[11px] text-gray-500">
                      Đã đặt, chưa tập
                    </Text>
                  </View>
                  <View className="flex-1 items-center">
                    <Text className="text-lg font-bold text-emerald-700">
                      {limited ? current.remainingSessions : "Theo hạn"}
                    </Text>
                    <Text className="text-[11px] text-gray-500">
                      Còn có thể đặt
                    </Text>
                  </View>
                </View>

                {!!packageUnavailable(current) && (
                  <View className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 mt-3">
                    <Text className="text-xs text-amber-800 font-medium">
                      {packageUnavailable(current)}
                    </Text>
                  </View>
                )}
                {current.package?.privateSessionType === "semi_private_1v2" &&
                  current.package.privateSessionEnabled && (
                    <Text className="text-xs text-gray-600 mt-2">
                      {current.duoPartner
                        ? `Tập cùng ${current.duoPartner.fullName} · Mỗi người xác nhận cùng ca bằng gói riêng.`
                        : "Liên hệ lễ tân ghép người tập cùng trước khi đặt lịch."}
                    </Text>
                  )}
              </View>

              {!!message && (
                <View
                  accessibilityRole="alert"
                  className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl mb-3 flex-row items-center gap-2"
                >
                  <Ionicons name="checkmark-circle" size={18} color="#059669" />
                  <Text className="text-emerald-800 text-sm flex-1 font-medium">
                    {message}
                  </Text>
                </View>
              )}
              {!!error && (
                <View
                  accessibilityRole="alert"
                  className="bg-red-50 border border-red-200 p-3 rounded-xl mb-3 flex-row items-center gap-2"
                >
                  <Ionicons name="alert-circle" size={18} color="#DC2626" />
                  <Text className="text-red-700 text-sm flex-1 font-medium">
                    {error}
                  </Text>
                </View>
              )}

              {/* BƯỚC 2: CHỌN GIÁO VIÊN (HLV) */}
              <View className="bg-white rounded-2xl p-4 border border-gray-200 mb-3 shadow-sm">
                <View className="flex-row justify-between items-center mb-3">
                  <View>
                    <Text className="font-bold text-[#1A3A5C] text-base">
                      2. Chọn Giáo viên (Huấn luyện viên)
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5">
                      Chọn giáo viên để xem toàn bộ lịch dạy của giảng viên đó
                      và bấm vào ca học để đăng ký
                    </Text>
                  </View>
                  {instructorId && (
                    <TouchableOpacity
                      accessibilityRole="button"
                      disabled={
                        preferences.isPending ||
                        current.preferredInstructorId === instructorId
                      }
                      onPress={savePreference}
                      className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl"
                    >
                      <Text className="text-xs font-semibold text-amber-800">
                        {preferences.isPending
                          ? "Đang lưu…"
                          : current.preferredInstructorId === instructorId
                            ? "★ HLV ưu tiên của gói"
                            : "☆ Lưu làm HLV ưu tiên"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {instructorsQuery.isLoading ? (
                  <ActivityIndicator color="#1A3A5C" />
                ) : instructorsQuery.isError ? (
                  <TouchableOpacity
                    accessibilityRole="button"
                    onPress={() => instructorsQuery.refetch()}
                  >
                    <Text className="text-red-600">
                      Không tải được danh sách giáo viên. Nhấn để thử lại
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 10 }}
                  >
                    {[
                      ...instructors,
                      {
                        userId: "",
                        fullName: "Tất cả Giáo viên",
                        specializations: "Xem toàn bộ lịch studio",
                      },
                    ].map((c: any) => {
                      const active = instructorId === c.userId;
                      const isPreferred =
                        c.userId && current.preferredInstructorId === c.userId;
                      const coachCount = schedules.filter(
                        (s) =>
                          scheduleMatchesPackage(s, current) &&
                          (!c.userId || s.instructor.id === c.userId),
                      ).length;
                      return (
                        <TouchableOpacity
                          key={c.userId || "all"}
                          accessibilityRole="button"
                          accessibilityLabel={`Chọn HLV ${c.fullName}`}
                          accessibilityState={{ selected: active }}
                          onPress={() => {
                            setInstructorId(c.userId);
                            setError("");
                          }}
                          className={`flex-row items-center rounded-2xl border p-3 ${
                            active
                              ? "bg-[#1A3A5C] border-[#1A3A5C]"
                              : "bg-white border-gray-200"
                          }`}
                          style={{ width: 215, minHeight: 68 }}
                        >
                          <View
                            className={`w-11 h-11 rounded-full items-center justify-center ${
                              active ? "bg-white/20" : "bg-blue-50"
                            }`}
                          >
                            <Text
                              className={
                                active
                                  ? "text-white font-bold text-sm"
                                  : "text-[#1A3A5C] font-bold text-sm"
                              }
                            >
                              {c.userId ? initials(c.fullName) : "ALL"}
                            </Text>
                          </View>
                          <View className="ml-2.5 flex-1">
                            <View className="flex-row items-center gap-1">
                              <Text
                                className={`text-sm font-bold flex-1 ${
                                  active ? "text-white" : "text-[#1A3A5C]"
                                }`}
                                numberOfLines={1}
                              >
                                {c.fullName}
                              </Text>
                              {isPreferred && (
                                <Text className="text-amber-400 text-xs">★</Text>
                              )}
                            </View>
                            <Text
                              className={`text-[11px] mt-0.5 ${
                                active ? "text-blue-100" : "text-gray-500"
                              }`}
                              numberOfLines={1}
                            >
                              {Array.isArray(c.specializations)
                                ? c.specializations.join(", ")
                                : c.specializations || "HLV Pilates"}
                            </Text>
                            <Text
                              className={`text-[11px] font-semibold mt-0.5 ${
                                active ? "text-emerald-300" : "text-emerald-600"
                              }`}
                            >
                              {coachCount} ca phù hợp trong tuần
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                {selectedInstructorObj && (
                  <View className="mt-3 pt-3 border-t border-gray-100 flex-row items-center justify-between flex-wrap gap-2">
                    <View className="flex-row items-center gap-2">
                      <Ionicons
                        name="person-circle-outline"
                        size={18}
                        color="#1A3A5C"
                      />
                      <Text className="text-xs text-gray-700">
                        Đang xem lịch dạy của giảng viên:{" "}
                        <Text className="font-bold text-[#1A3A5C]">
                          {selectedInstructorObj.fullName}
                        </Text>
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-500">
                      Có {matching.length} ca dạy phù hợp gói tập trong tuần này
                    </Text>
                  </View>
                )}
              </View>

              {/* BƯỚC 3: THỜI KHÓA BIỂU LỊCH DẠY CỦA GIẢNG VIÊN + LỊCH THÁNG */}
              <View
                style={{
                  flexDirection: isWide ? "row" : "column",
                  gap: 16,
                  alignItems: "flex-start",
                }}
              >
                {/* CỘT TRÁI: BẢNG THỜI KHÓA BIỂU TUẦN / DANH SÁCH CA DẠY */}
                <View style={{ flex: 1, width: "100%" }}>
                  <View className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                    {/* Thanh điều hướng tuần & chế độ hiển thị */}
                    <View className="flex-row flex-wrap items-center justify-between gap-2 pb-3 border-b border-gray-100">
                      <View className="flex-row items-center gap-2">
                        <Ionicons
                          name="calendar-outline"
                          size={20}
                          color="#1A3A5C"
                        />
                        <View>
                          <Text className="font-bold text-[#1A3A5C] text-base">
                            {selectedInstructorObj
                              ? `Lịch dạy của ${selectedInstructorObj.fullName}`
                              : "Lịch dạy tất cả Giáo viên"}
                          </Text>
                          <Text className="text-xs text-gray-500">
                            Tuần: {dateLabel(days[0])} – {dateLabel(days[6])} ·
                            Bấm vào ca học để kiểm tra điều kiện & đăng ký
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row items-center gap-2 flex-wrap">
                        <View className="flex-row bg-gray-100 rounded-xl p-0.5">
                          <TouchableOpacity
                            accessibilityRole="button"
                            onPress={() => setViewMode("timetable")}
                            className={`px-3 py-1.5 rounded-lg ${
                              viewMode === "timetable" ? "bg-white shadow-sm" : ""
                            }`}
                          >
                            <Text
                              className={`text-xs font-bold ${
                                viewMode === "timetable"
                                  ? "text-[#1A3A5C]"
                                  : "text-gray-500"
                              }`}
                            >
                              Bảng tuần
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            accessibilityRole="button"
                            onPress={() => setViewMode("day")}
                            className={`px-3 py-1.5 rounded-lg ${
                              viewMode === "day" ? "bg-white shadow-sm" : ""
                            }`}
                          >
                            <Text
                              className={`text-xs font-bold ${
                                viewMode === "day"
                                  ? "text-[#1A3A5C]"
                                  : "text-gray-500"
                              }`}
                            >
                              Theo ngày
                            </Text>
                          </TouchableOpacity>
                        </View>

                        <View className="flex-row items-center border border-gray-200 rounded-xl bg-gray-50">
                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Tuần trước"
                            onPress={() => changeWeek(-7)}
                            className="p-2"
                          >
                            <Ionicons
                              name="chevron-back"
                              size={16}
                              color="#1A3A5C"
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            accessibilityRole="button"
                            onPress={() => {
                              const today = studioDate();
                              setWeekStart(startOfWeekMonday(today));
                              setDay(today);
                            }}
                            className="px-2.5 py-1.5"
                          >
                            <Text className="text-xs font-semibold text-[#1A3A5C]">
                              Tuần này
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityLabel="Tuần sau"
                            onPress={() => changeWeek(7)}
                            className="p-2"
                          >
                            <Ionicons
                              name="chevron-forward"
                              size={16}
                              color="#1A3A5C"
                            />
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                          accessibilityRole="button"
                          disabled={
                            !!packageUnavailable(current) ||
                            book.isPending ||
                            selected.length >= limit
                          }
                          onPress={() => setWeeklyOpen(true)}
                          className="border border-[#1A3A5C] bg-blue-50/60 rounded-xl px-3 py-2"
                        >
                          <Text className="text-xs font-bold text-[#1A3A5C]">
                            Đặt theo tuần
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Chú thích màu sắc */}
                    <View className="flex-row flex-wrap items-center gap-4 py-2.5 px-1 border-b border-gray-100">
                      <View className="flex-row items-center gap-1.5">
                        <View className="w-3 h-3 rounded bg-amber-500" />
                        <Text className="text-xs text-gray-600">
                          Đủ điều kiện đăng ký
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-1.5">
                        <View className="w-3 h-3 rounded bg-[#1A3A5C]" />
                        <Text className="text-xs text-gray-600">
                          Đang chọn để đặt
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-1.5">
                        <View className="w-3 h-3 rounded bg-emerald-600" />
                        <Text className="text-xs text-gray-600">
                          Bạn đã đăng ký
                        </Text>
                      </View>
                      <View className="flex-row items-center gap-1.5">
                        <View className="w-3 h-3 rounded bg-gray-300" />
                        <Text className="text-xs text-gray-600">
                          Đã đầy / Đã qua giờ
                        </Text>
                      </View>
                    </View>

                    {schedulesQuery.isLoading ? (
                      <View className="py-12 items-center">
                        <ActivityIndicator color="#1A3A5C" />
                        <Text className="text-xs text-gray-500 mt-2">
                          Đang tải lịch dạy của giảng viên...
                        </Text>
                      </View>
                    ) : schedulesQuery.isError ? (
                      <TouchableOpacity
                        accessibilityRole="button"
                        onPress={() => schedulesQuery.refetch()}
                        className="py-8 items-center"
                      >
                        <Text className="text-red-600 font-semibold">
                          Không tải được lịch dạy. Nhấn để thử lại.
                        </Text>
                      </TouchableOpacity>
                    ) : viewMode === "timetable" ? (
                      /* CHẾ ĐỘ BẢNG THỜI KHÓA BIỂU TUẦN (6:00 -> 21:00) */
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator
                        className="mt-2"
                      >
                        <View style={{ minWidth: 820 }}>
                          {/* Hàng tiêu đề Thứ 2 -> Chủ Nhật */}
                          <View className="flex-row border-b border-gray-200 bg-gray-50 rounded-t-xl">
                            <View
                              style={{ width: 68 }}
                              className="py-3 px-2 items-center justify-center border-r border-gray-200"
                            >
                              <Ionicons
                                name="time-outline"
                                size={16}
                                color="#64748B"
                              />
                              <Text className="text-[11px] font-semibold text-gray-500 mt-0.5">
                                Giờ VN
                              </Text>
                            </View>
                            {days.map((d) => {
                              const isChosenDay = d === day;
                              const isToday = d === studioDate();
                              return (
                                <TouchableOpacity
                                  key={d}
                                  onPress={() => setDay(d)}
                                  style={{ width: 112, flex: 1 }}
                                  className={`py-2.5 px-1 items-center justify-center border-r border-gray-100 ${
                                    isChosenDay ? "bg-blue-50/70" : ""
                                  }`}
                                >
                                  <Text
                                    className={`text-base font-bold ${
                                      isToday
                                        ? "text-[#C0392B]"
                                        : isChosenDay
                                          ? "text-[#1A3A5C]"
                                          : "text-gray-800"
                                    }`}
                                  >
                                    {d.slice(8, 10)}/{d.slice(5, 7)}
                                  </Text>
                                  <Text
                                    className={`text-xs mt-0.5 ${
                                      isChosenDay
                                        ? "text-[#1A3A5C] font-bold"
                                        : "text-gray-500"
                                    }`}
                                  >
                                    {weekdayName(d)}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>

                          {/* Các hàng khung giờ từ 6:00 đến 21:00 */}
                          {HOURS.map((hour) => {
                            const rowHasAny = matching.some(
                              (s) => vnHour(s.startTime) === hour,
                            );
                            return (
                              <View
                                key={hour}
                                className="flex-row border-b border-gray-100"
                                style={{ minHeight: rowHasAny ? 96 : 44 }}
                              >
                                <View
                                  style={{ width: 68 }}
                                  className="py-2 px-2 items-center justify-start border-r border-gray-200 bg-gray-50/40"
                                >
                                  <Text className="text-xs font-bold text-gray-700">
                                    {hour}:00
                                  </Text>
                                </View>

                                {days.map((d) => {
                                  const cellSchedules = matching.filter(
                                    (s) =>
                                      studioDate(s.startTime) === d &&
                                      vnHour(s.startTime) === hour,
                                  );
                                  return (
                                    <View
                                      key={`${d}-${hour}`}
                                      style={{ width: 112, flex: 1 }}
                                      className={`p-1 border-r border-gray-100 ${
                                        d === day ? "bg-blue-50/20" : ""
                                      }`}
                                    >
                                      {cellSchedules.map((s) => {
                                        const checked = selected.some(
                                          (v) => v.id === s.id,
                                        );
                                        const reason = unavailable(s);
                                        const waitlistReason = unavailable(
                                          s,
                                          true,
                                        );
                                        const canJoinWaitlist =
                                          !s.isBooked &&
                                          !s.isWaitlisted &&
                                          s.enrolled >= s.capacity &&
                                          !waitlistReason;
                                        const headerBg = s.isBooked
                                          ? "bg-emerald-600"
                                          : s.isWaitlisted
                                            ? "bg-purple-600"
                                            : checked
                                              ? "bg-[#1A3A5C]"
                                              : canJoinWaitlist
                                                ? "bg-amber-600"
                                                : reason
                                                  ? "bg-gray-400"
                                                  : "bg-[#C8963E]";
                                        const cardBorder = s.isBooked
                                          ? "border-emerald-500 bg-emerald-50/40"
                                          : s.isWaitlisted
                                            ? "border-purple-400 bg-purple-50/40"
                                            : checked
                                              ? "border-[#1A3A5C] bg-blue-50"
                                              : canJoinWaitlist
                                                ? "border-amber-400 bg-amber-50/30"
                                                : reason
                                                  ? "border-gray-200 bg-gray-50"
                                                  : "border-amber-300 bg-white";

                                        return (
                                          <TouchableOpacity
                                            key={s.id}
                                            accessibilityRole="button"
                                            accessibilityLabel={`Ca ${s.className} ${formatTime(s.startTime)} ${dateLabel(d)} với ${s.instructor.fullName}`}
                                            onPress={() => {
                                              setDay(d);
                                              setActiveSlot(s);
                                            }}
                                            className={`rounded-xl border overflow-hidden mb-1 shadow-sm ${cardBorder}`}
                                          >
                                            <View
                                              className={`px-2 py-1.5 ${headerBg}`}
                                            >
                                              <Text
                                                className="text-white font-bold text-xs"
                                                numberOfLines={2}
                                              >
                                                {s.className}
                                              </Text>
                                              <Text className="text-white/90 text-[10px] mt-0.5">
                                                {formatTime(s.startTime)} -{" "}
                                                {formatTime(s.endTime)}
                                              </Text>
                                            </View>
                                            <View className="p-2">
                                              <Text
                                                className="text-[11px] font-semibold text-gray-700"
                                                numberOfLines={1}
                                              >
                                                {s.room}
                                              </Text>
                                              <Text
                                                className="text-[10px] text-gray-500 mt-0.5"
                                                numberOfLines={1}
                                              >
                                                GV: {s.instructor.fullName}
                                              </Text>
                                              <View className="flex-row items-center justify-between mt-1.5 pt-1 border-t border-gray-100">
                                                <Text
                                                  className={`text-[10px] font-bold ${
                                                    s.isBooked
                                                      ? "text-emerald-700"
                                                      : s.isWaitlisted
                                                        ? "text-purple-700"
                                                        : checked
                                                          ? "text-[#1A3A5C]"
                                                          : canJoinWaitlist
                                                            ? "text-amber-700"
                                                            : reason
                                                              ? "text-gray-400"
                                                              : "text-amber-800"
                                                  }`}
                                                >
                                                  {s.isBooked
                                                    ? "✓ Đã đăng ký"
                                                    : s.isWaitlisted
                                                      ? `⏳ Chờ #${s.waitlistPosition ?? 1}`
                                                      : checked
                                                        ? "✓ Đang chọn"
                                                        : s.enrolled >=
                                                            s.capacity
                                                          ? canJoinWaitlist
                                                            ? "Đầy · Vào chờ"
                                                            : "Đầy chỗ"
                                                          : `Còn ${s.capacity - s.enrolled}/${s.capacity} chỗ`}
                                                </Text>
                                                {!s.isBooked &&
                                                  !s.isWaitlisted &&
                                                  (!reason ||
                                                    canJoinWaitlist) && (
                                                    <View className="bg-blue-50 px-1.5 py-0.5 rounded">
                                                      <Text className="text-[9px] font-bold text-[#1A3A5C]">
                                                        {checked
                                                          ? "Bỏ"
                                                          : canJoinWaitlist
                                                            ? "+ Chờ"
                                                            : "+ Đăng ký"}
                                                      </Text>
                                                    </View>
                                                  )}
                                              </View>
                                            </View>
                                          </TouchableOpacity>
                                        );
                                      })}
                                    </View>
                                  );
                                })}
                              </View>
                            );
                          })}
                        </View>
                      </ScrollView>
                    ) : (
                      /* CHẾ ĐỘ XEM THEO NGÀY */
                      <View className="mt-3">
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          contentContainerStyle={{ gap: 8, paddingBottom: 12 }}
                        >
                          {days.map((d) => {
                            const count = matching.filter(
                              (s) =>
                                studioDate(s.startTime) === d &&
                                !unavailable(s),
                            ).length;
                            const chosen = day === d;
                            return (
                              <TouchableOpacity
                                key={d}
                                accessibilityRole="button"
                                accessibilityLabel={`Chọn ngày ${dateLabel(d)}`}
                                accessibilityState={{ selected: chosen }}
                                onPress={() => setDay(d)}
                                className={`rounded-xl border items-center py-2 px-3 ${
                                  chosen
                                    ? "bg-[#1A3A5C] border-[#1A3A5C]"
                                    : "border-gray-200 bg-white"
                                }`}
                                style={{ minWidth: 96 }}
                              >
                                <Text
                                  className={`text-xs ${
                                    chosen ? "text-blue-100" : "text-gray-500"
                                  }`}
                                >
                                  {weekdayName(d)}
                                </Text>
                                <Text
                                  className={`text-lg font-bold my-0.5 ${
                                    chosen ? "text-white" : "text-[#1A3A5C]"
                                  }`}
                                >
                                  {d.slice(8, 10)}/{d.slice(5, 7)}
                                </Text>
                                <Text
                                  className={`text-[11px] ${
                                    chosen
                                      ? "text-emerald-200"
                                      : count
                                        ? "text-emerald-600"
                                        : "text-gray-400"
                                  }`}
                                >
                                  {count ? `${count} ca còn chỗ` : "Xem lịch"}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>

                        {!daySchedules.length ? (
                          <View className="bg-gray-50 rounded-2xl p-6 border border-gray-200 items-center">
                            <Ionicons
                              name="calendar-outline"
                              size={28}
                              color="#94A3B8"
                            />
                            <Text className="text-gray-600 text-center mt-2">
                              Giảng viên chưa có ca phù hợp vào ngày{" "}
                              {dateLabel(day)}.
                            </Text>
                            <Text className="text-xs text-gray-400 text-center mt-1">
                              Chọn ngày khác trên lịch hoặc chuyển sang chế độ
                              Bảng tuần.
                            </Text>
                          </View>
                        ) : (
                          daySchedules.map((s) => {
                            const checked = selected.some((v) => v.id === s.id);
                            const reason = unavailable(s);
                            const waitlistReason = unavailable(s, true);
                            const canJoinWaitlist =
                              !s.isBooked &&
                              !s.isWaitlisted &&
                              s.enrolled >= s.capacity &&
                              !waitlistReason;
                            const past =
                              Date.parse(s.startTime) <= Date.now() ||
                              (s.scheduleStatus &&
                                s.scheduleStatus !== "scheduled");
                            return (
                              <TouchableOpacity
                                key={s.id}
                                activeOpacity={0.85}
                                onPress={() => setActiveSlot(s)}
                                className={`bg-white rounded-2xl p-4 border mb-3 ${
                                  checked
                                    ? "border-[#1A3A5C] bg-blue-50"
                                    : "border-gray-200"
                                }`}
                              >
                                <View className="flex-row items-center">
                                  <View className="pr-4 mr-4 border-r border-gray-100">
                                    <Text className="text-xl font-bold text-[#1A3A5C]">
                                      {formatTime(s.startTime)}
                                    </Text>
                                    <Text className="text-xs text-gray-400 mt-1">
                                      đến {formatTime(s.endTime)}
                                    </Text>
                                  </View>
                                  <View className="flex-1">
                                    <Text className="font-bold text-gray-800 text-base">
                                      {s.className}
                                    </Text>
                                    <Text className="text-xs text-gray-500 mt-1">
                                      GV: {s.instructor.fullName} · {s.room}
                                    </Text>
                                    <Text className="text-xs text-gray-500 mt-1">
                                      {s.isBooked
                                        ? "Bạn đã đăng ký ca này"
                                        : s.isWaitlisted
                                          ? `⏳ Bạn đang trong Danh sách chờ (Vị trí #${s.waitlistPosition ?? 1})`
                                          : s.enrolled >= s.capacity
                                            ? `Đã đủ chỗ (${s.enrolled}/${s.capacity})${s.waitlistCount ? ` · ${s.waitlistCount} người đang chờ` : ""}`
                                            : `Còn ${s.capacity - s.enrolled}/${s.capacity} chỗ`}
                                    </Text>
                                  </View>
                                </View>
                                {s.isBooked || s.isWaitlisted ? (
                                  <TouchableOpacity
                                    accessibilityRole="button"
                                    disabled={
                                      !!past ||
                                      cancel.isPending ||
                                      book.isPending
                                    }
                                    onPress={() => cancelBooking(s)}
                                    className="border border-gray-200 rounded-xl py-2.5 mt-3 items-center"
                                  >
                                    <Text className="text-gray-600 font-semibold">
                                      {cancelId === s.id
                                        ? "Đang hủy…"
                                        : past
                                          ? "Buổi đã đặt"
                                          : s.isWaitlisted
                                            ? "Rời khỏi danh sách chờ"
                                            : "Hủy đặt chỗ"}
                                    </Text>
                                  </TouchableOpacity>
                                ) : (
                                  <View className="flex-row gap-2 mt-3">
                                    <TouchableOpacity
                                      accessibilityRole="button"
                                      disabled={
                                        (!!reason && !canJoinWaitlist) ||
                                        book.isPending
                                      }
                                      onPress={() => bookSingleScheduleNow(s)}
                                      className={`flex-1 rounded-xl py-2.5 items-center ${
                                        canJoinWaitlist
                                          ? "bg-amber-600"
                                          : reason
                                            ? "bg-gray-100"
                                            : "bg-[#1A3A5C]"
                                      }`}
                                    >
                                      <Text
                                        className={`font-bold text-xs ${
                                          reason && !canJoinWaitlist
                                            ? "text-gray-400"
                                            : "text-white"
                                        }`}
                                      >
                                        {canJoinWaitlist
                                          ? "Đăng ký vào Danh sách chờ (Waitlist)"
                                          : reason || "Đăng ký ngay ca này"}
                                      </Text>
                                    </TouchableOpacity>
                                    {!reason && (
                                      <TouchableOpacity
                                        accessibilityRole="checkbox"
                                        accessibilityLabel={`${checked ? "Bỏ chọn" : "Chọn"} ca ${formatTime(s.startTime)} ${dateLabel(day)} với ${s.instructor.fullName}`}
                                        accessibilityState={{
                                          checked,
                                          disabled: book.isPending,
                                        }}
                                        disabled={book.isPending}
                                        onPress={() => toggle(s)}
                                        className={`px-4 rounded-xl py-2.5 items-center justify-center border ${
                                          checked
                                            ? "bg-amber-50 border-amber-400"
                                            : "bg-blue-50 border-blue-200"
                                        }`}
                                      >
                                        <Text className="text-xs font-bold text-[#1A3A5C]">
                                          {checked ? "Bỏ chọn" : "+ Chọn nhiều"}
                                        </Text>
                                      </TouchableOpacity>
                                    )}
                                  </View>
                                )}
                              </TouchableOpacity>
                            );
                          })
                        )}
                      </View>
                    )}
                  </View>
                </View>

                {/* CỘT PHẢI: LỊCH THÁNG MINI & TÓM TẮT CA TRONG NGÀY ĐANG CHỌN */}
                <View style={{ width: isWide ? 290 : "100%", gap: 12 }}>
                  <MiniMonthCalendar
                    activeDate={day}
                    weekDays={days}
                    scheduleDates={scheduleDates}
                    onSelectDate={selectDateFromCalendar}
                  />

                  <View className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                    <Text className="font-bold text-[#1A3A5C] text-sm">
                      Ca dạy ngày {dateLabel(day)}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5 mb-2">
                      {selectedInstructorObj
                        ? `GV: ${selectedInstructorObj.fullName}`
                        : "Tất cả giáo viên"}
                    </Text>
                    {!daySchedules.length ? (
                      <Text className="text-xs text-gray-400 py-3">
                        Không có ca dạy phù hợp trong ngày này.
                      </Text>
                    ) : (
                      daySchedules.map((s) => {
                        const checked = selected.some((v) => v.id === s.id);
                        const reason = unavailable(s);
                        const canWaitlist =
                          !s.isBooked &&
                          !s.isWaitlisted &&
                          s.enrolled >= s.capacity &&
                          !unavailable(s, true);
                        return (
                          <TouchableOpacity
                            key={s.id}
                            onPress={() => setActiveSlot(s)}
                            className={`p-2.5 rounded-xl border mb-2 ${
                              s.isBooked
                                ? "border-emerald-300 bg-emerald-50/50"
                                : s.isWaitlisted
                                  ? "border-purple-300 bg-purple-50/50"
                                  : checked
                                    ? "border-[#1A3A5C] bg-blue-50"
                                    : "border-gray-200 bg-gray-50/60"
                            }`}
                          >
                            <View className="flex-row justify-between items-center">
                              <Text className="text-xs font-bold text-[#1A3A5C]">
                                {formatTime(s.startTime)} -{" "}
                                {formatTime(s.endTime)}
                              </Text>
                              <Text
                                className={`text-[10px] font-bold ${
                                  s.isBooked
                                    ? "text-emerald-700"
                                    : s.isWaitlisted
                                      ? "text-purple-700"
                                      : canWaitlist
                                        ? "text-amber-700"
                                        : reason
                                          ? "text-amber-700"
                                          : "text-blue-700"
                                }`}
                              >
                                {s.isBooked
                                  ? "Đã đặt"
                                  : s.isWaitlisted
                                    ? `Chờ #${s.waitlistPosition ?? 1}`
                                    : canWaitlist
                                      ? "Vào Waitlist"
                                      : reason
                                        ? "Không đủ ĐK"
                                        : `Còn ${s.capacity - s.enrolled} chỗ`}
                              </Text>
                            </View>
                            <Text
                              className="text-xs font-semibold text-gray-800 mt-0.5"
                              numberOfLines={1}
                            >
                              {s.className}
                            </Text>
                            <Text className="text-[11px] text-gray-500">
                              {s.room} · {s.instructor.fullName}
                            </Text>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* THANH XÁC NHẬN ĐẶT NHIỀU BUỔI Ở DƯỚI */}
      {current && (
        <View className="bg-white border-t border-gray-200 px-4 py-3">
          <View
            style={{ width: "100%", maxWidth: 1220, alignSelf: "center" }}
            className="flex-row items-center justify-between gap-3 flex-wrap"
          >
            <View>
              <Text className="font-bold text-[#1A3A5C] text-sm">
                Đã chọn {selected.length} buổi
              </Text>
              <Text className="text-xs text-gray-500">
                {limited
                  ? `Sau khi đặt còn ${after} buổi có thể đặt`
                  : "Sử dụng trong hạn gói"}
              </Text>
              {!!selectionError && selected.length > 0 && (
                <Text className="text-xs text-red-600 mt-0.5">
                  {selectionError}
                </Text>
              )}
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={!selected.length || !!selectionError || book.isPending}
              onPress={() => setReview(true)}
              className={`rounded-xl px-5 py-3 items-center ${
                selected.length && !selectionError
                  ? "bg-[#1A3A5C]"
                  : "bg-gray-200"
              }`}
            >
              <Text
                className={`font-bold text-sm ${
                  selected.length && !selectionError
                    ? "text-white"
                    : "text-gray-500"
                }`}
              >
                {selected.length
                  ? `Xem lại & Đăng ký ${selected.length} buổi`
                  : "Bấm vào ca dạy trên lịch để đăng ký"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* MODAL CHI TIẾT CA DẠY KHI BẤM VÀO LỊCH TRÊN THỜI KHÓA BIỂU */}
      <Modal
        visible={!!activeSlot}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!book.isPending) setActiveSlot(null);
        }}
      >
        <View className="flex-1 bg-black/50 justify-center items-center px-4">
          {activeSlot &&
            (() => {
              const liveSlot =
                schedules.find((item) => item.id === activeSlot.id) ??
                activeSlot;
              const slotReason = unavailable(liveSlot);
              const waitlistReason = unavailable(liveSlot, true);
              const canJoinWaitlist =
                !liveSlot.isBooked &&
                !liveSlot.isWaitlisted &&
                liveSlot.enrolled >= liveSlot.capacity &&
                !waitlistReason;
              const isChecked = selected.some((v) => v.id === liveSlot.id);
              const isPast =
                Date.parse(liveSlot.startTime) <= Date.now() ||
                (liveSlot.scheduleStatus &&
                  liveSlot.scheduleStatus !== "scheduled");
              const cancelHours = current?.cancelHoursLimit ?? 2;
              const hoursLeft =
                (Date.parse(liveSlot.startTime) - Date.now()) / 3600000;
              const isLateCancelNow = !isPast && hoursLeft < cancelHours;

              return (
                <View className="bg-white rounded-3xl p-5 w-full max-w-md shadow-xl">
                  <View className="flex-row items-start justify-between pb-3 border-b border-gray-100">
                    <View className="flex-1 pr-2">
                      <Text className="text-xs font-bold uppercase text-[#C8963E]">
                        Chi tiết ca dạy của giảng viên
                      </Text>
                      <Text className="text-lg font-bold text-[#1A3A5C] mt-0.5">
                        {liveSlot.className}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setActiveSlot(null)}
                      className="p-1"
                    >
                      <Ionicons name="close" size={22} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  <View className="py-3 space-y-2">
                    <View className="flex-row justify-between py-1">
                      <Text className="text-xs text-gray-500">Giáo viên:</Text>
                      <Text className="text-xs font-bold text-[#1A3A5C]">
                        {liveSlot.instructor.fullName}
                      </Text>
                    </View>
                    <View className="flex-row justify-between py-1">
                      <Text className="text-xs text-gray-500">Thời gian:</Text>
                      <Text className="text-xs font-bold text-gray-800">
                        {dateLabel(studioDate(liveSlot.startTime))} ·{" "}
                        {formatTime(liveSlot.startTime)} -{" "}
                        {formatTime(liveSlot.endTime)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between py-1">
                      <Text className="text-xs text-gray-500">Phòng tập:</Text>
                      <Text className="text-xs font-semibold text-gray-800">
                        {liveSlot.room}
                      </Text>
                    </View>
                    <View className="flex-row justify-between py-1">
                      <Text className="text-xs text-gray-500">Sĩ số chỗ:</Text>
                      <Text className="text-xs font-bold text-emerald-700">
                        Đã đăng ký {liveSlot.enrolled}/{liveSlot.capacity} học
                        viên (Còn{" "}
                        {Math.max(0, liveSlot.capacity - liveSlot.enrolled)}{" "}
                        chỗ)
                        {liveSlot.waitlistCount
                          ? ` · ${liveSlot.waitlistCount} đang chờ`
                          : ""}
                      </Text>
                    </View>
                    <View className="flex-row justify-between py-1">
                      <Text className="text-xs text-gray-500">
                        Gói áp dụng:
                      </Text>
                      <Text className="text-xs font-semibold text-[#1A3A5C]">
                        {current?.packageName ?? current?.package?.name} (Còn{" "}
                        {current?.remainingSessions ?? 0} buổi)
                      </Text>
                    </View>
                  </View>

                  {/* KIỂM TRA ĐIỀU KIỆN ĐĂNG KÝ */}
                  {liveSlot.isBooked ? (
                    <View
                      className={`rounded-xl p-3 mb-4 border ${
                        isLateCancelNow
                          ? "bg-amber-50 border-amber-300"
                          : "bg-emerald-50 border-emerald-200"
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isLateCancelNow
                            ? "text-amber-900"
                            : "text-emerald-800"
                        }`}
                      >
                        ✓ Bạn đã đăng ký chính thức ca học này
                      </Text>
                      <Text
                        className={`text-[11px] mt-1 ${
                          isLateCancelNow
                            ? "text-amber-800"
                            : "text-emerald-700"
                        }`}
                      >
                        {isPast
                          ? "Ca học đã hoặc đang diễn ra."
                          : isLateCancelNow
                            ? `⚠️ Còn khoảng ${Math.max(0, Math.round(hoursLeft * 10) / 10)} giờ trước giờ học (ít hơn quy định ${cancelHours} giờ). Nếu hủy lúc này hệ thống sẽ tự động trừ 1 buổi trong gói (No-show policy).`
                            : `Hủy trước ít nhất ${cancelHours} giờ để được hoàn 1 buổi tập (hiện còn ${Math.round(hoursLeft * 10) / 10} giờ).`}
                      </Text>
                    </View>
                  ) : liveSlot.isWaitlisted ? (
                    <View className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-4">
                      <Text className="text-xs font-bold text-purple-900">
                        ⏳ Bạn đang trong Danh sách chờ (Vị trí #
                        {liveSlot.waitlistPosition ?? 1})
                      </Text>
                      <Text className="text-[11px] text-purple-700 mt-1">
                        Chưa trừ buổi trong gói. Khi có học viên hủy lớp, hệ
                        thống sẽ tự động chuyển người đầu danh sách chờ sang lớp
                        chính thức!
                      </Text>
                    </View>
                  ) : canJoinWaitlist ? (
                    <View className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                      <Text className="text-xs font-bold text-amber-900">
                        ⏳ Lớp đã đủ chỗ ({liveSlot.enrolled}/
                        {liveSlot.capacity}) — Mở đăng ký Waitlist
                      </Text>
                      <Text className="text-[11px] text-amber-800 mt-1">
                        Bạn đủ điều kiện tham gia Danh sách chờ (chưa trừ buổi).
                        Khi có người hủy lớp, hệ thống sẽ tự động đôn học viên
                        đầu danh sách chờ vào lớp chính thức!
                      </Text>
                    </View>
                  ) : slotReason ? (
                    <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
                      <Text className="text-xs font-bold text-red-700">
                        Chưa đủ điều kiện đăng ký ca này:
                      </Text>
                      <Text className="text-xs text-red-600 mt-0.5">
                        {slotReason}
                      </Text>
                    </View>
                  ) : (
                    <View className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4">
                      <Text className="text-xs font-bold text-emerald-800">
                        ✓ Đủ điều kiện đăng ký
                      </Text>
                      <Text className="text-[11px] text-emerald-700 mt-0.5">
                        Gói tập hợp lệ, đúng loại lớp và ca học còn chỗ trống.
                      </Text>
                    </View>
                  )}

                  {liveSlot.isBooked || liveSlot.isWaitlisted ? (
                    <TouchableOpacity
                      accessibilityRole="button"
                      disabled={!!isPast || cancel.isPending || book.isPending}
                      onPress={() => cancelBooking(liveSlot)}
                      className="border border-red-300 bg-red-50 rounded-xl py-3 items-center mb-2"
                    >
                      <Text className="text-red-600 font-bold text-sm">
                        {cancelId === liveSlot.id
                          ? "Đang hủy..."
                          : isPast
                            ? "Buổi học đã diễn ra"
                            : liveSlot.isWaitlisted
                              ? "Rời khỏi Danh sách chờ (Waitlist)"
                              : isLateCancelNow
                                ? `Hủy trễ (Chấp nhận trừ 1 buổi)`
                                : "Hủy đăng ký ca này (Hoàn 1 buổi)"}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View className="space-y-2">
                      <TouchableOpacity
                        accessibilityRole="button"
                        disabled={
                          (!!slotReason && !canJoinWaitlist) || book.isPending
                        }
                        onPress={() => bookSingleScheduleNow(liveSlot)}
                        className={`rounded-xl py-3.5 items-center ${
                          canJoinWaitlist
                            ? "bg-amber-600"
                            : slotReason
                              ? "bg-gray-200"
                              : "bg-[#1A3A5C]"
                        }`}
                      >
                        {book.isPending ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <Text
                            className={`font-bold text-sm ${
                              slotReason && !canJoinWaitlist
                                ? "text-gray-500"
                                : "text-white"
                            }`}
                          >
                            {canJoinWaitlist
                              ? "Đăng ký vào Danh sách chờ (Waitlist)"
                              : "Đăng ký ngay lịch này (Trừ 1 buổi)"}
                          </Text>
                        )}
                      </TouchableOpacity>

                      {!slotReason && (
                        <TouchableOpacity
                          accessibilityRole="button"
                          disabled={book.isPending}
                          onPress={() => {
                            toggle(liveSlot);
                            setActiveSlot(null);
                          }}
                          className="border border-[#1A3A5C] rounded-xl py-2.5 items-center mt-2"
                        >
                          <Text className="text-[#1A3A5C] font-semibold text-xs">
                            {isChecked
                              ? "Bỏ khỏi danh sách chọn nhiều buổi"
                              : "+ Thêm vào danh sách chọn nhiều buổi"}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={() => setActiveSlot(null)}
                    className="items-center pt-3"
                  >
                    <Text className="text-xs text-gray-500">Đóng</Text>
                  </TouchableOpacity>
                </View>
              );
            })()}
        </View>
      </Modal>

      {current && (
        <WeeklyBookingPlanner
          visible={weeklyOpen}
          memberPackage={current}
          existing={selected}
          initialInstructorId={instructorId}
          onClose={() => setWeeklyOpen(false)}
          onApply={(items) => {
            setSelected((previous) => [...previous, ...items]);
            setWeeklyOpen(false);
            setError("");
            setMessage(
              `Đã chọn ${items.length} buổi theo tuần. Xem lại để xác nhận.`,
            );
          }}
        />
      )}
      <Modal
        visible={packagePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setPackagePicker(false)}
      >
        <View className="flex-1 bg-black/40 justify-center items-center px-4">
          <View
            className="bg-white rounded-2xl p-5 w-full max-w-lg"
            style={{ maxHeight: "80%" }}
          >
            <Text className="font-bold text-lg text-[#1A3A5C] mb-4">
              Chọn gói sử dụng
            </Text>
            <ScrollView>
              {packages.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: p.id === packageId }}
                  onPress={() => {
                    setPackageId(p.id);
                    router.setParams({ memberPackageId: p.id });
                    setSelected([]);
                    setError("");
                    setMessage("");
                    setPackagePicker(false);
                  }}
                  className={`border rounded-xl p-4 mb-2 ${p.id === packageId ? "border-[#1A3A5C] bg-blue-50" : "border-gray-200"}`}
                >
                  <Text className="font-semibold text-[#1A3A5C]">
                    {p.packageName ?? p.package?.name}
                  </Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    {packageConfiguration(p)} ·{" "}
                    {isSessionPackage(p)
                      ? `${p.remainingSessions} buổi có thể đặt`
                      : "Theo hạn gói"}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => setPackagePicker(false)}
              className="items-center py-3"
            >
              <Text className="text-gray-500">Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        visible={review}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!book.isPending) setReview(false);
        }}
      >
        <View className="flex-1 bg-black/40 justify-center items-center px-4">
          <View
            className="bg-white rounded-2xl p-5 w-full max-w-lg"
            style={{ maxHeight: "85%" }}
          >
            <Text className="font-bold text-xl text-[#1A3A5C]">
              Xác nhận lịch tập
            </Text>
            <Text className="text-sm text-gray-500 mt-2">
              {current?.packageName ?? current?.package?.name}
            </Text>
            <ScrollView style={{ maxHeight: 280 }} className="my-3">
              {[...selected]
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((s) => (
                  <View
                    key={s.id}
                    className="flex-row py-3 border-b border-gray-100 items-center"
                  >
                    <View className="flex-1">
                      <Text className="font-semibold text-gray-800">
                        {dateLabel(studioDate(s.startTime))} ·{" "}
                        {formatTime(s.startTime)}
                      </Text>
                      <Text className="text-xs text-gray-500 mt-1">
                        {s.className} · {s.instructor.fullName} · {s.room}
                      </Text>
                    </View>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityLabel={`Bỏ ca ${dateLabel(studioDate(s.startTime))} ${formatTime(s.startTime)}`}
                      disabled={book.isPending}
                      onPress={() => toggle(s)}
                      className="p-2"
                    >
                      <Ionicons
                        name="close-circle-outline"
                        size={22}
                        color="#94A3B8"
                      />
                    </TouchableOpacity>
                  </View>
                ))}
            </ScrollView>
            <Text className="text-[#1A3A5C] font-bold mb-2">
              {limited
                ? `Đặt ${selected.length} buổi · Còn có thể đặt ${after} buổi`
                : `Đặt ${selected.length} buổi trong hạn gói`}
            </Text>
            <Text className="text-xs text-gray-500 mb-4">{`Trừ buổi khi đặt thành công, điểm danh không trừ thêm. Hủy trước ít nhất ${current?.cancelHoursLimit ?? 2} giờ được hoàn buổi. Hủy muộn hoặc vắng mặt vẫn tính buổi.`}</Text>
            {!!selectionError && (
              <Text className="text-red-600 text-xs mb-3">
                {selectionError}
              </Text>
            )}
            <TouchableOpacity
              accessibilityRole="button"
              disabled={book.isPending || !!selectionError || !selected.length}
              onPress={confirmBooking}
              className="rounded-xl bg-[#1A3A5C] items-center py-3.5"
            >
              {book.isPending ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="font-bold text-white">
                  Xác nhận đặt {selected.length} buổi
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={book.isPending}
              onPress={() => setReview(false)}
              className="items-center py-3"
            >
              <Text className="text-gray-500">Quay lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
