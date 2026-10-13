import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";

import {
  useInstructorOptions,
  useInstructorWeek,
  useMyPrivateRequests,
  useRequestPrivateSession,
  useCancelPrivateRequest,
  type FreeSlot,
  type PrivateSessionType,
  type WeekClass,
} from "@/hooks/useInstructorSchedule";
import { useBookClass, useCancelBooking } from "@/hooks/useSchedules";
import { formatTime } from "@/lib/utils";
import { notifyAlert, confirmAlert } from "@/lib/alert";

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const SESSION_TYPES: { value: PrivateSessionType; label: string; desc: string }[] = [
  { value: "private_1v1", label: "1 vs 1", desc: "Kèm riêng 1 học viên" },
  { value: "semi_private_1v2", label: "1 vs 2", desc: "Tập cùng 1 người" },
  { value: "small_group_1v3", label: "1 vs 3", desc: "Nhóm nhỏ 3 người" },
  { value: "small_group_1v4", label: "1 vs 4", desc: "Nhóm nhỏ 4 người" },
];

const REQUEST_STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Chờ duyệt", cls: "bg-amber-100 text-amber-700" },
  approved: { label: "Đã xác nhận", cls: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Bị từ chối", cls: "bg-red-100 text-red-700" },
  cancelled: { label: "Đã hủy", cls: "bg-gray-100 text-gray-500" },
};

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function shiftDate(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return toISODate(new Date(y, m - 1, d + days));
}

function displayDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

export default function InstructorScheduleScreen() {
  const params = useLocalSearchParams<{ instructorUserId?: string }>();
  const today = toISODate(new Date());

  const [instructorUserId, setInstructorUserId] = useState<string | undefined>(
    params.instructorUserId
  );
  const [weekStart, setWeekStart] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [requestSlot, setRequestSlot] = useState<FreeSlot | null>(null);
  const [sessionType, setSessionType] = useState<PrivateSessionType>("private_1v1");
  const [note, setNote] = useState("");

  const { data: instructors, isLoading: loadingInstructors } = useInstructorOptions();
  const {
    data: week,
    isLoading: loadingWeek,
    isFetching,
    refetch,
  } = useInstructorWeek(instructorUserId, weekStart);
  const { data: myRequests, refetch: refetchRequests } = useMyPrivateRequests();

  const bookMutation = useBookClass();
  const cancelBookingMutation = useCancelBooking();
  const requestMutation = useRequestPrivateSession();
  const cancelRequestMutation = useCancelPrivateRequest();

  useEffect(() => {
    if (!instructorUserId && instructors && instructors.length > 0) {
      setInstructorUserId(instructors[0].userId);
    }
  }, [instructors, instructorUserId]);

  useFocusEffect(
    React.useCallback(() => {
      refetch();
      refetchRequests();
    }, [refetch, refetchRequests])
  );

  const selectedDay = useMemo(
    () => week?.days.find((d) => d.date === selectedDate) ?? week?.days[0],
    [week, selectedDate]
  );

  const instructorRequests = useMemo(
    () =>
      (myRequests ?? []).filter(
        (r) => r.instructor?.userId === instructorUserId && r.status !== "cancelled"
      ),
    [myRequests, instructorUserId]
  );

  const currentInstructor = instructors?.find((i) => i.userId === instructorUserId);

  function changeWeek(delta: number) {
    const next = shiftDate(weekStart, delta * 7);
    const safe = next < today ? today : next;
    setWeekStart(safe);
    setSelectedDate(safe);
  }

  async function handleBook(cls: WeekClass) {
    setLoadingId(cls.id);
    try {
      await bookMutation.mutateAsync(cls.id);
      await refetch();
      notifyAlert("Thành công", `Đã đặt chỗ lớp ${cls.className}.`);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Đặt chỗ thất bại.";
      notifyAlert("Lỗi", Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoadingId(null);
    }
  }

  function handleCancelBooking(cls: WeekClass) {
    confirmAlert(
      "Hủy đặt chỗ",
      `Bạn muốn hủy chỗ lớp ${cls.className}?`,
      async () => {
        setLoadingId(cls.id);
        try {
          await cancelBookingMutation.mutateAsync(cls.id);
          await refetch();
          notifyAlert("Đã hủy", "Hủy đặt chỗ thành công.");
        } catch (err: any) {
          const msg = err?.response?.data?.message ?? "Hủy thất bại.";
          notifyAlert("Lỗi", Array.isArray(msg) ? msg[0] : msg);
        } finally {
          setLoadingId(null);
        }
      },
      "Hủy chỗ",
      "Giữ lại"
    );
  }

  function openRequest(slot: FreeSlot) {
    if (slot.myRequestStatus) {
      notifyAlert("Đã gửi đề nghị", "Bạn đã đề nghị khung giờ này, vui lòng chờ xác nhận.");
      return;
    }
    setSessionType("private_1v1");
    setNote("");
    setRequestSlot(slot);
  }

  async function submitRequest() {
    if (!requestSlot || !instructorUserId) return;
    try {
      await requestMutation.mutateAsync({
        instructorUserId,
        startTime: requestSlot.startTime,
        endTime: requestSlot.endTime,
        sessionType,
        note: note.trim(),
      });
      setRequestSlot(null);
      notifyAlert(
        "Đã gửi đề nghị",
        "Studio sẽ xác nhận lịch tập riêng với huấn luyện viên và phản hồi cho bạn sớm nhất."
      );
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Gửi đề nghị thất bại.";
      notifyAlert("Lỗi", Array.isArray(msg) ? msg[0] : msg);
    }
  }

  function cancelRequest(id: string) {
    confirmAlert("Hủy đề nghị", "Bạn muốn hủy đề nghị tập riêng này?", async () => {
      try {
        await cancelRequestMutation.mutateAsync(id);
      } catch (err: any) {
        const msg = err?.response?.data?.message ?? "Hủy thất bại.";
        notifyAlert("Lỗi", Array.isArray(msg) ? msg[0] : msg);
      }
    });
  }

  function renderClass(cls: WeekClass) {
    const ratio = cls.capacity > 0 ? Math.min(cls.enrolled / cls.capacity, 1) : 0;
    const barColor = cls.isFull ? "bg-red-500" : ratio >= 0.7 ? "bg-amber-500" : "bg-emerald-500";
    let badge = { label: `Còn ${cls.remaining} chỗ`, cls: "bg-emerald-100 text-emerald-700" };
    if (cls.isBooked) badge = { label: "Bạn đã đặt", cls: "bg-blue-100 text-blue-700" };
    else if (cls.isPast) badge = { label: "Đã diễn ra", cls: "bg-gray-100 text-gray-500" };
    else if (cls.isFull) badge = { label: "Đã đủ người", cls: "bg-red-100 text-red-700" };

    return (
      <View key={cls.id} className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
        <View className="flex-row justify-between items-start">
          <View className="flex-1 pr-2">
            <Text className="text-[#1A3A5C] font-bold text-base">
              {formatTime(cls.startTime)} - {formatTime(cls.endTime)}
            </Text>
            <Text className="text-gray-800 font-semibold mt-0.5">{cls.className}</Text>
            <Text className="text-gray-500 text-xs mt-0.5">{cls.room}</Text>
          </View>
          <View className={`px-2.5 py-1 rounded-full ${badge.cls.split(" ")[0]}`}>
            <Text className={`text-xs font-semibold ${badge.cls.split(" ")[1]}`}>
              {badge.label}
            </Text>
          </View>
        </View>

        <View className="mt-3">
          <View className="flex-row justify-between mb-1">
            <Text className="text-xs text-gray-500">Đã đăng ký</Text>
            <Text className="text-xs font-semibold text-gray-700">
              {cls.enrolled}/{cls.capacity} người
            </Text>
          </View>
          <View className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <View className={`h-2 ${barColor}`} style={{ width: `${ratio * 100}%` }} />
          </View>
        </View>

        {!cls.isPast && (
          <View className="mt-3">
            {cls.isBooked ? (
              <TouchableOpacity
                onPress={() => handleCancelBooking(cls)}
                disabled={loadingId === cls.id}
                className="border border-red-300 rounded-xl py-2.5 items-center"
              >
                {loadingId === cls.id ? (
                  <ActivityIndicator color="#C0392B" />
                ) : (
                  <Text className="text-red-600 font-semibold">Hủy đặt chỗ</Text>
                )}
              </TouchableOpacity>
            ) : cls.isFull ? (
              <View className="bg-gray-50 rounded-xl py-2.5 px-3">
                <Text className="text-gray-500 text-xs text-center">
                  Lớp đã đủ người. Bạn có thể chọn khung giờ trống bên dưới để đề nghị tập riêng.
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => handleBook(cls)}
                disabled={loadingId === cls.id}
                className="bg-[#1A3A5C] rounded-xl py-2.5 items-center"
              >
                {loadingId === cls.id ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-semibold">Đăng ký tham gia</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="bg-[#1A3A5C] px-5 pt-4 pb-4">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-white text-xl font-bold">Lịch theo huấn luyện viên</Text>
            <Text className="text-blue-200 text-xs mt-0.5">
              Xem lịch dạy trong tuần, chỗ trống và đề nghị tập riêng
            </Text>
          </View>
        </View>
      </View>

      <View className="bg-white border-b border-gray-100">
        {loadingInstructors ? (
          <ActivityIndicator className="py-4" color="#1A3A5C" />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
          >
            {(instructors ?? []).map((ins) => {
              const active = ins.userId === instructorUserId;
              return (
                <TouchableOpacity
                  key={ins.userId}
                  onPress={() => setInstructorUserId(ins.userId)}
                  className={`flex-row items-center px-3 py-2 rounded-full border ${
                    active ? "bg-[#1A3A5C] border-[#1A3A5C]" : "bg-white border-gray-200"
                  }`}
                >
                  <View
                    className={`w-7 h-7 rounded-full items-center justify-center mr-2 ${
                      active ? "bg-white/20" : "bg-blue-50"
                    }`}
                  >
                    <Text className={`font-bold text-xs ${active ? "text-white" : "text-[#1A3A5C]"}`}>
                      {ins.fullName?.split(" ").pop()?.charAt(0) ?? "H"}
                    </Text>
                  </View>
                  <Text className={`font-semibold text-sm ${active ? "text-white" : "text-gray-700"}`}>
                    {ins.fullName}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !loadingWeek}
            onRefresh={() => {
              refetch();
              refetchRequests();
            }}
            tintColor="#1A3A5C"
          />
        }
      >
        {currentInstructor?.specializations || currentInstructor?.bio ? (
          <View className="mx-4 mt-3 bg-blue-50 rounded-2xl p-3">
            {currentInstructor?.specializations ? (
              <Text className="text-[#1A3A5C] text-xs font-semibold">
                Chuyên môn: {currentInstructor.specializations}
              </Text>
            ) : null}
            {currentInstructor?.bio ? (
              <Text className="text-gray-600 text-xs mt-1" numberOfLines={2}>
                {currentInstructor.bio}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View className="flex-row items-center justify-between px-4 mt-4">
          <TouchableOpacity
            onPress={() => changeWeek(-1)}
            disabled={weekStart <= today}
            className={`p-2 rounded-full ${weekStart <= today ? "opacity-30" : "bg-white"}`}
          >
            <Ionicons name="chevron-back" size={20} color="#1A3A5C" />
          </TouchableOpacity>
          <Text className="text-[#1A3A5C] font-semibold">
            {displayDate(weekStart)} - {displayDate(shiftDate(weekStart, 6))}
          </Text>
          <TouchableOpacity onPress={() => changeWeek(1)} className="p-2 rounded-full bg-white">
            <Ionicons name="chevron-forward" size={20} color="#1A3A5C" />
          </TouchableOpacity>
        </View>

        {loadingWeek || !week ? (
          <View className="py-20 items-center">
            <ActivityIndicator size="large" color="#1A3A5C" />
          </View>
        ) : (
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
            >
              {week.days.map((day) => {
                const active = day.date === selectedDay?.date;
                const hasClass = day.totalClasses > 0;
                return (
                  <TouchableOpacity
                    key={day.date}
                    onPress={() => setSelectedDate(day.date)}
                    className={`items-center px-3 py-2.5 rounded-2xl min-w-[62px] ${
                      active ? "bg-[#1A3A5C]" : "bg-white border border-gray-200"
                    }`}
                  >
                    <Text className={`text-xs ${active ? "text-blue-200" : "text-gray-500"}`}>
                      {WEEKDAYS[day.weekday]}
                    </Text>
                    <Text className={`text-lg font-bold ${active ? "text-white" : "text-gray-800"}`}>
                      {day.date.slice(8)}
                    </Text>
                    <Text
                      className={`text-[10px] mt-0.5 ${
                        active ? "text-blue-100" : hasClass ? "text-emerald-600" : "text-gray-400"
                      }`}
                    >
                      {hasClass ? `${day.totalClasses} lớp` : "Trống"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View className="px-4">
              <Text className="text-gray-800 font-bold text-base mb-2">
                Lớp {week.instructor.fullName} dạy ngày {displayDate(selectedDay?.date ?? weekStart)}
              </Text>
              {selectedDay && selectedDay.classes.length > 0 ? (
                selectedDay.classes.map(renderClass)
              ) : (
                <View className="bg-white rounded-2xl p-5 items-center border border-dashed border-gray-200 mb-3">
                  <Ionicons name="calendar-clear-outline" size={36} color="#D1D5DB" />
                  <Text className="text-gray-500 text-sm mt-2 text-center">
                    Huấn luyện viên không có lớp nào trong ngày này.
                  </Text>
                </View>
              )}

              <View className="mt-3 mb-2 flex-row items-center">
                <Ionicons name="time-outline" size={18} color="#1A3A5C" />
                <Text className="text-gray-800 font-bold text-base ml-1.5">
                  Giờ trống - đề nghị tập riêng
                </Text>
              </View>
              <Text className="text-gray-500 text-xs mb-3">
                Chọn một khung giờ HLV đang rảnh để gửi đề nghị tập riêng (1 vs 1 đến 1 vs 4).
              </Text>
              {selectedDay && selectedDay.freeSlots.length > 0 ? (
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {selectedDay.freeSlots.map((slot) => {
                    const requested = Boolean(slot.myRequestStatus);
                    return (
                      <TouchableOpacity
                        key={slot.startTime}
                        onPress={() => openRequest(slot)}
                        className={`px-3 py-2 rounded-xl border ${
                          requested
                            ? "bg-amber-50 border-amber-300"
                            : "bg-white border-emerald-300"
                        }`}
                      >
                        <Text
                          className={`text-sm font-semibold ${
                            requested ? "text-amber-700" : "text-emerald-700"
                          }`}
                        >
                          {slot.label}
                        </Text>
                        {requested && (
                          <Text className="text-[10px] text-amber-600">
                            {REQUEST_STATUS[slot.myRequestStatus!]?.label}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text className="text-gray-400 text-sm">Không còn khung giờ trống trong ngày này.</Text>
              )}

              {instructorRequests.length > 0 && (
                <View className="mt-6">
                  <Text className="text-gray-800 font-bold text-base mb-2">
                    Đề nghị tập riêng của bạn
                  </Text>
                  {instructorRequests.map((r) => {
                    const st = REQUEST_STATUS[r.status];
                    const type = SESSION_TYPES.find((t) => t.value === r.sessionType);
                    const start = new Date(r.startTime);
                    return (
                      <View key={r.id} className="bg-white rounded-2xl p-3 mb-2 border border-gray-100">
                        <View className="flex-row justify-between items-center">
                          <Text className="text-gray-800 font-semibold">
                            {WEEKDAYS[start.getDay()]} {displayDate(toISODate(start))} ·{" "}
                            {formatTime(r.startTime)} - {formatTime(r.endTime)}
                          </Text>
                          <View className={`px-2 py-0.5 rounded-full ${st.cls.split(" ")[0]}`}>
                            <Text className={`text-xs font-semibold ${st.cls.split(" ")[1]}`}>
                              {st.label}
                            </Text>
                          </View>
                        </View>
                        <Text className="text-gray-500 text-xs mt-1">
                          Hình thức: {type?.label ?? r.sessionType}
                          {r.note ? ` · ${r.note}` : ""}
                        </Text>
                        {r.responseNote ? (
                          <Text className="text-[#1A3A5C] text-xs mt-1">Phản hồi: {r.responseNote}</Text>
                        ) : null}
                        {(r.status === "pending" || r.status === "approved") && (
                          <TouchableOpacity onPress={() => cancelRequest(r.id)} className="mt-2 self-start">
                            <Text className="text-red-600 text-xs font-semibold">Hủy đề nghị</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        )}
        <View className="h-8" />
      </ScrollView>

      <Modal
        visible={Boolean(requestSlot)}
        transparent
        animationType="slide"
        onRequestClose={() => setRequestSlot(null)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl p-5">
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-lg font-bold text-[#1A3A5C]">Đề nghị tập riêng</Text>
              <TouchableOpacity onPress={() => setRequestSlot(null)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            {requestSlot && (
              <Text className="text-gray-600 text-sm mb-4">
                HLV {week?.instructor.fullName} · {displayDate(selectedDay?.date ?? "")} ·{" "}
                {requestSlot.label}
              </Text>
            )}

            <Text className="text-gray-700 font-semibold text-sm mb-2">Hình thức tập</Text>
            <View className="flex-row flex-wrap mb-4" style={{ gap: 8 }}>
              {SESSION_TYPES.map((t) => {
                const active = t.value === sessionType;
                return (
                  <TouchableOpacity
                    key={t.value}
                    onPress={() => setSessionType(t.value)}
                    className={`px-3 py-2 rounded-xl border ${
                      active ? "bg-[#1A3A5C] border-[#1A3A5C]" : "bg-white border-gray-200"
                    }`}
                    style={{ width: "48%" }}
                  >
                    <Text className={`font-bold ${active ? "text-white" : "text-gray-800"}`}>
                      {t.label}
                    </Text>
                    <Text className={`text-xs ${active ? "text-blue-100" : "text-gray-500"}`}>
                      {t.desc}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text className="text-gray-700 font-semibold text-sm mb-2">Ghi chú cho HLV</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="VD: Muốn tập phục hồi lưng, đi cùng 1 bạn..."
              multiline
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 min-h-[70px]"
              placeholderTextColor="#9CA3AF"
              style={{ textAlignVertical: "top" }}
            />

            <TouchableOpacity
              onPress={submitRequest}
              disabled={requestMutation.isPending}
              className="bg-[#C0392B] rounded-xl py-3.5 items-center mt-5"
            >
              {requestMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-bold">Gửi đề nghị</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
