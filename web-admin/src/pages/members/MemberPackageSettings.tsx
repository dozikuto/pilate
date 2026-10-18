import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "@/lib/axios";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import type { MemberPackage } from "@/types";

type Partner = {
  packageId: string;
  fullName: string;
  packageName: string;
  remainingSessions: number;
};

export default function MemberPackageSettings({
  pkg,
  canManage,
}: {
  pkg: MemberPackage;
  canManage: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [coachId, setCoachId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const duo =
    pkg.privateSessionEnabled && pkg.privateSessionType === "semi_private_1v2";
  const coaches = useQuery({
    queryKey: ["instructor-options"],
    enabled: open,
    queryFn: async () => {
      const response = await api.get("/instructors/options");
      const data = response.data?.data ?? response.data;
      return (Array.isArray(data) ? data : (data.items ?? [])) as {
        userId: string;
        fullName: string;
      }[];
    },
  });
  const partners = useQuery({
    queryKey: ["duo-options", pkg.id],
    enabled: open && !!duo,
    queryFn: async () => {
      const response = await api.get(
        `/packages/member-packages/${pkg.id}/duo-options`,
      );
      return (response.data?.data ?? response.data) as Partner[];
    },
  });
  const save = useMutation({
    mutationFn: () =>
      api.patch(`/packages/member-packages/${pkg.id}/settings`, {
        preferredInstructorId: coachId || null,
        ...(duo ? { duoPartnerPackageId: partnerId || null } : {}),
      }),
    onSuccess: async () => {
      await Promise.all(
        ["members", "member-packages", "duo-options", "schedules"].map((key) =>
          queryClient.invalidateQueries({ queryKey: [key] }),
        ),
      );
      toast.success("Đã lưu cấu hình gói học viên");
      setOpen(false);
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message;
      setError(
        Array.isArray(message)
          ? message.join(". ")
          : (message ?? "Không lưu được cấu hình"),
      );
    },
  });
  const partnerOptions = partners.data ?? [];
  const selectedPartnerMissing =
    pkg.duoPartner &&
    !partnerOptions.some((p) => p.packageId === pkg.duoPartnerPackageId);

  return (
    <div className="mt-4 border-t pt-4 space-y-3">
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-gray-50 p-3 text-center">
        {[
          ["Đã tập", pkg.attendedSessions ?? 0],
          ["Đã đặt, chưa tập", pkg.reservedSessions ?? 0],
          [
            "Còn có thể đặt",
            pkg.packageType === "session_based"
              ? pkg.remainingSessions
              : "Theo hạn gói",
          ],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-lg font-bold text-primary">{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>
      {!!pkg.forfeitedSessions && (
        <p className="text-xs text-amber-700">
          Hủy muộn / vắng mặt: {pkg.forfeitedSessions} buổi
        </p>
      )}
      {!!pkg.otherUsedSessions && (
        <p className="text-xs text-gray-500">
          Buổi đã trừ khác / dữ liệu cũ: {pkg.otherUsedSessions}
        </p>
      )}
      <p className="text-sm text-gray-600">
        HLV ưu tiên:{" "}
        <strong>{pkg.preferredInstructor?.fullName ?? "Chưa chọn"}</strong>
      </p>
      {duo && (
        <p className="text-sm text-gray-600">
          Tập cùng:{" "}
          <strong>{pkg.duoPartner?.fullName ?? "Chưa ghép đôi"}</strong>
          <span className="block text-xs mt-1">
            Mỗi học viên dùng gói riêng và tự xác nhận cùng ca tập.
          </span>
        </p>
      )}
      {canManage && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setCoachId(pkg.preferredInstructorId ?? "");
            setPartnerId(pkg.duoPartnerPackageId ?? "");
            setError("");
            setOpen(true);
          }}
        >
          {duo ? "HLV ưu tiên & ghép đôi" : "Chọn HLV ưu tiên"}
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => {
          if (!save.isPending) setOpen(false);
        }}
        hideClose={save.isPending}
        title={duo ? "Cấu hình gói tập đôi" : "HLV ưu tiên của gói"}
        description={pkg.packageName}
      >
        <fieldset disabled={save.isPending} className="space-y-4">
          <Select
            label="HLV ưu tiên"
            placeholder=""
            value={coachId}
            onChange={setCoachId}
            options={[
              { value: "", label: "Không ưu tiên HLV" },
              ...(coaches.data ?? []).map((c) => ({
                value: c.userId,
                label: c.fullName,
              })),
            ]}
          />
          <p className="text-xs text-gray-500">
            HLV ưu tiên dùng để gợi ý khi đặt lịch. Học viên có thể chọn ca của
            HLV khác phù hợp.
          </p>
          {duo && (
            <>
              <Select
                label="Học viên tập cùng"
                placeholder=""
                value={partnerId}
                onChange={setPartnerId}
                disabled={partners.isLoading || partners.isError}
                options={[
                  { value: "", label: "Chưa ghép đôi" },
                  ...(selectedPartnerMissing
                    ? [
                        {
                          value: pkg.duoPartner!.packageId,
                          label: pkg.duoPartner!.fullName + " · đang ghép",
                        },
                      ]
                    : []),
                  ...partnerOptions.map((p) => ({
                    value: p.packageId,
                    label: `${p.fullName} · ${p.packageName} · còn ${p.remainingSessions} buổi`,
                  })),
                ]}
              />
              <p className="text-xs text-gray-500">
                Chọn gói 1:2 cùng thời lượng của người tập cùng. Nếu đã có lịch
                sắp tới, cần xử lý lịch trước khi thay đổi cặp.
              </p>
            </>
          )}
          {(coaches.isError || partners.isError) && (
            <p role="alert" className="text-sm text-red-600">
              Không tải được danh sách.{" "}
              <button
                type="button"
                className="underline"
                onClick={() => {
                  coaches.refetch();
                  if (duo) partners.refetch();
                }}
              >
                Thử lại
              </button>
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
        </fieldset>
        <ModalFooter>
          <Button
            variant="outline"
            disabled={save.isPending}
            onClick={() => setOpen(false)}
          >
            Hủy
          </Button>
          <Button
            disabled={
              save.isPending ||
              coaches.isLoading ||
              coaches.isError ||
              (!!duo && (partners.isLoading || partners.isError))
            }
            onClick={() => {
              setError("");
              save.mutate();
            }}
          >
            {save.isPending ? "Đang lưu…" : "Lưu cấu hình"}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
