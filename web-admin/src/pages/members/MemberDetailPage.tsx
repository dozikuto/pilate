import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Calendar,
  AlertCircle,
  QrCode,
  Package,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  useMember,
  useMemberPackages,
  useMemberBookings,
  useMemberCheckIns,
} from "@/hooks/useMembers";
import { usePackages, useAssignPackage } from "@/hooks/usePackages";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import {
  formatDate,
  formatDateTime,
  formatCurrency,
  getInitials,
  getAvatarColor,
} from "@/lib/utils";
import api from "@/lib/axios";
import toast from "react-hot-toast";
import MemberFormModal from "./MemberFormModal";
import MemberPackageSettings from './MemberPackageSettings';
import { useAuthStore } from "@/store/auth.store";
import type { MemberPackage, Booking, CheckIn } from "@/types";

type TabKey = "info" | "packages" | "bookings" | "checkins";

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const canEdit = user?.role === 'admin' || user?.role === 'receptionist';
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("info");
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");

  const { data: allPackagesData } = usePackages();
  const assignPackageMutation = useAssignPackage();

  const rawPackages =
    (allPackagesData as any)?.data?.items ||
    (allPackagesData as any)?.items ||
    allPackagesData ||
    [];
  const availablePackages = Array.isArray(rawPackages) ? rawPackages : [];
  const selectedPkg = availablePackages.find(
    (p: any) => p.id === selectedPackageId,
  );

  const originalAmount = selectedPkg ? Number(selectedPkg.price) || 0 : 0;
  const discountAmount = appliedVoucher
    ? Number(appliedVoucher.discountAmount) || 0
    : 0;
  const finalAmount = appliedVoucher
    ? Number(appliedVoucher.finalAmount) || 0
    : originalAmount;

  const handleApplyVoucher = async (codeToApply?: string) => {
    const code = (codeToApply || voucherCode).trim().toUpperCase();
    if (!code) {
      setVoucherError("Vui lòng nhập mã giảm giá");
      return;
    }
    if (!selectedPkg) {
      setVoucherError("Vui lòng chọn gói tập trước khi áp mã");
      return;
    }

    setVoucherLoading(true);
    setVoucherError(null);
    try {
      const res = await api.post("/promotions/apply", {
        code,
        orderAmount: originalAmount,
      });
      const data = res.data?.data ?? res.data;
      setAppliedVoucher(data);
      setVoucherCode(code);
      setVoucherError(null);
      toast.success(`Áp dụng mã ${code} thành công!`);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "Mã giảm giá không hợp lệ hoặc đã hết hạn";
      setVoucherError(Array.isArray(msg) ? msg[0] : msg);
      setAppliedVoucher(null);
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleAssignPackage = async () => {
    if (!selectedPackageId) {
      toast.error("Vui lòng chọn gói tập");
      return;
    }
    try {
      await assignPackageMutation.mutateAsync({
        memberId: id!,
        packageId: selectedPackageId,
      });
      setIsPurchaseModalOpen(false);
      setSelectedPackageId("");
      setVoucherCode("");
      setAppliedVoucher(null);
    } catch {}
  };

  const { data: member, isLoading, isError, refetch } = useMember(id!);
  const { data: packages } = useMemberPackages(id!);
  const { data: bookings } = useMemberBookings(id!);
  const { data: checkIns } = useMemberCheckIns(id!);

  const displayPackages = packages ?? [];
  const displayBookings = bookings ?? [];
  const displayCheckIns = checkIns ?? [];

  if (isLoading) return <PageLoader />;
  if (isError || !member)
    return (
      <div
        role="alert"
        className="bg-white rounded-xl border border-red-100 p-8 space-y-4"
      >
        <h1 className="font-semibold text-lg text-red-700">
          Không tải được hồ sơ học viên
        </h1>
        <p className="text-gray-500 text-sm">
          Hồ sơ không tồn tại hoặc kết nối đang gặp lỗi. Vui lòng thử lại.
        </p>
        <div className="flex gap-3">
          <Button onClick={() => refetch()}>Thử lại</Button>
          <Button variant="outline" onClick={() => navigate("/members")}>
            Về danh sách học viên
          </Button>
        </div>
      </div>
    );
  const displayMember = member;

  const tabs: { key: TabKey; label: string }[] = [
    { key: "info", label: "Thông tin cá nhân" },
    { key: "packages", label: "Gói tập" },
    { key: "bookings", label: "Lịch đặt" },
    { key: "checkins", label: "Lịch sử check-in" },
  ];

  return (
    <div className="space-y-6">
      {isEditModalOpen && canEdit && <MemberFormModal memberId={id} onClose={() => setIsEditModalOpen(false)} />}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {displayMember.name}
          </h1>
          <p className="text-sm text-gray-500">
            {displayMember.code} · Tham gia {formatDate(displayMember.joinDate)}
          </p>
        </div>
        <div className="ml-auto flex gap-2">
          <Badge
            variant={
              displayMember.status === "active"
                ? "success"
                : displayMember.status === "inactive"
                  ? "default"
                  : "danger"
            }
          >
            {displayMember.status === "active"
              ? "Hoạt động"
              : displayMember.status === "inactive"
                ? "Không HĐ"
                : "Hết hạn"}
          </Badge>
          {canEdit && <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)}>
            Chỉnh sửa
          </Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-3">
          <CardContent className="pt-6">
            <div className="flex items-start gap-5">
              <div
                className={`w-20 h-20 rounded-2xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0 ${getAvatarColor(
                  displayMember.name,
                )}`}
              >
                {getInitials(displayMember.name)}
              </div>
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <InfoRow
                  icon={<Phone size={14} />}
                  value={displayMember.phone}
                />
                <InfoRow
                  icon={<Mail size={14} />}
                  value={displayMember.email}
                />
                {displayMember.address && (
                  <InfoRow
                    icon={<MapPin size={14} />}
                    value={displayMember.address}
                  />
                )}
                {displayMember.dateOfBirth && (
                  <InfoRow
                    icon={<Calendar size={14} />}
                    value={formatDate(displayMember.dateOfBirth)}
                  />
                )}
                {displayMember.healthNotes && (
                  <div className="sm:col-span-2">
                    <InfoRow
                      icon={<AlertCircle size={14} />}
                      value={displayMember.healthNotes}
                      variant="warning"
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col items-center justify-center p-6">
          <QrCode size={64} className="text-gray-300 mb-3" />
          <p className="text-sm text-gray-500 text-center">QR Check-in</p>
          <p className="text-xs font-mono text-gray-400 mt-1">
            {displayMember.code}
          </p>
          <Button variant="outline" size="sm" className="mt-4">
            Tải QR Code
          </Button>
        </Card>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "info" && (
        <Card>
          <CardHeader>
            <CardTitle>Thông tin chi tiết</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DetailField label="Họ và tên" value={displayMember.name} />
              <DetailField
                label="Mã học viên"
                value={displayMember.code}
                mono
              />
              <DetailField label="Số điện thoại" value={displayMember.phone} />
              <DetailField label="Email" value={displayMember.email} />
              <DetailField
                label="Ngày sinh"
                value={formatDate(displayMember.dateOfBirth)}
              />
              <DetailField
                label="Giới tính"
                value={
                  displayMember.gender === "female"
                    ? "Nữ"
                    : displayMember.gender === "male"
                      ? "Nam"
                      : displayMember.gender === 'other' ? "Khác" : "—"
                }
              />
              <DetailField
                label="Địa chỉ"
                value={displayMember.address || "—"}
                fullWidth
              />
              <DetailField
                label="Người liên hệ khẩn cấp"
                value={
                  [displayMember.emergencyContact, displayMember.emergencyPhone].filter(Boolean).join(' — ') || '—'
                }
                fullWidth
              />
              <DetailField
                label="Ghi chú sức khỏe"
                value={displayMember.healthNotes || "—"}
                fullWidth
                highlight
              />
              <DetailField label="Mục tiêu tập luyện" value={displayMember.goals || '—'} fullWidth />
              <DetailField
                label="Ngày tham gia"
                value={formatDate(displayMember.joinDate)}
              />
              <DetailField
                label="Cập nhật lần cuối"
                value={formatDateTime(displayMember.updatedAt)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "packages" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Gói tập</h2>
            <Button size="sm" onClick={() => setIsPurchaseModalOpen(true)}>
              <Package size={14} />
              Mua thêm gói
            </Button>
          </div>
          {displayPackages.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} canManage={canEdit} />
          ))}
          {displayPackages.length === 0 && (
            <p className="text-center text-gray-400 py-8">
              Học viên chưa có gói tập
            </p>
          )}
        </div>
      )}

      {activeTab === "bookings" && (
        <Card>
          <CardHeader>
            <CardTitle>Lịch đặt ({displayBookings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {displayBookings.map((booking) => (
                <BookingRow key={booking.id} booking={booking} />
              ))}
              {displayBookings.length === 0 && (
                <p className="text-center text-gray-400 py-8">
                  Chưa có lịch đặt
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "checkins" && (
        <Card>
          <CardHeader>
            <CardTitle>Lịch sử check-in ({displayCheckIns.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {displayCheckIns.map((ci) => (
                <CheckInRow key={ci.id} checkIn={ci} />
              ))}
              {displayCheckIns.length === 0 && (
                <p className="text-center text-gray-400 py-8">
                  Chưa có lịch sử check-in
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Modal
        open={isPurchaseModalOpen}
        onClose={() => {
          setIsPurchaseModalOpen(false);
          setSelectedPackageId("");
          setVoucherCode("");
          setAppliedVoucher(null);
          setVoucherError(null);
        }}
        title="Gán / Mua gói tập cho học viên"
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chọn gói tập
            </label>
            <Select
              value={selectedPackageId}
              onChange={(val) => {
                setSelectedPackageId(val);
                setAppliedVoucher(null);
                setVoucherError(null);
              }}
              options={[
                { value: "", label: "-- Chọn gói tập --" },
                ...availablePackages.map((pkg: any) => ({
                  value: pkg.id,
                  label: `${pkg.name} (${formatCurrency(Number(pkg.price) || 0)} - ${pkg.totalSessions || 0} buổi)`,
                })),
              ]}
            />
          </div>

          {selectedPkg && (
            <div className="bg-gray-50 p-3 rounded-lg border text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Mô tả:</span>
                <span className="font-medium text-right">
                  {selectedPkg.description}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Thời hạn:</span>
                <span className="font-medium">
                  {selectedPkg.durationDays || 30} ngày
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Giá niêm yết:</span>
                <span className="font-semibold text-gray-900">
                  {formatCurrency(originalAmount)}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mã giảm giá / Voucher
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Ví dụ: PILATES2026"
                value={voucherCode}
                onChange={(e) => {
                  setVoucherCode(e.target.value.toUpperCase());
                  if (voucherError) setVoucherError(null);
                }}
                disabled={!selectedPkg || !!appliedVoucher}
              />
              {appliedVoucher ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAppliedVoucher(null);
                    setVoucherCode("");
                  }}
                >
                  Gỡ mã
                </Button>
              ) : (
                <Button
                  size="sm"
                  disabled={
                    !selectedPkg || voucherLoading || !voucherCode.trim()
                  }
                  onClick={() => handleApplyVoucher()}
                >
                  {voucherLoading ? "Đang kiểm tra..." : "Áp dụng"}
                </Button>
              )}
            </div>

            {voucherError && (
              <p className="text-xs text-red-600 mt-1">{voucherError}</p>
            )}

            {appliedVoucher && (
              <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex justify-between items-center">
                <span>
                  ✓ Đã áp dụng <strong>{appliedVoucher.code}</strong>:{" "}
                  {appliedVoucher.name}
                </span>
                <span className="font-bold">
                  -{formatCurrency(discountAmount)}
                </span>
              </div>
            )}

            {!appliedVoucher && selectedPkg && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-500">Mã có sẵn:</span>
                <button
                  type="button"
                  onClick={() => handleApplyVoucher("PILATES2026")}
                  className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded font-medium hover:bg-blue-100"
                >
                  PILATES2026 (-10%)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyVoucher("CHAOMUNG300")}
                  className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded font-medium hover:bg-amber-100"
                >
                  CHAOMUNG300 (-300k)
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phương thức thanh toán
            </label>
            <Select
              value={paymentMethod}
              onChange={(val) => setPaymentMethod(val)}
              options={[
                {
                  value: "bank_transfer",
                  label: "Chuyển khoản ngân hàng (VietQR)",
                },
                { value: "cash", label: "Tiền mặt tại quầy lễ tân" },
                { value: "credit_card", label: "Thẻ tín dụng / ATM" },
              ]}
            />
          </div>

          <div className="border-t pt-3 flex justify-between items-baseline">
            <span className="font-semibold text-gray-900">
              Tổng thanh toán:
            </span>
            <span className="text-xl font-bold text-red-600">
              {formatCurrency(finalAmount)}
            </span>
          </div>
        </div>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setIsPurchaseModalOpen(false)}
          >
            Hủy
          </Button>
          <Button
            disabled={!selectedPackageId || assignPackageMutation.isPending}
            onClick={handleAssignPackage}
          >
            {assignPackageMutation.isPending
              ? "Đang kích hoạt..."
              : "Xác nhận kích hoạt gói"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}

function InfoRow({
  icon,
  value,
  variant = "default",
}: {
  icon: React.ReactNode;
  value: string;
  variant?: "default" | "warning";
}) {
  return (
    <div
      className={`flex items-start gap-2 text-sm ${
        variant === "warning"
          ? "bg-yellow-50 p-2 rounded-lg text-yellow-700"
          : "text-gray-700"
      }`}
    >
      <span className="mt-0.5 flex-shrink-0 text-gray-400">{icon}</span>
      <span>{value}</span>
    </div>
  );
}

function DetailField({
  label,
  value,
  fullWidth,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  fullWidth?: boolean;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={fullWidth ? "sm:col-span-2" : ""}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p
        className={`text-sm ${
          mono
            ? "font-mono"
            : highlight
              ? "bg-yellow-50 text-yellow-800 p-2 rounded-lg"
              : "text-gray-900"
        }`}
      >
        {value || "—"}
      </p>
    </div>
  );
}

function PackageCard({ pkg, canManage }: { pkg: MemberPackage; canManage: boolean }) {
  const percent =
    pkg.totalSessions > 0
      ? ((pkg.usedSessions / pkg.totalSessions) * 100).toFixed(0)
      : 0;

  return (
    <Card className={pkg.status === "active" ? "border-primary/20" : ""}>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">{pkg.packageName}</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {formatDate(pkg.startDate)}
              {pkg.endDate && ` → ${formatDate(pkg.endDate)}`}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={pkg.status === "active" ? "success" : "danger"}>
              {
                {
                  active: "Đang dùng",
                  expired: "Hết hạn",
                  cancelled: "Đã hủy",
                  suspended: "Tạm dừng",
                }[pkg.status]
              }
            </Badge>
            <p className="text-sm font-semibold text-gray-900">
              {formatCurrency(pkg.price)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Số buổi đã đặt hoặc đã trừ</span>
            <span className="font-medium">
              {pkg.usedSessions}/{pkg.totalSessions} buổi ({percent}%)
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                pkg.status === "active" ? "bg-primary" : "bg-gray-400"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">
            Còn có thể đặt:{" "}
            <span className="font-semibold text-gray-900">
              {pkg.remainingSessions} buổi
            </span>
          </p>
        </div>
        <MemberPackageSettings pkg={pkg} canManage={canManage} />
      </CardContent>
    </Card>
  );
}

function BookingRow({ booking }: { booking: Booking }) {
  const isPast = new Date(booking.startTime) < new Date();

  const statusConfig = {
    confirmed: {
      icon: <CheckCircle size={16} />,
      color: "text-blue-500",
      label: "Đã xác nhận",
    },
    attended: {
      icon: <CheckCircle size={16} />,
      color: "text-emerald-500",
      label: "Đã điểm danh",
    },
    cancelled: {
      icon: <XCircle size={16} />,
      color: "text-gray-400",
      label: "Đã hủy",
    },
    waitlisted: {
      icon: <Clock size={16} />,
      color: "text-amber-500",
      label: "Danh sách chờ",
    },
    "no-show": {
      icon: <XCircle size={16} />,
      color: "text-red-500",
      label: "Vắng mặt",
    },
  };

  const config = statusConfig[booking.status] ?? statusConfig.confirmed;

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50">
      <div className={`${config.color} flex-shrink-0`}>{config.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{booking.className}</p>
        <p className="text-xs text-gray-500">GV: {booking.instructorName}</p>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium">
          {formatDateTime(booking.startTime)}
        </p>
        <p className={`text-xs ${config.color}`}>{config.label}</p>
      </div>
    </div>
  );
}

function CheckInRow({ checkIn }: { checkIn: CheckIn }) {
  const methodLabel =
    {
      qr: "QR Code",
      manual: "Thủ công",
      card: "Thẻ",
      face_id: "Nhận diện khuôn mặt",
    }[checkIn.method] ?? checkIn.method;

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-gray-50">
      <Clock size={16} className="text-primary flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">
          {checkIn.className ?? "Tự do"}
        </p>
        <p className="text-xs text-gray-500">
          Check-in: {formatDateTime(checkIn.checkInTime)}
          {checkIn.checkOutTime &&
            ` · Check-out: ${formatDateTime(checkIn.checkOutTime)}`}
        </p>
      </div>
      <Badge variant="default">{methodLabel}</Badge>
    </div>
  );
}
