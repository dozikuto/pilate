import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  MapPin,
  Users,
  Trash2,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/axios";
import {
  useSchedules,
  useCreateSchedule,
  useDeleteSchedule,
} from "@/hooks/useSchedules";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal, ModalFooter } from "@/components/ui/Modal";
import { Input, NumberInput } from "@/components/ui/Input";
import { parseNumberInput } from "@/lib/numberInput";
import toast from "react-hot-toast";
import { Select } from "@/components/ui/Select";
import RecurringScheduleForm from "./RecurringScheduleForm";

interface FormScheduleState {
  classId: string;
  instructorId: string;
  roomId: string;
  startTime: string;
  endTime: string;
  maxCapacity: string;
  notes: string;
}

export default function SchedulePage() {
  const [searchParams] = useSearchParams();
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [creationMode, setCreationMode] = useState("single");
  const [bulkSaving, setBulkSaving] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);

  const { data: rawSchedules, isLoading: schedulesLoading, isFetching: schedulesFetching, refetch: refreshSchedules } = useSchedules({
    date: selectedDate,
  });

  const createSchedule = useCreateSchedule();
  const deleteSchedule = useDeleteSchedule();

  const { data: classesData } = useQuery({
    queryKey: ["classes-list"],
    queryFn: async () => {
      const res = await api.get<any>("/classes");
      const d = res.data?.data ?? res.data;
      return Array.isArray(d) ? d : (d?.items ?? []);
    },
  });

  const { data: instructorsData } = useQuery({
    queryKey: ["instructors-list"],
    queryFn: async () => {
      const res = await api.get<any>("/instructors");
      const d = res.data?.data ?? res.data;
      return Array.isArray(d) ? d : (d?.items ?? []);
    },
  });

  const { data: roomsData } = useQuery({
    queryKey: ["schedule-rooms"],
    queryFn: async () => {
      const res = await api.get("/classes/rooms");
      return res.data?.data ?? res.data;
    },
  });

  const [formData, setFormData] = useState<FormScheduleState>({
    classId: "",
    instructorId: "",
    roomId: "",
    startTime: "09:00",
    endTime: "09:55",
    maxCapacity: "8",
    notes: "",
  });

  function applyClass(classId: string) {
    const cls = classesData?.find((c: any) => c.id === classId);
    setFormData((prev) => {
      const [hour, minute] = prev.startTime.split(":").map(Number);
      const end = hour * 60 + minute + (cls?.durationMinutes ?? 60);
      return {
        ...prev,
        classId,
        instructorId: cls?.defaultInstructorId || prev.instructorId,
        roomId: cls?.defaultRoomId || prev.roomId,
        maxCapacity: String(cls?.defaultMaxCapacity ?? prev.maxCapacity),
        endTime: `${String(Math.floor(end / 60) % 24).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`,
      };
    });
  }
  useEffect(() => {
    const classId = searchParams.get("classId");
    if (classId && classesData?.some((c: any) => c.id === classId)) {
      applyClass(classId);
      setIsAddModalOpen(true);
    }
  }, [searchParams, classesData]);

  const daysOfWeek = [
    "Chủ Nhật",
    "Thứ Hai",
    "Thứ Ba",
    "Thứ Tư",
    "Thứ Năm",
    "Thứ Sáu",
    "Thứ Bảy",
  ];
  const today = new Date(selectedDate);
  const dayName = isNaN(today.getTime()) ? "" : daysOfWeek[today.getDay()];

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    setSelectedDate(`${y}-${m}-${day}`);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    setSelectedDate(`${y}-${m}-${day}`);
  };

  const handleGoToday = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const schedulesList: any[] = Array.isArray(rawSchedules)
    ? rawSchedules
    : (rawSchedules as any)?.data || (rawSchedules as any)?.items || [];

  const formattedSchedules = schedulesList
    .filter(
      (s: any) => s.status !== "cancelled" && s.scheduleStatus !== "cancelled",
    )
    .map((s: any) => {
      const startDate = new Date(s.startTime);
      const endDate = new Date(s.endTime);

      const startH = isNaN(startDate.getTime())
        ? "09:00"
        : startDate.toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
      const endH = isNaN(endDate.getTime())
        ? "09:55"
        : endDate.toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });

      const allBookings = s.bookings || [];
      const confirmedBookings = allBookings.filter(
        (b: any) => b.status === "confirmed" || b.status === "attended",
      );
      const waitlistedBookings = allBookings.filter(
        (b: any) => b.status === "waitlisted",
      );
      const enrolled =
        s.currentEnrolled ?? s.enrolled ?? confirmedBookings.length ?? 0;
      const cap = s.maxCapacity ?? s.capacity ?? 8;
      const isPrivate = s.class?.type && s.class.type !== "group";

      return {
        id: s.id,
        className: s.className || s.class?.name || "Lớp Pilates",
        classType: isPrivate ? `Tập riêng (1:${cap})` : "Lớp Nhóm",
        instructorName: s.instructor?.fullName || "HLV Pilates",
        roomName:
          typeof s.room === "string" ? s.room : s.room?.name || "Phòng tập",
        startTime: startH,
        endTime: endH,
        currentEnrolled: enrolled,
        maxCapacity: cap,
        waitlistCount: waitlistedBookings.length,
        status: s.status || "scheduled",
        color: isPrivate
          ? "#7C3AED"
          : s.className?.includes("Cột Sống")
            ? "#2563EB"
            : "#1A3A5C",
        bookings: confirmedBookings,
        waitlistedBookings,
      };
    });

  const selectedSchedule = formattedSchedules.find((item) => item.id === selectedScheduleId);

  const handleCancelStudentBooking = async (bookingId: string, studentName: string, isWaitlist = false) => {
    if (!window.confirm(
      isWaitlist
        ? `Xóa học viên "${studentName}" khỏi danh sách chờ?`
        : `Hủy chỗ của học viên "${studentName}"? (Hệ thống sẽ áp dụng chính sách hoàn/trừ buổi và tự động đôn người đầu danh sách chờ nếu bật Auto-Waitlist)`
    )) return;
    try {
      await api.patch(`/bookings/${bookingId}/cancel`, {
        reason: isWaitlist ? "Admin xóa khỏi danh sách chờ" : "Admin hủy chỗ",
      });
      toast.success(
        isWaitlist
          ? `Đã xóa ${studentName} khỏi danh sách chờ`
          : `Đã hủy chỗ của ${studentName} và cập nhật danh sách lớp`,
      );
      await refreshSchedules();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Không thể hủy chỗ");
    }
  };

  const handlePromoteWaitlist = async (bookingId: string, studentName: string) => {
    try {
      await api.patch(`/bookings/${bookingId}/status`, { status: "confirmed" });
      toast.success(`Đã đôn học viên ${studentName} từ Waitlist lên lớp chính thức!`);
      await refreshSchedules();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Không thể đôn học viên lên lớp chính thức");
    }
  };

  const handleCreateSubmit = () => {
    const maxCapacity = parseNumberInput(formData.maxCapacity);
    if (!Number.isInteger(maxCapacity) || maxCapacity < 1) {
      toast.error("Sĩ số tối đa phải là số nguyên lớn hơn 0");
      return;
    }
    if (!formData.classId) {
      alert("Vui lòng chọn lớp học");
      return;
    }
    if (!formData.instructorId) {
      alert("Vui lòng chọn huấn luyện viên");
      return;
    }
    if (!formData.roomId) {
      alert("Vui lòng chọn phòng tập");
      return;
    }

    const startIso = new Date(
      `${selectedDate}T${formData.startTime}:00+07:00`,
    ).toISOString();
    const endIso = new Date(
      `${selectedDate}T${formData.endTime}:00+07:00`,
    ).toISOString();

    createSchedule.mutate(
      {
        classId: formData.classId,
        instructorId: formData.instructorId,
        roomId: formData.roomId,
        startTime: startIso,
        endTime: endIso,
        maxCapacity,
        notes: formData.notes,
        isRecurring: false,
      },
      {
        onSuccess: () => {
          setIsAddModalOpen(false);
        },
      },
    );
  };

  const handleDeleteSchedule = (id: string) => {
    if (confirm("Bạn có chắc chắn muốn hủy lịch học này?")) {
      deleteSchedule.mutate(id, {
        onSuccess: () => {
          setSelectedScheduleId(null);
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Lịch Học & Đặt Chỗ
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Quản lý và điều phối các buổi học đồng bộ trực tiếp với hệ thống học
            viên
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setCreationMode("weekly");
              setIsAddModalOpen(true);
            }}
          >
            Tạo lịch hàng loạt
          </Button>
          <Button
            onClick={() => {
              setCreationMode("single");
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Tạo Lịch Học Mới
          </Button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            aria-label="Ngày trước"
            variant="outline"
            size="sm"
            onClick={handlePrevDay}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
            <CalendarIcon className="w-4 h-4 text-primary" />
            <span className="font-semibold text-gray-800">{dayName},</span>
            <input
              aria-label="Ngày xếp lịch"
              type="date"
              value={selectedDate}
              onChange={(event) => {
                if (event.target.value) setSelectedDate(event.target.value);
              }}
              className="bg-transparent text-gray-600 outline-none"
            />
          </div>
          <Button
            aria-label="Ngày sau"
            variant="outline"
            size="sm"
            onClick={handleNextDay}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={handleGoToday}>
          Hôm nay
        </Button>
      </div>

      {schedulesLoading ? (
        <div className="bg-white p-12 rounded-xl text-center border border-gray-100">
          <p className="text-gray-400 text-sm">Đang tải lịch học...</p>
        </div>
      ) : formattedSchedules.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {formattedSchedules.map((item) => {
            const isFull = item.currentEnrolled >= item.maxCapacity;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedScheduleId(item.id)}
                className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-4"
                style={{ borderLeftColor: item.color }}
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-lg text-gray-900">
                      {item.className}
                    </span>
                    <Badge
                      variant={
                        item.classType.includes("Nhóm")
                          ? "default"
                          : "secondary"
                      }
                    >
                      {item.classType}
                    </Badge>
                    {isFull && <Badge variant="danger">Đã đầy chỗ</Badge>}
                    {item.waitlistCount > 0 && (
                      <Badge variant="warning">
                        ⏳ Waitlist: {item.waitlistCount} học viên
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5 font-semibold text-gray-800">
                      <Clock className="w-4 h-4 text-primary" />
                      {item.startTime} – {item.endTime}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <User className="w-4 h-4 text-gray-400" />
                      HLV:{" "}
                      <strong className="text-gray-700">
                        {item.instructorName}
                      </strong>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {item.roomName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-sm font-semibold text-gray-700">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span>
                        {item.currentEnrolled} / {item.maxCapacity} học viên
                      </span>
                    </div>
                    <div className="w-32 bg-gray-200 rounded-full h-2 mt-1.5 overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${
                          isFull ? "bg-red-500" : "bg-primary"
                        }`}
                        style={{
                          width: `${Math.min((item.currentEnrolled / item.maxCapacity) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Chi tiết & Sĩ số
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-xl text-center border border-gray-100">
          <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-800 mb-1">
            Không có ca lịch học nào trong ngày {selectedDate}
          </h3>
          <p className="text-gray-400 text-sm mb-4">
            Bấm "Tạo Lịch Học Mới" để thêm ca học mới vào hệ thống
          </p>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Tạo Lịch Học
          </Button>
        </div>
      )}

      {selectedSchedule && (
        <Modal
          open={!!selectedSchedule}
          onClose={() => setSelectedScheduleId(null)}
          title={`Chi tiết lớp: ${selectedSchedule.className}`}
          size="lg"
        >
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div>
                <span className="text-gray-500 block text-xs">Thời gian:</span>
                <span className="font-bold text-gray-900">
                  {selectedSchedule.startTime} – {selectedSchedule.endTime}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">
                  Huấn luyện viên:
                </span>
                <span className="font-bold text-gray-900">
                  {selectedSchedule.instructorName}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">Phòng tập:</span>
                <span className="font-bold text-gray-900">
                  {selectedSchedule.roomName}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-xs">
                  Sĩ số hiện tại:
                </span>
                <span className="font-bold text-gray-900">
                  {selectedSchedule.currentEnrolled} /{" "}
                  {selectedSchedule.maxCapacity} chỗ
                  {selectedSchedule.waitlistCount > 0 && (
                    <span className="ml-2 text-amber-600 text-xs font-semibold">
                      (+{selectedSchedule.waitlistCount} trong Waitlist)
                    </span>
                  )}
                </span>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm text-gray-800 mb-2">
                Học viên lớp chính thức ({selectedSchedule.bookings?.length || 0}):
              </h4>
              {selectedSchedule.bookings &&
              selectedSchedule.bookings.length > 0 ? (
                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {selectedSchedule.bookings.map((b: any, idx: number) => {
                    const studentName =
                      b.member?.user?.fullName || b.member?.name || "Học viên";
                    const studentPhone =
                      b.member?.user?.phone || b.member?.phone || "";
                    return (
                      <div
                        key={b.id || idx}
                        className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="font-semibold text-gray-800">
                            {studentName}
                          </span>
                          {studentPhone && (
                            <span className="text-gray-400 font-mono">
                              ({studentPhone})
                            </span>
                          )}
                          {b.spotNumber && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold text-[10px]">
                              Máy #{b.spotNumber}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="success">
                            {b.status === "attended"
                              ? "Đã tham dự"
                              : "Đã xác nhận"}
                          </Badge>
                          {b.status === "confirmed" && b.id && (
                            <button
                              type="button"
                              onClick={() =>
                                handleCancelStudentBooking(
                                  b.id,
                                  studentName,
                                  false,
                                )
                              }
                              className="px-2 py-1 rounded border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 font-semibold text-[11px]"
                            >
                              Hủy chỗ
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">
                  Chưa có học viên nào đặt chỗ chính thức cho lớp này.
                </p>
              )}
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm text-amber-800">
                  ⏳ Danh sách chờ - Waitlist (
                  {selectedSchedule.waitlistedBookings?.length || 0}):
                </h4>
                <span className="text-[11px] text-gray-500">
                  Xếp theo thứ tự đăng ký chờ
                </span>
              </div>
              {selectedSchedule.waitlistedBookings &&
              selectedSchedule.waitlistedBookings.length > 0 ? (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selectedSchedule.waitlistedBookings.map(
                    (b: any, idx: number) => {
                      const studentName =
                        b.member?.user?.fullName ||
                        b.member?.name ||
                        "Học viên";
                      const studentPhone =
                        b.member?.user?.phone || b.member?.phone || "";
                      const canPromote =
                        selectedSchedule.currentEnrolled <
                        selectedSchedule.maxCapacity;
                      return (
                        <div
                          key={b.id || idx}
                          className="flex items-center justify-between p-2.5 bg-amber-50/60 rounded-lg border border-amber-200 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold flex items-center justify-center text-[10px]">
                              #{idx + 1}
                            </span>
                            <span className="font-semibold text-gray-900">
                              {studentName}
                            </span>
                            {studentPhone && (
                              <span className="text-gray-500 font-mono">
                                ({studentPhone})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {canPromote && b.id && (
                              <button
                                type="button"
                                onClick={() =>
                                  handlePromoteWaitlist(b.id, studentName)
                                }
                                className="px-2.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 font-semibold text-[11px]"
                              >
                                Đôn lên chính thức
                              </button>
                            )}
                            {b.id && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleCancelStudentBooking(
                                    b.id,
                                    studentName,
                                    true,
                                  )
                                }
                                className="px-2 py-1 rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-100 font-medium text-[11px]"
                              >
                                Xóa chờ
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">
                  Không có học viên nào trong danh sách chờ.
                </p>
              )}
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm text-gray-800 mb-2">
                Sơ đồ máy tập (Spot map):
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: selectedSchedule.maxCapacity }).map(
                  (_, i) => {
                    const spotNumber = i + 1;
                    const booking = selectedSchedule.bookings.find((b: any) => b.spotNumber === spotNumber);
                    const isBooked = !!booking;
                    return (
                      <div
                        key={i}
                        title={booking?.member?.user?.fullName || `Chỗ ${spotNumber} còn trống`}
                        className={`p-2.5 text-center rounded-lg border text-xs font-semibold ${
                          isBooked
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-green-50 text-green-700 border-green-200"
                        }`}
                      >
                        Máy #{i + 1}
                        <span className="block font-normal text-[10px] mt-0.5">
                          {isBooked ? booking.member?.user?.fullName || "Đã đặt" : "Còn trống"}
                        </span>
                      </div>
                    );
                  },
                )}
              </div>
              <p className="text-xs text-gray-400 mt-3">Sĩ số và chỗ đặt tự cập nhật mỗi 15 giây.</p>
            </div>
          </div>
          <ModalFooter>
            <Button variant="outline" onClick={() => setSelectedScheduleId(null)}>
              Đóng
            </Button>
            <Button variant="outline" disabled={schedulesFetching} onClick={() => refreshSchedules()}>
              <RefreshCw className={`w-4 h-4 mr-1.5 ${schedulesFetching ? "animate-spin" : ""}`} />
              Làm mới sĩ số
            </Button>
            <Button
              variant="danger"
              disabled={deleteSchedule.isPending}
              onClick={() => handleDeleteSchedule(selectedSchedule.id)}
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Hủy Buổi Học
            </Button>
          </ModalFooter>
        </Modal>
      )}

      {isAddModalOpen && (
        <Modal
          open={isAddModalOpen}
          onClose={() => {
            if (!bulkSaving && !createSchedule.isPending)
              setIsAddModalOpen(false);
          }}
          title={
            creationMode === "weekly"
              ? "Tạo lịch hàng loạt theo tuần"
              : `Tạo Lịch Học Mới — Ngày ${selectedDate}`
          }
        >
          <fieldset
            disabled={bulkSaving || createSchedule.isPending}
            className="space-y-4 py-2"
          >
            <Select
              label="Cách tạo lịch"
              value={creationMode}
              onChange={setCreationMode}
              options={[
                { value: "single", label: "Tạo một buổi học" },
                { value: "weekly", label: "Tạo hàng loạt · lặp theo tuần" },
              ]}
            />
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Chọn lớp học *
              </label>
              <Select
                value={formData.classId}
                onChange={applyClass}
                options={[
                  { value: "", label: "-- Chọn lớp học --" },
                  ...(classesData?.map((c: any) => ({
                    value: c.id,
                    label: `${c.name} (${c.type === "group" ? "Tập lớp" : `Tập riêng 1:${c.defaultMaxCapacity}`}, ${c.durationMinutes} phút)`,
                  })) || []),
                ]}
                placeholder="Chọn lớp học..."
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Huấn luyện viên *
              </label>
              <Select
                value={formData.instructorId}
                onChange={(val) =>
                  setFormData((prev) => ({ ...prev, instructorId: val }))
                }
                options={[
                  { value: "", label: "-- Chọn huấn luyện viên --" },
                  ...(instructorsData?.map((inst: any) => ({
                    value: inst.userId || inst.user?.id || inst.id,
                    label:
                      inst.user?.fullName || inst.fullName || "Huấn luyện viên",
                  })) || []),
                ]}
                placeholder="Chọn huấn luyện viên..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Giờ bắt đầu
                </label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      startTime: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Giờ kết thúc
                </label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      endTime: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <Select
              label="Phòng tập *"
              value={formData.roomId}
              onChange={(roomId) =>
                setFormData((prev) => ({ ...prev, roomId }))
              }
              options={[
                { value: "", label: "-- Chọn phòng tập --" },
                ...(Array.isArray(roomsData) ? roomsData : []).map(
                  (room: any) => ({
                    value: room.id,
                    label: `${room.name} · ${room.capacity} chỗ`,
                  }),
                ),
              ]}
            />

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Sĩ số tối đa
              </label>
              <NumberInput
                aria-label="Sĩ số tối đa"
                min={1}
                step={1}
                value={formData.maxCapacity}
                onValueChange={(maxCapacity) =>
                  setFormData((prev) => ({
                    ...prev,
                    maxCapacity,
                  }))
                }
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Ghi chú
              </label>
              <Input
                placeholder="Ví dụ: Nhớ mang vớ chống trượt..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>
            {creationMode === "weekly" && (
              <RecurringScheduleForm
                configuration={formData}
                initialDate={selectedDate}
                onCreated={() => {
                  setIsAddModalOpen(false);
                  setBulkSaving(false);
                }}
                onBusyChange={setBulkSaving}
              />
            )}
          </fieldset>
          <ModalFooter>
            <Button
              variant="outline"
              disabled={bulkSaving || createSchedule.isPending}
              onClick={() => setIsAddModalOpen(false)}
            >
              Hủy
            </Button>
            {creationMode === "single" && (
              <Button
                disabled={createSchedule.isPending}
                onClick={handleCreateSubmit}
              >
                {createSchedule.isPending ? "Đang tạo..." : "Tạo Lịch Học"}
              </Button>
            )}
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
}
