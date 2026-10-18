import { Link, useSearchParams } from "react-router-dom";
import { Calendar, BookOpen, Package } from "lucide-react";
import SchedulePage from "./SchedulePage";
import ClassesPage from "../classes/ClassesPage";

export default function ClassSchedulePage() {
  const [params, setParams] = useSearchParams();
  const catalogue = params.get("tab") === "classes";
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-3">
        <nav aria-label="Quản lý lớp và lịch" className="flex gap-2">
          {[
            { id: "schedule", label: "Xếp lịch & đặt chỗ", icon: Calendar },
            { id: "classes", label: "Danh mục lớp", icon: BookOpen },
          ].map((tab) => (
            <button
              key={tab.id}
              aria-current={
                (catalogue ? "classes" : "schedule") === tab.id
                  ? "page"
                  : undefined
              }
              onClick={() =>
                setParams(tab.id === "classes" ? { tab: "classes" } : {})
              }
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold ${(catalogue ? "classes" : "schedule") === tab.id ? "bg-primary text-white" : "bg-white text-gray-500 hover:bg-gray-100"}`}
            >
              <tab.icon size={17} />
              {tab.label}
            </button>
          ))}
        </nav>
        <Link
          to="/packages"
          className="flex items-center gap-2 text-sm font-semibold text-primary"
        >
          <Package size={17} />
          Cấu hình gói tập
        </Link>
      </div>
      {catalogue ? <ClassesPage /> : <SchedulePage />}
    </div>
  );
}
