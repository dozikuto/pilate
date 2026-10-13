# Kiểm thử use case Pilates

Chạy API NestJS thật với PostgreSQL thật, dùng fixture riêng và đối chiếu dữ liệu sau từng thao tác. Bao gồm 132 ca kiểm thử cho UC1–UC7 và chạy lại 54 ca trong hai script hiện có.

## Chạy lại

```powershell
cd C:\pilates\backend
npm run test:qa
```

PostgreSQL phải chạy trước (ví dụ `docker compose up -d postgres redis` tại thư mục gốc). Thông tin kết nối lấy từ `C:\pilates\.env`. User PostgreSQL cần quyền CREATE DATABASE. Có thể chỉ định `QA_DB_HOST`, `QA_DB_PORT`, `QA_DB_USER`, `QA_DB_PASSWORD`. Không cần cài thêm package.

Runner tạo database `qa_pilates_<UUID>` mới, khởi động AppModule trên cổng loopback ngẫu nhiên, sử dụng ValidationPipe/TransformInterceptor/HttpExceptionFilter giống main.ts. Hai script hiện có được chạy với URL chuyển sang API test; các assertion báo PASS khi thiếu dữ liệu và cách chọn fixture sai đã được sửa. Sau đó fixture được nạp mới trong database test, rồi chạy bộ regression. Cuối cùng API dừng và chỉ database do lượt test đó tạo ra bị xóa. Database hiện có không được seed/truncate/restore.

Kết quả mặc định nằm trong `tests/qa/results/integration-results.json`, kèm log hai script cũ. Đặt `QA_REPORT_DIR` để đổi nơi lưu. Exit code: 0 = đạt, 1 = có test thất bại (kể cả script cũ báo FAIL nhưng exit 0), 2 = lỗi chuẩn bị hoặc dọn dẹp. `--skip-legacy` bỏ qua hai script cũ.

Fixture cố ý đặt các trạng thái biên như gói `active` nhưng ngày hết hạn đã qua, lịch hoàn tất/quá giờ, capacity=1 và request đồng thời. Mỗi ca lỗi phải được xử lý theo nghiệp vụ, không đổi expected thành HTTP hiện tại để làm xanh kết quả.

Một test thất bại có thể bao gồm nhiều endpoint cùng nguyên nhân. Không diễn giải 41 ca thất bại trước khi sửa thành 41 lỗi độc lập. Test đồng thời có thể phụ thuộc thời điểm thực thi; runner thử tối đa 5 vòng để phát hiện overbooking, dừng khi tái hiện.

## Giao diện và build web

`web-qa.mjs --build` chạy build với source hiện tại, Tailwind hiện tại và `preserveSymlinks: true` để tránh lỗi `fs.realpathSync.native` EPERM trong Windows sandbox. Đây là cấu hình kiểm thử, không sửa Vite config sản phẩm. Build chuẩn vẫn cần chạy lại ngoài sandbox nếu gặp EPERM.

`run-integration.cjs --serve` mở API test với fixture cho kiểm tra giao diện, ghi `ui-server.json` vào `QA_REPORT_DIR`. Chạy `web-qa.mjs` với cùng `QA_REPORT_DIR` để mở web ở 127.0.0.1:5173. Tạo tệp `stop-ui` trong thư mục report để dừng API và xóa database test. Dừng Vite bằng Ctrl+C. Không dùng kết quả build/API để khẳng định giao diện hoặc thiết bị mobile đã được kiểm thử tương tác.

Hai script cũ trực tiếp dùng port 3001 và có sửa dữ liệu/phát broadcast. Nên chạy qua runner này, không chạy trực tiếp trên database có người dùng thật.
