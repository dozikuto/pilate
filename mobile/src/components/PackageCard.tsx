import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MemberPackage, Package } from "@/types";
import { formatDate, formatVND, daysRemaining } from "@/lib/utils";

interface MemberPackageCardProps {
  memberPackage: MemberPackage;
}

export function MemberPackageCard({ memberPackage }: MemberPackageCardProps) {
  const pkg = memberPackage.package;
  const packageName = memberPackage.packageName || pkg?.name || "Gói tập Pilates";
  const packageDescription =
    pkg?.description ||
    (memberPackage.packageType === "session_based"
      ? "Gói tập theo buổi"
      : memberPackage.packageType === "unlimited"
      ? "Gói tập không giới hạn"
      : "Gói tập tiêu chuẩn");

  const totalSessions = memberPackage.totalSessions ?? 0;
  const remainingSessions = memberPackage.remainingSessions ?? 0;
  const expiresAt = memberPackage.expiryDate || memberPackage.expiresAt;
  const rawStatus = (memberPackage.status || "active").toLowerCase();

  const progress =
    totalSessions > 0 ? (remainingSessions / totalSessions) * 100 : 0;
  const days = daysRemaining(expiresAt);

  const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
    active: { label: "Đang hoạt động", bg: "bg-green-100", text: "text-green-700" },
    expired: { label: "Đã hết hạn", bg: "bg-red-100", text: "text-red-700" },
    paused: { label: "Tạm dừng", bg: "bg-yellow-100", text: "text-yellow-700" },
    suspended: { label: "Tạm dừng", bg: "bg-yellow-100", text: "text-yellow-700" },
  };
  const st = statusConfig[rawStatus] || {
    label: "Đang hoạt động",
    bg: "bg-green-100",
    text: "text-green-700",
  };

  return (
    <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100">
      
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1 pr-2">
          <Text className="text-lg font-bold text-[#1A3A5C]" numberOfLines={1}>
            {packageName}
          </Text>
          <Text className="text-xs text-gray-500 mt-0.5">{packageDescription}</Text>
        </View>
        <View className={`px-2.5 py-1 rounded-full ${st.bg}`}>
          <Text className={`text-xs font-semibold ${st.text}`}>{st.label}</Text>
        </View>
      </View>

      <View className="mb-3">
        <View className="flex-row justify-between mb-1.5">
          <Text className="text-sm text-gray-600">Buổi còn lại</Text>
          <Text className="text-sm font-bold text-[#1A3A5C]">
            {remainingSessions}/{totalSessions}
          </Text>
        </View>
        <View className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <View
            className={`h-full rounded-full ${
              progress > 50 ? "bg-[#1A3A5C]" : progress > 20 ? "bg-yellow-400" : "bg-[#C0392B]"
            }`}
            style={{ width: `${progress}%` }}
          />
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="calendar-outline" size={14} color="#6B7280" />
          <Text className="text-sm text-gray-600">
            Hết hạn: {formatDate(expiresAt)}
          </Text>
        </View>
        {rawStatus === "active" && (
          <Text
            className={`text-xs font-semibold ${
              days <= 7 ? "text-[#C0392B]" : "text-gray-500"
            }`}
          >
            Còn {days} ngày
          </Text>
        )}
      </View>
    </View>
  );
}

interface PackageCardProps {
  pkg: any;
  onPurchase?: (pkg: any) => void;
  isLoading?: boolean;
}

const categoryLabels: Record<string, string> = {
  beginner: "Người mới",
  intermediate: "Trung cấp",
  advanced: "Nâng cao",
  unlimited: "Không giới hạn",
  session_based: "Theo buổi",
  time_based: "Theo thời gian",
};

export default function PackageCard({
  pkg,
  onPurchase,
  isLoading = false,
}: PackageCardProps) {
  const days = pkg.durationDays ?? pkg.validDays ?? 30;
  const tag = (pkg.category && categoryLabels[pkg.category]) || (pkg.type && categoryLabels[pkg.type]) || "Gói tập";

  return (
    <View className="bg-white rounded-2xl p-5 mb-4 border border-gray-100 shadow-sm">
      <View className="flex-row items-start justify-between mb-2">
        <Text className="text-base font-bold text-[#1A3A5C] flex-1" numberOfLines={1}>
          {pkg.name}
        </Text>
        <View className="bg-blue-50 px-2.5 py-1 rounded-full ml-2">
          <Text className="text-xs text-[#1A3A5C] font-medium">
            {tag}
          </Text>
        </View>
      </View>

      <Text className="text-sm text-gray-500 mb-3" numberOfLines={2}>
        {pkg.description}
      </Text>

      <View className="flex-row gap-4 mb-4">
        <View className="flex-row items-center gap-1">
          <Ionicons name="fitness-outline" size={14} color="#1A3A5C" />
          <Text className="text-sm text-gray-700">{pkg.totalSessions ?? 0} buổi</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Ionicons name="time-outline" size={14} color="#1A3A5C" />
          <Text className="text-sm text-gray-700">HH {days} ngày</Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-xl font-bold text-[#C0392B]">
          {formatVND(pkg.price)}
        </Text>
        {onPurchase && (
          <TouchableOpacity
            onPress={() => onPurchase(pkg)}
            disabled={isLoading}
            className="bg-[#1A3A5C] px-5 py-2.5 rounded-xl active:opacity-80"
          >
            <Text className="text-white font-semibold text-sm">Mua ngay</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
