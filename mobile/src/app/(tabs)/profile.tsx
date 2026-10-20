import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/auth.store";
import { useDashboardStats } from "@/hooks/usePackages";
import apiClient from "@/lib/axios";
import { notifyAlert } from "@/lib/alert";
import { passwordChangeRequest } from "@/lib/passwordChange";

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  onPress: () => void;
  danger?: boolean;
  right?: React.ReactNode;
}

function MenuRow({ icon, label, sublabel, onPress, danger, right }: MenuItem) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center px-4 py-4"
      activeOpacity={0.7}
    >
      <View
        className={`w-9 h-9 rounded-xl items-center justify-center mr-3 ${
          danger ? "bg-red-100" : "bg-gray-100"
        }`}
      >
        <Ionicons
          name={icon}
          size={18}
          color={danger ? "#DC2626" : "#1A3A5C"}
        />
      </View>
      <View className="flex-1">
        <Text
          className={`text-sm font-medium ${
            danger ? "text-red-600" : "text-gray-800"
          }`}
        >
          {label}
        </Text>
        {sublabel && (
          <Text className="text-xs text-gray-400 mt-0.5">{sublabel}</Text>
        )}
      </View>
      {right ?? (
        <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
      )}
    </TouchableOpacity>
  );
}

function ChangePasswordModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!oldPwd || !newPwd || !confirmPwd) {
      notifyAlert("Thiếu thông tin", "Vui lòng điền đầy đủ các trường.");
      return;
    }
    if (newPwd.length < 8) {
      notifyAlert("Lỗi", "Mật khẩu mới tối thiểu 8 ký tự.");
      return;
    }
    if (newPwd !== confirmPwd) {
      notifyAlert("Lỗi", "Mật khẩu xác nhận không khớp.");
      return;
    }
    setLoading(true);
    try {
      await apiClient.put("/auth/change-password", passwordChangeRequest(oldPwd, newPwd, confirmPwd));
      notifyAlert("Thành công", "Đổi mật khẩu thành công!");
      setOldPwd("");
      setNewPwd("");
      setConfirmPwd("");
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "Đổi mật khẩu thất bại.";
      notifyAlert("Lỗi", Array.isArray(msg) ? msg.join("\n") : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <View className="px-5 pt-5 pb-4 flex-row items-center justify-between border-b border-gray-100">
          <Text className="text-[#1A3A5C] text-xl font-bold">Đổi mật khẩu</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-5 pt-6">
          {[
            {
              label: "Mật khẩu hiện tại",
              value: oldPwd,
              setter: setOldPwd,
            },
            { label: "Mật khẩu mới", value: newPwd, setter: setNewPwd },
            {
              label: "Xác nhận mật khẩu mới",
              value: confirmPwd,
              setter: setConfirmPwd,
            },
          ].map(({ label, value, setter }) => (
            <View key={label} className="mb-5">
              <Text className="text-gray-700 text-sm font-medium mb-1.5">
                {label}
              </Text>
              <View className="flex-row items-center border border-gray-200 rounded-xl px-4 bg-gray-50">
                <Ionicons name="lock-closed-outline" size={16} color="#9CA3AF" />
                <TextInput
                  accessibilityLabel={label}
                  className="flex-1 h-12 ml-3 text-gray-800"
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry
                  value={value}
                  onChangeText={setter}
                />
              </View>
            </View>
          ))}

          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            className={`rounded-xl py-4 items-center mt-2 ${
              loading ? "bg-[#1A3A5C]/60" : "bg-[#1A3A5C]"
            }`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold">Cập nhật</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function EditProfileModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [healthNote, setHealthNote] = useState(user?.healthNote ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      const res = await apiClient.put<{ data: typeof user }>("/members/me", {
        fullName,
        phone,
        healthNotes: healthNote,
      });
      const profile: any = res.data?.data ?? res.data;
      updateUser({ ...profile.user, healthNote: profile.healthNotes } as any);
      notifyAlert("Thành công", "Cập nhật hồ sơ thành công!");
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Cập nhật thất bại.";
      notifyAlert("Lỗi", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-white" edges={["top"]}>
        <View className="px-5 pt-5 pb-4 flex-row items-center justify-between border-b border-gray-100">
          <Text className="text-[#1A3A5C] text-xl font-bold">
            Thông tin cá nhân
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-5 pt-6">
          
          <View className="mb-5">
            <Text className="text-gray-700 text-sm font-medium mb-1.5">
              Họ và tên
            </Text>
            <View className="flex-row items-center border border-gray-200 rounded-xl px-4 bg-gray-50">
              <Ionicons name="person-outline" size={16} color="#9CA3AF" />
              <TextInput
                className="flex-1 h-12 ml-3 text-gray-800"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Nguyễn Văn A"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>

          <View className="mb-5">
            <Text className="text-gray-700 text-sm font-medium mb-1.5">
              Email (không thể thay đổi)
            </Text>
            <View className="flex-row items-center border border-gray-100 rounded-xl px-4 bg-gray-100">
              <Ionicons name="mail-outline" size={16} color="#9CA3AF" />
              <Text className="flex-1 h-12 ml-3 text-gray-400 leading-[48px]">
                {user?.email}
              </Text>
            </View>
          </View>

          <View className="mb-5">
            <Text className="text-gray-700 text-sm font-medium mb-1.5">
              Số điện thoại
            </Text>
            <View className="flex-row items-center border border-gray-200 rounded-xl px-4 bg-gray-50">
              <Ionicons name="call-outline" size={16} color="#9CA3AF" />
              <TextInput
                className="flex-1 h-12 ml-3 text-gray-800"
                value={phone}
                onChangeText={setPhone}
                placeholder="0901234567"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View className="mb-6">
            <Text className="text-gray-700 text-sm font-medium mb-1.5">
              Ghi chú sức khỏe
            </Text>
            <TextInput
              className="border border-gray-200 rounded-xl px-4 py-3 bg-gray-50 text-gray-800 text-sm min-h-[100px]"
              value={healthNote}
              onChangeText={setHealthNote}
              placeholder="Dị ứng, chấn thương, điều kiện đặc biệt..."
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={loading}
            className={`rounded-xl py-4 items-center ${
              loading ? "bg-[#1A3A5C]/60" : "bg-[#1A3A5C]"
            }`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold">Lưu thay đổi</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const user = useAuthStore((s) => s.user);
  const { data: stats } = useDashboardStats();

  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  function handleLogout() {
    setShowLogoutModal(true);
  }

  async function performLogout(redirectToRegister = false) {
    setIsLoggingOut(true);
    try {
      await logout();
      setShowLogoutModal(false);
      if (redirectToRegister) {
        router.replace("/(auth)/register");
      }
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        
        <View className="bg-[#1A3A5C] pt-6 pb-10 px-5 items-center">
          <View className="w-24 h-24 rounded-full bg-white/20 border-4 border-white/30 items-center justify-center mb-4 overflow-hidden">
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} className="w-24 h-24" />
            ) : (
              <Ionicons name="person" size={44} color="white" />
            )}
          </View>
          <Text className="text-white text-xl font-bold">
            {user?.fullName ?? "—"}
          </Text>
          <Text className="text-blue-200 text-sm mt-1">{user?.email}</Text>
          <View className="flex-row items-center gap-1.5 mt-2 bg-white/15 px-3 py-1.5 rounded-full">
            <Ionicons name="card-outline" size={13} color="#93C5FD" />
            <Text className="text-blue-200 text-xs font-medium">
              Mã HV: {user?.memberCode ?? "—"}
            </Text>
          </View>
        </View>

        <View className="mx-4 -mt-5 bg-white rounded-2xl shadow-sm border border-gray-100 flex-row">
          <View className="flex-1 items-center py-4">
            <Text className="text-2xl font-bold text-[#1A3A5C]">
              {stats?.totalAttended ?? 0}
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5">Buổi đã tham gia</Text>
          </View>
          <View className="w-px bg-gray-100" />
          <View className="flex-1 items-center py-4">
            <Text className="text-2xl font-bold text-[#1A3A5C]">
              {stats?.remainingSessions ?? 0}
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5">Buổi còn lại</Text>
          </View>
          <View className="w-px bg-gray-100" />
          <View className="flex-1 items-center py-4">
            <View className="w-8 h-8 rounded-full bg-green-100 items-center justify-center">
              <Ionicons name="checkmark" size={16} color="#059669" />
            </View>
            <Text className="text-xs text-gray-500 mt-1">Đang hoạt động</Text>
          </View>
        </View>

        <View className="mx-4 mt-5 bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          <Text className="text-xs font-semibold text-gray-400 uppercase px-4 pt-4 pb-2 tracking-wide">
            Tài khoản
          </Text>
          <MenuRow
            icon="person-circle-outline"
            label="Thông tin cá nhân"
            sublabel="Họ tên, SĐT, ghi chú sức khỏe"
            onPress={() => setShowEditProfile(true)}
          />
          <View className="h-px bg-gray-100 ml-16" />
          <MenuRow
            icon="lock-closed-outline"
            label="Đổi mật khẩu"
            onPress={() => setShowChangePwd(true)}
          />
        </View>

        <View className="mx-4 mt-4 bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
          <Text className="text-xs font-semibold text-gray-400 uppercase px-4 pt-4 pb-2 tracking-wide">
            Cài đặt
          </Text>
          <MenuRow
            icon="help-circle-outline"
            label="Trợ giúp & Hỗ trợ"
            onPress={() => notifyAlert("Liên hệ hỗ trợ", "Email: support@pilatesms.vn\nHotline: 1900 1234")}
          />
          <View className="h-px bg-gray-100 ml-16" />
          <MenuRow
            icon="document-text-outline"
            label="Điều khoản sử dụng"
            onPress={() => notifyAlert("Điều khoản", "Hệ thống quản lý phòng tập Pilates PilatesMS.")}
          />
        </View>

        <Text className="text-center text-xs text-gray-400 mt-4">
          PilatesMS v1.0.0
        </Text>

        <View className="mx-4 mt-4 mb-8 space-y-2.5">
          <TouchableOpacity
            onPress={() => performLogout(true)}
            className="bg-blue-50 border border-blue-200 rounded-2xl py-3.5 items-center flex-row justify-center gap-2 active:opacity-80 mb-2.5"
          >
            <Ionicons name="person-add-outline" size={18} color="#1A3A5C" />
            <Text className="text-[#1A3A5C] font-bold text-sm">Đăng ký tài khoản khác</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogout}
            className="bg-red-50 border border-red-200 rounded-2xl py-3.5 items-center flex-row justify-center gap-2 active:opacity-80"
          >
            <Ionicons name="log-out-outline" size={18} color="#DC2626" />
            <Text className="text-red-600 font-bold text-sm">Đăng xuất</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <EditProfileModal
        visible={showEditProfile}
        onClose={() => setShowEditProfile(false)}
      />
      <ChangePasswordModal
        visible={showChangePwd}
        onClose={() => setShowChangePwd(false)}
      />

      <Modal
        visible={showLogoutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLogoutModal(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-4">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl items-center">
            <View className="w-14 h-14 bg-red-50 rounded-2xl items-center justify-center mb-3">
              <Ionicons name="log-out" size={28} color="#DC2626" />
            </View>
            <Text className="text-xl font-bold text-[#1A3A5C] text-center mb-1">
              Đăng xuất tài khoản
            </Text>
            <Text className="text-xs text-gray-500 text-center mb-6">
              Bạn có chắc chắn muốn đăng xuất khỏi tài khoản {user?.fullName || "hiện tại"} không?
            </Text>

            <TouchableOpacity
              onPress={() => performLogout(true)}
              disabled={isLoggingOut}
              className="w-full bg-[#1A3A5C] py-3.5 rounded-xl items-center mb-2.5 active:opacity-90 flex-row justify-center gap-2"
            >
              {isLoggingOut ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Ionicons name="person-add" size={16} color="white" />
                  <Text className="text-white font-bold text-sm">Đăng ký tài khoản khác</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => performLogout(false)}
              disabled={isLoggingOut}
              className="w-full bg-red-50 border border-red-200 py-3 rounded-xl items-center mb-2.5 active:opacity-80 flex-row justify-center gap-2"
            >
              <Ionicons name="log-out-outline" size={16} color="#DC2626" />
              <Text className="text-red-600 font-semibold text-xs">Đăng xuất</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowLogoutModal(false)}
              disabled={isLoggingOut}
              className="w-full py-2.5 items-center"
            >
              <Text className="text-gray-400 text-xs">Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
