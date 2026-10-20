# Kết quả luồng gói tập, HLV ưu tiên và tập đôi — 18/10/2026

- API NestJS + PostgreSQL: **173/173 ca đạt**, gồm 11 ca mới cho số buổi, HLV ưu tiên và ghép đôi. Hai script cũ đạt **34/34** và **11/11**; tổng **218/218**. Database tạm đã được xóa. Báo cáo: `backend/.qa-temp/package-flow-final/integration-results.json`.
- Backend TypeScript, TypeScript web học viên và build web quản trị đạt; Vite còn cảnh báo kích thước bundle hiện có.
- Đã thử trên giao diện với dữ liệu riêng: chọn gói 1:1, lưu HLV ưu tiên, lọc 18:00, chọn 5 thứ Hai liên tiếp, xem lại/xác nhận, đối chiếu admin hiển thị 0 đã tập / 5 đã đặt / 0 còn có thể đặt.
- Admin ghép hai gói 1:2; học viên thấy đúng người tập cùng, đặt ca đôi và còn 4/5 buổi. Giao diện chặn bỏ ghép khi có lịch sắp tới và giữ nguyên dữ liệu đã lưu. Bộ lọc mua gói 1:2 chỉ hiển thị gói phù hợp.
- Kiểm thử khôi phục backup phát hiện liên kết hai gói tham chiếu lẫn nhau; đã sửa khôi phục tham chiếu sau khi nạp đủ các dòng, trong cùng transaction. Kiểm thử khôi phục thành công và rollback khi dữ liệu lỗi đều đạt.
- Ảnh bước xác nhận: `backend/.qa-temp/package-flow-ui/booking-review.png`. Hướng dẫn sử dụng: `docs/Luong_goi_tap_va_dat_lich.md`.

## Kết quả tạo gói trực tiếp và gỡ đề nghị — 15/10/2026

Kiểm thử NestJS HTTP với PostgreSQL thật đạt **130/130 ca hồi quy**, `test-admin-crud.js` đạt **34/34**, `test-usecases.js` đạt **11/11**. Tổng cộng **175/175 ca đạt**, exit code 0; database tạm đã được xóa. JSON/log ở `backend/.qa-temp/direct-training-results/`.

- Tạo/sửa gói chọn trực tiếp hình thức tập lớp hoặc tập riêng 1:1–1:4; cấu hình thời lượng, giá, số buổi và hạn dùng. Kiểm thử lưu/đọc đủ bốn hình thức, đổi về tập lớp, validation và quyền admin đều đạt.
- Hình thức/thời lượng được trả đúng trong gói hội viên để ứng dụng học viên hiển thị.
- Đã gỡ tab, màn hình, thao tác gửi/duyệt/hủy và API đề nghị. Các API cũ trả 404 cho cả bốn vai trò. Bản ghi cũ giữ trong database để tương thích sao lưu nhưng không còn chặn xếp lịch hoặc đặt lớp.
- Lịch HLV chuyển sang API Instructors; xem lịch, đặt lớp, thanh toán, báo cáo và backup/restore tiếp tục đạt.
- Backend/web build và TypeScript mobile đạt. Web còn cảnh báo kích thước bundle.
- Đã kiểm tra giao diện thật: trang Gói tập không còn tab đề nghị; Tạo Gói Mới có Hình thức tập với tập lớp và 1:1–1:4, chọn tập riêng sẽ hiện thời lượng. Hủy biểu mẫu thử, không tạo gói vào dữ liệu hiện có. Ba server 3001, 5173, 8081 đều trả HTTP 200.

## Kết quả phiên bản có đề nghị trước khi gỡ — 15/10/2026

Kiểm thử NestJS HTTP với PostgreSQL thật đạt **137/137 ca hồi quy**, `test-admin-crud.js` đạt **34/34**, `test-usecases.js` đạt **11/11**. Tổng cộng **182/182 ca đạt**, exit code 0. Database tạm đã được xóa sau khi chạy. Báo cáo JSON và log ở `backend/.qa-temp/package-private-results/`.

- Gói tập lưu riêng thiết lập bật/tắt tập riêng, hình thức 1:1–1:4 và thời lượng 15–180 phút; tạo/sửa đều được kiểm tra dữ liệu và quyền admin.
- Đề nghị bắt buộc chọn gói đang hoạt động đã mở tập riêng. Backend áp dụng hình thức/thời lượng theo gói và chặn thông số gửi sai. Khung giờ tránh trùng lớp và không vượt giờ đóng cửa. Đề nghị cũ không gắn gói vẫn đọc được.
- Đã kiểm tra trực tiếp trên trình duyệt: nút Cấu hình gói, bật tập riêng, chọn 1:2 và 45 phút trong biểu mẫu, cùng tab Đề nghị tập riêng trong trang Gói tập. Hủy thay đổi biểu mẫu sau khi kiểm tra, không thay cấu hình các gói hiện có. Hộp thoại cuộn được trên màn hình nhỏ.
- Backend build và TypeScript mobile đạt; web build đạt. Kiểm thử API xác nhận lưu và đọc lại dữ liệu; chưa thực hiện gửi đề nghị qua giao diện mobile.
- Backend, web quản trị và mobile web đang chạy ở các cổng 3001, 5173, 8081 và đã kiểm tra phản hồi HTTP 200.

## Kết quả sau khi gỡ use case ngày 15/10/2026

Đã gỡ UC22, UC23, UC26, UC31 và UC34 khỏi API và giao diện. Kiểm thử với NestJS HTTP và PostgreSQL thật đạt **128/128 ca hồi quy**, `test-admin-crud.js` đạt **34/34**, `test-usecases.js` đạt **11/11**. Tổng cộng **173/173 ca đạt**, exit code 0. Database tạm đã được xóa sau khi chạy; dữ liệu hiện có không bị sửa.

- Các endpoint chi nhánh/phòng, thiết bị, sản phẩm/tồn kho, thông báo và tra cứu nhật ký đã bỏ trả 404 cho cả bốn vai trò.
- `GET /classes/rooms` chỉ đọc danh mục phòng đang hoạt động, loại phòng/cơ sở ngừng dùng và yêu cầu đăng nhập. Không thể thêm, sửa, xóa phòng qua đường dẫn này. Đã sửa kiểm tra UUID trên API xóa lớp để đường dẫn danh mục phòng không bị nhận nhầm thành ID lớp.
- Xếp lịch, đặt/hủy lớp, kiểm tra sức chứa, thanh toán, báo cáo, sao lưu/khôi phục tiếp tục đạt. Phản hồi HLV được lưu và đọc lại trong hồ sơ tiến độ.
- Backend và web build thành công; TypeScript mobile đạt. Web còn cảnh báo kích thước bundle. Lượt này chưa kiểm thử tương tác giao diện trên trình duyệt/điện thoại.

Đã cập nhật README và đặc tả Markdown theo phạm vi hiện tại. Các tệp Word vẫn giữ bản thiết kế ban đầu; môi trường thiếu LibreOffice để render và kiểm tra bố cục theo quy trình tài liệu.

Chạy lại từ thư mục `backend`: `npm run test:qa`. Báo cáo JSON và log của lượt này ở `backend/.qa-temp/removed-usecases-results/` (không đưa vào Git).

## Kết quả lịch sử ngày 13/10/2026 trước khi thu hẹp phạm vi

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
## Kiểm thử xóa HLV và mật khẩu ngày 20/10/2026

- **11/11 ca API/PostgreSQL đạt**, database QA đã được xóa. Chạy bằng `--account-regressions`; đây là lượt kiểm thử tập trung, không phải chạy lại toàn bộ regression.
- **2/2 ca phía client đạt**: nhập sai mật khẩu hiện tại không làm mất token; lỗi 401 thông thường vẫn xóa token không hợp lệ.
- Sửa danh sách HLV chỉ lấy tài khoản đang hoạt động, giữ điều kiện lọc khi tìm tên/email. Xóa giữ hồ sơ, lịch dạy và booking; tài khoản ngừng hoạt động không đăng nhập được. UI bỏ dữ liệu mẫu, tải lại từ API sau thao tác và có trạng thái rỗng/lỗi rõ ràng.
- Admin gửi mật khẩu mới khi sửa tài khoản, bỏ trường password nếu để trống. Client và DTO kiểm tra tối thiểu 8 ký tự. Web học viên gửi đúng `oldPassword` thay vì `currentPassword`.
- Giao diện kiểm thử dùng API/database riêng: đã xóa hai HLV mẫu, tải lại trang và xác nhận danh sách vẫn rỗng; kiểm tra trường mật khẩu mới trong biểu mẫu admin có `minlength=8`. Không đổi mật khẩu tài khoản đang sử dụng của người dùng qua trình duyệt.
- Backend và mobile TypeScript đạt. Web admin build đạt, còn cảnh báo bundle lớn đã có trước.
- Báo cáo API: `backend/.qa-temp/account-fixes-20261020/integration-results.json`. Ảnh QA ở `backend/.qa-temp/account-ui-20261020/`; dữ liệu và ảnh thử nghiệm không đưa vào Git.
