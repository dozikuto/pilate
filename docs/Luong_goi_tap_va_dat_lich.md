# Gói tập, HLV ưu tiên và đặt lịch

## Học viên

1. Admin nhập giá rồi mở bán năm gói chính: tập thử 2 buổi, lớp chung 8 hoặc 10 buổi, riêng 1:1 và đôi 1:2 cùng 4 buổi. Học viên mở **Gói tập → Mua thêm**, lọc tập thử, lớp chung, riêng 1:1 hoặc đôi 1:2. Các cấu hình 1:3–1:4 cũ chỉ còn phục vụ tương thích, không nằm trong năm gói chính.
2. Chọn gói và phương thức thanh toán. Yêu cầu mua online chờ nhân viên xác nhận tiền trước khi cấp gói.
3. Trong **Gói tập của tôi**, chọn **Chọn lịch tập**. Chỉ hiển thị ca phù hợp với hình thức và thời lượng của gói; gói thường không hiển thị ca riêng.
4. Chọn HLV và ngày bằng các nút trên lịch, rồi chọn giờ tập. Có thể lưu/bỏ HLV ưu tiên theo từng gói; ưu tiên không hạn chế học viên đặt ca của HLV khác.
5. Chọn từng buổi hoặc mở **Đặt theo tuần**: khoảng ngày, thứ, số buổi, giờ và HLV. Các ca phải do admin/lễ tân công bố trước.
6. Xem lại ngày, giờ, HLV, phòng và số buổi còn có thể đặt rồi xác nhận. Không bắt buộc đặt hết gói khi mua.

## Tập đôi 1:2

- Mỗi người có tài khoản và gói 1:2 riêng, cùng thời lượng buổi tập.
- Admin/lễ tân mở **Học viên → hồ sơ → Gói tập → HLV ưu tiên & ghép đôi**, chọn gói của người tập cùng và lưu.
- Học viên thấy tên người tập cùng trên gói. Hai người thống nhất và tự xác nhận cùng ca; mỗi tài khoản chỉ trừ buổi trong gói của mình.
- Ca đã có một người đặt chỉ nhận người còn lại trong cặp, không nhận học viên của cặp khác. Gói chưa ghép không đặt được ca 1:2.
- Muốn đổi/bỏ cặp, xử lý các lịch sắp tới của các gói liên quan trước. Không tự động hủy lịch của người tập cùng.
- HLV ưu tiên và người tập cùng có thể khác nhau giữa các gói của cùng một học viên.

## Theo dõi số buổi

| Mục | Ý nghĩa |
| --- | --- |
| Đã tập | Booking đã điểm danh và check-in trực tiếp có liên kết gói |
| Đã đặt, chưa tập | Booking đã xác nhận, chưa điểm danh |
| Còn có thể đặt | Số dư sau các lượt đặt thành công |
| Hủy muộn / vắng mặt | Lượt bị tính buổi theo chính sách |
| Buổi đã trừ khác / dữ liệu cũ | Chênh lệch đã có mà không đủ lịch sử để khẳng định là đã tập |

Ví dụ: gói 5 buổi, đặt trước 3 buổi → đã tập 0, đã đặt 3, còn có thể đặt 2. Điểm danh một buổi → đã tập 1, đã đặt 2, còn có thể đặt vẫn là 2.

Hủy trước ít nhất số giờ đã cấu hình được hoàn buổi; hủy muộn/vắng mặt vẫn tính buổi. Studio hủy ca hoàn buổi cho các booking hợp lệ. Gói còn hiệu lực khi số dư bằng 0 do đã đặt trước toàn bộ; học viên vẫn xem và hủy lịch được.

Hồ sơ/danh sách học viên trên admin và gói/lịch trên web học viên tự cập nhật mỗi 15 giây khi trang đang mở, đồng thời cập nhật ngay sau thao tác tại trang đó.

## Dữ liệu và triển khai

- Migration `1792288800000-MemberPackagePreferences.ts` bổ sung HLV ưu tiên, liên kết hai gói tập đôi và gói được dùng cho check-in. Các trường đều nullable, giữ dữ liệu hiện có.
- Khi `DB_SYNC=true`, TypeORM tự bổ sung cột. Môi trường tắt đồng bộ schema cần áp dụng migration theo quy trình triển khai.
- Sao lưu/khôi phục hỗ trợ liên kết đối ứng giữa hai gói; thao tác khôi phục vẫn chạy trong một transaction.
- Gói tập cũ không đủ lịch sử sử dụng được hiển thị riêng, không suy diễn tất cả lượt đã trừ thành lượt đã tập.

## Kiểm chứng

Runner `tests/qa/run-integration.cjs` bao gồm `package-flow.cjs`: số buổi, điểm danh không trừ hai lần, hoàn buổi, HLV ưu tiên, quyền sở hữu, ghép đôi, lịch của cặp khác và các request đồng thời. Chạy bằng API NestJS/PostgreSQL thật trong database tạm, không dùng dữ liệu hiện có.

`--serve --package-flow` tạo fixture giao diện có gói nhóm 5 buổi, gói 1:1 và hai gói 1:2 chưa ghép; lịch mẫu trong năm tuần. Trỏ web thử nghiệm tới API được ghi trong `ui-server.json`; tạo tệp `stop-ui` để dừng và xóa database tạm.
