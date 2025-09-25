# Ứng dụng quản lý đặt lịch khám bệnh online

Hệ thống quản lý đặt lịch khám bệnh của Bệnh viện Phục hồi chức năng Hà Nội

## Tổng quan

Đây là một ứng dụng web full-stack cho phép bệnh nhân đặt lịch khám bệnh online, quản lý lịch hẹn, và cho phép bác sĩ và nhân viên quản lý các cuộc hẹn.

## Công nghệ sử dụng

### Frontend
- ReactJS + TypeScript
- Material UI
- React Router
- Axios

### Backend
- NodeJS + Express + TypeScript
- SQL Server + Prisma ORM
- JWT Authentication
- bcryptjs (password hashing)

## Cấu trúc thư mục

```
med-booking/
├── .gitignore         # Git ignore rules (root level)
├── frontend/          # React frontend
│   ├── .env.example   # Frontend environment template
│   ├── public/        # Static files
│   └── src/           # Source code
├── backend/           # Node.js backend
│   ├── .env.example   # Backend environment template
│   ├── prisma/        # Database schema & migrations
│   └── src/           # Source code
└── README.md         # Documentation
```

## Cấu hình môi trường

### Thiết lập biến môi trường

Trước khi cài đặt và chạy ứng dụng, bạn cần tạo các file cấu hình môi trường.

#### Backend (.env file)

1. Sao chép file mẫu:
```bash
cd backend
cp .env.example .env
```

2. Chỉnh sửa file `.env` với thông tin của bạn:
```env
# Database Configuration
DATABASE_URL="sqlserver://localhost:1433;database=med_booking;user=sa;password=YourActualPassword;trustServerCertificate=true"

# JWT Configuration
JWT_SECRET="your-unique-secret-key-here-make-it-long-and-secure"

# Server Configuration
PORT=8080
```

**Lưu ý quan trọng:**
- **DATABASE_URL**: Thay `YourActualPassword` bằng mật khẩu thật của SQL Server
- **JWT_SECRET**: Tạo một chuỗi bí mật mạnh (tối thiểu 32 ký tự) cho việc mã hóa JWT
- **PORT**: Có thể thay đổi nếu port 8080 đã được sử dụng

#### Frontend (.env file)

1. Sao chép file mẫu:
```bash
cd frontend
cp .env.example .env
```

2. Chỉnh sửa file `.env` với thông tin của bạn:
```env
# API Configuration
REACT_APP_API_URL=http://localhost:8080/api
```

**Lưu ý:**
- **REACT_APP_API_URL**: URL của backend API (thường là `http://localhost:8080/api` khi chạy local)

### Yêu cầu hệ thống
- Node.js (version 16+)
- SQL Server hoặc PostgreSQL
- npm hoặc yarn

### Backend Setup

1. Di chuyển vào thư mục backend:
```bash
cd backend
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Thiết lập database:
```bash
# Tạo database PostgreSQL với tên 'med_booking_db'
# Cập nhật DATABASE_URL trong file .env nếu cần

# Chạy migration
npm run prisma:migrate

# Seed dữ liệu mẫu
npm run prisma:seed
```

4. Chạy backend server:
```bash
npm run dev
```

### Frontend Setup

1. Di chuyển vào thư mục frontend:
```bash
cd frontend
```

2. Cài đặt dependencies:
```bash
npm install
```

3. Chạy frontend server:
```bash
npm start
```

## Tài khoản mẫu

Sau khi chạy seed data, bạn có thể đăng nhập với các tài khoản sau:

### Bệnh nhân
- Email: `patient1@example.com`
- Mật khẩu: `password123`

### Bác sĩ
- Email: `doctor1@hospital.vn`
- Mật khẩu: `password123`

### Quản trị viên
- Email: `admin@hospital.vn`
- Mật khẩu: `password123`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Đăng ký tài khoản mới
- `POST /api/auth/login` - Đăng nhập
- `GET /api/auth/verify` - Xác thực token

### Appointments (sẽ được thêm)
- `GET /api/appointments` - Lấy danh sách lịch hẹn
- `POST /api/appointments` - Tạo lịch hẹn mới
- `PUT /api/appointments/:id` - Cập nhật lịch hẹn
- `DELETE /api/appointments/:id` - Xóa lịch hẹn

## Tính năng

### Cho bệnh nhân
- ✅ Đăng ký/Đăng nhập
- Đặt lịch khám online
- Xem và quản lý lịch hẹn
- Nhận thông báo về lịch hẹn

### Cho bác sĩ
- ✅ Đăng nhập
- Xem danh sách lịch hẹn
- Xác nhận/hủy lịch hẹn
- Quản lý thông tin bệnh nhân

### Cho quản trị viên
- ✅ Đăng nhập
- Quản lý tài khoản bác sĩ và nhân viên
- Quản lý phòng khám
- Báo cáo thống kê

## Phát triển tiếp

Các tính năng sẽ được thêm trong tương lai:
- Email/SMS notifications
- Calendar view cho appointments
- Patient medical records
- Doctor scheduling management
- Admin dashboard với statistics
- Mobile responsive design improvements

## License

ISC
