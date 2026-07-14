# Kho BĐS Đông Anh — chạy local trong VS Code

Hệ thống quản lý & tra cứu bất động sản cho văn phòng môi giới xã Đông Anh.
Gồm 2 phần: **backend** (Flask, local dùng SQLite nên không cần cài PostgreSQL) và **frontend** (Vite + React).

```
bds-donganh/
├── backend/         # Flask API
│   ├── app.py
│   ├── requirements.txt
│   ├── schema.sql   # dùng cho PostgreSQL khi lên production
│   └── .env.example
├── frontend/        # Vite + React
│   ├── src/ (BdsApp.jsx, api.js, main.jsx)
│   └── package.json
└── docker-compose.yml   # dùng khi deploy production (PostgreSQL)
```

## Yêu cầu
- **Python 3.11+**  (kiểm tra: `python --version`)
- **Node.js 18+**   (kiểm tra: `node --version`)

Mở thư mục `bds-donganh` bằng VS Code, rồi mở **2 terminal** (Terminal ▸ Split).

---

## 1) Chạy BACKEND (terminal 1)

**Windows (PowerShell):**
```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env      # rồi mở .env điền CLAUDE_API_KEY nếu muốn dùng AI
python app.py
```

**macOS / Linux:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python app.py
```

Chạy xong sẽ thấy backend ở `http://localhost:5000`. Lần đầu nó tự tạo file `bds.db` (SQLite),
**tài khoản admin/admin** và vài tin mẫu.

## 2) Chạy FRONTEND (terminal 2)

```bash
cd frontend
npm install
npm run dev
```

Mở `http://localhost:5173` → đăng nhập **admin / admin**.

---

## Ghi chú
- **AI bóc tách tin:** cần điền `CLAUDE_API_KEY` (lấy ở https://console.anthropic.com) vào `backend/.env`.
  Không có key thì mọi chức năng khác vẫn chạy, chỉ nút *"Phân tích bằng AI"* báo lỗi.
- **Bản đồ / toạ độ:** tin mẫu đã có toạ độ sẵn. Tin thêm mới sẽ được backend **tự tra toạ độ từ địa chỉ**
  (OpenStreetMap) — cần máy có internet; nếu offline thì tin vẫn lưu, chỉ chưa lên bản đồ.
- **Ảnh:** bản local lưu ảnh trực tiếp trong dữ liệu (tiện test). Khi lên production nên chuyển sang
  upload file (endpoint `/api/upload` đã có sẵn).
- **Reset dữ liệu local:** xoá file `backend/bds.db` rồi chạy lại `python app.py`.
- **Tạo thêm tài khoản:**
  ```bash
  curl -X POST http://localhost:5000/api/auth/register -H "Content-Type: application/json" ^
    -d "{\"username\":\"huong\",\"password\":\"123456\",\"name\":\"Hương\"}"
  ```

## Lên production (tuỳ chọn, sau khi test xong)
Dùng `docker-compose.yml` ở thư mục gốc: nó dựng PostgreSQL + backend, tự nạp `schema.sql`.
Đặt các biến `DB_PASSWORD`, `SECRET_KEY`, `CLAUDE_API_KEY`, `PUBLIC_URL` rồi `docker compose up -d --build`.
Frontend build bằng `npm run build` và trỏ `VITE_API_URL` về domain backend.
```
