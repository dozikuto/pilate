# TÀI LIỆU HƯỚNG DẪN CÀI ĐẶT VÀ KHỞI CHẠY HỆ THỐNG PILATESMS

Tài liệu dành cho người nhận dự án để cài đặt và chạy trên máy của mình. Hệ thống gồm Backend API (NestJS), Web Admin (React Vite) và ứng dụng học viên (Expo React Native, có thể chạy trên trình duyệt).

Hướng dẫn dưới đây chạy PostgreSQL và Redis bằng Docker, sau đó chạy ba ứng dụng bằng Node.js. Mỗi ứng dụng dùng một cửa sổ terminal riêng.

## YÊU CẦU TRƯỚC KHI CÀI ĐẶT

- Node.js 20 trở lên và npm.
- Git.
- Docker Desktop đã mở và sẵn sàng chạy Linux containers.
- Các cổng mặc định còn trống: `5433`, `6379`, `3001`, `5173`, `8081`.

## BƯỚC 1: TẢI MÃ NGUỒN VỀ MÁY

Lần đầu nhận dự án:

```powershell
git clone https://github.com/dozikuto/pilate.git
cd pilate
```

Nếu đã có bản clone, mở terminal trong thư mục đó và cập nhật sau khi đã lưu các thay đổi riêng:

```powershell
git pull origin main
```

Các lệnh ở bước 2 và 3 chạy tại thư mục gốc `pilate`, nơi có `docker-compose.yml`.

## BƯỚC 2: THIẾT LẬP TỆP CẤU HÌNH MÔI TRƯỜNG

Tạo một tệp `.env` tại thư mục gốc từ tệp mẫu. Chỉ sao chép khi chưa có `.env`; giữ cấu hình đang dùng khi cập nhật dự án.

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Linux hoặc macOS:

```bash
cp .env.example .env
```

Backend, Web Admin và ứng dụng học viên đọc cấu hình từ tệp `.env` gốc. Khi chạy các ứng dụng trên cùng một máy, dùng các địa chỉ sau:

```dotenv
PORT=3001
DB_HOST=localhost
DB_PORT=5433
DB_SYNC=true
REDIS_HOST=localhost
REDIS_PORT=6379
VITE_API_URL=http://localhost:3001/api/v1
EXPO_PUBLIC_API_URL=http://localhost:3001/api/v1
```

Giữ `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `REDIS_PASSWORD` và các khóa còn lại đồng nhất với tệp mẫu và Docker Compose. Cấu hình mẫu và tài khoản ở bên dưới phục vụ chạy thử local. Không đưa `.env` thật lên Git.

`DB_SYNC=true` cho phép TypeORM đồng bộ schema khi chạy local. Khi triển khai với `DB_SYNC=false`, cần kiểm tra và áp dụng các thay đổi schema trước; không coi hướng dẫn local này là quy trình triển khai production.

## BƯỚC 3: KHỞI ĐỘNG POSTGRESQL VÀ REDIS

Mở Docker Desktop, đợi Docker sẵn sàng rồi chạy tại thư mục gốc:

```powershell
docker compose up -d postgres redis
docker compose ps
```

PostgreSQL được truy cập từ máy ở cổng `5433`, Redis ở cổng `6379`. Các volume Docker giữ dữ liệu khi dừng hoặc khởi động lại container. Lệnh này chỉ bật hai dịch vụ dữ liệu; backend và các giao diện được chạy ở những bước tiếp theo.

Nếu báo không kết nối được Docker engine, mở Docker Desktop và đợi engine chạy rồi thực hiện lại. Nếu báo cổng bị chiếm, kiểm tra ứng dụng đang dùng cổng hoặc điều chỉnh cổng cùng cấu hình kết nối tương ứng.

## BƯỚC 4: CÀI ĐẶT VÀ KHỞI ĐỘNG BACKEND

Mở terminal mới tại thư mục gốc dự án:

```powershell
cd backend
npm install
```

**Chỉ với database mới cần dữ liệu demo**, chạy:

```powershell
npm run seed
```

Seed tạo tài khoản mẫu cùng danh mục và dữ liệu demo để kiểm tra hệ thống sau cài đặt.

Khởi động API:

```powershell
npm run start:dev
```

- Backend: [http://localhost:3001](http://localhost:3001).
- Swagger API: [http://localhost:3001/api](http://localhost:3001/api).
- Tiền tố API nghiệp vụ: `/api/v1`.

**Với database đã có dữ liệu**, không chạy lại toàn bộ seed chỉ để mở server. Sau khi cài dependencies và kiểm tra cấu hình, chạy `npm run start:dev`.

## BƯỚC 5: CÀI ĐẶT VÀ KHỞI ĐỘNG WEB ADMIN

Giữ terminal backend đang chạy. Mở terminal mới tại thư mục gốc:

```powershell
cd web-admin
npm install
npm run dev
```

Mở [http://localhost:5173](http://localhost:5173). Nếu Vite chọn cổng khác vì cổng mặc định bị chiếm, dùng đúng địa chỉ được in trong terminal.

Tài khoản demo chỉ có sau khi seed database mới:

| Vai trò | Email | Mật khẩu mẫu |
| --- | --- | --- |
| Quản trị viên | `admin@pilatesms.vn` | `Admin@123456` |
| Lễ tân | `letan@pilatesms.vn` | `Staff@123` |
| Huấn luyện viên | `coach.lan@pilatesms.vn` | `Coach@123` |

## BƯỚC 6: CÀI ĐẶT VÀ KHỞI ĐỘNG ỨNG DỤNG HỌC VIÊN

Giữ backend và Web Admin đang chạy. Mở terminal mới tại thư mục gốc:

```powershell
cd mobile
npm install
npm run web
```

Mở [http://localhost:8081](http://localhost:8081), hoặc địa chỉ Expo in trong terminal nếu cổng đã thay đổi.

Tài khoản học viên demo sau khi seed:

- Email: `hang.nguyen@gmail.com`.
- Mật khẩu: `Member@123`.

Nếu thử bằng Expo Go trên điện thoại thật, máy tính và điện thoại cần kết nối mạng phù hợp. Đổi `EXPO_PUBLIC_API_URL` thành IP LAN của máy chạy backend, ví dụ `http://192.168.1.10:3001/api/v1`, rồi khởi động lại Expo. `localhost` trên điện thoại là chính điện thoại, không phải máy tính. Cho phép kết nối tới cổng backend trong firewall nếu cần. Mã QR mở ứng dụng Expo khác với mã QR điểm danh học viên.

Để chạy lại những lần sau, mở Docker và thực hiện bước 3, sau đó chạy ba lệnh khởi động ở bước 4–6 trong ba terminal. Chỉ cần cài lại dependencies khi chúng thay đổi; không cần seed lại. Dừng mỗi ứng dụng bằng `Ctrl+C`; dừng database bằng `docker compose stop postgres redis` tại thư mục gốc khi không sử dụng.
