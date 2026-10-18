import { useState } from "react";
import toast from "react-hot-toast";
import {
  Plus,
  Check,
  Edit,
  Trash2,
  Calendar,
  Clock,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { Input, NumberInput } from "@/components/ui/Input";
import { parseNumberInput } from "@/lib/numberInput";
import { Select } from "@/components/ui/Select";
import { PageLoader } from "@/components/shared/LoadingSpinner";
import {
  usePackages,
  useCreatePackage,
  useUpdatePackage,
  useDeletePackage,
  usePreparePackageCatalog,
} from "@/hooks/usePackages";
import { useAuthStore } from "@/store/auth.store";
import { formatCurrency } from "@/lib/utils";
import type { Package, PackageType, PrivateSessionType } from "@/types";

const PRIVATE_TYPES: { value: PrivateSessionType; label: string }[] = [
  { value: "private_1v1", label: "1:1 — Một HLV, một học viên" },
  { value: "semi_private_1v2", label: "1:2 — Một HLV, hai học viên" },
  { value: "small_group_1v3", label: "1:3 — Một HLV, ba học viên" },
  { value: "small_group_1v4", label: "1:4 — Một HLV, bốn học viên" },
];
const shortType = (type?: PrivateSessionType) =>
  PRIVATE_TYPES.find((t) => t.value === type)?.label.split(" — ")[0] ?? "1:1";
const emptyForm = () => ({
  name: "",
  type: "session_based" as PackageType,
  price: "",
  totalSessions: "8",
  durationDays: "60",
  description: "",
  isActive: false,
  privateSessionEnabled: false,
  privateSessionType: "private_1v1" as PrivateSessionType,
  privateSessionDurationMinutes: "60",
});

export default function PackagesPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === "admin");
  const { data, isLoading, isError, refetch } = usePackages();
  const createPackage = useCreatePackage();
  const deletePackage = useDeletePackage();
  const prepareCatalog = usePreparePackageCatalog();
  const [catalogView, setCatalogView] = useState(true);
  const [editing, setEditing] = useState<Package | null>(null);
  const updatePackage = useUpdatePackage(editing?.id ?? "");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const packages: Package[] = Array.isArray(data)
    ? data
    : ((data as any)?.items ?? []);
  const catalogOrder = ["trial_2", "group_8", "group_10", "private_4", "duo_4"];
  const shownPackages = catalogView
    ? packages
        .filter((p) => p.catalogCode)
        .sort(
          (a, b) =>
            catalogOrder.indexOf(a.catalogCode!) -
            catalogOrder.indexOf(b.catalogCode!),
        )
    : packages.filter((p) => !p.catalogCode);
  const groupRate = Math.max(
    0,
    ...packages
      .filter(
        (p) =>
          p.isActive && ["group_8", "group_10"].includes(p.catalogCode ?? ""),
      )
      .map((p) => Number(p.price) / (p.totalSessions || 1)),
  );
  const saving = createPackage.isPending || updatePackage.isPending;

  function openForm(pkg?: Package) {
    setEditing(pkg ?? null);
    setForm(
      pkg
        ? {
            name: pkg.name,
            type: pkg.type,
            price: Number(pkg.price) > 0 ? String(Number(pkg.price)) : "",
            totalSessions: String(pkg.totalSessions ?? 0),
            durationDays: String(pkg.durationDays ?? 30),
            description: pkg.description ?? "",
            isActive: pkg.isActive !== false,
            privateSessionEnabled: pkg.privateSessionEnabled ?? false,
            privateSessionType: pkg.privateSessionType ?? "private_1v1",
            privateSessionDurationMinutes: String(
              pkg.privateSessionDurationMinutes ?? 60,
            ),
          }
        : emptyForm(),
    );
    setIsModalOpen(true);
  }

  async function savePackage() {
    const price = form.price.trim() === "" ? 0 : parseNumberInput(form.price);
    const durationDays = parseNumberInput(form.durationDays);
    const totalSessions = parseNumberInput(form.totalSessions);
    const privateSessionDurationMinutes = parseNumberInput(
      form.privateSessionDurationMinutes,
    );
    if (!form.name.trim()) {
      toast.error("Vui lòng nhập tên gói tập");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Vui lòng nhập giá bán từ 0 đồng");
      return;
    }
    if (form.isActive && price <= 0) {
      toast.error("Nhập giá bán lớn hơn 0 trước khi mở bán");
      return;
    }
    if (!Number.isInteger(durationDays) || durationDays < 1) {
      toast.error("Hạn dùng phải là số ngày lớn hơn 0");
      return;
    }
    if (
      form.type === "session_based" &&
      (!Number.isInteger(totalSessions) || totalSessions < 1)
    ) {
      toast.error("Số buổi phải là số nguyên lớn hơn 0");
      return;
    }
    if (
      form.privateSessionEnabled &&
      (!Number.isInteger(privateSessionDurationMinutes) ||
        privateSessionDurationMinutes < 15 ||
        privateSessionDurationMinutes > 180)
    ) {
      toast.error("Thời lượng tập riêng phải từ 15 đến 180 phút");
      return;
    }
    const payload = {
      ...form,
      name: form.name.trim(),
      price,
      durationDays,
      totalSessions: form.type === "session_based" ? totalSessions : 0,
      privateSessionDurationMinutes:
        Number.isInteger(privateSessionDurationMinutes) &&
        privateSessionDurationMinutes >= 15 &&
        privateSessionDurationMinutes <= 180
          ? privateSessionDurationMinutes
          : 60,
    };
    try {
      if (editing) await updatePackage.mutateAsync(payload);
      else await createPackage.mutateAsync(payload);
      setIsModalOpen(false);
    } catch {
      /* Mutation hooks display the API error. */
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Gói tập theo buổi
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Tập thử 2 buổi · Lớp chung 8 / 10 buổi · Tập 1:1 / 1:2 mỗi gói 4
            buổi
          </p>
        </div>
        {isAdmin && (
          <Button onClick={() => openForm()}>
            <Plus size={16} />
            Tạo Gói Mới
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 flex flex-wrap gap-3 items-center justify-between">
        <div>
          <p className="font-semibold text-primary">
            Admin nhập giá trước khi mở bán
          </p>
          <p className="text-sm text-gray-600 mt-1">
            So sánh theo giá mỗi buổi. Gói 1:1 và 1:2 có giá mỗi buổi cao hơn
            lớp chung.
          </p>
        </div>
        {isAdmin && !packages.some((p) => p.catalogCode) && (
          <Button
            onClick={() => prepareCatalog.mutate()}
            loading={prepareCatalog.isPending}
          >
            Chuẩn bị 5 gói mẫu
          </Button>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          variant={catalogView ? "primary" : "outline"}
          onClick={() => setCatalogView(true)}
        >
          5 gói chính
        </Button>
        <Button
          variant={!catalogView ? "primary" : "outline"}
          onClick={() => setCatalogView(false)}
        >
          Gói khác và gói cũ
        </Button>
      </div>

      {isLoading ? (
        <PageLoader />
      ) : isError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center">
          <p className="text-red-700 mb-3">Không tải được danh sách gói tập.</p>
          <Button variant="outline" onClick={() => refetch()}>
            Thử lại
          </Button>
        </div>
      ) : shownPackages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
          Chưa có gói tập. Tạo gói mới để bắt đầu cấu hình.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {shownPackages.map((pkg) => (
            <div
              key={pkg.id}
              className={`bg-white rounded-2xl border p-6 flex flex-col ${pkg.privateSessionEnabled ? "border-primary/25 shadow-sm" : "border-gray-100 shadow-sm"}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <Badge
                  variant={pkg.privateSessionEnabled ? "secondary" : "info"}
                >
                  {pkg.catalogCode === "trial_2"
                    ? "Tập thử · Lớp chung"
                    : pkg.privateSessionEnabled
                      ? `${pkg.privateSessionType === "semi_private_1v2" ? "Tập đôi" : "Tập riêng"} ${shortType(pkg.privateSessionType)}`
                      : "Lớp chung"}
                </Badge>
                <Badge variant={pkg.isActive !== false ? "success" : "default"}>
                  {pkg.isActive !== false ? "Đang mở bán" : "Chưa mở bán"}
                </Badge>
              </div>
              <h3 className="font-bold text-lg text-gray-900">{pkg.name}</h3>
              <p className="text-xs text-gray-500 mt-1 mb-4 min-h-8">
                {pkg.description || "Chưa có mô tả"}
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {Number(pkg.price) > 0
                  ? formatCurrency(Number(pkg.price))
                  : "Chờ nhập giá"}
              </p>
              <p className="text-sm text-gray-500 mb-4 mt-1">
                {Number(pkg.price) > 0 && pkg.totalSessions
                  ? `${formatCurrency(Number(pkg.price) / pkg.totalSessions)} / buổi`
                  : "Nhập giá và bật mở bán để học viên đăng ký"}
              </p>
              <div className="space-y-2.5 border-t border-gray-100 py-4 mb-auto text-sm text-gray-600">
                <p className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-500" />
                  {pkg.type === "session_based"
                    ? `${pkg.totalSessions ?? 0} buổi tập`
                    : "Gói theo thời gian"}
                </p>
                <p className="flex items-center gap-2">
                  <Calendar size={16} />
                  Hạn dùng {pkg.durationDays ?? 0} ngày
                </p>
                {pkg.privateSessionEnabled ? (
                  <>
                    <p className="flex items-center gap-2">
                      <Users size={16} />
                      {
                        PRIVATE_TYPES.find(
                          (t) => t.value === pkg.privateSessionType,
                        )?.label
                      }
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock size={16} />
                      {pkg.privateSessionDurationMinutes} phút mỗi buổi
                    </p>
                    <p className="text-xs text-primary">
                      Gói tập riêng theo hình thức và thời lượng đã thiết lập.
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-gray-400">
                    Tham gia các lớp tập theo lịch của studio.
                  </p>
                )}
              </div>
              {isAdmin && (
                <div className="flex gap-2 pt-4 border-t border-gray-100">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openForm(pkg)}
                  >
                    <Edit size={14} />
                    Cấu hình gói
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500"
                    disabled={pkg.isActive === false || deletePackage.isPending}
                    onClick={() => {
                      if (window.confirm(`Ngừng cung cấp gói "${pkg.name}"?`))
                        deletePackage.mutate(pkg.id);
                    }}
                  >
                    <Trash2 size={14} />
                    Ngừng gói
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={isModalOpen}
        size="lg"
        onClose={() => {
          if (!saving) setIsModalOpen(false);
        }}
        title={editing ? "Cấu Hình Gói Tập" : "Tạo Gói Tập Mới"}
      >
        <div className="space-y-4 py-2">
          <Input
            label="Tên gói tập"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <div className="rounded-xl border border-purple-100 bg-purple-50/50 p-4 space-y-3">
            <Select
              label="Hình thức tập"
              disabled={!!editing?.catalogCode}
              value={
                form.privateSessionEnabled ? form.privateSessionType : "group"
              }
              onChange={(value) =>
                setForm({
                  ...form,
                  privateSessionEnabled: value !== "group",
                  privateSessionType:
                    value === "group"
                      ? form.privateSessionType
                      : (value as PrivateSessionType),
                })
              }
              options={[
                { value: "group", label: "Tập lớp theo lịch chung" },
                ...PRIVATE_TYPES.map((t) => ({
                  ...t,
                  label: `Tập riêng ${t.label}`,
                })),
              ]}
            />
            {form.privateSessionEnabled && (
              <NumberInput
                label="Thời lượng mỗi buổi (phút)"
                min={15}
                max={180}
                step={15}
                value={form.privateSessionDurationMinutes}
                onValueChange={(privateSessionDurationMinutes) =>
                  setForm({ ...form, privateSessionDurationMinutes })
                }
                helperText="Từ 15 đến 180 phút"
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Cách tính gói"
              disabled={!!editing?.catalogCode}
              value={form.type}
              onChange={(v) => setForm({ ...form, type: v as PackageType })}
              options={[
                { value: "session_based", label: "Theo số buổi" },
                { value: "time_based", label: "Theo thời gian" },
                { value: "unlimited", label: "Không giới hạn buổi" },
              ]}
            />
            <NumberInput
              label="Giá bán (VNĐ)"
              min={0}
              value={form.price}
              onValueChange={(price) => setForm({ ...form, price })}
            />
          </div>
          {form.price && Number(form.totalSessions) > 0 && (
            <p className="text-sm font-medium text-primary">
              {formatCurrency(Number(form.price) / Number(form.totalSessions))}{" "}
              / buổi
            </p>
          )}
          {form.privateSessionEnabled && groupRate > 0 && (
            <p className="text-xs text-gray-500">
              Giá mỗi buổi cần cao hơn {formatCurrency(groupRate)} của lớp chung
              đang mở bán.
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <NumberInput
              label="Số buổi"
              min={1}
              disabled={!!editing?.catalogCode || form.type !== "session_based"}
              value={form.totalSessions}
              onValueChange={(totalSessions) =>
                setForm({ ...form, totalSessions })
              }
            />
            <NumberInput
              label="Hạn dùng (ngày)"
              min={1}
              value={form.durationDays}
              onValueChange={(durationDays) =>
                setForm({ ...form, durationDays })
              }
            />
          </div>
          <label className="block text-sm font-medium text-gray-700">
            Mô tả gói tập
            <textarea
              className="mt-1 w-full border border-gray-300 rounded-lg p-2.5 text-sm"
              rows={2}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="w-4 h-4 accent-[#1A3A5C]"
            />
            Mở bán gói này
          </label>
        </div>
        <ModalFooter>
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => setIsModalOpen(false)}
          >
            Hủy
          </Button>
          <Button onClick={savePackage} loading={saving}>
            Lưu Gói Tập
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
