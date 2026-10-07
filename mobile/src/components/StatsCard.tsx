import React from "react";
import { View, Text } from "react-native";

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: boolean;
  subLabel?: string;
}

export default function StatsCard({
  label,
  value,
  icon,
  accent = false,
  subLabel,
}: StatsCardProps) {
  return (
    <View
      className={`flex-1 rounded-2xl p-4 shadow-sm ${
        accent ? "bg-[#1A3A5C]" : "bg-white border border-gray-100"
      }`}
    >
      <View className="mb-2">{icon}</View>
      <Text
        className={`text-2xl font-bold ${
          accent ? "text-white" : "text-[#1A3A5C]"
        }`}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text
        className={`text-xs mt-1 ${accent ? "text-blue-200" : "text-gray-500"}`}
        numberOfLines={2}
      >
        {label}
      </Text>
      {subLabel ? (
        <Text
          className={`text-xs mt-0.5 font-medium ${
            accent ? "text-yellow-300" : "text-[#C0392B]"
          }`}
          numberOfLines={1}
        >
          {subLabel}
        </Text>
      ) : null}
    </View>
  );
}
