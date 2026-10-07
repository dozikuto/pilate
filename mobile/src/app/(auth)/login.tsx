import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import { notifyAlert } from "@/lib/alert";

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);

  function validate(): boolean {
    const errs: typeof errors = {};
    if (!email.trim()) errs.email = "Vui lòng nhập email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = "Email không hợp lệ";
    if (!password) errs.password = "Vui lòng nhập mật khẩu";
    else if (password.length < 6) errs.password = "Mật khẩu tối thiểu 6 ký tự";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleLogin() {
    setServerError(null);
    if (!validate()) return;
    try {
      await login({ email: email.trim().toLowerCase(), password });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? "Đăng nhập thất bại. Vui lòng kiểm tra email và mật khẩu.";
      const displayMsg = Array.isArray(msg) ? msg[0] : msg;
      setServerError(displayMsg);
      notifyAlert("Lỗi đăng nhập", displayMsg);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerClassName="flex-grow"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          
          <View className="bg-[#1A3A5C] pt-16 pb-12 px-6 items-center">
            <View className="w-20 h-20 bg-white/20 rounded-full items-center justify-center mb-4">
              <Ionicons name="fitness" size={40} color="white" />
            </View>
            <Text className="text-white text-3xl font-bold tracking-wide">
              PilatesMS
            </Text>
            <Text className="text-blue-200 text-sm mt-1">
              Hệ thống quản lý phòng tập Pilates
            </Text>
          </View>

          <View className="flex-1 bg-white rounded-t-3xl -mt-6 px-6 pt-8 pb-6">
            <Text className="text-[#1A3A5C] text-2xl font-bold mb-1">
              Đăng nhập
            </Text>
            <Text className="text-gray-500 text-sm mb-6">
              Chào mừng trở lại! Vui lòng đăng nhập.
            </Text>

            {serverError && (
              <View className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex-row items-center gap-2">
                <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
                <Text className="text-red-700 text-xs flex-1 leading-5 font-medium">
                  {serverError}
                </Text>
              </View>
            )}

            <View className="mb-5">
              <Text className="text-gray-700 text-sm font-medium mb-1.5">
                Email
              </Text>
              <View
                className={`flex-row items-center border rounded-xl px-4 bg-gray-50 ${
                  errors.email ? "border-red-400" : "border-gray-200"
                }`}
              >
                <Ionicons name="mail-outline" size={18} color="#6B7280" />
                <TextInput
                  className="flex-1 h-12 ml-3 text-gray-800 text-base"
                  placeholder="your@email.com"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (errors.email) setErrors((e) => ({ ...e, email: undefined }));
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                />
              </View>
              {errors.email && (
                <Text className="text-red-500 text-xs mt-1">{errors.email}</Text>
              )}
            </View>

            <View className="mb-8">
              <Text className="text-gray-700 text-sm font-medium mb-1.5">
                Mật khẩu
              </Text>
              <View
                className={`flex-row items-center border rounded-xl px-4 bg-gray-50 ${
                  errors.password ? "border-red-400" : "border-gray-200"
                }`}
              >
                <Ionicons name="lock-closed-outline" size={18} color="#6B7280" />
                <TextInput
                  className="flex-1 h-12 ml-3 text-gray-800 text-base"
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={(t) => {
                    setPassword(t);
                    if (errors.password)
                      setErrors((e) => ({ ...e, password: undefined }));
                  }}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity onPress={() => setShowPassword((v) => !v)}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
              {errors.password && (
                <Text className="text-red-500 text-xs mt-1">
                  {errors.password}
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={isLoading}
              className={`rounded-xl py-4 items-center shadow-sm ${
                isLoading ? "bg-[#1A3A5C]/60" : "bg-[#1A3A5C]"
              }`}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">Đăng nhập</Text>
              )}
            </TouchableOpacity>

            <View className="flex-row justify-center mt-6">
              <Text className="text-gray-500 text-sm">Chưa có tài khoản? </Text>
              <TouchableOpacity
                onPress={() => router.push("/(auth)/register")}
                activeOpacity={0.7}
              >
                <Text className="text-[#1A3A5C] text-sm font-bold">
                  Đăng ký ngay
                </Text>
              </TouchableOpacity>
            </View>

            <View className="mt-8 pt-6 border-t border-gray-100">
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider text-center mb-3">
                Tài khoản thử nghiệm nhanh (1 chạm)
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setEmail("minh.le@gmail.com");
                  setPassword("Member@123");
                  login({ email: "minh.le@gmail.com", password: "Member@123" });
                }}
                disabled={isLoading}
                className="bg-blue-50/70 border border-blue-200 rounded-xl p-3 flex-row items-center justify-between active:opacity-80"
              >
                <View>
                  <Text className="text-sm font-bold text-[#1A3A5C]">
                    Học viên: Lê Tuấn Minh
                  </Text>
                  <Text className="text-xs text-gray-500 mt-0.5">
                    minh.le@gmail.com • Member@123
                  </Text>
                </View>
                <Ionicons name="arrow-forward-circle" size={24} color="#1A3A5C" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
