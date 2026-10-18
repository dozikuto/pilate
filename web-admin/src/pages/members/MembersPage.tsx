import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Filter, Pencil } from "lucide-react";
import { useMembers } from "@/hooks/useMembers";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import MemberFormModal from "./MemberFormModal";
import { useAuthStore } from "@/store/auth.store";
import { formatDate } from "@/lib/utils";
import type { Member } from "@/types";
import { useDebounce } from "@/hooks/useDebounce";

const statusOptions = [
  { label: "Tất cả trạng thái", value: "all" },
  { label: "Hoạt động", value: "active" },
  { label: "Không hoạt động", value: "inactive" },
  { label: "Hết hạn", value: "expired" },
];

export default function MembersPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const user = useAuthStore(s => s.user);
  const canEdit = user?.role === 'admin' || user?.role === 'receptionist';

  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading, isError, refetch } = useMembers({
    page,
    limit: 10,
    search: debouncedSearch,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const apiItems = Array.isArray(data?.data)
    ? data.data
    : Array.isArray((data as any)?.items)
      ? (data as any).items
      : null;
  const rawList: Member[] = apiItems ?? [];

  const members = rawList.filter((m: Member) => {
    if (statusFilter && statusFilter !== "all" && m.status !== statusFilter)
      return false;
    if (debouncedSearch) {
      const s = debouncedSearch.toLowerCase();
      const matchName = m.name?.toLowerCase().includes(s);
      const matchPhone = m.phone?.includes(s);
      const matchEmail = m.email?.toLowerCase().includes(s);
      if (!matchName && !matchPhone && !matchEmail) return false;
    }
    return true;
  });
  const total =
    statusFilter !== "all" || debouncedSearch
      ? members.length
      : (data?.total ?? members.length);
  const totalPages = Math.max(1, Math.ceil(total / 10));

  const columns: Column<Member>[] = [
    {
      key: "code",
      header: "Mã HV",
      width: "90px",
      render: (value) => (
        <span className="text-xs font-mono text-gray-500">{String(value)}</span>
      ),
    },
    {
      key: "name",
      header: "Họ tên",
      render: (_, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
            {row.name.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{row.name}</p>
            <p className="text-xs text-gray-500">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Số điện thoại",
      render: (value) => (
        <span className="text-sm font-mono">{String(value)}</span>
      ),
    },
    {
      key: "currentPackage",
      header: "Gói tập",
      render: (_, row) =>
        row.currentPackage ? (
          <span className="text-sm">{row.currentPackage.packageName}</span>
        ) : (
          <span className="text-xs text-gray-400">Chưa có gói</span>
        ),
    },
    {
      key: "remainingSessions",
      header: "Buổi còn lại",
      align: "center",
      render: (_, row) => (
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-semibold">
            {row.remainingSessions}/{row.totalSessions}
          </span>
          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{
                width: `${row.totalSessions > 0 ? (row.remainingSessions / row.totalSessions) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      ),
    },
    {
      key: "joinDate",
      header: "Ngày tham gia",
      render: (value) => (
        <span className="text-sm">{formatDate(String(value))}</span>
      ),
    },
    {
      key: "status",
      header: "Trạng thái",
      render: (value) => {
        const v = String(value);
        return (
          <Badge
            variant={
              v === "active"
                ? "success"
                : v === "inactive"
                  ? "default"
                  : "danger"
            }
          >
            {v === "active"
              ? "Hoạt động"
              : v === "inactive"
                ? "Không HĐ"
                : "Hết hạn"}
          </Badge>
        );
      },
    },
  ];

  if (canEdit) columns.push({
    key: 'actions', header: 'Thao tác', align: 'right',
    render: (_, row) => <Button variant="outline" size="sm" aria-label={`Chỉnh sửa ${row.name}`}
      onClick={event => { event.stopPropagation(); setEditingId(row.id); setModalOpen(true); }}>
      <Pencil size={14} />Chỉnh sửa
    </Button>,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Học viên</h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý danh sách học viên ({total} học viên)
          </p>
        </div>
        {canEdit && <Button onClick={() => { setEditingId(undefined); setModalOpen(true); }}>
          <Plus size={16} />
          Thêm học viên
        </Button>}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, SĐT, email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <Select
            options={statusOptions}
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
            placeholder=""
            className="w-48"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        {isError ? (
          <div role="alert" className="p-8 text-center space-y-3">
            <p className="text-red-700">Không tải được danh sách học viên.</p>
            <Button variant="outline" onClick={() => refetch()}>
              Thử lại
            </Button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={members}
            loading={isLoading}
            onRowClick={(row) => navigate(`/members/${row.id}`)}
            page={page}
            totalPages={totalPages}
            total={total}
            limit={10}
            onPageChange={setPage}
            emptyMessage="Không tìm thấy học viên nào"
          />
        )}
      </div>

      {modalOpen && canEdit && <MemberFormModal memberId={editingId} onClose={() => setModalOpen(false)} />}
    </div>
  );
}
