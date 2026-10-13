# Kết quả kiểm thử và sửa lỗi — 13/10/2026

Lệnh `npm run test:qa` đã chạy thành công với PostgreSQL thật: **132/132 ca regression đạt**, `test-admin-crud.js` **42/42 đạt**, `test-usecases.js` **12/12 đạt**. Tổng cộng **186 lượt kiểm thử đạt**, exit code 0. Database test đã được xóa sau khi chạy.

Trước khi sửa, bộ 116 ca bổ sung có 75 đạt và 41 thất bại. Hai script cũ còn báo PASS khi thiếu fixture, không đối chiếu dữ liệu sau thao tác và trả exit 0 dù có FAIL. Các assertion này đã được sửa; dữ liệu chuẩn bị phải phù hợp với sức chứa phòng và gói còn hiệu lực.

## Các sửa lỗi chính

- Kiểm tra chủ sở hữu booking và giao dịch; học viên không hủy/xem dữ liệu của người khác. API loại bỏ passwordHash, refreshTokenHash và mã xác thực trong response; lịch không đưa toàn bộ hồ sơ các học viên vào payload.
- Đặt lịch dùng transaction và khóa hàng PostgreSQL, dùng chung logic cho hai endpoint đặt chỗ. Kiểm tra trùng HLV/phòng/học viên, thời gian, sức chứa, gói hết hạn và số buổi. Đặt đồng thời không vượt sức chứa, số vị trí trống khớp booking.
- Đặt chỗ ghi nhận buổi đã trừ; check-in không trừ lần hai và chặn lượt lặp/đồng thời. Hủy sớm hoàn đúng buổi, hủy trễ áp dụng cấu hình; phòng tập hủy lớp hoàn buổi và hủy booking. Danh sách chờ được xử lý trong cùng transaction.
- Mua gói tính giá/voucher ở server. Yêu cầu mua online ở trạng thái pending, chỉ cấp gói sau xác nhận thanh toán của nhân viên. Xác nhận lặp/đồng thời không cấp gói hai lần; thanh toán và cấp gói cùng transaction.
- Sửa route PUT đổi mật khẩu mà mobile đang gọi và PATCH hồ sơ cá nhân; bổ sung validation số âm, sức chứa, rating nguyên 1–5, ID UUID, trạng thái và bộ lọc giao dịch. Tài khoản chưa xác thực không đăng nhập; mã xác thực chưa phát hành không được chấp nhận.
- Báo cáo năm dùng doanh thu/học viên/lịch thật; tháng không có dữ liệu trả 0. Báo cáo HLV, phòng, phân bố gói lấy từ database; web không tạo số liệu mô phỏng khi API lỗi.
- Cấu hình hệ thống lưu trong database. Sao lưu tạo snapshot JSON toàn bộ bảng và file thực tế, admin có thể tải; khôi phục kiểm tra cấu trúc/database và chạy trong transaction. Test sửa/xóa rồi khôi phục xác nhận dữ liệu và cấu hình được phục hồi; backup lỗi được rollback.
- Màn hình cài đặt dùng API thật cho cấu hình, nhật ký, backup/restore; mobile hiển thị đúng trạng thái chờ thanh toán và đọc lại hồ sơ đúng cấu trúc.

## Kiểm tra bổ sung

Backend build đạt; TypeScript web-admin và mobile đạt. Build web đạt với cấu hình QA `preserveSymlinks: true` để xử lý lỗi EPERM của Windows sandbox, có cảnh báo bundle lớn hơn 500 kB. Build chuẩn trong sandbox bị EPERM ở native realpath, đây là giới hạn môi trường.

Chưa xác nhận thao tác giao diện bằng trình duyệt hoặc thiết bị mobile: trình duyệt không kết nối được tới server loopback của sandbox. Không suy diễn kết quả API/build thành kết quả kiểm thử giao diện, hiệu năng hoặc thanh toán qua nhà cung cấp bên ngoài.

Các test chạy trên database tạo mới; không seed, restore hoặc sửa dữ liệu database hiện có. Bản sửa có cột `bookings.session_deducted`, `transactions.package_id` và bảng `system_settings`. Dự án đang dùng TypeORM synchronize trong môi trường local; khi triển khai môi trường tắt synchronize cần migration tương ứng. Với booking/giao dịch cũ, dữ liệu trước đây không lưu nguồn trừ buổi hoặc packageId của giao dịch pending; cần đối chiếu dữ liệu lịch sử trước khi chuyển các bản ghi đó qua luồng mới.

Chạy lại từ `C:\pilates\backend`: `npm run test:qa`. Xem `tests/qa/README.md` để chọn kết nối PostgreSQL và nơi lưu JSON/log. Snapshot backup của các test được lưu trong thư mục kết quả QA, không đưa vào Git.
