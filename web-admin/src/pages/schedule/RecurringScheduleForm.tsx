import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api from "@/lib/axios";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { parseNumberInput } from "@/lib/numberInput";

interface ScheduleConfiguration {
  classId: string;
  instructorId: string;
  roomId: string;
  startTime: string;
  endTime: string;
  maxCapacity: string;
  notes: string;
}
interface Preview {
  occurrences: {
    date: string;
    startTime: string;
    endTime: string;
    conflicts: string[];
  }[];
  totalCount: number;
  conflictCount: number;
}
function addDays(value: string, count: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}
const weekdays = [
  { value: 1, label: "Thứ 2" },
  { value: 2, label: "Thứ 3" },
  { value: 3, label: "Thứ 4" },
  { value: 4, label: "Thứ 5" },
  { value: 5, label: "Thứ 6" },
  { value: 6, label: "Thứ 7" },
  { value: 0, label: "Chủ nhật" },
];

export default function RecurringScheduleForm({
  configuration,
  initialDate,
  onCreated,
  onBusyChange,
}: {
  configuration: ScheduleConfiguration;
  initialDate: string;
  onCreated: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(() => addDays(initialDate, 28));
  const [days, setDays] = useState<number[]>([
    new Date(`${initialDate}T00:00:00Z`).getUTCDay(),
  ]);
  const [error, setError] = useState("");
  const [storedPreview, setStoredPreview] = useState<{
    key: string;
    data: Preview;
  } | null>(null);
  const payload = {
    ...configuration,
    maxCapacity: parseNumberInput(configuration.maxCapacity),
    startDate,
    endDate,
    weekdays: [...days].sort(),
  };
  const key = JSON.stringify(payload);
  const preview = storedPreview?.key === key ? storedPreview.data : null;
  const inspect = useMutation({
    mutationFn: async () => {
      const response = await api.post("/schedules/recurring/preview", payload);
      return (response.data?.data ?? response.data) as Preview;
    },
    onSuccess: (data) => {
      setStoredPreview({ key, data });
      setError("");
    },
    onError: (err: any) =>
      setError(
        err?.response?.data?.message ??
          "Không kiểm tra được lịch. Vui lòng thử lại.",
      ),
  });
  const create = useMutation({
    mutationFn: async () => {
      const response = await api.post("/schedules/recurring", payload);
      return response.data?.data ?? response.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["schedules"] });
      toast.success(`Đã tạo ${result.createdCount} buổi học theo tuần`);
      onCreated();
    },
    onError: async (err: any) => {
      setError(
        err?.response?.data?.message ??
          "Không tạo được lịch. Chưa tạo buổi nào.",
      );
      setStoredPreview(null);
      try {
        const response = await api.post(
          "/schedules/recurring/preview",
          payload,
        );
        setStoredPreview({ key, data: response.data?.data ?? response.data });
      } catch {
        /* Keep the creation error visible. */
      }
    },
  });
  useEffect(() => {
    onBusyChange(create.isPending);
  }, [create.isPending, onBusyChange]);
  const invalid =
    !configuration.classId ||
    !configuration.instructorId ||
    !configuration.roomId ||
    !Number.isInteger(payload.maxCapacity) ||
    payload.maxCapacity < 1 ||
    !startDate ||
    !endDate ||
    !days.length;

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-4">
      <div>
        <h3 className="font-semibold text-primary">Lặp lịch hằng tuần</h3>
        <p className="text-xs text-gray-500 mt-1">
          Tạo các buổi có cùng lớp, HLV, phòng và giờ học ở những thứ đã chọn.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Từ ngày"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <Input
          label="Đến ngày"
          type="date"
          value={endDate}
          min={startDate}
          onChange={(e) => setEndDate(e.target.value)}
        />
      </div>
      <fieldset>
        <legend className="text-sm font-medium text-gray-700 mb-2">
          Các thứ lặp lại
        </legend>
        <div className="flex flex-wrap gap-2">
          {weekdays.map((day) => (
            <label
              key={day.value}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer ${days.includes(day.value) ? "bg-primary text-white border-primary" : "bg-white border-gray-200"}`}
            >
              <input
                type="checkbox"
                checked={days.includes(day.value)}
                onChange={() =>
                  setDays((previous) =>
                    previous.includes(day.value)
                      ? previous.filter((v) => v !== day.value)
                      : [...previous, day.value],
                  )
                }
              />
              {day.label}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="text-xs text-gray-500">
        Tối đa 100 buổi trong khoảng 1 năm, theo giờ Việt Nam. Mỗi ngày được
        chọn tạo một buổi.
      </p>
      {error && (
        <p
          role="alert"
          className="text-sm text-red-700 bg-red-50 p-3 rounded-lg"
        >
          {error}
        </p>
      )}
      <Button
        type="button"
        variant="outline"
        disabled={invalid || inspect.isPending || create.isPending}
        onClick={() => {
          setError("");
          inspect.mutate();
        }}
      >
        {inspect.isPending ? "Đang kiểm tra…" : "Kiểm tra & xem trước lịch"}
      </Button>
      {preview && (
        <div className="space-y-3">
          <p
            className={`font-semibold text-sm ${preview.conflictCount ? "text-red-700" : "text-green-700"}`}
          >
            {preview.totalCount} buổi dự kiến · {preview.conflictCount} buổi
            xung đột
          </p>
          <div className="max-h-52 overflow-auto rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
            {preview.occurrences.map((item) => (
              <div
                key={item.date}
                className={`px-3 py-2 text-sm ${item.conflicts.length ? "bg-red-50" : ""}`}
              >
                <p className="font-medium">
                  {new Date(`${item.date}T12:00:00+07:00`).toLocaleDateString(
                    "vi-VN",
                    {
                      weekday: "short",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      timeZone: "Asia/Ho_Chi_Minh",
                    },
                  )}{" "}
                  · {configuration.startTime}–{configuration.endTime}
                </p>
                <p
                  className={`text-xs mt-1 ${item.conflicts.length ? "text-red-600" : "text-green-600"}`}
                >
                  {item.conflicts.join(" · ") || "Có thể tạo"}
                </p>
              </div>
            ))}
          </div>
          {preview.conflictCount > 0 ? (
            <p className="text-xs text-red-600">
              Đổi phòng, HLV, giờ hoặc khoảng ngày rồi kiểm tra lại. Hệ thống sẽ
              tạo toàn bộ danh sách khi không còn xung đột.
            </p>
          ) : (
            <Button
              type="button"
              disabled={create.isPending || inspect.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending
                ? "Đang tạo toàn bộ lịch…"
                : `Xác nhận tạo ${preview.totalCount} buổi`}
            </Button>
          )}
        </div>
      )}
      {!preview && storedPreview && (
        <p className="text-xs text-amber-700">
          Cấu hình đã thay đổi. Kiểm tra lại để có danh sách mới nhất.
        </p>
      )}
    </div>
  );
}
