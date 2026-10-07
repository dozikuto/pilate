import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";

import { useAuthStore } from "@/store/auth.store";
import { generateQRPayload } from "@/lib/utils";

const QR_REFRESH_INTERVAL = 5 * 60 * 1000; 
const QR_SIZE = 220;

export default function CheckInScreen() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);

  const [qrValue, setQrValue] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(QR_REFRESH_INTERVAL / 1000);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const generateQR = useCallback(() => {
    if (!user?.memberCode || !token) return;
    const payload = generateQRPayload(user.memberCode, token);
    setQrValue(payload);
    setSecondsLeft(QR_REFRESH_INTERVAL / 1000);
  }, [user, token]);

  useEffect(() => {
    generateQR();

    const countdown = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          generateQR();
          return QR_REFRESH_INTERVAL / 1000;
        }
        return prev - 1;
      });
    }, 1000);

    intervalRef.current = countdown;
    return () => clearInterval(countdown);
  }, [generateQR]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progressPct = (secondsLeft / (QR_REFRESH_INTERVAL / 1000)) * 100;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <ScrollView
        contentContainerClassName="flex-grow"
        showsVerticalScrollIndicator={false}
      >
        
        <View className="bg-[#1A3A5C] px-5 pt-5 pb-8">
          <Text className="text-white text-xl font-bold">Check-in</Text>
          <Text className="text-blue-200 text-sm mt-0.5">
            Hiển thị mã QR để điểm danh
          </Text>
        </View>

        <View className="mx-4 -mt-4 bg-white rounded-3xl shadow-lg p-6 mb-4 border border-gray-100">
          
          <View className="items-center mb-6">
            <View className="w-20 h-20 rounded-full bg-[#1A3A5C]/10 border-4 border-[#1A3A5C]/20 items-center justify-center mb-3 overflow-hidden">
              {user?.avatarUrl ? (
                <Image
                  source={{ uri: user.avatarUrl }}
                  className="w-20 h-20"
                />
              ) : (
                <Ionicons name="person" size={36} color="#1A3A5C" />
              )}
            </View>
            <Text className="text-[#1A3A5C] text-xl font-bold">
              {user?.fullName ?? "—"}
            </Text>
            <View className="flex-row items-center gap-1.5 mt-1">
              <View className="w-2 h-2 rounded-full bg-green-500" />
              <Text className="text-gray-500 text-sm">
                Mã HV: {user?.memberCode ?? "—"}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-3 mb-6">
            <View className="flex-1 h-px bg-gray-200" />
            <Text className="text-gray-400 text-xs">MÃ CHECK-IN</Text>
            <View className="flex-1 h-px bg-gray-200" />
          </View>

          <View className="items-center">
            {qrValue ? (
              <View
                className="p-4 bg-white rounded-2xl shadow-sm border-2 border-[#1A3A5C]/10"
                style={{ elevation: 4 }}
              >
                <QRCode
                  value={qrValue}
                  size={QR_SIZE}
                  color="#1A3A5C"
                  backgroundColor="white"
                  quietZone={8}
                />
              </View>
            ) : (
              <View
                className="bg-gray-100 rounded-2xl items-center justify-center"
                style={{ width: QR_SIZE + 32, height: QR_SIZE + 32 }}
              >
                <Ionicons name="qr-code-outline" size={64} color="#D1D5DB" />
              </View>
            )}
          </View>

          <View className="mt-5">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-xs text-gray-500">Tự động làm mới sau</Text>
              <Text className="text-xs font-bold text-[#1A3A5C]">
                {minutes > 0 ? `${minutes}:` : ""}
                {String(seconds).padStart(2, "0")}s
              </Text>
            </View>
            <View className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <View
                className={`h-full rounded-full ${
                  progressPct > 40 ? "bg-[#1A3A5C]" : "bg-[#C0392B]"
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={generateQR}
            className="mt-5 flex-row items-center justify-center gap-2 bg-[#1A3A5C]/08 border border-[#1A3A5C]/20 rounded-xl py-3"
          >
            <Ionicons name="refresh-outline" size={18} color="#1A3A5C" />
            <Text className="text-[#1A3A5C] font-semibold text-sm">
              Làm mới mã ngay
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mx-4 bg-blue-50 rounded-2xl p-4 mb-8 border border-blue-100">
          <View className="flex-row items-start gap-3">
            <Ionicons
              name="information-circle-outline"
              size={20}
              color="#2563EB"
            />
            <View className="flex-1">
              <Text className="text-blue-900 text-sm font-semibold mb-1">
                Hướng dẫn check-in
              </Text>
              <Text className="text-blue-700 text-xs leading-5">
                1. Hiển thị mã QR này cho nhân viên lễ tân{"\n"}
                2. Nhân viên sẽ quét mã để xác nhận điểm danh{"\n"}
                3. Mã QR tự động làm mới sau mỗi 5 phút để bảo mật{"\n"}
                4. Không chụp màn hình để check-in thay cho người khác
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
