import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { packageUnavailable, isSessionPackage } from "@/lib/packageBooking";
import type { MemberPackage, Package } from "@/types";
import { formatDate, formatVND, daysRemaining } from "@/lib/utils";
import PackageUsageSummary from "./PackageUsageSummary";

function trainingLabel(pkg: any) {
  if (pkg?.catalogCode === "trial_2") return "Tập thử trong lớp chung";
  const labels: Record<string, string> = {
    private_1v1: "1:1",
    semi_private_1v2: "1:2",
    small_group_1v3: "1:3",
    small_group_1v4: "1:4",
  };
  return pkg?.privateSessionEnabled
    ? `${pkg.privateSessionType === "semi_private_1v2" ? "Tập đôi" : "Tập riêng"} ${labels[pkg.privateSessionType] ?? "1:1"} · ${pkg.privateSessionDurationMinutes ?? 60} phút/buổi`
    : "Tập lớp theo lịch chung";
}

interface MemberPackageCardProps {
  memberPackage: MemberPackage;
}

export function MemberPackageCard({
  memberPackage: p,
}: MemberPackageCardProps) {
  const expiry = p.expiryDate ?? p.expiresAt;
  return (
    <View className="bg-white rounded-2xl p-5 mb-4 border border-gray-200">
      <View className="flex-row justify-between items-start">
        <View className="flex-1 pr-2">
          <Text className="text-lg font-bold text-[#1A3A5C]">
            {p.packageName ?? p.package?.name}
          </Text>
          <Text className="text-xs text-gray-500 mt-1">
            {trainingLabel(p.package)}
          </Text>
        </View>
        <Text className="text-xs text-gray-500">
          {p.status === "active"
            ? "Đang dùng"
            : p.status === "suspended"
              ? "Tạm dừng"
              : "Hết hạn"}
        </Text>
      </View>
      <PackageUsageSummary memberPackage={p} />
      {!!p.preferredInstructor && (
        <Text className="text-xs text-gray-600 mt-3">
          HLV ưu tiên: {p.preferredInstructor.fullName}
        </Text>
      )}
      {p.package?.privateSessionEnabled &&
        p.package.privateSessionType === "semi_private_1v2" && (
          <Text className="text-xs text-gray-600 mt-2">
            {p.duoPartner
              ? "Tập cùng: " + p.duoPartner.fullName
              : "Lễ tân sẽ ghép người tập cùng trước khi đặt lịch"}
          </Text>
        )}
      <View className="flex-row justify-between items-center mt-4">
        <Text className="text-xs text-gray-500 flex-1">
          {expiry ? "Hạn dùng: " + formatDate(expiry) : "Không giới hạn ngày"}
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: "/(tabs)/schedule",
              params: { memberPackageId: p.id },
            })
          }
          className="bg-[#1A3A5C] rounded-xl px-4 py-3"
        >
          <Text className="text-white font-semibold">
            {packageUnavailable(p) ? "Xem lịch đã đặt" : "Chọn lịch tập"}
          </Text>
        </TouchableOpacity>
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
  const tag =
    (pkg.category && categoryLabels[pkg.category]) ||
    (pkg.type && categoryLabels[pkg.type]) ||
    "Gói tập";

  return (
    <View className="bg-white rounded-2xl p-5 mb-4 border border-gray-100 shadow-sm">
      <View className="flex-row items-start justify-between mb-2">
        <Text
          className="text-base font-bold text-[#1A3A5C] flex-1"
          numberOfLines={1}
        >
          {pkg.name}
        </Text>
        <View className="bg-blue-50 px-2.5 py-1 rounded-full ml-2">
          <Text className="text-xs text-[#1A3A5C] font-medium">{tag}</Text>
        </View>
      </View>

      <Text className="text-sm text-gray-500 mb-3" numberOfLines={2}>
        {pkg.description}
      </Text>
      <Text className="text-sm font-semibold text-[#1A3A5C] mb-3">
        {trainingLabel(pkg)}
      </Text>

      <View className="flex-row gap-4 mb-4">
        <View className="flex-row items-center gap-1">
          <Ionicons name="fitness-outline" size={14} color="#1A3A5C" />
          <Text className="text-sm text-gray-700">
            {pkg.totalSessions ?? 0} buổi
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Ionicons name="time-outline" size={14} color="#1A3A5C" />
          <Text className="text-sm text-gray-700">HH {days} ngày</Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-xl font-bold text-[#C0392B]">
            {formatVND(pkg.price)}
          </Text>
          {Number(pkg.totalSessions) > 0 && (
            <Text className="text-xs text-gray-500 mt-1">
              {formatVND(Number(pkg.price) / Number(pkg.totalSessions))} / buổi
              {pkg.privateSessionType === "semi_private_1v2" &&
              pkg.privateSessionEnabled
                ? " / học viên"
                : ""}
            </Text>
          )}
        </View>
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
      {Number(pkg.totalSessions) > 0 && (
        <Text className="text-xs text-gray-500 mt-2">
          {formatVND(Number(pkg.price) / Number(pkg.totalSessions))} / buổi
          {pkg.privateSessionType === "semi_private_1v2" &&
          pkg.privateSessionEnabled
            ? " / học viên"
            : ""}
        </Text>
      )}
    </View>
  );
}
