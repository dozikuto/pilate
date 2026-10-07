import React from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({
  message = "Đang tải...",
}: LoadingScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 items-center justify-center gap-4">
        <ActivityIndicator size="large" color="#1A3A5C" />
        <Text className="text-primary text-base font-medium text-[#1A3A5C]">
          {message}
        </Text>
      </View>
    </SafeAreaView>
  );
}
