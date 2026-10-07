BẢN THẢO BÁO CÁO BÀI TẬP LỚN

Đề tài: PHẦN MỀM QUẢN LÝ PHÒNG TẬP PILATES

PHÂN TÍCH YÊU CẦU HỆ THỐNG VÀ SƠ ĐỒ USE-CASE

MỤC LỤC NỘI DUNG

1. Phân tích yêu cầu của hệ thống

1.1. Mô tả bài toán / Đặt vấn đề

1.2. Các yêu cầu chức năng

1.3. Sơ đồ Use-Case

1.3.1. Sơ đồ Use-Case

1.3.2. Mô tả ngắn gọn Actor và Use-Case

1.4. Đặc tả nhóm chức năng 1 (UC1)

1. PHÂN TÍCH YÊU CẦU CỦA HỆ THỐNG

1.1. Mô tả bài toán / Đặt vấn đề

Phần mềm quản lý phòng tập Pilates được xây dựng nhằm hỗ trợ phòng tập quản lý tập trung các hoạt động liên quan đến hội viên, lớp học, huấn luyện viên, gói tập, thanh toán, phòng tập, thiết bị và các hoạt động quản trị hệ thống.

Hệ thống hướng tới việc cung cấp một môi trường quản lý thống nhất, trong đó mỗi nhóm người sử dụng được cung cấp các chức năng phù hợp với vai trò của mình. Hội viên có thể quản lý tài khoản, tìm kiếm và đặt lịch tập; huấn luyện viên quản lý lịch dạy và theo dõi học viên; nhân viên/lễ tân hỗ trợ quản lý hội viên và thanh toán; quản trị viên quản lý hoạt động chung, thống kê và cấu hình hệ thống.

Việc xây dựng hệ thống giúp các nghiệp vụ được tổ chức theo từng nhóm chức năng rõ ràng, hỗ trợ theo dõi dữ liệu và giảm sự phụ thuộc vào các thao tác quản lý thủ công.

1.1.1. Mục tiêu của hệ thống

Quản lý tài khoản và thông tin hội viên.

Hỗ trợ hội viên tìm kiếm, đặt và hủy lịch tập.

Hỗ trợ hội viên check-in lớp học bằng mã QR.

Hỗ trợ HLV quản lý lịch dạy và danh sách học viên.

Hỗ trợ HLV cập nhật tiến độ, thiết kế bài tập và đánh giá học viên.

Hỗ trợ nhân viên/lễ tân quản lý gói hội viên và thanh toán.

Quản lý phòng tập, thiết bị, sản phẩm, dịch vụ, khuyến mãi và bảo trì.

Cung cấp thống kê và báo cáo cho quản trị viên.

Hỗ trợ quản trị người dùng, vai trò, phân quyền và dữ liệu hệ thống.

1.2. Các yêu cầu chức năng

R1. Quản lý tài khoản và thông tin hội viên

R1.1 Hệ thống cho phép khách hàng đăng ký tài khoản.

R1.2 Hệ thống cho phép xác thực tài khoản sau khi đăng ký.

R1.3 Hệ thống cho phép người dùng đăng nhập vào hệ thống.

R1.4 Hệ thống cho phép hội viên xem và quản lý thông tin cá nhân.

R1.5 Hệ thống cho phép hội viên cập nhật thông tin cá nhân.

R1.6 Hệ thống cho phép hội viên thay đổi mật khẩu.

R1.7 Hệ thống cho phép hội viên xem lịch sử giao dịch.

R1.8 Hệ thống cho phép hội viên đánh giá dịch vụ của phòng tập.

R2. Đặt lịch và tham gia lớp tập

R2.1 Hệ thống cho phép hội viên xem danh sách các lớp học.

R2.2 Hệ thống cho phép hội viên tìm kiếm lớp học.

R2.3 Hệ thống cho phép hệ thống kiểm tra số lượng chỗ còn trống của lớp.

R2.4 Hệ thống cho phép hội viên đặt lịch tập.

R2.5 Hệ thống cho phép hội viên xem lịch tập của mình.

R2.6 Hệ thống cho phép hội viên hủy lịch tập đã đặt.

R2.7 Hệ thống cho phép hội viên xác nhận việc hủy lịch tập.

R2.8 Hệ thống cho phép hội viên check-in lớp học bằng mã QR.

R2.9 Hệ thống cho phép cập nhật trạng thái tham gia lớp học.

R3. Quản lý giảng dạy và học viên

R3.1 Hệ thống cho phép HLV xem lịch dạy.

R3.2 Hệ thống cho phép HLV xem danh sách học viên.

R3.3 Hệ thống cho phép HLV cập nhật tiến độ của học viên.

R3.4 Hệ thống cho phép HLV thiết kế bài tập cho học viên.

R3.5 Hệ thống cho phép HLV ghi nhận thông tin buổi tập.

R3.6 Hệ thống cho phép HLV đánh giá học viên.

R3.7 Hệ thống cho phép HLV gửi phản hồi cho học viên.

R4. Quản lý hội viên và thanh toán

R4.1 Hệ thống cho phép nhân viên tư vấn các gói tập cho khách hàng.

R4.2 Hệ thống cho phép nhân viên đăng ký gói hội viên cho khách hàng.

R4.3 Hệ thống cho phép nhân viên gia hạn gói hội viên.

R4.4 Hệ thống cho phép thực hiện thanh toán.

R4.5 Hệ thống cho phép thanh toán tại quầy.

R4.6 Hệ thống cho phép thanh toán trực tuyến.

R4.7 Hệ thống cho phép xem lịch sử thanh toán.

R4.8 Hệ thống cho phép xuất hóa đơn.

R5. Quản lý cửa hàng và dịch vụ

R5.1 Hệ thống cho phép quản trị viên quản lý sản phẩm và dịch vụ.

R5.2 Hệ thống cho phép quản trị viên quản lý các chương trình khuyến mãi.

R5.3 Hệ thống cho phép áp dụng chương trình khuyến mãi.

R5.4 Hệ thống cho phép quản trị viên quản lý phòng tập.

R5.5 Hệ thống cho phép quản trị viên quản lý thiết bị.

R5.6 Hệ thống cho phép quản trị viên quản lý lịch bảo trì.

R5.7 Hệ thống cho phép hệ thống gửi thông báo bảo trì.

R6. Thống kê và báo cáo

R6.1 Hệ thống cho phép quản trị viên thống kê số lượng hội viên.

R6.2 Hệ thống cho phép quản trị viên thống kê doanh thu.

R6.3 Hệ thống cho phép quản trị viên thống kê lượt đặt lịch.

R6.4 Hệ thống cho phép quản trị viên xem báo cáo hiệu suất HLV.

R6.5 Hệ thống cho phép quản trị viên xem báo cáo sử dụng phòng tập.

R6.6 Hệ thống cho phép quản trị viên xuất báo cáo.

R7. Quản trị hệ thống

R7.1 Hệ thống cho phép quản trị viên quản lý người dùng.

R7.2 Hệ thống cho phép quản trị viên quản lý vai trò.

R7.3 Hệ thống cho phép quản trị viên phân quyền người dùng.

R7.4 Hệ thống cho phép quản trị viên cấu hình hệ thống.

R7.5 Hệ thống cho phép quản trị viên xem nhật ký hệ thống.

R7.6 Hệ thống cho phép quản trị viên sao lưu dữ liệu.

R7.7 Hệ thống cho phép quản trị viên khôi phục dữ liệu.

1.3. Sơ đồ Use-Case

1.3.1. Sơ đồ Use-Case

Sơ đồ Use-Case mô tả các tác nhân tương tác với hệ thống quản lý phòng tập Pilates và các nhóm chức năng mà mỗi tác nhân được phép thực hiện. Hệ thống được tổ chức thành 7 nhóm Use Case tương ứng với các nhóm yêu cầu chức năng R1 đến R7.

Các nhóm Use Case gồm:

UC1 – Quản lý tài khoản và hội viên.

UC2 – Đặt lịch và tham gia lớp tập.

UC3 – Quản lý giảng dạy và học viên.

UC4 – Quản lý hội viên và thanh toán.

UC5 – Quản lý cửa hàng và dịch vụ.

UC6 – Thống kê và báo cáo.

UC7 – Quản trị hệ thống.

1.3.2. Mô tả ngắn gọn về từng Actor và từng Use-Case

A1. Khách hàng / Hội viên

Là người sử dụng dịch vụ của phòng tập. Actor này thực hiện các chức năng liên quan đến tài khoản, thông tin cá nhân, lớp học, lịch tập, check-in và đánh giá dịch vụ.

Các Use Case liên quan:

Đăng ký tài khoản

Xác thực tài khoản

Đăng nhập

Quản lý thông tin cá nhân

Cập nhật thông tin cá nhân

Đổi mật khẩu

Xem lịch sử giao dịch

Đánh giá dịch vụ

Xem danh sách lớp học

Tìm kiếm lớp học

Đặt lịch tập

Xem lịch tập của mình

Hủy lịch tập

Xác nhận hủy lịch

Check-in lớp học (Quét QR)

Cập nhật trạng thái tham gia

A2. Huấn luyện viên (HLV)

Là người trực tiếp phụ trách các lớp tập và theo dõi quá trình tập luyện của học viên.

Các Use Case liên quan:

Xem lịch dạy

Xem danh sách học viên

Cập nhật tiến độ học viên

Thiết kế bài tập

Ghi nhận buổi tập

Đánh giá học viên

Gửi phản hồi cho học viên

A3. Nhân viên / Lễ tân

Là người hỗ trợ khách hàng và thực hiện các nghiệp vụ liên quan đến gói hội viên và thanh toán.

Các Use Case liên quan:

Tư vấn gói tập

Đăng ký gói hội viên

Gia hạn gói hội viên

Thanh toán

Thanh toán tại quầy

Thanh toán online

Xem lịch sử thanh toán

Xuất hóa đơn

A4. Quản trị viên (Admin)

Là người quản lý và vận hành hệ thống, bao gồm dữ liệu nghiệp vụ, thống kê, báo cáo và cấu hình hệ thống.

Các Use Case liên quan:

Quản lý sản phẩm / dịch vụ

Quản lý khuyến mãi

Áp dụng khuyến mãi

Quản lý phòng tập

Quản lý thiết bị

Quản lý lịch bảo trì

Thông báo bảo trì

Thống kê số lượng hội viên

Thống kê doanh thu

Thống kê lượt đặt lịch

Báo cáo hiệu suất HLV

Báo cáo sử dụng phòng tập

Xuất báo cáo

Quản lý người dùng

Quản lý vai trò

Phân quyền người dùng

Cấu hình hệ thống

Nhật ký hệ thống

Sao lưu dữ liệu

Khôi phục dữ liệu

Bảng tổng hợp nhóm Use Case

1.4. Đặc tả nhóm chức năng 1 (UC1)

Nhóm UC1 – Quản lý tài khoản và hội viên tập trung vào các chức năng giúp khách hàng/hội viên tạo, truy cập và quản lý tài khoản cũng như thông tin cá nhân trên hệ thống.

1.4.1. Danh sách Use Case thuộc UC1

1.4.2. UC1.1 – Đăng ký tài khoản

Actor: Khách hàng / Hội viên

Mục đích: Cho phép khách hàng tạo tài khoản để sử dụng hệ thống.

Điều kiện trước: Khách hàng chưa có tài khoản trên hệ thống.

Luồng chính:

Khách hàng chọn chức năng Đăng ký tài khoản.

Hệ thống hiển thị biểu mẫu đăng ký.

Khách hàng nhập các thông tin cần thiết.

Hệ thống kiểm tra tính hợp lệ của dữ liệu.

Hệ thống tạo tài khoản.

Hệ thống chuyển sang bước xác thực tài khoản.

Luồng ngoại lệ:

Thông tin không hợp lệ → hệ thống yêu cầu nhập lại.

Email hoặc số điện thoại đã tồn tại → hệ thống thông báo tài khoản đã tồn tại.

Xác thực không thành công → yêu cầu thực hiện lại.

Kết quả: Tài khoản được tạo và sẵn sàng cho bước xác thực.

1.4.3. UC1.2 – Xác thực tài khoản

Actor: Khách hàng / Hội viên

Mục đích: Xác nhận tài khoản sau khi đăng ký.

Điều kiện trước: Khách hàng đã thực hiện đăng ký.

Luồng chính:

Hệ thống gửi yêu cầu/thông tin xác thực.

Khách hàng thực hiện xác thực.

Hệ thống kiểm tra thông tin xác thực.

Hệ thống cập nhật trạng thái tài khoản.

Luồng ngoại lệ:

Thông tin xác thực không hợp lệ → hệ thống thông báo lỗi.

Quá thời gian xác thực → yêu cầu thực hiện lại.

Kết quả: Tài khoản được xác thực thành công.

1.4.4. UC1.3 – Đăng nhập

Actor: Khách hàng / Hội viên

Mục đích: Cho phép người dùng truy cập hệ thống bằng tài khoản đã đăng ký.

Điều kiện trước: Người dùng đã có tài khoản.

Luồng chính:

Người dùng chọn Đăng nhập.

Nhập thông tin tài khoản.

Hệ thống kiểm tra thông tin.

Hệ thống xác thực tài khoản.

Hệ thống cho phép truy cập.

Luồng ngoại lệ:

Sai tài khoản hoặc mật khẩu → thông báo lỗi.

Tài khoản chưa được xác thực → yêu cầu xác thực.

Kết quả: Người dùng đăng nhập thành công.

1.4.5. UC1.4 – Quản lý thông tin cá nhân

Actor: Khách hàng / Hội viên

Mục đích: Cho phép hội viên xem và quản lý thông tin cá nhân.

Điều kiện trước: Hội viên đã đăng nhập.

Luồng chính:

Hội viên mở chức năng thông tin cá nhân.

Hệ thống hiển thị thông tin hiện tại.

Hội viên lựa chọn chức năng xem hoặc cập nhật thông tin.

Hệ thống xử lý yêu cầu tương ứng.

Luồng ngoại lệ:

Dữ liệu cập nhật không hợp lệ → hệ thống yêu cầu nhập lại.

Kết quả: Thông tin cá nhân được hiển thị hoặc cập nhật theo yêu cầu.

1.4.6. UC1.5 – Cập nhật thông tin cá nhân

Actor: Khách hàng / Hội viên

Mục đích: Cho phép hội viên thay đổi thông tin cá nhân.

Điều kiện trước: Hội viên đã đăng nhập.

Luồng chính:

Hội viên mở thông tin cá nhân.

Chọn trường thông tin cần cập nhật.

Nhập dữ liệu mới.

Hệ thống kiểm tra dữ liệu.

Hệ thống lưu thông tin mới.

Hệ thống thông báo cập nhật thành công.

Luồng ngoại lệ:

Dữ liệu không hợp lệ → yêu cầu nhập lại.

Kết quả: Thông tin cá nhân mới được lưu trong hệ thống.

1.4.7. UC1.6 – Đổi mật khẩu

Actor: Khách hàng / Hội viên

Mục đích: Cho phép hội viên thay đổi mật khẩu tài khoản.

Điều kiện trước: Hội viên đã đăng nhập.

Luồng chính:

Chọn Đổi mật khẩu.

Nhập mật khẩu hiện tại.

Nhập mật khẩu mới và xác nhận.

Hệ thống kiểm tra thông tin.

Hệ thống cập nhật mật khẩu.

Luồng ngoại lệ:

Mật khẩu hiện tại không đúng → thông báo lỗi.

Mật khẩu mới không đáp ứng yêu cầu → yêu cầu nhập lại.

Mật khẩu xác nhận không trùng khớp → yêu cầu nhập lại.

Kết quả: Mật khẩu mới được cập nhật.

1.4.8. UC1.7 – Xem lịch sử giao dịch

Actor: Khách hàng / Hội viên

Mục đích: Cho phép hội viên xem các giao dịch đã thực hiện.

Điều kiện trước: Hội viên đã đăng nhập.

Luồng chính:

Hội viên chọn Lịch sử giao dịch.

Hệ thống truy xuất dữ liệu.

Hệ thống hiển thị danh sách giao dịch.

Hội viên có thể xem chi tiết giao dịch.

Luồng ngoại lệ:

Không có giao dịch → hệ thống hiển thị danh sách rỗng/thông báo phù hợp.

Kết quả: Thông tin lịch sử giao dịch được hiển thị.

1.4.9. UC1.8 – Đánh giá dịch vụ

Actor: Khách hàng / Hội viên

Mục đích: Cho phép hội viên đánh giá chất lượng dịch vụ.

Điều kiện trước: Hội viên đã sử dụng dịch vụ và đăng nhập.

Luồng chính:

Hội viên chọn chức năng Đánh giá dịch vụ.

Hệ thống hiển thị biểu mẫu đánh giá.

Hội viên nhập nội dung và mức đánh giá.

Hệ thống kiểm tra dữ liệu.

Hệ thống lưu đánh giá.

Hệ thống thông báo hoàn tất.

Luồng ngoại lệ:

Nội dung đánh giá không hợp lệ → yêu cầu nhập lại.

Kết quả: Đánh giá được lưu vào hệ thống.

1.4.10. Quan hệ giữa các Use Case trong UC1

Trong nhóm UC1, Đăng ký tài khoản có thể bao gồm bước Xác thực tài khoản. Quan hệ <<include>> thể hiện bước xác thực là một phần của quy trình đăng ký.

Quản lý thông tin cá nhân và Cập nhật thông tin cá nhân có quan hệ phụ thuộc về mặt nghiệp vụ: cập nhật là thao tác cụ thể được thực hiện khi người dùng quản lý thông tin cá nhân.

Ghi chú về cách đánh số

Để phù hợp với yêu cầu của bài tập, các Use Case nên được đánh số theo trình tự nghiệp vụ: các chức năng tạo dữ liệu hoặc thiết lập thông tin trước được đặt trước các chức năng sử dụng và khai thác dữ liệu sau đó. Ví dụ trong UC1: Đăng ký tài khoản → Xác thực tài khoản → Đăng nhập → Quản lý/Cập nhật thông tin cá nhân → các chức năng khai thác thông tin.

Trong Module 2, quan hệ nghiệp vụ nên được thể hiện nhất quán: Đặt lịch tập <<include>> Kiểm tra lớp còn trống; Hủy lịch tập <<include>> Xác nhận hủy lịch. Cách này phản ánh đúng trình tự của từng quy trình và tránh việc một thao tác đặt lịch lại bao gồm bước xác nhận hủy.


### BẢNG 1

| Nhóm | Tên nhóm chức năng | Actor chính |
| UC1 | Quản lý tài khoản & hội viên | Khách hàng / Hội viên |
| UC2 | Đặt lịch & tham gia lớp tập | Khách hàng / Hội viên |
| UC3 | Quản lý giảng dạy & học viên | Huấn luyện viên |
| UC4 | Quản lý hội viên & thanh toán | Nhân viên / Lễ tân |
| UC5 | Quản lý cửa hàng & dịch vụ | Quản trị viên |
| UC6 | Thống kê & báo cáo | Quản trị viên |
| UC7 | Quản trị hệ thống | Quản trị viên |


### BẢNG 2

| Mã | Use Case | Actor chính |
| UC1.1 | Đăng ký tài khoản | Khách hàng / Hội viên |
| UC1.2 | Xác thực tài khoản | Khách hàng / Hội viên |
| UC1.3 | Đăng nhập | Khách hàng / Hội viên |
| UC1.4 | Quản lý thông tin cá nhân | Khách hàng / Hội viên |
| UC1.5 | Cập nhật thông tin cá nhân | Khách hàng / Hội viên |
| UC1.6 | Đổi mật khẩu | Khách hàng / Hội viên |
| UC1.7 | Xem lịch sử giao dịch | Khách hàng / Hội viên |
| UC1.8 | Đánh giá dịch vụ | Khách hàng / Hội viên |

