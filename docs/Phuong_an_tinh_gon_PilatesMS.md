# Phương án tinh gọn PilatesMS

Ngày lựa chọn: 18/10/2026.

Mục tiêu là giảm số nơi người dùng phải thao tác, giữ dữ liệu thống nhất giữa quản trị và học viên, và hoàn thiện các luồng phòng tập sử dụng hằng ngày. Phương án dưới đây là lựa chọn về phạm vi và thiết kế; các thay đổi giao diện và xử lý ứng dụng được liệt kê theo thứ tự triển khai ở cuối tài liệu.

## 1 Các lựa chọn chính

- Giữ luồng cốt lõi: tạo lớp và lịch → mua hoặc cấp gói → đặt lịch → điểm danh → ghi nhận tập luyện → thanh toán và báo cáo.
- Giữ tạo lịch hàng loạt cho admin/lễ tân, đặt nhiều buổi bằng một gói và chọn lịch theo tuần cho học viên.
- Thu gọn 12 mục điều hướng quản trị thành 8 mục. Gộp các điểm truy cập có liên quan; các dữ liệu khác bản chất vẫn giữ quan hệ và trách nhiệm riêng.
- Giữ một nguồn lịch, booking, điểm danh, giao dịch và quyền sử dụng gói. Các màn hình theo vai trò cùng đọc và cập nhật nguồn này.
- Giữ bốn vai trò cố định: học viên, HLV, lễ tân, quản trị viên. Hiển thị menu và kiểm soát đường dẫn theo quyền thực tế.
- Giữ sao lưu và khôi phục. Hai thao tác nằm chung một nơi nhưng là hai mục tiêu nghiệp vụ khác nhau.
- Giữ danh mục phòng và sức chứa để xếp lịch. Không mở lại phân hệ chi nhánh, thiết bị, bảo trì hoặc cửa hàng trong phạm vi hiện tại.

## 2 Tám mục quản trị được chọn

| Mục đích đến | Phạm vi được giữ | Cách tinh gọn |
| --- | --- | --- |
| Tổng quan | Lịch hôm nay, chỗ trống, giao dịch chờ, số liệu nhanh | Dùng số liệu thực và liên kết đến thao tác cần xử lý. Phân tích theo kỳ nằm ở Báo cáo. |
| Học viên | Hồ sơ, thông tin sức khỏe, gói đang sở hữu, booking, chuyên cần, giáo án và tiến độ | Một hồ sơ học viên có các tab liên quan. Thanh toán và ghi nhận tập luyện mở các biểu mẫu dùng chung. |
| Lịch học | Lịch theo ngày/tuần, danh mục lớp, xếp lịch đơn/hàng loạt, đặt chỗ, sĩ số và điểm danh | Giữ cấu trúc lớp và lịch đã gộp. Dùng một chi tiết buổi học cho lịch quản trị và lịch HLV. |
| Huấn luyện viên | Hồ sơ HLV, chuyên môn, phân công, lịch dạy và lối vào nghiệp vụ giảng dạy | Gộp Giáo viên với Giảng dạy & HLV. Dùng thống nhất tên Huấn luyện viên. Lịch dạy là chế độ xem của cùng nguồn lịch học. |
| Gói tập và ưu đãi | Danh mục gói, hình thức tập lớp/tập riêng, giá, hạn dùng, số buổi, voucher | Gộp Gói tập với Khuyến mãi thành hai tab. Danh mục gói không đồng nhất với gói học viên đã mua. |
| Thanh toán | Giao dịch chờ, xác nhận thu tiền, giao dịch hoàn tất, biên nhận và xuất CSV | Một luồng ghi nhận thanh toán và kích hoạt gói. Các nút mua/gia hạn tại hồ sơ học viên mở luồng này. |
| Báo cáo | Doanh thu, học viên, buổi học, hiệu suất HLV, sử dụng phòng, chất lượng dịch vụ | Đưa danh sách đánh giá vào tab Chất lượng dịch vụ. Giữ đánh giá và phản hồi tập luyện là hai loại dữ liệu khác nhau. |
| Quản trị | Tài khoản và vai trò, thông tin studio, quy định hủy, sao lưu, khôi phục | Gộp Người dùng & Quyền với Cài đặt. Quản trị viên có toàn bộ các tab này; các vai trò khác chỉ thấy phần được phép. |

Bốn lần gộp menu là Giảng dạy & HLV với Giáo viên, Gói tập với Khuyến mãi, Báo cáo với Đánh giá, và Cài đặt với Người dùng & Quyền. Việc gộp này đưa 12 mục hiện có xuống 8 mục mà giữ được toàn bộ nhóm nghiệp vụ cần thiết.

## 3 Các phần trùng hoặc chồng phạm vi

### Lịch quản trị và lịch dạy

Hiện Lớp & lịch học và Giảng dạy & HLV cùng hiển thị lịch, sĩ số và danh sách học viên. Hai điểm truy cập phù hợp với hai công việc khác nhau nhưng cần dùng chung truy vấn, dữ liệu và thành phần chi tiết ca.

Lựa chọn: Lịch học quản lý xếp lịch và đặt chỗ; Lịch dạy hiển thị ca được phân công và hành động giảng dạy. Một ca chỉ có một bản ghi lịch. Không duy trì hai bộ sĩ số hoặc hai danh sách điểm danh.

### Giáo án và ghi nhận tiến độ

Trang giảng dạy hiện đã dùng chung TeachingPlanModal và API workout-plans cho bài tập, điểm, tiến độ và phản hồi. Đây là nền tảng cần giữ, không phải ba phân hệ lưu trữ riêng để xây lại.

Lựa chọn: một phiếu tập luyện của học viên có nội dung bài tập, ghi nhận tiến độ và phản hồi; gắn buổi học khi phù hợp. Các tab là cách tra cứu. HLV có thể chuẩn bị giáo án trước buổi và ghi nhận kết quả sau buổi. Giữ lịch sử các phiếu, tránh ghi đè phiếu của một buổi khác chỉ để cập nhật điểm mới nhất.

### Đăng ký mới và gia hạn gói

Cấp gói tại hồ sơ học viên, học viên tự mua gói và xác nhận giao dịch cùng tác động đến quyền sử dụng gói. Đó là các điểm bắt đầu khác nhau của một quy trình cần thống nhất.

Lựa chọn: mua mới và gia hạn dùng chung luồng chọn học viên, chọn gói, tính giá, thu tiền hoặc ghi lý do cấp, rồi kích hoạt gói. Gia hạn thông thường tạo lượt sở hữu gói mới để giữ lịch sử. Cấp gói miễn phí hoặc điều chỉnh quyền lợi cần được phân biệt với giao dịch có thu tiền.

### Lịch sử giao dịch và lịch sử thanh toán

Hai tên này cùng chỉ dữ liệu giao dịch trong phạm vi hiện tại. Admin/lễ tân xem theo quyền, học viên chỉ xem của mình.

Lựa chọn: dùng thống nhất tên Lịch sử thanh toán và một nguồn giao dịch; không duy trì hai bảng hoặc hai chức năng cập nhật trạng thái riêng.

### Các bước nhỏ đang được tách thành use case

| Các mục đang tách | Lựa chọn |
| --- | --- |
| Quản lý thông tin cá nhân và cập nhật thông tin cá nhân | Gộp mô tả thành Quản lý hồ sơ cá nhân, gồm xem và sửa. |
| Hủy lịch và xác nhận hủy lịch | Một use case Hủy đặt chỗ; xác nhận là bước trong luồng. |
| Đặt lịch và kiểm tra còn chỗ | Kiểm tra chỗ là xử lý bắt buộc của đặt lịch; vẫn có thể hiển thị chỗ trống khi tra cứu. |
| Thanh toán chung, thanh toán tại quầy, thanh toán online | Một luồng thanh toán với các phương thức và trạng thái khác nhau; không tạo ba sổ giao dịch. |
| Ghi nhận buổi tập, đánh giá học viên, cập nhật tiến độ, phản hồi HLV | Một luồng ghi nhận kết quả tập luyện với các trường thông tin tương ứng; điểm danh là dữ liệu liên quan được liên kết. |
| Quản lý vai trò và phân quyền người dùng | Một chức năng quản trị tài khoản và gán vai trò cố định; kiểm tra quyền vẫn thực hiện ở API. |
| Khuyến mãi và quản lý chương trình/mã giảm giá | Một danh mục ưu đãi. Áp dụng mã là bước dùng ưu đãi khi mua gói. |

Không ép sao lưu và khôi phục thành một thao tác. Không coi đăng ký, đăng nhập và đăng xuất là trùng chỉ vì cùng phân hệ tài khoản.

## 4 Những phần cần giữ riêng

| Các khái niệm | Lý do giữ riêng |
| --- | --- |
| Danh mục lớp và buổi học | Danh mục mô tả chương trình; buổi học gắn ngày, giờ, HLV và phòng. |
| Buổi học và booking | Một buổi có nhiều booking, mỗi booking thuộc một học viên. |
| Danh mục gói và gói học viên sở hữu | Giá và cấu hình sản phẩm khác quyền sử dụng, hạn dùng và số buổi còn lại của từng học viên. |
| Booking và điểm danh | Đặt chỗ không đồng nghĩa đã đến tập. Điểm danh không trừ thêm buổi đã trừ lúc đặt. |
| Giao dịch chờ và gói đã kích hoạt | Yêu cầu mua gói không chứng minh đã thu tiền. |
| Phản hồi của HLV và đánh giá dịch vụ của học viên | Khác người viết, người nhận, thang điểm và phạm vi chia sẻ. |
| Tổng quan và báo cáo | Tổng quan phục vụ việc cần làm hôm nay; báo cáo phục vụ phân tích theo kỳ. Có thể dùng chung nguồn tính số liệu. |
| Tài khoản, hồ sơ học viên và hồ sơ HLV | Dùng chung định danh người dùng nhưng giữ thông tin nghiệp vụ của từng vai trò. |

## 5 Các chức năng giữ ngoài phạm vi

- Quản lý cửa hàng, sản phẩm và tồn kho.
- Quản lý đa chi nhánh ở mức phân hệ vận hành riêng.
- Quản lý thiết bị, bảo trì và thông báo bảo trì.
- Quy trình gửi, duyệt hoặc từ chối đề nghị tập riêng. Tập riêng dùng cấu hình gói và lịch do phòng tập mở.
- HLV tự đăng ký lịch dạy trong bản hiện tại. Admin/lễ tân phân công để kiểm soát phòng, sức chứa và xung đột.
- Trung tâm thông báo và tra cứu nhật ký hệ thống như hai module riêng đã gỡ.
- Nhận diện khuôn mặt, tính lương và hoa hồng, vai trò tự thiết kế, tự thu tiền định kỳ, tự động gia hạn.
- Các phương thức thanh toán hoặc nút đăng nhập ngoài chưa được tích hợp thực tế: chỉ hiển thị khi luồng sử dụng đã hoạt động.

Danh mục phòng và sức chứa vẫn được giữ cho xếp lịch. Các dữ liệu cũ phục vụ tương thích và sao lưu được bảo toàn; bỏ điểm truy cập hoặc nghiệp vụ không đồng nghĩa xóa bảng và lịch sử.

Danh sách chờ được giữ như một trạng thái booking trong chi tiết buổi học, không tạo menu riêng. Cần hoàn thiện giao diện vào hàng chờ và chuyển lên trước khi quảng bá thành luồng học viên đã hoàn chỉnh.

## 6 Trải nghiệm theo vai trò

### Học viên

Chọn bốn tab: Trang chủ, Lịch học, Gói tập, Hồ sơ.

- Trang chủ hiển thị buổi sắp tới, gói còn hiệu lực và nút Mã QR.
- Lịch học gồm lịch có thể đặt và lịch đã đăng ký. Có chọn một buổi, nhiều buổi và chọn theo tuần.
- Gói tập gồm gói đang sở hữu, mua/gia hạn và lịch sử thanh toán.
- Hồ sơ gồm thông tin cá nhân, thông tin phục vụ tập luyện, tiến độ, phản hồi và đổi mật khẩu.
- Mã QR được mở từ trang chủ hoặc chi tiết buổi đã đăng ký. Bỏ tab Check-in độc lập vì mở mã QR chưa phải thao tác điểm danh.

### Huấn luyện viên

Chọn ba điểm truy cập chính: Lịch dạy của tôi, Học viên của tôi, Hồ sơ.

- Mở ca để xem danh sách, điểm danh và cập nhật trạng thái ca.
- Mở học viên để chuẩn bị giáo án và ghi nhận kết quả tập luyện.
- Không hiển thị menu cấu hình hệ thống, giao dịch toàn studio hoặc dữ liệu ngoài phân công.

### Lễ tân

Ưu tiên Học viên, Lịch học, Gói tập và Thanh toán; Tổng quan phục vụ ca trực. Quyền báo cáo, ưu đãi được hiển thị theo chính sách hiện có. Không cấp các tab tài khoản, phân quyền, sao lưu và khôi phục của admin.

### Quản trị viên

Sử dụng đầy đủ tám mục quản trị. Việc ẩn menu phải đi kèm chặn truy cập đường dẫn và kiểm tra quyền phía server.

## 7 Các quy tắc phải bảo toàn

1. Nhiều HLV được có lịch cùng ngày giờ khi khác phòng và không chồng lịch của chính HLV đó.
2. Không có hai buổi chồng giờ trong một phòng. Sĩ số không vượt sức chứa phòng.
3. Gói theo buổi chỉ bị trừ sau khi xác nhận đặt thành công; tích chọn hoặc tìm lịch tuần chưa trừ.
4. Gói còn 5 buổi có thể đặt 5 lịch khác nhau, hoặc đặt ít hơn và dùng phần còn lại sau.
5. Đặt nhiều buổi thực hiện toàn bộ hoặc hoàn tác toàn bộ; không âm buổi, không đặt vượt chỗ.
6. Tạo lịch hàng loạt kiểm tra lại xung đột trên server và không tạo dở dang một phần.
7. Chọn theo tuần của học viên chỉ tìm buổi đã mở. Không tự tạo lớp, phòng hoặc phân công HLV.
8. Hủy đủ điều kiện hoàn đúng gói đã dùng và chỉ hoàn một lần.
9. Điểm danh chỉ ghi nhận tham gia, không trừ thêm buổi.
10. Xác nhận thanh toán và cấp gói chỉ có hiệu lực một lần khi gửi lặp.
11. Booking chờ chưa trừ buổi. Chuyển lên xác nhận phải kiểm tra lại điều kiện; đặt hàng loạt không âm thầm đổi các buổi lỗi sang chờ.
12. Học viên chỉ xem dữ liệu của mình; HLV chỉ thao tác trong phạm vi phân công của phân hệ giảng dạy.

## 8 Thứ tự triển khai được chọn

### Ưu tiên 1 Hoàn thiện độ tin cậy của luồng hiện có

- Thay dữ liệu mẫu dự phòng trong dashboard, giao dịch và danh sách HLV bằng trạng thái tải, lỗi và dữ liệu rỗng rõ ràng.
- Nối thao tác xác nhận thanh toán, cập nhật gói và lịch sử thanh toán vào cùng luồng; chống cấp gói trùng.
- Hoàn thiện trạng thái sau đăng ký. Chỉ yêu cầu OTP khi có cơ chế cấp, gửi và kiểm tra mã thật; loại các mã mẫu khỏi trải nghiệm sử dụng.
- Hiển thị menu và chặn đường dẫn theo vai trò.
- Rà soát cách quy đổi số buổi giữa các loại gói. Không dùng giá trị mặc định 10 buổi hoặc tổng số buổi của gói có thời hạn như dữ liệu quyền lợi thực.

### Ưu tiên 2 Gộp điều hướng và thành phần dùng chung

- Tạo tám mục quản trị theo phần 2 và bốn tab học viên theo phần 6.
- Gộp HLV, gói/ưu đãi, chất lượng/báo cáo và các tab quản trị.
- Dùng chung chi tiết buổi học, danh sách sĩ số, điểm danh và phiếu ghi nhận tập luyện.
- Giữ đường dẫn cũ bằng chuyển hướng phù hợp; không làm mất liên kết đến hồ sơ và lịch sử.

### Ưu tiên 3 Hoàn thiện phần còn thiếu ở hai đầu sử dụng

- Đưa tiến độ, giáo án và phản hồi được phép chia sẻ lên hồ sơ học viên.
- Hoàn thiện giao diện hàng chờ trong chi tiết buổi, điểm danh QR tại quầy và các thông báo kết quả ngay trên màn hình.
- Thống nhất cách làm mới dữ liệu sau mua gói, xác nhận tiền, đặt/hủy lịch và điểm danh.
- Cập nhật danh mục use case về một bộ mã và ghi riêng mức có giao diện, mới có API hoặc ngoài phạm vi.

### Kiểm tra sau triển khai

Kiểm tra lại theo luồng nghiệp vụ và vai trò: nhiều HLV cùng giờ khác phòng; tạo lịch hàng loạt không dở dang; gói 5 buổi đặt nhiều lịch; hoàn đúng gói; không trừ khi điểm danh; xác nhận tiền lặp không cấp trùng; học viên và HLV không xem dữ liệu ngoài quyền; các liên kết cũ mở đúng nơi mới.

## 9 Căn cứ rà soát

- Điều hướng quản trị: `web-admin/src/components/layout/Sidebar.tsx`, `web-admin/src/App.tsx`.
- Lớp và lịch dùng chung: `web-admin/src/pages/schedule/ClassSchedulePage.tsx`, `SchedulePage.tsx`, `backend/src/modules/classes`.
- Giảng dạy: `web-admin/src/pages/teaching/TeachingPage.tsx`, `TeachingPlanModal.tsx`, `backend/src/modules/teaching`.
- Học viên, gói và thanh toán: `backend/src/modules/members`, `packages`, `bookings`, `transactions`; các trang quản trị và học viên tương ứng.
- Điều hướng học viên: `mobile/src/app/(tabs)/_layout.tsx`, `mobile/src/components/PackageScheduleScreen.tsx`, `mobile/src/app/(tabs)/my-packages.tsx`.
- Phạm vi đã gỡ và các bổ sung gần đây: `README.md`.
- Danh mục use case người dùng cung cấp: `FullUCnew.xlsx`, đã đối chiếu ở lượt kiểm tra trước; cần thống nhất các mục giữ/bỏ và hai bộ mã đang trùng.
