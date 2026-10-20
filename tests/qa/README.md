# Kiểm thử use case Pilates

Xóa HLV và mật khẩu: từ thư mục `backend`, chạy `node ../tests/qa/run-integration.cjs --account-regressions` sau khi biên dịch backend. Bộ 11 ca dùng database tạm, kiểm tra HLV không trở lại sau xóa/tìm kiếm, danh sách rỗng, quyền xóa, giữ lịch sử, đặt lại mật khẩu qua request builder của admin và đổi mật khẩu qua request builder của học viên. Kiểm tra mật khẩu mới đăng nhập được, mật khẩu cũ bị từ chối và bỏ trống khi sửa không đổi mật khẩu. Từ thư mục gốc, `node tests/qa/run-password-client.cjs` chạy 2 ca kiểm tra lỗi sai mật khẩu hiện tại không xóa phiên học viên, còn lỗi 401 thông thường vẫn xóa phiên không hợp lệ.

Luồng gói tập/HLV/tập đôi: runner HTTP tự chạy thêm `package-flow.cjs` với 11 ca kiểm thử về số buổi đã tập/đã đặt, check-in không trừ hai lần, hủy sớm/muộn, HLV ưu tiên và quyền sở hữu, ghép đôi đối ứng, buổi cuối và chống ghép chéo khi có request đồng thời. `--serve --package-flow` tạo fixture riêng để kiểm tra giao diện cả admin và học viên. Quy trình sử dụng ở `docs/Luong_goi_tap_va_dat_lich.md`.

Lịch tuần: `node tests/qa/run-weekly-booking.cjs` chạy 12 ca cho bộ chọn của học viên (Thứ 3/Thứ 7, múi giờ, lọc giờ/lớp/HLV, giữ lựa chọn thủ công, giới hạn gói, buổi đầy/trùng/hết hạn, thiếu lịch và gói theo thời gian). Runner HTTP bên dưới có 7 ca bổ sung cho admin xem trước/tạo lịch lặp, kiểm tra ngày xung đột, rollback, validation, phân quyền và tạo đồng thời.

Luồng chọn nhiều buổi theo gói có 11 ca kiểm thử HTTP/PostgreSQL: gói 5 buổi đặt 5 lịch và hoàn khi hủy; vượt số buổi; validation; quyền sở hữu; lớp đầy rollback; trùng giờ; hạn gói/trạng thái; hình thức và thời lượng tập; request đồng thời; gửi lại danh sách; gói theo thời gian. Các ca này chạy trong runner dưới đây, không dùng dữ liệu hiện có.

`--serve --package-booking` tạo fixture giao diện với gói 5 buổi và lịch trong hai tuần tới. Có thể đặt `QA_HTTP_PORT` để giữ cố định cổng API; `QA_REPORT_DIR` chứa `ui-server.json` và tệp `stop-ui` để dừng. Giao diện kiểm thử cần trỏ biến API tới URL trong tệp này. Chỉ sử dụng tùy chọn này cho kiểm thử riêng.

Chạy API NestJS thật với PostgreSQL thật, dùng fixture riêng và đối chiếu dữ liệu sau từng thao tác. Kiểm tra các chức năng còn trong phạm vi dự án và chạy lại hai script hiện có. Có kiểm thử xác nhận API của UC22, UC23, UC26, UC31, UC34 đã bị gỡ; danh mục phòng chỉ đọc và phản hồi HLV vẫn được lưu trong hồ sơ tiến độ.

Bao gồm tạo/sửa hình thức tập lớp hoặc tập riêng 1:1–1:4, validation thời lượng, phân quyền cấu hình gói, dữ liệu trên gói hội viên và lịch HLV. Kiểm tra các API đề nghị đã gỡ trả 404 và dữ liệu đề nghị cũ không còn chặn lịch hoặc đặt lớp.

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

Hai script cũ trực tiếp dùng port 3001 và có sửa dữ liệu. Nên chạy qua runner này, không chạy trực tiếp trên database có người dùng thật.
