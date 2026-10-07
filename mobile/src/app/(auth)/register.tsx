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
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/hooks/useAuth";
import apiClient from "@/lib/axios";

interface FormValues {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
}

export default function RegisterScreen() {
  const { login, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState<FormValues>({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [otpCode, setOtpCode] = useState("123456");
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);

  function setField(key: keyof FormValues, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setServerError(null);
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const errs: FormErrors = {};
    if (!form.fullName.trim()) errs.fullName = "Vui lòng nhập họ tên";
    if (!form.email.trim()) errs.email = "Vui lòng nhập email";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Email không hợp lệ";

    const cleanPhone = form.phone.replace(/[\s\-\.]/g, "");
    if (!cleanPhone) {
      errs.phone = "Vui lòng nhập số điện thoại";
    } else if (!/^(0|\+?84)[0-9]{9,10}$/.test(cleanPhone)) {
      errs.phone = "Số điện thoại không hợp lệ (VD: 0901234567)";
    }

    if (!form.password) errs.password = "Vui lòng nhập mật khẩu";
    else if (form.password.length < 8) errs.password = "Mật khẩu tối thiểu 8 ký tự";
    if (!form.confirmPassword) errs.confirmPassword = "Vui lòng xác nhận mật khẩu";
    else if (form.password !== form.confirmPassword)
      errs.confirmPassword = "Mật khẩu không khớp";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleRegister() {
    setServerError(null);
    if (!validate()) return;
    setIsRegistering(true);
    try {
      await apiClient.post("/auth/register", {
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim().replace(/[\s\-\.]/g, ""),
        password: form.password,
        confirmPassword: form.confirmPassword,
      });
      
      setShowVerifyModal(true);
    } catch (err: any) {
      let msg =
        err?.response?.data?.message ?? "Đăng ký thất bại. Vui lòng thử lại.";
      if (err?.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        msg = err.response.data.errors.join(", ");
      }
      if (msg.includes("Email already registered")) {
        msg = "Email này đã được đăng ký, vui lòng đăng nhập hoặc dùng email khác.";
      }
      setServerError(msg);
      if (Platform.OS !== "web") {
        Alert.alert("Lỗi đăng ký", msg);
      }
    } finally {
      setIsRegistering(false);
    }
  }

  async function handleVerifyOtp() {
    setOtpError(null);
    if (!otpCode.trim()) {
      setOtpError("Vui lòng nhập mã xác thực OTP.");
      return;
    }
    setOtpLoading(true);
    try {
      await apiClient.post("/auth/verify", {
        email: form.email.trim().toLowerCase(),
        code: otpCode.trim(),
      });
      
      await login({
        email: form.email.trim().toLowerCase(),
        password: form.password,
      });
      setShowVerifyModal(false);
      router.replace("/(tabs)/home");
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Mã xác thực không hợp lệ.";
      setOtpError(msg);
    } finally {
      setOtpLoading(false);
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
          
          <View className="bg-[#1A3A5C] pt-12 pb-10 px-6">
            <TouchableOpacity
              onPress={() => router.back()}
              className="flex-row items-center gap-2 mb-6"
            >
              <Ionicons name="arrow-back" size={20} color="white" />
              <Text className="text-white text-sm">Quay lại</Text>
            </TouchableOpacity>
            <Text className="text-white text-3xl font-bold">Tạo tài khoản</Text>
            <Text className="text-blue-200 text-sm mt-1">
              Đăng ký để bắt đầu hành trình Pilates
            </Text>
          </View>

          <View className="flex-1 bg-white rounded-t-3xl -mt-6 px-6 pt-8 pb-8">
            {serverError && (
              <View className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex-row items-center gap-2">
                <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
                <Text className="text-red-700 text-xs flex-1 leading-5 font-medium">
                  {serverError}
                </Text>
              </View>
            )}

            <Field
              label="Họ và tên"
              icon="person-outline"
              placeholder="Nguyễn Văn A"
              value={form.fullName}
              onChangeText={(t) => setField("fullName", t)}
              error={errors.fullName}
            />

            <Field
              label="Email"
              icon="mail-outline"
              placeholder="your@email.com"
              value={form.email}
              onChangeText={(t) => setField("email", t)}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Field
              label="Số điện thoại"
              icon="call-outline"
              placeholder="0901234567"
              value={form.phone}
              onChangeText={(t) => setField("phone", t.replace(/[^\d+\s\-]/g, ""))}
              error={errors.phone}
              keyboardType="phone-pad"
            />

            <View className="mb-5">
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
                  placeholder="Tối thiểu 8 ký tự"
                  placeholderTextColor="#9CA3AF"
                  value={form.password}
                  onChangeText={(t) => setField("password", t)}
                  secureTextEntry={!showPassword}
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
                <Text className="text-red-500 text-xs mt-1">{errors.password}</Text>
              )}
            </View>

            <View className="mb-8">
              <Text className="text-gray-700 text-sm font-medium mb-1.5">
                Xác nhận mật khẩu
              </Text>
              <View
                className={`flex-row items-center border rounded-xl px-4 bg-gray-50 ${
                  errors.confirmPassword ? "border-red-400" : "border-gray-200"
                }`}
              >
                <Ionicons name="shield-checkmark-outline" size={18} color="#6B7280" />
                <TextInput
                  className="flex-1 h-12 ml-3 text-gray-800 text-base"
                  placeholder="Nhập lại mật khẩu"
                  placeholderTextColor="#9CA3AF"
                  value={form.confirmPassword}
                  onChangeText={(t) => setField("confirmPassword", t)}
                  secureTextEntry={!showConfirm}
                  onSubmitEditing={handleRegister}
                />
                <TouchableOpacity onPress={() => setShowConfirm((v) => !v)}>
                  <Ionicons
                    name={showConfirm ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color="#6B7280"
                  />
                </TouchableOpacity>
              </View>
              {errors.confirmPassword && (
                <Text className="text-red-500 text-xs mt-1">
                  {errors.confirmPassword}
                </Text>
              )}
            </View>

            <TouchableOpacity
              onPress={handleRegister}
              disabled={isRegistering}
              className={`rounded-xl py-4 items-center shadow-sm ${
                isRegistering ? "bg-[#1A3A5C]/60" : "bg-[#1A3A5C]"
              }`}
              activeOpacity={0.8}
            >
              {isRegistering ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">Đăng ký</Text>
              )}
            </TouchableOpacity>

            <View className="flex-row justify-center mt-5">
              <Text className="text-gray-500 text-sm">Đã có tài khoản? </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text className="text-[#1A3A5C] text-sm font-bold">Đăng nhập</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showVerifyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowVerifyModal(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-5">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <View className="w-14 h-14 rounded-full bg-blue-50 items-center justify-center mx-auto mb-4">
              <Ionicons name="shield-checkmark" size={32} color="#1A3A5C" />
            </View>

            <Text className="text-xl font-bold text-center text-gray-900 mb-1">
              Xác thực tài khoản
            </Text>
            <Text className="text-xs text-center text-gray-500 mb-4 px-2">
              Mã xác thực kích hoạt 6 số đã được gửi tới email{"\n"}
              <Text className="font-semibold text-gray-700">{form.email}</Text>
            </Text>

            <View className="bg-blue-50/70 p-3 rounded-xl border border-blue-100 mb-4 flex-row items-center justify-between">
              <Text className="text-xs text-blue-700 font-medium">Mã xác thực mẫu:</Text>
              <Text className="text-xs font-mono font-bold text-blue-900 tracking-wider">123456</Text>
            </View>

            {otpError && (
              <View className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                <Text className="text-red-600 text-xs text-center font-medium">{otpError}</Text>
              </View>
            )}

            <View className="border border-gray-300 rounded-xl px-4 py-3 bg-gray-50 mb-5">
              <TextInput
                className="text-center font-mono font-bold text-2xl tracking-[8px] text-[#1A3A5C]"
                maxLength={6}
                keyboardType="number-pad"
                value={otpCode}
                onChangeText={setOtpCode}
                placeholder="123456"
              />
            </View>

            <TouchableOpacity
              onPress={handleVerifyOtp}
              disabled={otpLoading}
              className={`rounded-xl py-3.5 items-center mb-3 ${
                otpLoading ? "bg-[#1A3A5C]/60" : "bg-[#1A3A5C]"
              }`}
            >
              {otpLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-sm">Xác nhận kích hoạt</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowVerifyModal(false)}
              className="py-2 items-center"
            >
              <Text className="text-gray-400 text-xs">Để sau</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

interface FieldProps {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  error?: string;
  keyboardType?: TextInput["props"]["keyboardType"];
  autoCapitalize?: TextInput["props"]["autoCapitalize"];
}

function Field({
  label,
  icon,
  placeholder,
  value,
  onChangeText,
  error,
  keyboardType = "default",
  autoCapitalize = "words",
}: FieldProps) {
  return (
    <View className="mb-5">
      <Text className="text-gray-700 text-sm font-medium mb-1.5">{label}</Text>
      <View
        className={`flex-row items-center border rounded-xl px-4 bg-gray-50 ${
          error ? "border-red-400" : "border-gray-200"
        }`}
      >
        <Ionicons name={icon} size={18} color="#6B7280" />
        <TextInput
          className="flex-1 h-12 ml-3 text-gray-800 text-base"
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
      </View>
      {error && <Text className="text-red-500 text-xs mt-1">{error}</Text>}
    </View>
  );
}
