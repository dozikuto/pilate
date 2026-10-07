import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useAuthStore } from "@/store/auth.store";
import apiClient from "@/lib/axios";
import {
  useDashboardStats,
  useNotifications,
} from "@/hooks/usePackages";
import { useUpcomingClasses } from "@/hooks/useSchedules";
import StatsCard from "@/components/StatsCard";
import ClassCard from "@/components/ClassCard";
import { formatDate, formatRelativeTime } from "@/lib/utils";

export default function HomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useDashboardStats();

  const {
    data: upcoming,
    isLoading: upcomingLoading,
    refetch: refetchUpcoming,
  } = useUpcomingClasses();

  const {
    data: notifications,
    isLoading: notiLoading,
    refetch: refetchNoti,
  } = useNotifications();

  const [refreshing, setRefreshing] = useState(false);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<"service" | "instructor">("service");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const handleSubmitReview = async () => {
    setReviewSubmitting(true);
    try {
      await apiClient.post("/reviews", {
        targetType: reviewTarget,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });
      setReviewSuccess(true);
      setTimeout(() => {
        setReviewSuccess(false);
        setShowReviewModal(false);
        setReviewComment("");
        setReviewRating(5);
      }, 1500);
    } catch (err: any) {
      Alert.alert("Lỗi", err?.response?.data?.message || "Không thể gửi đánh giá lúc này");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchStats(), refetchUpcoming(), refetchNoti()]);
    setRefreshing(false);
  }, [refetchStats, refetchUpcoming, refetchNoti]);

  const firstName = user?.fullName?.split(" ").pop() ?? "bạn";
  const greeting = getGreeting();

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#1A3A5C"
            colors={["#1A3A5C"]}
          />
        }
      >
        
        <View className="bg-[#1A3A5C] px-5 pt-5 pb-8">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="w-11 h-11 rounded-full bg-white/20 items-center justify-center overflow-hidden">
                {user?.avatarUrl ? (
                  <Image
                    source={{ uri: user.avatarUrl }}
                    className="w-11 h-11"
                  />
                ) : (
                  <Ionicons name="person" size={22} color="white" />
                )}
              </View>
              <View>
                <Text className="text-blue-200 text-xs">{greeting}</Text>
                <Text className="text-white text-base font-bold">
                  {firstName}!
                </Text>
              </View>
            </View>
            <TouchableOpacity className="w-10 h-10 bg-white/15 rounded-full items-center justify-center">
              <Ionicons name="notifications-outline" size={20} color="white" />
              {notifications && notifications.filter((n) => !n.isRead).length > 0 && (
                <View className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#C0392B] rounded-full" />
              )}
            </TouchableOpacity>
          </View>

          <Text className="text-white text-xl font-bold mt-5 mb-1">
            Xin chào, {user?.fullName ?? "học viên"} 👋
          </Text>
          <Text className="text-blue-200 text-sm">
            Hãy duy trì thói quen tập luyện mỗi ngày!
          </Text>
        </View>

        <View className="px-4 -mt-4">
          <View className="flex-row gap-3 mb-3">
            <StatsCard
              label="Buổi còn lại"
              value={statsLoading ? "—" : (stats?.remainingSessions ?? 0)}
              accent
              icon={<Ionicons name="fitness-outline" size={20} color="white" />}
              subLabel={stats?.remainingSessions === 0 ? "Hết buổi tập" : undefined}
            />
            <StatsCard
              label="Ngày hết hạn"
              value={
                statsLoading
                  ? "—"
                  : stats?.packageExpiresAt
                  ? formatDate(stats.packageExpiresAt)
                  : "Chưa có gói"
              }
              icon={
                <Ionicons name="calendar-outline" size={20} color="#1A3A5C" />
              }
            />
          </View>
          <View className="flex-row gap-3">
            <StatsCard
              label="Tổng buổi đã tham gia"
              value={statsLoading ? "—" : (stats?.totalAttended ?? 0)}
              icon={
                <Ionicons name="checkmark-circle-outline" size={20} color="#1A3A5C" />
              }
            />
            <StatsCard
              label="Lớp sắp tới"
              value={
                statsLoading
                  ? "—"
                  : stats?.nextClass?.className?.substring(0, 12) ?? "Chưa có"
              }
              icon={<Ionicons name="time-outline" size={20} color="#1A3A5C" />}
              subLabel={
                stats?.nextClass
                  ? formatDate(stats.nextClass.startTime)
                  : undefined
              }
            />
          </View>
        </View>

        <View className="mt-6 px-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-[#1A3A5C] text-base font-bold">
              Lớp học sắp tới
            </Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/schedule")}>
              <Text className="text-[#C0392B] text-sm font-medium">Xem tất cả</Text>
            </TouchableOpacity>
          </View>

          {upcomingLoading ? (
            <View className="bg-white rounded-2xl p-6 items-center">
              <Text className="text-gray-400 text-sm">Đang tải...</Text>
            </View>
          ) : upcoming && upcoming.length > 0 ? (
            upcoming.map((cls: any) => (
              <ClassCard key={cls.id} schedule={cls} showDate />
            ))
          ) : (
            <View className="bg-white rounded-2xl p-6 items-center border border-gray-100">
              <Ionicons name="calendar-outline" size={32} color="#D1D5DB" />
              <Text className="text-gray-400 text-sm mt-2">
                Không có lớp học sắp tới
              </Text>
            </View>
          )}
        </View>

        <View className="mt-6 px-4">
          <TouchableOpacity
            onPress={() => setShowReviewModal(true)}
            activeOpacity={0.85}
            className="bg-amber-50 rounded-2xl p-4 border border-amber-200 flex-row items-center justify-between"
          >
            <View className="flex-1 mr-3">
              <View className="flex-row items-center gap-1.5 mb-1">
                <Text className="text-amber-800 font-bold text-sm">
                  Đánh giá dịch vụ & HLV
                </Text>
                <View className="flex-row">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Ionicons key={s} name="star" size={13} color="#D97706" />
                  ))}
                </View>
              </View>
              <Text className="text-amber-700 text-xs">
                Góp ý của bạn giúp PilatesMS nâng cao chất lượng dịch vụ mỗi ngày!
              </Text>
            </View>
            <View className="bg-amber-500 px-3 py-2 rounded-xl">
              <Text className="text-white text-xs font-bold">Đánh giá</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View className="mt-6 px-4 mb-8">
          <Text className="text-[#1A3A5C] text-base font-bold mb-3">
            Thông báo mới nhất
          </Text>

          {notiLoading ? (
            <View className="bg-white rounded-2xl p-6 items-center">
              <Text className="text-gray-400 text-sm">Đang tải...</Text>
            </View>
          ) : notifications && notifications.length > 0 ? (
            <View className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
              {notifications.map((noti, idx) => (
                <View
                  key={noti.id}
                  className={`flex-row p-4 ${
                    idx < notifications.length - 1
                      ? "border-b border-gray-100"
                      : ""
                  } ${!noti.isRead ? "bg-blue-50/50" : ""}`}
                >
                  <View
                    className={`w-9 h-9 rounded-full items-center justify-center mr-3 ${
                      noti.type === "warning"
                        ? "bg-yellow-100"
                        : noti.type === "success"
                        ? "bg-green-100"
                        : "bg-blue-100"
                    }`}
                  >
                    <Ionicons
                      name={
                        noti.type === "warning"
                          ? "warning-outline"
                          : noti.type === "success"
                          ? "checkmark-circle-outline"
                          : "information-circle-outline"
                      }
                      size={18}
                      color={
                        noti.type === "warning"
                          ? "#D97706"
                          : noti.type === "success"
                          ? "#059669"
                          : "#2563EB"
                      }
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-gray-800">
                      {noti.title}
                    </Text>
                    <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={2}>
                      {noti.message}
                    </Text>
                    <Text className="text-xs text-gray-400 mt-1">
                      {formatRelativeTime(noti.createdAt)}
                    </Text>
                  </View>
                  {!noti.isRead && (
                    <View className="w-2 h-2 rounded-full bg-[#1A3A5C] mt-1" />
                  )}
                </View>
              ))}
            </View>
          ) : (
            <View className="bg-white rounded-2xl p-6 items-center border border-gray-100">
              <Ionicons name="notifications-off-outline" size={32} color="#D1D5DB" />
              <Text className="text-gray-400 text-sm mt-2">Chưa có thông báo</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={showReviewModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 pb-10">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-[#1A3A5C] text-lg font-bold">
                Đánh giá chất lượng dịch vụ
              </Text>
              <TouchableOpacity
                onPress={() => setShowReviewModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <Ionicons name="close" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {reviewSuccess ? (
              <View className="py-8 items-center">
                <Ionicons name="checkmark-circle" size={56} color="#059669" />
                <Text className="text-green-700 text-base font-bold mt-3">
                  Gửi đánh giá thành công!
                </Text>
                <Text className="text-gray-500 text-xs mt-1 text-center">
                  Cảm ơn bạn đã đóng góp ý kiến quý báu cho PilatesMS.
                </Text>
              </View>
            ) : (
              <>
                <Text className="text-gray-600 text-xs mb-2 font-medium">
                  Bạn muốn đánh giá về:
                </Text>
                <View className="flex-row gap-2 mb-4">
                  <TouchableOpacity
                    onPress={() => setReviewTarget("service")}
                    className={`flex-1 py-2.5 rounded-xl items-center border ${
                      reviewTarget === "service"
                        ? "bg-[#1A3A5C] border-[#1A3A5C]"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        reviewTarget === "service" ? "text-white" : "text-gray-700"
                      }`}
                    >
                      Dịch vụ & Phòng tập
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setReviewTarget("instructor")}
                    className={`flex-1 py-2.5 rounded-xl items-center border ${
                      reviewTarget === "instructor"
                        ? "bg-[#1A3A5C] border-[#1A3A5C]"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-xs font-bold ${
                        reviewTarget === "instructor" ? "text-white" : "text-gray-700"
                      }`}
                    >
                      Huấn luyện viên
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text className="text-gray-600 text-xs mb-2 font-medium text-center">
                  Mức độ hài lòng:
                </Text>
                <View className="flex-row justify-center gap-3 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setReviewRating(star)}
                      className="p-1"
                    >
                      <Ionicons
                        name={star <= reviewRating ? "star" : "star-outline"}
                        size={34}
                        color={star <= reviewRating ? "#F59E0B" : "#D1D5DB"}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <Text className="text-gray-600 text-xs mb-1 font-medium">
                  Ý kiến đóng góp (tùy chọn):
                </Text>
                <TextInput
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  placeholder="Chia sẻ cảm nhận về lớp học, cơ sở vật chất, thái độ phục vụ..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm text-gray-800 min-h-[90px] mb-5"
                />

                <TouchableOpacity
                  onPress={handleSubmitReview}
                  disabled={reviewSubmitting}
                  className="bg-[#1A3A5C] py-3.5 rounded-xl items-center active:opacity-90"
                >
                  {reviewSubmitting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-bold text-sm">
                      Gửi đánh giá
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Chào buổi sáng ☀️";
  if (hour < 18) return "Chào buổi chiều 🌤️";
  return "Chào buổi tối 🌙";
}
