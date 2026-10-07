TAI LIEU HUONG DAN CAI DAT VA KHOI CHAY HE THONG PILATESMS

Tai lieu nay danh cho nguoi nhan du an de tu cai dat, cau hinh va van hanh he thong quan ly phong tap PilatesMS tren may tinh ca nhan. He thong gom ba thanh phan chinh: Backend API (NestJS), Web Admin quan ly (React Vite), va Mobile App hoc vien (Expo React Native).

YEU CAU TRUOC KHI CAI DAT

Nguoi dung can dam bao may tinh da duoc cai dat san cac moi truong sau:
- Node.js tu phien ban 20 tro len.
- Docker Desktop de khoi chay co so du lieu PostgreSQL va bo nho dem Redis.
- Git de quan ly va dong bo ma nguon.

BUOC 1: TAI MA NGUON VE MAY

Mo terminal tren may tinh cua ban va thuc hien thao tac tai ma nguon:

Neu tai ma nguon ve lan dau tien, chay lenh clone de sao chep toan bo du an:
git clone https://github.com/dozikuto/pilate.git
cd pilate

Neu tren may ban da co san thu muc du an tu truoc va chi muon cap nhat phien ban code moi nhat, chi can chay:
git pull origin main

BUOC 2: THIET LAP TEP CAU HINH MOI TRUONG

He thong da duoc toi uu de su dung chung duy nhat mot file cau hinh .env dat tai thu muc goc. Nguoi dung khong can vao tung thu muc con de tao file.

Tai thu muc goc cua du an, hay chay lenh sao chep file mau:
- Tren Windows: copy .env.example .env
- Tren Linux hoac macOS: cp .env.example .env

File .env goc nay da duoc cau hinh san thong so chuan de ca ba phan he Backend, Web Admin va Mobile deu tu dong doc duoc.

BUOC 3: KHOI DONG CO SO DU LIEU POSTGRESQL VA REDIS

Mo terminal tai thu muc goc cua du an va chay lenh sau de Docker khoi chay co so du lieu va Redis:

docker-compose up -d postgres redis

Sau khi lenh chay xong, co so du lieu PostgreSQL se hoat dong tai cong 5433 va Redis se hoat dong tai cong 6379.

BUOC 4: CAI DAT VA KHOI DONG MAY CHU BACKEND

Mo mot cua so terminal moi, di chuyen vao thu muc backend va thuc hien cac lenh:

cd backend
npm install
npm run seed
npm run start:dev

Lenh npm run seed se tu dong nap toan bo du lieu khoi tao gom tai khoan, lich hoc, phong tap, may tap va goi tap vao co so du lieu.

Khi may chu backend khoi dong thanh cong, he thong se thong bao lang nghe tai dia chi http://localhost:3001. Ban co the xem tai lieu Swagger API truc tiep tai dia chi http://localhost:3001/api.

BUOC 5: CAI DAT VA KHOI DONG GIAO DIEN WEB ADMIN

Mo mot cua so terminal tiep theo, di chuyen vao thu muc web-admin va chay cac lenh:

cd web-admin
npm install
npm run dev

Trang quan tri Web Admin se san sang hoat dong tai dia chi http://localhost:5173.

Nguoi dung co the su dung cac tai khoan mau sau day de dang nhap trai nghiem:
- Tai khoan Quan tri vien: admin@pilatesms.vn voi mat khau Admin@123456
- Tai khoan Le tan: letan@pilatesms.vn voi mat khau Staff@123
- Tai khoan Huan luyen vien: coach.lan@pilatesms.vn voi mat khau Coach@123

BUOC 6: CAI DAT VA KHOI DONG UNG DUNG MOBILE APP

Mo mot cua so terminal khac, di chuyen vao thu muc mobile va chay cac lenh:

cd mobile
npm install
npx expo start --web

Ung dung danh cho hoc vien se mo truc tiep tren trinh duyet tai dia chi http://localhost:8081 hoac ban co the su dung ung dung Expo Go tren dien thoai de quet ma QR.

Tai khoan hoc vien mau de dang nhap trai nghiem tren ung dung di dong:
- Email: hang.nguyen@gmail.com
- Mat khau: Member@123
