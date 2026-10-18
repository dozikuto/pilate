import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSchedules } from "@/hooks/useSchedules";
import { studioDate, isSessionPackage, scheduleMatchesPackage } from "@/lib/packageBooking";
import {
  planWeeklyBookings,
  shiftStudioDate,
  weeklyRuleError,
  WEEKDAYS,
} from "@/lib/weeklyBooking";
import { formatTime } from "@/lib/utils";
import type { ClassSchedule, MemberPackage } from "@/types";

function CalendarField({
  label,
  value,
  onChange,
  type = "date",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "date" | "time";
}) {
  return (
    <View className="flex-1">
      <Text className="text-sm font-semibold text-gray-700 mb-2">{label}</Text>
      {Platform.OS === "web" ? (
        <input
          aria-label={label}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            border: "1px solid #D1D5DB",
            borderRadius: 10,
            padding: 10,
            width: "100%",
            minWidth: 0,
            boxSizing: "border-box",
            fontSize: 14,
          }}
        />
      ) : (
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChange}
          placeholder={type === "date" ? "YYYY-MM-DD" : "HH:mm"}
          className="border border-gray-300 rounded-xl p-3 text-sm"
        />
      )}
    </View>
  );
}
function FilterChips({
  title,
  options,
  value,
  onChange,
}: {
  title: string;
  options: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <View className="mb-3">
      <Text className="text-sm font-semibold text-gray-700 mb-2">{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6 }}
      >
        {[{ id: "", name: "Bất kỳ" }, ...options].map((option) => (
          <TouchableOpacity
            key={option.id}
            accessibilityRole="radio"
            aria-checked={value === option.id}
            onPress={() => onChange(option.id)}
            className={`px-3 py-2 rounded-xl border ${value === option.id ? "bg-[#1A3A5C] border-[#1A3A5C]" : "border-gray-200 bg-white"}`}
          >
            <Text
              className={`text-sm ${value === option.id ? "text-white" : "text-gray-600"}`}
            >
              {option.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
export default function WeeklyBookingPlanner({
  visible,
  memberPackage,
  existing,
  onClose,
  onApply,
  initialInstructorId,
  initialTime,
}: {
  visible: boolean;
  memberPackage: MemberPackage;
  existing: ClassSchedule[];
  onClose: () => void;
  onApply: (schedules: ClassSchedule[]) => void;
  initialInstructorId?: string;
  initialTime?: string;
}) {
  const [startDate, setStartDate] = useState(studioDate());
  const [endDate, setEndDate] = useState(shiftStudioDate(studioDate(), 60));
  const [days, setDays] = useState<number[]>([2]);
  const [count, setCount] = useState("5");
  const [time, setTime] = useState("");
  const [classId, setClassId] = useState("");
  const [instructorId, setInstructorId] = useState("");
  const maxCount = Math.max(
    0,
    Math.min(
      100 - existing.length,
      isSessionPackage(memberPackage)
        ? memberPackage.remainingSessions - existing.length
        : 100,
    ),
  );
  useEffect(() => {
    if (!visible) return;
    const begin = studioDate();
    const target = Math.max(
      1,
      Math.min(maxCount, isSessionPackage(memberPackage) ? maxCount : 5),
    );
    const until = shiftStudioDate(begin, Math.min(365, target * 7 + 6));
    const expiry = (memberPackage.expiryDate ?? memberPackage.expiresAt)?.slice(
      0,
      10,
    );
    setStartDate(begin);
    setEndDate(expiry && expiry < until ? expiry : until);
    setCount(String(target));
    setClassId("");
    setInstructorId(
      initialInstructorId ?? memberPackage.preferredInstructorId ?? "",
    );
    setTime(initialTime ?? "");
  }, [visible, memberPackage.id]);
  const rule = {
    startDate,
    endDate,
    weekdays: days,
    count: Number(count),
    startTime: time,
    classId,
    instructorId,
  };
  const validation = weeklyRuleError(rule, maxCount);
  const range = useSchedules(startDate, endDate, visible && !validation);
  const schedules: ClassSchedule[] = range.data ?? [];
  const compatible = schedules.filter(s => scheduleMatchesPackage(s, memberPackage));
  const plan = planWeeklyBookings(schedules, memberPackage, rule, existing);
  const classes = [
    ...new Map(
      compatible
        .filter((s) => s.class?.id)
        .map((s) => [s.class!.id!, { id: s.class!.id!, name: s.className }]),
    ).values(),
  ];
  const instructors = [
    ...new Map(
      compatible.map((s) => [
        s.instructor.id,
        { id: s.instructor.id, name: s.instructor.fullName },
      ]),
    ).values(),
  ];
  const labelDate = (value: string) =>
    new Date(`${value}T12:00:00+07:00`).toLocaleDateString("vi-VN", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      timeZone: "Asia/Ho_Chi_Minh",
    });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 items-center justify-center p-3">
        <View
          className="bg-white rounded-3xl w-full max-w-2xl"
          style={{ maxHeight: "94%" }}
        >
          <View className="px-5 pt-5 pb-3 border-b border-gray-100">
            <Text className="text-xl font-bold text-[#1A3A5C]">
              Chọn lịch hằng tuần
            </Text>
            <Text className="text-sm text-gray-500 mt-1">
              Ví dụ: Thứ 3 mỗi tuần, hoặc cả Thứ 3 và Thứ 7.
            </Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <Text className="text-sm font-semibold text-gray-700 mb-2">
              Các thứ muốn tập
            </Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {WEEKDAYS.map((day) => (
                <TouchableOpacity
                  key={day.value}
                  accessibilityRole="checkbox"
                  accessibilityLabel={day.label}
                  aria-checked={days.includes(day.value)}
                  onPress={() =>
                    setDays((previous) =>
                      previous.includes(day.value)
                        ? previous.filter((d) => d !== day.value)
                        : [...previous, day.value],
                    )
                  }
                  className={`px-3 py-2.5 rounded-xl border ${days.includes(day.value) ? "bg-[#1A3A5C] border-[#1A3A5C]" : "bg-white border-gray-200"}`}
                >
                  <Text
                    className={
                      days.includes(day.value)
                        ? "text-white font-semibold"
                        : "text-gray-600"
                    }
                  >
                    {day.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View className="flex-row gap-3 mb-4">
              <CalendarField
                label="Từ ngày"
                value={startDate}
                onChange={setStartDate}
              />
              <CalendarField
                label="Đến ngày"
                value={endDate}
                onChange={setEndDate}
              />
            </View>
            <View className="flex-row gap-3 mb-4">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-gray-700 mb-2">
                  Số buổi muốn chọn
                </Text>
                <TextInput
                  accessibilityLabel="Số buổi muốn chọn"
                  keyboardType="number-pad"
                  value={count}
                  onChangeText={(value) =>
                    setCount(value.replace(/^0+(?=\d)/, ""))
                  }
                  className="border border-gray-300 rounded-xl p-3 text-sm"
                />
                <Text className="text-xs text-gray-500 mt-1">
                  Có thể thêm tối đa {maxCount} buổi
                </Text>
              </View>
              <CalendarField
                label="Giờ bắt đầu (không bắt buộc)"
                type="time"
                value={time}
                onChange={setTime}
              />
            </View>
            {!!time && (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => setTime("")}
                className="mb-3"
              >
                <Text className="text-sm text-[#1A3A5C]">
                  Bỏ lọc giờ bắt đầu
                </Text>
              </TouchableOpacity>
            )}
            {classes.length > 0 && (
              <FilterChips
                title="Lớp học"
                options={classes}
                value={classId}
                onChange={setClassId}
              />
            )}
            {instructors.length > 0 && (
              <FilterChips
                title="Huấn luyện viên"
                options={instructors}
                value={instructorId}
                onChange={setInstructorId}
              />
            )}
            <Text className="text-xs text-gray-500 mb-4">
              Mỗi ngày chọn tối đa một buổi còn chỗ sớm nhất khớp bộ lọc và cấu
              hình gói, theo giờ Việt Nam. Những buổi bạn đang chọn được giữ
              lại.
            </Text>
            {plan.error ? (
              <Text
                accessibilityRole="alert"
                className="text-red-700 p-3 rounded-xl bg-red-50"
              >
                {plan.error}
              </Text>
            ) : range.isLoading || range.isFetching ? (
              <ActivityIndicator color="#1A3A5C" />
            ) : range.isError ? (
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => range.refetch()}
              >
                <Text className="text-red-600">
                  Không tải được lịch. Nhấn để thử lại.
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                <Text
                  className={`font-bold mb-3 ${plan.chosen.length < rule.count ? "text-amber-700" : "text-green-700"}`}
                >
                  Tìm được {plan.chosen.length}/{rule.count} buổi phù hợp
                </Text>
                {plan.chosen.map((s) => (
                  <View
                    key={s.id}
                    className="p-3 border border-blue-100 bg-blue-50 rounded-xl mb-2"
                  >
                    <Text className="font-semibold text-[#1A3A5C]">
                      {labelDate(studioDate(s.startTime))} ·{" "}
                      {formatTime(s.startTime)} – {formatTime(s.endTime)}
                    </Text>
                    <Text className="text-sm text-gray-600 mt-1">
                      {s.className} · {s.instructor.fullName}
                    </Text>
                  </View>
                ))}
                {plan.chosen.length < rule.count && (
                  <Text className="text-sm text-amber-700 mt-2">
                    Chưa đủ buổi theo yêu cầu. Bạn có thể mở rộng khoảng ngày,
                    đổi bộ lọc hoặc thêm số buổi hiện có trước.
                  </Text>
                )}
                {plan.skipped.length > 0 && (
                  <View className="mt-3">
                    <Text className="font-semibold text-gray-700 text-sm mb-2">
                      Các ngày bỏ qua ({plan.skipped.length})
                    </Text>
                    {plan.skipped.slice(0, 12).map((item) => (
                      <Text
                        key={item.date}
                        className="text-xs text-gray-500 mb-1"
                      >
                        {labelDate(item.date)}: {item.reason}
                      </Text>
                    ))}
                    {plan.skipped.length > 12 && (
                      <Text className="text-xs text-gray-500">
                        Và {plan.skipped.length - 12} ngày khác
                      </Text>
                    )}
                  </View>
                )}
              </>
            )}
          </ScrollView>
          <View className="p-4 border-t border-gray-100">
            <TouchableOpacity
              accessibilityRole="button"
              disabled={
                !!plan.error ||
                !plan.chosen.length ||
                range.isFetching ||
                range.isError
              }
              onPress={() => onApply(plan.chosen)}
              className={`py-3.5 rounded-xl items-center ${!plan.error && plan.chosen.length && !range.isFetching && !range.isError ? "bg-[#1A3A5C]" : "bg-gray-200"}`}
            >
              <Text
                className={`font-bold ${!plan.error && plan.chosen.length && !range.isFetching && !range.isError ? "text-white" : "text-gray-500"}`}
              >
                Thêm {plan.chosen.length} buổi vào danh sách
              </Text>
            </TouchableOpacity>
            <Text className="text-xs text-gray-500 text-center mt-2">
              Chưa trừ buổi. Bạn sẽ xem lại và xác nhận ở bước tiếp theo.
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={onClose}
              className="items-center pt-3"
            >
              <Text className="text-gray-600">Quay lại lịch học</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
