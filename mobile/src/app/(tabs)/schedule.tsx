import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import {
  useSchedules,
  useBookClass,
  useCancelBooking,
} from "@/hooks/useSchedules";
import ClassCard from "@/components/ClassCard";
import { formatDateShort } from "@/lib/utils";
import { notifyAlert, confirmAlert } from "@/lib/alert";

function getWeekDays(): Date[] {
  const days: Date[] = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    days.push(d);
  }
  return days;
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function ScheduleScreen() {
  const weekDays = getWeekDays();
  const [selectedDate, setSelectedDate] = useState<Date>(weekDays[0]);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const dateStr = toISODate(selectedDate);

  const { data: schedules, isLoading, refetch } = useSchedules(dateStr);
  const bookMutation = useBookClass();
  const cancelMutation = useCancelBooking();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  async function handleBook(scheduleId: string) {
    setLoadingId(scheduleId);
    try {
      await bookMutation.mutateAsync(scheduleId);
      notifyAlert("Thành công", "Đặt chỗ thành công!");
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Đặt chỗ thất bại.";
      notifyAlert("Lỗi", Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setLoadingId(null);
    }
  }

  async function handleCancel(scheduleId: string) {
    confirmAlert(
      "Xác nhận hủy",
      "Bạn có chắc chắn muốn hủy đặt chỗ lớp này?",
      async () => {
        setLoadingId(scheduleId);
        try {
          await cancelMutation.mutateAsync(scheduleId);
          notifyAlert("Đã hủy", "Hủy đặt chỗ thành công.");
        } catch (err: any) {
          const msg = err?.response?.data?.message ?? "Hủy đặt chỗ thất bại.";
          notifyAlert("Lỗi", Array.isArray(msg) ? msg[0] : msg);
        } finally {
          setLoadingId(null);
        }
      },
      "Hủy đặt chỗ",
      "Giữ lại"
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      
      <View className="bg-[#1A3A5C] px-5 pt-5 pb-4">
        <Text className="text-white text-xl font-bold">Lịch học</Text>
        <Text className="text-blue-200 text-sm mt-0.5">
          Chọn ngày để xem và đặt lớp học
        </Text>
      </View>

      <View className="bg-white shadow-sm">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="px-4 py-3 gap-2"
        >
          {weekDays.map((day, idx) => {
            const isSelected =
              toISODate(day) === toISODate(selectedDate);
            const isToday = toISODate(day) === toISODate(new Date());
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => setSelectedDate(day)}
                className={`items-center px-3 py-2.5 rounded-2xl min-w-[60px] ${
                  isSelected
                    ? "bg-[#1A3A5C]"
                    : "bg-gray-50 border border-gray-200"
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    isSelected ? "text-blue-200" : "text-gray-500"
                  }`}
                >
                  {["CN", "T2", "T3", "T4", "T5", "T6", "T7"][day.getDay()]}
                </Text>
                <Text
                  className={`text-lg font-bold mt-0.5 ${
                    isSelected ? "text-white" : "text-gray-800"
                  }`}
                >
                  {day.getDate()}
                </Text>
                {isToday && (
                  <View
                    className={`w-1.5 h-1.5 rounded-full mt-1 ${
                      isSelected ? "bg-white" : "bg-[#1A3A5C]"
                    }`}
                  />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View className="px-5 py-3">
        <Text className="text-[#1A3A5C] font-semibold text-sm">
          {formatDateShort(selectedDate)}
          {toISODate(selectedDate) === toISODate(new Date()) && " (Hôm nay)"}
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#1A3A5C" />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-4"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#1A3A5C"
              colors={["#1A3A5C"]}
            />
          }
        >
          {schedules && schedules.length > 0 ? (
            schedules.map((schedule: any) => (
              <ClassCard
                key={schedule.id}
                schedule={schedule}
                onBook={handleBook}
                onCancel={handleCancel}
                isLoading={loadingId === schedule.id}
              />
            ))
          ) : (
            <View className="flex-1 items-center justify-center py-20">
              <Ionicons name="calendar-outline" size={56} color="#D1D5DB" />
              <Text className="text-gray-400 text-base font-medium mt-4">
                Không có lớp học
              </Text>
              <Text className="text-gray-400 text-sm mt-1 text-center px-8">
                Không có lớp học nào vào ngày này. Hãy chọn ngày khác.
              </Text>
            </View>
          )}
          <View className="h-4" />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
