import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  TextInput,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import {
  useMyPackages,
  useAvailablePackages,
  usePurchasePackage,
  useAttendanceHistory,
} from "@/hooks/usePackages";
import { useAuthStore } from "@/store/auth.store";
import apiClient from "@/lib/axios";
import { MemberPackageCard } from "@/components/PackageCard";
import PackageCard from "@/components/PackageCard";
import { formatDate, formatTime, formatVND } from "@/lib/utils";

interface PromotionResult {
  code: string;
  name: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
}

export default function MyPackagesScreen() {
  const [showStore, setShowStore] = useState(false);
  const [storeStep, setStoreStep] = useState<"list" | "checkout" | "success">("list");
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [viewMode, setViewMode] = useState<"packages" | "transactions">("packages");
  const [transactionsList, setTransactionsList] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  async function fetchTransactions() {
    setTxLoading(true);
    try {
      const res = await apiClient.get<any>("/transactions");
      const items = res.data?.data?.items || res.data?.data || (Array.isArray(res.data) ? res.data : []);
      if (Array.isArray(items)) {
        setTransactionsList(
          items.map((it: any) => {
            const rawNote = it.notes || "";
            const pkgNameFromNote = rawNote.startsWith("Thanh toán mua gói ")
              ? rawNote.replace("Thanh toán mua gói ", "")
              : null;
            return {
              id: it.id,
              code: it.referenceCode || `TX-${it.id.slice(0, 8).toUpperCase()}`,
              packageName: it.packageName || it.package?.name || pkgNameFromNote || "Gói tập Pilates",
              amount: Number(it.finalAmount ?? it.amount ?? 0),
              paymentMethod: it.paymentMethod || "vietqr",
              paymentStatus: it.paymentStatus || "completed",
              createdAt: it.createdAt ? it.createdAt.replace("T", " ").slice(0, 16) : "Gần đây",
            };
          })
        );
      }
    } catch (e) {
      console.error("fetchTransactions error:", e);
    } finally {
      setTxLoading(false);
    }
  }

  const [voucherCode, setVoucherCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<PromotionResult | null>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);

  const [paymentMethod, setPaymentMethod] = useState<"bank_transfer" | "cash" | "credit_card">("bank_transfer");

  const [lastPurchaseResult, setLastPurchaseResult] = useState<any>(null);

  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);

  const router = useRouter();
  const { user, isAuthenticated, login } = useAuthStore();

  const {
    data: myPackages,
    isLoading: pkgsLoading,
    refetch: refetchPkgs,
  } = useMyPackages();

  const { data: attendance, refetch: refetchAttendance } =
    useAttendanceHistory(5);

  const { data: available, isLoading: availableLoading } =
    useAvailablePackages();

  const purchaseMutation = usePurchasePackage();

  useEffect(() => {
    if (isAuthenticated) {
      fetchTransactions();
    }
  }, [isAuthenticated]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchPkgs(), refetchAttendance(), fetchTransactions()]);
    setRefreshing(false);
  }, [refetchPkgs, refetchAttendance]);

  function handleSelectPackage(pkg: any) {
    setSelectedPackage(pkg);
    setVoucherCode("");
    setAppliedPromo(null);
    setVoucherError(null);
    setCheckoutError(null);
    setPaymentMethod("bank_transfer");

    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    setStoreStep("checkout");
  }

  async function handleApplyVoucher(codeToApply?: string) {
    const code = (codeToApply ?? voucherCode).trim().toUpperCase();
    if (!code) {
      setVoucherError("Vui lòng nhập mã giảm giá");
      return;
    }

    if (!selectedPackage) return;

    setVoucherLoading(true);
    setVoucherError(null);

    try {
      const res = await apiClient.post<any>("/promotions/apply", {
        code,
        orderAmount: Number(selectedPackage.price) || 0,
      });

      const promoData = res.data?.data ?? res.data;
      setAppliedPromo(promoData);
      setVoucherCode(code);
      setVoucherError(null);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "Mã khuyến mãi không hợp lệ hoặc đã hết hạn";
      setVoucherError(Array.isArray(msg) ? msg[0] : msg);
      setAppliedPromo(null);
    } finally {
      setVoucherLoading(false);
    }
  }

  function handleRemoveVoucher() {
    setAppliedPromo(null);
    setVoucherCode("");
    setVoucherError(null);
  }

  async function handleConfirmPurchase() {
    if (!selectedPackage) return;

    if (!isAuthenticated) {
      setCheckoutError("Vui lòng đăng nhập tài khoản học viên để tiến hành thanh toán.");
      setShowAuthModal(true);
      return;
    }

    setCheckoutError(null);
    const originalPrice = Number(selectedPackage.price) || 0;
    const discountAmount = appliedPromo ? Number(appliedPromo.discountAmount) : 0;
    const finalAmount = appliedPromo ? Number(appliedPromo.finalAmount) : originalPrice;

    try {
      const result = await purchaseMutation.mutateAsync({
        packageId: selectedPackage.id,
        voucherCode: appliedPromo?.code,
        discountAmount,
        finalAmount,
        paymentMethod,
      });

      setLastPurchaseResult({
        packageName: selectedPackage.name,
        totalSessions: selectedPackage.totalSessions,
        durationDays: selectedPackage.durationDays || selectedPackage.validDays || 30,
        originalPrice,
        discountAmount,
        finalAmount,
        paymentMethod,
        expiryDate: result?.expiryDate,
        transactionId: result?.transactionId,
      });

      await refetchPkgs();
      await fetchTransactions();
      setStoreStep("success");
    } catch (err: any) {
      const is401 = err?.response?.status === 401;
      const msg = is401
        ? "Phiên đăng nhập đã hết hạn hoặc chưa đăng nhập. Vui lòng đăng nhập tài khoản học viên để thanh toán."
        : (err?.response?.data?.message ?? "Thanh toán mua gói thất bại. Vui lòng thử lại.");
      const displayMsg = Array.isArray(msg) ? msg[0] : msg;
      setCheckoutError(displayMsg);
      if (is401) {
        setShowAuthModal(true);
      }
    }
  }

  async function handleCloseModal() {
    setShowStore(false);
    setStoreStep("list");
    setSelectedPackage(null);
    setAppliedPromo(null);
    setVoucherError(null);
    await refetchPkgs();
    await fetchTransactions();
  }

  const originalPrice = selectedPackage ? Number(selectedPackage.price) || 0 : 0;
  const discountAmount = appliedPromo ? Number(appliedPromo.discountAmount) || 0 : 0;
  const finalPrice = appliedPromo ? Number(appliedPromo.finalAmount) || 0 : originalPrice;
  const days = selectedPackage
    ? selectedPackage.durationDays ?? selectedPackage.validDays ?? 30
    : 30;

  const qrTransferMemo = `PILATES ${user?.phone || 'MEMBER'} ${selectedPackage?.id ? selectedPackage.id.slice(0, 6).toUpperCase() : ''}`;
  const vietQrUrl = `https://img.vietqr.io/image/MB-888899992026-compact2.png?amount=${finalPrice}&addInfo=${encodeURIComponent(
    qrTransferMemo
  )}&accountName=CONG%20TY%20PILATES%20VIETNAM`;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      
      <View className="bg-[#1A3A5C] px-5 pt-5 pb-3 flex-row items-center justify-between">
        <View>
          <Text className="text-white text-xl font-bold">Gói tập & Giao dịch</Text>
          <Text className="text-blue-200 text-xs mt-0.5">
            Quản lý gói tập và lịch sử thanh toán
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            setStoreStep("list");
            setShowStore(true);
          }}
          className="flex-row items-center gap-1.5 bg-white/20 px-3 py-2 rounded-xl active:opacity-80"
        >
          <Ionicons name="add-circle-outline" size={18} color="white" />
          <Text className="text-white text-sm font-semibold">Mua thêm</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row bg-[#1A3A5C] px-4 pb-3 gap-2">
        <TouchableOpacity
          onPress={() => setViewMode("packages")}
          className={`flex-1 py-2 rounded-xl items-center justify-center ${
            viewMode === "packages" ? "bg-white" : "bg-white/15"
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              viewMode === "packages" ? "text-[#1A3A5C]" : "text-white"
            }`}
          >
            Gói tập của tôi
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setViewMode("transactions");
            fetchTransactions();
          }}
          className={`flex-1 py-2 rounded-xl items-center justify-center ${
            viewMode === "transactions" ? "bg-white" : "bg-white/15"
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              viewMode === "transactions" ? "text-[#1A3A5C]" : "text-white"
            }`}
          >
            Lịch sử giao dịch
          </Text>
        </TouchableOpacity>
      </View>

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
        {viewMode === "packages" ? (
          <>
            
            <View className="px-4 pt-5">
              <Text className="text-[#1A3A5C] text-base font-bold mb-3">
                Gói đang sử dụng
              </Text>

              {pkgsLoading ? (
                <View className="bg-white rounded-2xl p-8 items-center">
                  <ActivityIndicator color="#1A3A5C" />
                </View>
              ) : myPackages && myPackages.length > 0 ? (
                myPackages.map((mp: any) => (
                  <MemberPackageCard key={mp.id} memberPackage={mp} />
                ))
              ) : (
                <View className="bg-white rounded-2xl p-8 items-center border border-gray-100">
                  <Ionicons name="card-outline" size={40} color="#D1D5DB" />
                  <Text className="text-gray-400 text-sm mt-3 text-center">
                    Bạn chưa có gói tập nào.{"\n"}Mua gói để bắt đầu!
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setStoreStep("list");
                      setShowStore(true);
                    }}
                    className="mt-4 bg-[#1A3A5C] px-6 py-2.5 rounded-xl active:opacity-80"
                  >
                    <Text className="text-white font-semibold text-sm">
                      Xem các gói tập
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View className="px-4 mt-6 mb-8">
              <Text className="text-[#1A3A5C] text-base font-bold mb-3">
                Lịch sử tham gia (5 buổi gần nhất)
              </Text>

              {attendance && attendance.length > 0 ? (
                <View className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
                  {attendance.map((record: any, idx: number) => (
                    <View
                      key={record.id}
                      className={`flex-row items-center p-4 ${
                        idx < attendance.length - 1 ? "border-b border-gray-100" : ""
                      }`}
                    >
                      <View
                        className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                          record.status === "present"
                            ? "bg-green-100"
                            : record.status === "late"
                            ? "bg-yellow-100"
                            : "bg-red-100"
                        }`}
                      >
                        <Ionicons
                          name={
                            record.status === "present"
                              ? "checkmark-circle"
                              : record.status === "late"
                              ? "time"
                              : "close-circle"
                          }
                          size={20}
                          color={
                            record.status === "present"
                              ? "#059669"
                              : record.status === "late"
                              ? "#D97706"
                              : "#DC2626"
                          }
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-sm font-semibold text-gray-800">
                          {record.classSchedule?.className || "Lớp Pilates"}
                        </Text>
                        <Text className="text-xs text-gray-500 mt-0.5">
                          {formatDate(record.checkedInAt)} •{" "}
                          {formatTime(record.checkedInAt)}
                        </Text>
                      </View>
                      <View
                        className={`px-2 py-0.5 rounded-full ${
                          record.status === "present"
                            ? "bg-green-100"
                            : record.status === "late"
                            ? "bg-yellow-100"
                            : "bg-red-100"
                        }`}
                      >
                        <Text
                          className={`text-xs font-medium ${
                            record.status === "present"
                              ? "text-green-700"
                              : record.status === "late"
                              ? "text-yellow-700"
                              : "text-red-700"
                          }`}
                        >
                          {record.status === "present"
                            ? "Có mặt"
                            : record.status === "late"
                            ? "Muộn"
                            : "Vắng"}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View className="bg-white rounded-2xl p-8 items-center border border-gray-100">
                  <Ionicons name="list-outline" size={32} color="#D1D5DB" />
                  <Text className="text-gray-400 text-sm mt-2">
                    Chưa có lịch sử tham gia
                  </Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <View className="px-4 pt-5 pb-8">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-[#1A3A5C] text-base font-bold">
                Lịch sử nạp tiền & mua gói ({transactionsList.length})
              </Text>
              <TouchableOpacity onPress={fetchTransactions} className="p-1">
                <Ionicons name="refresh-outline" size={18} color="#1A3A5C" />
              </TouchableOpacity>
            </View>

            {txLoading ? (
              <View className="bg-white rounded-2xl p-8 items-center">
                <ActivityIndicator color="#1A3A5C" />
                <Text className="text-gray-400 text-xs mt-2">Đang tải lịch sử giao dịch...</Text>
              </View>
            ) : transactionsList.length === 0 ? (
              <View className="bg-white rounded-2xl p-8 items-center border border-gray-100">
                <Ionicons name="receipt-outline" size={40} color="#D1D5DB" />
                <Text className="text-gray-400 text-sm mt-3 text-center">
                  Chưa có giao dịch thanh toán nào
                </Text>
              </View>
            ) : (
              transactionsList.map((tx) => (
                <View
                  key={tx.id}
                  className="bg-white rounded-2xl p-4 mb-3 border border-gray-100 shadow-sm"
                >
                  <View className="flex-row justify-between items-center pb-2.5 border-b border-gray-100 mb-2.5">
                    <View className="flex-row items-center gap-1.5">
                      <Ionicons name="receipt" size={16} color="#1A3A5C" />
                      <Text className="text-xs font-semibold text-gray-700">{tx.code}</Text>
                    </View>
                    <View
                      className={`px-2.5 py-0.5 rounded-full ${
                        tx.paymentStatus === "completed"
                          ? "bg-green-100"
                          : tx.paymentStatus === "pending"
                          ? "bg-amber-100"
                          : "bg-red-100"
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          tx.paymentStatus === "completed"
                            ? "text-green-700"
                            : tx.paymentStatus === "pending"
                            ? "text-amber-700"
                            : "text-red-700"
                        }`}
                      >
                        {tx.paymentStatus === "completed"
                          ? "Thành công"
                          : tx.paymentStatus === "pending"
                          ? "Chờ xác nhận"
                          : "Thất bại"}
                      </Text>
                    </View>
                  </View>

                  <Text className="text-sm font-bold text-gray-800 mb-1">{tx.packageName}</Text>

                  <View className="flex-row justify-between items-center mt-2">
                    <View>
                      <Text className="text-xs text-gray-400">
                        {tx.paymentMethod === "vietqr"
                          ? "VietQR Chuyển khoản"
                          : tx.paymentMethod === "bank_transfer"
                          ? "Chuyển khoản"
                          : "Tiền mặt"}
                      </Text>
                      <Text className="text-xs text-gray-400 mt-0.5">{tx.createdAt}</Text>
                    </View>
                    <Text className="text-base font-extrabold text-[#C0392B]">
                      {formatVND(tx.amount)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showStore}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}
      >
        <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
          
          <View className="bg-white px-5 py-4 flex-row items-center justify-between border-b border-gray-200">
            {storeStep === "checkout" ? (
              <TouchableOpacity
                onPress={() => setStoreStep("list")}
                className="flex-row items-center gap-1 active:opacity-70"
              >
                <Ionicons name="chevron-back" size={22} color="#1A3A5C" />
                <Text className="text-[#1A3A5C] text-sm font-semibold">Chọn gói khác</Text>
              </TouchableOpacity>
            ) : (
              <Text className="text-[#1A3A5C] text-xl font-bold">
                {storeStep === "success" ? "Kết quả giao dịch" : "Mua gói tập"}
              </Text>
            )}

            <TouchableOpacity onPress={handleCloseModal} className="p-1">
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {storeStep === "list" && (
            <ScrollView className="flex-1 px-4 pt-5" showsVerticalScrollIndicator={false}>
              <View className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-4">
                <Text className="text-xs text-[#1A3A5C] font-semibold uppercase tracking-wider mb-1">
                  🎁 Ưu đãi đặc biệt
                </Text>
                <Text className="text-sm text-gray-700">
                  Nhập mã <Text className="font-bold text-[#C0392B]">PILATES2026</Text> để được giảm ngay 10% khi mua gói tập!
                </Text>
              </View>

              {availableLoading ? (
                <View className="flex-1 items-center py-12">
                  <ActivityIndicator color="#1A3A5C" />
                </View>
              ) : available && available.length > 0 ? (
                available.map((pkg: any) => (
                  <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    onPurchase={handleSelectPackage}
                    isLoading={purchaseMutation.isPending}
                  />
                ))
              ) : (
                <View className="items-center py-12">
                  <Ionicons name="cube-outline" size={40} color="#D1D5DB" />
                  <Text className="text-gray-400 text-sm mt-3">
                    Hiện tại không có gói tập
                  </Text>
                </View>
              )}
              <View className="h-8" />
            </ScrollView>
          )}

          {storeStep === "checkout" && selectedPackage && (
            <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
              
              <View className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm mb-4">
                <View className="flex-row items-center justify-between pb-3 border-b border-gray-100">
                  <View className="flex-1 mr-2">
                    <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Gói đã chọn
                    </Text>
                    <Text className="text-lg font-bold text-[#1A3A5C] mt-0.5">
                      {selectedPackage.name}
                    </Text>
                  </View>
                  <View className="bg-blue-50 px-3 py-1 rounded-full">
                    <Text className="text-xs font-bold text-[#1A3A5C]">
                      {selectedPackage.totalSessions ?? 0} buổi
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center justify-between pt-3">
                  <View className="flex-row items-center gap-1.5">
                    <Ionicons name="time-outline" size={16} color="#6B7280" />
                    <Text className="text-sm text-gray-600">Thời hạn sử dụng: {days} ngày</Text>
                  </View>
                  <Text className="text-base font-bold text-gray-900">
                    {formatVND(originalPrice)}
                  </Text>
                </View>
              </View>

              <View className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm mb-4">
                <View className="flex-row items-center gap-2 mb-3">
                  <Ionicons name="pricetag-outline" size={18} color="#1A3A5C" />
                  <Text className="text-base font-bold text-[#1A3A5C]">
                    Mã khuyến mãi / Voucher
                  </Text>
                </View>

                <View className="flex-row gap-2">
                  <View className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 justify-center">
                    <TextInput
                      value={voucherCode}
                      onChangeText={(t) => {
                        setVoucherCode(t.toUpperCase());
                        if (voucherError) setVoucherError(null);
                      }}
                      placeholder="Nhập mã voucher (ví dụ: PILATES2026)"
                      placeholderTextColor="#9CA3AF"
                      autoCapitalize="characters"
                      editable={!appliedPromo}
                      style={{ fontSize: 14, color: "#1F2937", padding: 0 }}
                    />
                  </View>

                  {appliedPromo ? (
                    <TouchableOpacity
                      onPress={handleRemoveVoucher}
                      className="bg-red-50 border border-red-200 px-4 rounded-xl items-center justify-center active:opacity-80"
                    >
                      <Text className="text-red-600 font-semibold text-sm">Gỡ bỏ</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleApplyVoucher()}
                      disabled={voucherLoading || !voucherCode.trim()}
                      className={`px-5 rounded-xl items-center justify-center ${
                        voucherLoading || !voucherCode.trim()
                          ? "bg-gray-300"
                          : "bg-[#1A3A5C] active:opacity-80"
                      }`}
                    >
                      {voucherLoading ? (
                        <ActivityIndicator color="white" size="small" />
                      ) : (
                        <Text className="text-white font-bold text-sm">Áp dụng</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>

                {voucherError && (
                  <View className="flex-row items-center gap-1.5 mt-2 bg-red-50 p-2.5 rounded-xl border border-red-100">
                    <Ionicons name="alert-circle" size={16} color="#DC2626" />
                    <Text className="text-xs text-red-600 flex-1">{voucherError}</Text>
                  </View>
                )}

                {appliedPromo && (
                  <View className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2 flex-1">
                      <Ionicons name="checkmark-circle" size={20} color="#059669" />
                      <View className="flex-1">
                        <Text className="text-xs font-bold text-emerald-800">
                          {appliedPromo.code}: {appliedPromo.name}
                        </Text>
                        <Text className="text-xs text-emerald-600 mt-0.5">
                          Tiết kiệm được {formatVND(appliedPromo.discountAmount)}
                        </Text>
                      </View>
                    </View>
                    <View className="bg-emerald-200/60 px-2.5 py-1 rounded-full">
                      <Text className="text-xs font-bold text-emerald-800">
                        -{formatVND(appliedPromo.discountAmount)}
                      </Text>
                    </View>
                  </View>
                )}

                {!appliedPromo && (
                  <View className="mt-3 pt-3 border-t border-gray-100">
                    <Text className="text-xs text-gray-500 mb-2">Mã ưu đãi có sẵn:</Text>
                    <View className="flex-row flex-wrap gap-2">
                      <TouchableOpacity
                        onPress={() => handleApplyVoucher("PILATES2026")}
                        className="bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg flex-row items-center gap-1 active:opacity-75"
                      >
                        <Ionicons name="sparkles" size={12} color="#1A3A5C" />
                        <Text className="text-xs font-bold text-[#1A3A5C]">PILATES2026</Text>
                        <Text className="text-xs text-blue-600 font-medium">(Giảm 10%)</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleApplyVoucher("CHAOMUNG300")}
                        className="bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-lg flex-row items-center gap-1 active:opacity-75"
                      >
                        <Ionicons name="gift-outline" size={12} color="#D97706" />
                        <Text className="text-xs font-bold text-[#D97706]">CHAOMUNG300</Text>
                        <Text className="text-xs text-orange-600 font-medium">(-300k)</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              <View className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm mb-4">
                <Text className="text-base font-bold text-[#1A3A5C] mb-3">
                  Phương thức thanh toán
                </Text>

                <TouchableOpacity
                  onPress={() => setPaymentMethod("bank_transfer")}
                  className={`p-3 rounded-xl border flex-row items-center justify-between mb-2.5 ${
                    paymentMethod === "bank_transfer"
                      ? "bg-blue-50/50 border-[#1A3A5C]"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className={`w-9 h-9 rounded-full items-center justify-center ${
                        paymentMethod === "bank_transfer"
                          ? "bg-[#1A3A5C]"
                          : "bg-gray-100"
                      }`}
                    >
                      <Ionicons
                        name="qr-code-outline"
                        size={20}
                        color={paymentMethod === "bank_transfer" ? "white" : "#4B5563"}
                      />
                    </View>
                    <View>
                      <Text className="text-sm font-bold text-gray-900">
                        Chuyển khoản QR (VietQR)
                      </Text>
                      <Text className="text-xs text-gray-500">
                        Quét mã thanh toán qua mọi app ngân hàng
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={
                      paymentMethod === "bank_transfer"
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={20}
                    color={paymentMethod === "bank_transfer" ? "#1A3A5C" : "#9CA3AF"}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setPaymentMethod("cash")}
                  className={`p-3 rounded-xl border flex-row items-center justify-between mb-2.5 ${
                    paymentMethod === "cash"
                      ? "bg-blue-50/50 border-[#1A3A5C]"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className={`w-9 h-9 rounded-full items-center justify-center ${
                        paymentMethod === "cash" ? "bg-[#1A3A5C]" : "bg-gray-100"
                      }`}
                    >
                      <Ionicons
                        name="cash-outline"
                        size={20}
                        color={paymentMethod === "cash" ? "white" : "#4B5563"}
                      />
                    </View>
                    <View>
                      <Text className="text-sm font-bold text-gray-900">
                        Tiền mặt tại quầy lễ tân
                      </Text>
                      <Text className="text-xs text-gray-500">
                        Thanh toán trực tiếp khi đến tập
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={
                      paymentMethod === "cash"
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={20}
                    color={paymentMethod === "cash" ? "#1A3A5C" : "#9CA3AF"}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setPaymentMethod("credit_card")}
                  className={`p-3 rounded-xl border flex-row items-center justify-between ${
                    paymentMethod === "credit_card"
                      ? "bg-blue-50/50 border-[#1A3A5C]"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <View className="flex-row items-center gap-3">
                    <View
                      className={`w-9 h-9 rounded-full items-center justify-center ${
                        paymentMethod === "credit_card"
                          ? "bg-[#1A3A5C]"
                          : "bg-gray-100"
                      }`}
                    >
                      <Ionicons
                        name="card-outline"
                        size={20}
                        color={paymentMethod === "credit_card" ? "white" : "#4B5563"}
                      />
                    </View>
                    <View>
                      <Text className="text-sm font-bold text-gray-900">
                        Thẻ tín dụng / ATM
                      </Text>
                      <Text className="text-xs text-gray-500">
                        Hỗ trợ Visa, Mastercard, Napas
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={
                      paymentMethod === "credit_card"
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={20}
                    color={paymentMethod === "credit_card" ? "#1A3A5C" : "#9CA3AF"}
                  />
                </TouchableOpacity>
              </View>

              {paymentMethod === "bank_transfer" && (
                <View className="bg-white rounded-2xl p-4 border border-blue-200 shadow-sm mb-4">
                  <View className="flex-row items-center gap-2 mb-3">
                    <Ionicons name="business" size={18} color="#1A3A5C" />
                    <Text className="text-base font-bold text-[#1A3A5C]">
                      Thông tin chuyển khoản VietQR
                    </Text>
                  </View>

                  <View className="items-center mb-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <Image
                      source={{ uri: vietQrUrl }}
                      style={{ width: 220, height: 220 }}
                      resizeMode="contain"
                    />
                    <Text className="text-xs text-gray-500 mt-2 font-medium">
                      Mở app ngân hàng quét mã QR để thanh toán tự động
                    </Text>
                  </View>

                  <View className="space-y-2 bg-blue-50/60 p-3 rounded-xl border border-blue-100">
                    <View className="flex-row justify-between py-1 border-b border-blue-100">
                      <Text className="text-xs text-gray-500">Ngân hàng:</Text>
                      <Text className="text-xs font-bold text-gray-900">
                        MB Bank (Ngân hàng TMCP Quân Đội)
                      </Text>
                    </View>
                    <View className="flex-row justify-between py-1 border-b border-blue-100">
                      <Text className="text-xs text-gray-500">Số tài khoản:</Text>
                      <Text className="text-xs font-mono font-bold text-[#1A3A5C]">
                        8888 9999 2026
                      </Text>
                    </View>
                    <View className="flex-row justify-between py-1 border-b border-blue-100">
                      <Text className="text-xs text-gray-500">Chủ tài khoản:</Text>
                      <Text className="text-xs font-bold text-gray-900">
                        CONG TY PILATES VIETNAM
                      </Text>
                    </View>
                    <View className="flex-row justify-between py-1 border-b border-blue-100">
                      <Text className="text-xs text-gray-500">Số tiền:</Text>
                      <Text className="text-xs font-bold text-[#C0392B]">
                        {formatVND(finalPrice)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between py-1">
                      <Text className="text-xs text-gray-500">Nội dung CK:</Text>
                      <Text className="text-xs font-mono font-bold text-gray-900">
                        {qrTransferMemo}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              <View className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm mb-6">
                <Text className="text-base font-bold text-gray-900 mb-3">
                  Tóm tắt đơn hàng
                </Text>

                <View className="flex-row justify-between mb-2">
                  <Text className="text-sm text-gray-600">Giá niêm yết:</Text>
                  <Text className="text-sm font-semibold text-gray-800">
                    {formatVND(originalPrice)}
                  </Text>
                </View>

                {discountAmount > 0 && (
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-sm text-emerald-600 font-medium">
                      Giảm giá ({appliedPromo?.code}):
                    </Text>
                    <Text className="text-sm font-bold text-emerald-600">
                      -{formatVND(discountAmount)}
                    </Text>
                  </View>
                )}

                <View className="border-t border-gray-100 pt-3 mt-1 flex-row justify-between items-baseline">
                  <Text className="text-base font-bold text-gray-900">
                    Tổng thanh toán:
                  </Text>
                  <Text className="text-2xl font-black text-[#C0392B]">
                    {formatVND(finalPrice)}
                  </Text>
                </View>
              </View>

              {checkoutError && (
                <View className="mb-4 bg-red-50 border border-red-200 rounded-2xl p-4">
                  <View className="flex-row items-center gap-2 mb-1.5">
                    <Ionicons name="alert-circle" size={20} color="#DC2626" />
                    <Text className="text-sm font-bold text-red-700">Lỗi giao dịch</Text>
                  </View>
                  <Text className="text-xs text-red-600 leading-4 mb-3">{checkoutError}</Text>
                  {!isAuthenticated && (
                    <TouchableOpacity
                      onPress={() => setShowAuthModal(true)}
                      className="bg-[#1A3A5C] py-2.5 rounded-xl items-center active:opacity-80"
                    >
                      <Text className="text-white font-bold text-xs">Đăng nhập tài khoản ngay</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <TouchableOpacity
                onPress={handleConfirmPurchase}
                disabled={purchaseMutation.isPending}
                className={`py-4 rounded-2xl items-center justify-center mb-8 shadow-sm ${
                  purchaseMutation.isPending
                    ? "bg-gray-400"
                    : "bg-[#1A3A5C] active:opacity-90"
                }`}
              >
                {purchaseMutation.isPending ? (
                  <View className="flex-row items-center gap-2">
                    <ActivityIndicator color="white" />
                    <Text className="text-white font-bold text-base">
                      Đang xử lý giao dịch...
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="checkmark-circle-outline" size={20} color="white" />
                    <Text className="text-white font-bold text-base">
                      Xác nhận thanh toán {formatVND(finalPrice)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>
          )}

          {storeStep === "success" && lastPurchaseResult && (
            <View className="flex-1 px-5 pt-8 items-center justify-center">
              <View className="w-20 h-20 rounded-full bg-emerald-100 items-center justify-center mb-5">
                <Ionicons name="checkmark-circle" size={54} color="#059669" />
              </View>

              <Text className="text-2xl font-bold text-gray-900 text-center">
                Mua gói tập thành công!
              </Text>
              <Text className="text-sm text-gray-500 text-center mt-1 mb-6">
                Gói tập đã được kích hoạt vào tài khoản của bạn.
              </Text>

              <View className="w-full bg-white rounded-2xl p-5 border border-gray-200 shadow-sm mb-8 space-y-3">
                <View className="flex-row justify-between pb-2 border-b border-gray-100">
                  <Text className="text-sm text-gray-500">Tên gói:</Text>
                  <Text className="text-sm font-bold text-[#1A3A5C]">
                    {lastPurchaseResult.packageName}
                  </Text>
                </View>

                <View className="flex-row justify-between pb-2 border-b border-gray-100">
                  <Text className="text-sm text-gray-500">Số buổi được cấp:</Text>
                  <Text className="text-sm font-bold text-gray-900">
                    {lastPurchaseResult.totalSessions} buổi
                  </Text>
                </View>

                <View className="flex-row justify-between pb-2 border-b border-gray-100">
                  <Text className="text-sm text-gray-500">Thời hạn sử dụng:</Text>
                  <Text className="text-sm font-bold text-gray-900">
                    {lastPurchaseResult.durationDays} ngày
                  </Text>
                </View>

                <View className="flex-row justify-between pb-2 border-b border-gray-100">
                  <Text className="text-sm text-gray-500">Số tiền thanh toán:</Text>
                  <Text className="text-sm font-bold text-[#C0392B]">
                    {formatVND(lastPurchaseResult.finalAmount)}
                  </Text>
                </View>

                {lastPurchaseResult.discountAmount > 0 && (
                  <View className="flex-row justify-between pb-2 border-b border-gray-100">
                    <Text className="text-sm text-emerald-600">Đã tiết kiệm:</Text>
                    <Text className="text-sm font-bold text-emerald-600">
                      -{formatVND(lastPurchaseResult.discountAmount)}
                    </Text>
                  </View>
                )}

                <View className="flex-row justify-between">
                  <Text className="text-sm text-gray-500">Phương thức:</Text>
                  <Text className="text-sm font-semibold text-gray-700">
                    {lastPurchaseResult.paymentMethod === "bank_transfer"
                      ? "Chuyển khoản QR"
                      : lastPurchaseResult.paymentMethod === "cash"
                      ? "Tiền mặt"
                      : "Thẻ ngân hàng"}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={handleCloseModal}
                className="w-full bg-[#1A3A5C] py-4 rounded-2xl items-center active:opacity-90"
              >
                <Text className="text-white font-bold text-base">
                  Xem gói tập của tôi
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showAuthModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAuthModal(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-4">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
            <View className="w-14 h-14 bg-blue-50 rounded-2xl items-center justify-center mx-auto mb-4">
              <Ionicons name="lock-closed" size={28} color="#1A3A5C" />
            </View>
            <Text className="text-xl font-bold text-[#1A3A5C] text-center mb-1">
              Yêu cầu đăng nhập
            </Text>
            <Text className="text-xs text-gray-500 text-center mb-6">
              Bạn cần đăng nhập tài khoản học viên để tiến hành mua và kích hoạt gói tập.
            </Text>

            <TouchableOpacity
              onPress={async () => {
                setAuthLoading(true);
                try {
                  await login({ email: "minh.le@gmail.com", password: "Member@123" });
                  setShowAuthModal(false);
                  setCheckoutError(null);
                  if (selectedPackage) {
                    setStoreStep("checkout");
                  }
                } catch {
                  
                } finally {
                  setAuthLoading(false);
                }
              }}
              disabled={authLoading}
              className="bg-[#1A3A5C] py-3.5 px-4 rounded-xl flex-row items-center justify-between mb-3 active:opacity-90"
            >
              <View>
                <Text className="text-white font-bold text-sm">
                  Đăng nhập nhanh: Lê Tuấn Minh
                </Text>
                <Text className="text-blue-200 text-xs mt-0.5">
                  minh.le@gmail.com • 1 chạm
                </Text>
              </View>
              {authLoading ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Ionicons name="flash" size={20} color="#FBBF24" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setShowAuthModal(false);
                setShowStore(false);
                router.push("/(auth)/login");
              }}
              className="bg-gray-100 py-3 rounded-xl items-center mb-2 active:opacity-80"
            >
              <Text className="text-gray-700 font-semibold text-xs">
                Đăng nhập với tài khoản khác
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowAuthModal(false)}
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
