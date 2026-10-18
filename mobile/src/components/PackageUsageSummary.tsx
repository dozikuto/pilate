import React from "react";
import { View, Text } from "react-native";
import type { MemberPackage } from "@/types";
import { isSessionPackage } from "@/lib/packageBooking";

export default function PackageUsageSummary({
  memberPackage: p,
}: {
  memberPackage: MemberPackage;
}) {
  return (
    <View className="mt-3">
      <View className="flex-row bg-gray-50 rounded-xl p-3">
        {[
          ["Đã tập", p.attendedSessions ?? 0],
          ["Đã đặt, chưa tập", p.reservedSessions ?? 0],
          [
            "Còn có thể đặt",
            isSessionPackage(p) ? p.remainingSessions : "Theo hạn gói",
          ],
        ].map(([label, value]) => (
          <View key={label} className="flex-1 items-center px-1">
            <Text className="text-lg font-bold text-[#1A3A5C]">{value}</Text>
            <Text className="text-xs text-gray-600 text-center mt-1">
              {label}
            </Text>
          </View>
        ))}
      </View>
      {!!p.forfeitedSessions && (
        <Text className="text-xs text-amber-700 mt-2">
          Hủy muộn / vắng mặt: {p.forfeitedSessions} buổi
        </Text>
      )}
      {!!p.otherUsedSessions && (
        <Text className="text-xs text-gray-500 mt-2">
          Buổi đã trừ khác / dữ liệu cũ: {p.otherUsedSessions}
        </Text>
      )}
    </View>
  );
}
