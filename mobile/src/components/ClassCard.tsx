import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { ClassSchedule } from "@/types";
import { formatTime, formatDate } from "@/lib/utils";

interface ClassCardProps {
  schedule: ClassSchedule;
  onBook?: (id: string) => void;
  onCancel?: (id: string) => void;
  isLoading?: boolean;
  showDate?: boolean;
}

const statusConfig = {
  available: {
    label: "Còn chỗ",
    bg: "bg-green-100",
    text: "text-green-700",
    dot: "bg-green-500",
  },
  nearly_full: {
    label: "Gần đầy",
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    dot: "bg-yellow-500",
  },
  full: {
    label: "Đã đầy",
    bg: "bg-red-100",
    text: "text-red-700",
    dot: "bg-red-500",
  },
};

export default function ClassCard({
  schedule,
  onBook,
  onCancel,
  isLoading = false,
  showDate = false,
}: ClassCardProps) {
  const status = statusConfig[schedule.status];
  const spotsLeft = schedule.capacity - schedule.enrolled;

  return (
    <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100">
      
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1">
          <Text className="text-base font-bold text-[#1A3A5C]" numberOfLines={1}>
            {schedule.className}
          </Text>
          {showDate && (
            <Text className="text-xs text-gray-400 mt-0.5">
              {formatDate(schedule.startTime)}
            </Text>
          )}
        </View>
        
        <View className={`flex-row items-center px-2.5 py-1 rounded-full ${status.bg}`}>
          <View className={`w-2 h-2 rounded-full mr-1.5 ${status.dot}`} />
          <Text className={`text-xs font-semibold ${status.text}`}>
            {status.label}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center gap-4 mb-3">
        
        <View className="flex-row items-center gap-1">
          <Ionicons name="time-outline" size={14} color="#6B7280" />
          <Text className="text-sm text-gray-600">
            {formatTime(schedule.startTime)} – {formatTime(schedule.endTime)}
          </Text>
        </View>
        
        <View className="flex-row items-center gap-1">
          <Ionicons name="location-outline" size={14} color="#6B7280" />
          <Text className="text-sm text-gray-600">{schedule.room}</Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="w-7 h-7 rounded-full bg-[#1A3A5C] items-center justify-center">
            <Ionicons name="person" size={14} color="white" />
          </View>
          <Text className="text-sm text-gray-700 font-medium">
            {schedule.instructor.fullName}
          </Text>
        </View>
        <Text className="text-xs text-gray-500">
          {spotsLeft}/{schedule.capacity} chỗ
        </Text>
      </View>

      {(onBook || onCancel) && (
        <View className="mt-3 pt-3 border-t border-gray-100">
          {schedule.isBooked ? (
            <TouchableOpacity
              onPress={() => onCancel?.(schedule.id)}
              disabled={isLoading}
              className="bg-red-50 border border-red-200 rounded-xl py-2.5 items-center"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#C0392B" />
              ) : (
                <Text className="text-[#C0392B] font-semibold text-sm">
                  Hủy đặt chỗ
                </Text>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => onBook?.(schedule.id)}
              disabled={isLoading || schedule.status === "full"}
              className={`rounded-xl py-2.5 items-center ${
                schedule.status === "full"
                  ? "bg-gray-100"
                  : "bg-[#1A3A5C]"
              }`}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text
                  className={`font-semibold text-sm ${
                    schedule.status === "full" ? "text-gray-400" : "text-white"
                  }`}
                >
                  {schedule.status === "full" ? "Lớp đã đầy" : "Đặt chỗ"}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}
