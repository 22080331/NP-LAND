"""
BDS ĐÔNG ANH — Flask backend v2
Khớp đúng data model của frontend (thôn/khu, lat/lng, đủ trường).
Tính năng: auth JWT · CRUD tin · AI bóc tách (Claude) · tự lấy toạ độ (geocoding) · upload ảnh.
"""
import os, json, uuid
from datetime import datetime, timedelta
from functools import wraps

try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

import jwt
import requests
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import anthropic
import cloudinary
import cloudinary.uploader

# Nếu có CLOUDINARY_URL (production) thì ảnh lưu trên Cloudinary — ổ đĩa server (Render free) không bền,
# mất hết ảnh mỗi lần restart nên không dùng làm nơi lưu chính thức.
USE_CLOUDINARY = bool(os.getenv("CLOUDINARY_URL"))
if USE_CLOUDINARY:
    cloudinary.config(secure=True)  # tự đọc CLOUDINARY_URL từ env

# ---- Danh sách 36 thôn xã Đông Anh (đồng bộ với frontend) ----
KHU_VUC = [
    "Cầu Cả","Cổ Loa","Cổ Vân","Cường Nỗ","Dục Nội","Dục Tú","Đa Vang","Đản Mỗ",
    "Đông Anh","Đông Hội","Đông Ngàn","Đông Trù","Đồng Dầu","Gia Lương","Hồng Lạc",
    "Hội Phụ","Hưng Sơn","Lộc Hà","Lợi Đà","Lực Canh","Lý Nhân","Mai Hiên","Mai Lâm",
    "Mạch Tràng","Oai Nỗ","Phúc Hậu","Thái Bình","Thục Vương","Thượng Lộc","Thượng Oai",
    "Thượng Thư","Uy Nỗ","Uy Sơn","Việt Hùng","Xuân Canh","Xuân Trạch",
]

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///bds.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret")
app.config["MAX_CONTENT_LENGTH"] = 12 * 1024 * 1024
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
PUBLIC_URL = os.getenv("PUBLIC_URL", "")  # vd https://api.bds.example.com

db = SQLAlchemy(app)
CORS(app)
claude = anthropic.Anthropic(api_key=os.getenv("CLAUDE_API_KEY", ""))

# ============================ MODELS ============================
class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = db.Column(db.String, unique=True, nullable=False)
    name = db.Column(db.String, nullable=False)
    password_hash = db.Column(db.String, nullable=False)
    role = db.Column(db.String, default="staff")
    def set_pw(self, pw): self.password_hash = generate_password_hash(pw)
    def check_pw(self, pw): return check_password_hash(self.password_hash, pw)
    def dict(self): return {"id": self.id, "username": self.username, "name": self.name, "role": self.role}

class Contact(db.Model):
    __tablename__ = "contacts"
    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    property_id = db.Column(db.String, db.ForeignKey("properties.id"))
    type = db.Column(db.String)   # "đầu chủ" | "khách quan tâm"
    name = db.Column(db.String)
    phone = db.Column(db.String)
    def dict(self): return {"type": self.type, "name": self.name, "phone": self.phone}

class Property(db.Model):
    __tablename__ = "properties"
    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String, nullable=False)
    description = db.Column(db.Text)
    type = db.Column(db.String)
    area = db.Column(db.Float)
    frontage = db.Column(db.Float)
    direction = db.Column(db.String)
    khu = db.Column(db.String)
    address = db.Column(db.String)
    lat = db.Column(db.Float)
    lng = db.Column(db.Float)
    price = db.Column(db.BigInteger)
    price_per_m2 = db.Column(db.BigInteger)
    legal = db.Column(db.String)
    land = db.Column(db.String)
    planning = db.Column(db.String)
    division = db.Column(db.String)
    source = db.Column(db.String)       # "chính chủ" | "qua cò"
    status = db.Column(db.String, default="dang_ban")
    img = db.Column(db.Text)            # ảnh đại diện (cover) — giữ để tương thích
    images = db.Column(db.Text)         # JSON list các URL ảnh
    posted_by = db.Column(db.String, db.ForeignKey("users.id"))
    is_archived = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    contacts = db.relationship("Contact", backref="property", cascade="all, delete-orphan")

    def imgs_list(self):
        try:
            arr = json.loads(self.images) if self.images else []
            return arr if isinstance(arr, list) else []
        except Exception:
            return []

    def dict(self, viewer=None):
        """viewer: user đang xem. Liên hệ chính chủ chỉ hiện với người đăng hoặc admin."""
        poster = User.query.get(self.posted_by) if self.posted_by else None
        can_edit = viewer is not None and (viewer.id == self.posted_by or viewer.role == "admin")
        imgs = self.imgs_list()
        cover = self.img or (imgs[0] if imgs else "")
        return {
            "id": self.id, "title": self.title, "desc": self.description, "type": self.type,
            "area": self.area, "frontage": self.frontage, "direction": self.direction,
            "khu": self.khu, "address": self.address, "lat": self.lat, "lng": self.lng,
            "price": self.price, "price_per_m2": self.price_per_m2,
            "legal": self.legal, "land": self.land, "planning": self.planning, "division": self.division,
            "source": self.source, "status": self.status, "img": cover, "imgs": imgs,
            "posted_by": poster.name if poster else None,
            "can_edit": can_edit,
            "contacts": [c.dict() for c in self.contacts] if can_edit else [],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }

# ============================ AUTH ============================
def token_required(f):
    @wraps(f)
    def w(*a, **k):
        h = request.headers.get("Authorization", "")
        if not h.startswith("Bearer "):
            return jsonify({"error": "Thiếu token"}), 401
        try:
            data = jwt.decode(h.split(" ", 1)[1], app.config["SECRET_KEY"], algorithms=["HS256"])
            user = User.query.get(data["uid"])
            if not user: raise Exception()
        except Exception:
            return jsonify({"error": "Token không hợp lệ"}), 401
        return f(user, *a, **k)
    return w

# --- Quản lý thành viên (chỉ admin) ---
def admin_only(user):
    return user.role != "admin"

@app.get("/api/users")
@token_required
def list_users(user):
    if admin_only(user): return jsonify({"error": "Chỉ quản trị viên"}), 403
    counts = dict(db.session.query(Property.posted_by, db.func.count(Property.id))
                  .filter_by(is_archived=False).group_by(Property.posted_by).all())
    users = User.query.order_by(User.username).all()
    return jsonify({"users": [{**u.dict(), "posts": counts.get(u.id, 0)} for u in users]})

@app.post("/api/users")
@token_required
def create_user(user):
    if admin_only(user): return jsonify({"error": "Chỉ quản trị viên"}), 403
    d = request.get_json() or {}
    username = (d.get("username") or "").strip().lower()
    if not username or not d.get("password") or not d.get("name"):
        return jsonify({"error": "Cần đủ tên, tài khoản và mật khẩu"}), 400
    if len(d["password"]) < 4:
        return jsonify({"error": "Mật khẩu tối thiểu 4 ký tự"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Tài khoản đã tồn tại"}), 409
    u = User(username=username, name=d["name"].strip(), role="staff")
    u.set_pw(d["password"])
    db.session.add(u); db.session.commit()
    return jsonify({"user": u.dict()}), 201

@app.delete("/api/users/<uid>")
@token_required
def delete_user(user, uid):
    if admin_only(user): return jsonify({"error": "Chỉ quản trị viên"}), 403
    target = User.query.get(uid)
    if not target: return jsonify({"error": "Không tìm thấy"}), 404
    if target.id == user.id: return jsonify({"error": "Không thể tự xoá tài khoản của mình"}), 400
    if target.role == "admin": return jsonify({"error": "Không thể xoá tài khoản quản trị"}), 400
    # tin của người này giữ nguyên trong kho, posted_by để trống
    Property.query.filter_by(posted_by=target.id).update({"posted_by": None})
    db.session.delete(target); db.session.commit()
    return jsonify({"ok": True})

@app.post("/api/users/<uid>/password")
@token_required
def reset_user_pw(user, uid):
    if admin_only(user): return jsonify({"error": "Chỉ quản trị viên"}), 403
    target = User.query.get(uid)
    if not target: return jsonify({"error": "Không tìm thấy"}), 404
    d = request.get_json() or {}
    if len(d.get("new", "")) < 4:
        return jsonify({"error": "Mật khẩu tối thiểu 4 ký tự"}), 400
    target.set_pw(d["new"]); db.session.commit()
    return jsonify({"ok": True})

@app.post("/api/auth/login")
def login():
    d = request.get_json() or {}
    u = User.query.filter_by(username=d.get("username")).first()
    if not u or not u.check_pw(d.get("password", "")):
        return jsonify({"error": "Sai tài khoản hoặc mật khẩu"}), 401
    token = jwt.encode({"uid": u.id, "exp": datetime.utcnow() + timedelta(days=30)},
                       app.config["SECRET_KEY"], algorithm="HS256")
    return jsonify({"token": token, "user": u.dict()})

@app.get("/api/auth/me")
@token_required
def me(user): return jsonify({"user": user.dict()})

@app.post("/api/auth/change-password")
@token_required
def change_pw(user):
    d = request.get_json() or {}
    if not user.check_pw(d.get("old", "")):
        return jsonify({"error": "Mật khẩu hiện tại không đúng"}), 400
    if len(d.get("new", "")) < 4:
        return jsonify({"error": "Mật khẩu mới tối thiểu 4 ký tự"}), 400
    user.set_pw(d["new"]); db.session.commit()
    return jsonify({"ok": True})

# ======================= GEOCODING (tự lấy toạ độ) =======================
def geocode(address, khu):
    """Tra toạ độ từ địa chỉ qua OpenStreetMap Nominatim (best-effort)."""
    q = ", ".join(x for x in [address, khu, "Đông Anh", "Hà Nội"] if x)
    try:
        r = requests.get("https://nominatim.openstreetmap.org/search",
                         params={"q": q, "format": "json", "limit": 1},
                         headers={"User-Agent": "DPG-BDS-DongAnh/1.0"}, timeout=6)
        arr = r.json()
        if arr:
            return float(arr[0]["lat"]), float(arr[0]["lon"])
    except Exception:
        pass
    return None, None

# ======================= PROPERTIES =======================
FIELDS = ["title", "type", "area", "frontage", "direction", "khu", "address",
          "lat", "lng", "price", "price_per_m2", "legal", "land", "planning", "division",
          "source", "status", "img"]

def apply_images(p, d):
    """Nhận 'imgs' (list URL) từ payload, lưu JSON và tự đặt ảnh cover."""
    if "imgs" in d:
        imgs = [u for u in (d.get("imgs") or []) if u]
        p.images = json.dumps(imgs, ensure_ascii=False)
        if not d.get("img"):
            p.img = imgs[0] if imgs else None

@app.get("/api/properties")
@token_required
def list_props(user):
    qry = Property.query.filter_by(is_archived=False)
    a = request.args
    if a.get("status"): qry = qry.filter_by(status=a["status"])
    if a.get("type"):   qry = qry.filter_by(type=a["type"])
    if a.get("khu"):    qry = qry.filter_by(khu=a["khu"])
    if a.get("min_price"): qry = qry.filter(Property.price >= int(a["min_price"]))
    if a.get("max_price"): qry = qry.filter(Property.price <= int(a["max_price"]))
    if a.get("q"):
        s = f"%{a['q']}%"
        phone_matches = db.session.query(Contact.property_id).filter(Contact.phone.ilike(s))
        qry = qry.filter(db.or_(
            Property.title.ilike(s), Property.address.ilike(s), Property.khu.ilike(s),
            Property.id.in_(phone_matches),
        ))
    items = qry.order_by(Property.created_at.desc()).all()
    return jsonify({"properties": [p.dict(user) for p in items]})

@app.post("/api/properties")
@token_required
def create_prop(user):
    d = request.get_json() or {}
    if not d.get("title") or not d.get("area"):
        return jsonify({"error": "Cần tiêu đề và diện tích"}), 400
    p = Property(posted_by=user.id, description=d.get("desc"))
    for f in FIELDS:
        if f in d: setattr(p, f, d[f])
    apply_images(p, d)
    # Tự lấy toạ độ nếu chưa có
    if (not p.lat or not p.lng) and (p.address or p.khu):
        p.lat, p.lng = geocode(p.address, p.khu)
    db.session.add(p); db.session.flush()
    for c in (d.get("contacts") or []):
        db.session.add(Contact(property_id=p.id, type=c.get("type"), name=c.get("name"), phone=c.get("phone")))
    db.session.commit()
    return jsonify({"property": p.dict(user)}), 201

@app.get("/api/properties/<pid>")
@token_required
def get_prop(user, pid):
    p = Property.query.get(pid)
    return (jsonify({"property": p.dict(user)}) if p else (jsonify({"error": "Không tìm thấy"}), 404))

@app.put("/api/properties/<pid>")
@token_required
def update_prop(user, pid):
    p = Property.query.get(pid)
    if not p: return jsonify({"error": "Không tìm thấy"}), 404
    if p.posted_by != user.id and user.role != "admin":
        return jsonify({"error": "Chỉ người đăng tin mới được sửa"}), 403
    d = request.get_json() or {}
    if "desc" in d: p.description = d["desc"]
    for f in FIELDS:
        if f in d: setattr(p, f, d[f])
    apply_images(p, d)
    if "contacts" in d:
        Contact.query.filter_by(property_id=p.id).delete()
        for c in d["contacts"]:
            db.session.add(Contact(property_id=p.id, type=c.get("type"), name=c.get("name"), phone=c.get("phone")))
    db.session.commit()
    return jsonify({"property": p.dict(user)})

@app.delete("/api/properties/<pid>")
@token_required
def del_prop(user, pid):
    p = Property.query.get(pid)
    if not p: return jsonify({"error": "Không tìm thấy"}), 404
    if p.posted_by != user.id and user.role != "admin":
        return jsonify({"error": "Chỉ người đăng tin mới được xoá"}), 403
    p.is_archived = True; db.session.commit()
    return jsonify({"ok": True})

# ======================= AI BÓC TÁCH =======================
@app.post("/api/ai-parse")
@token_required
def ai_parse(user):
    text = (request.get_json() or {}).get("text", "").strip()
    if not text: return jsonify({"error": "Thiếu nội dung"}), 400
    prompt = f"""Bạn là chuyên gia bất động sản khu vực Đông Anh, Hà Nội. Phân tích tin rao sau và trích xuất thông tin.
TIN: "{text}"
Danh sách thôn có thể có: {", ".join(KHU_VUC)}.

Trả về DUY NHẤT một object JSON (không markdown, không giải thích) với các khóa:
title, type (đất|nhà|căn hộ|shop|văn phòng), area (số m²), frontage (số hoặc null),
direction (hướng hoặc ""), khu (tên thôn nếu khớp danh sách trên, hoặc ""),
address, price (số nguyên VNĐ),
legal (sổ đỏ|sổ hồng|sổ chung|vi bằng|chưa có),
land (thổ cư|thổ cư một phần|nông nghiệp|""),
source (chính chủ|qua cò|"" — "chính chủ" nếu tin ghi chính chủ/miễn trung gian, "qua cò" nếu qua môi giới),
planning (""), division (""), desc, ownerPhone ("").
Không rõ trường nào thì null hoặc ""."""
    try:
        msg = claude.messages.create(model="claude-opus-4-8", max_tokens=1000,
                                     messages=[{"role": "user", "content": prompt}])
        raw = "".join(b.text for b in msg.content if getattr(b, "type", "") == "text").strip()
        raw = raw.replace("```json", "").replace("```", "").strip()
        data = json.loads(raw)
        if data.get("khu") not in KHU_VUC: data["khu"] = ""
        if data.get("price") and data.get("area"):
            data["price_per_m2"] = round(int(data["price"]) / float(data["area"]))
        return jsonify({"parsed": data})
    except Exception as e:
        return jsonify({"error": f"Không phân tích được: {e}"}), 500

# ======================= UPLOAD ẢNH =======================
@app.post("/api/upload")
@token_required
def upload(user):
    if "file" not in request.files: return jsonify({"error": "Thiếu file"}), 400
    f = request.files["file"]
    if USE_CLOUDINARY:
        try:
            r = cloudinary.uploader.upload(f, folder="np-land")
            return jsonify({"url": r["secure_url"]})
        except Exception as e:
            return jsonify({"error": f"Lỗi upload ảnh: {e}"}), 500
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    name = f"{uuid.uuid4().hex}_{secure_filename(f.filename)}"
    f.save(os.path.join(UPLOAD_DIR, name))
    return jsonify({"url": f"{PUBLIC_URL}/uploads/{name}"})

@app.get("/uploads/<path:name>")
def serve_upload(name): return send_from_directory(UPLOAD_DIR, name)

@app.get("/health")
def health(): return jsonify({"status": "ok"})

def seed():
    """Local: tạo tài khoản admin/admin + vài tin mẫu nếu DB trống."""
    if User.query.first():
        return
    admin = User(username="admin", name="Nam", role="admin")
    admin.set_pw("admin")
    db.session.add(admin)
    db.session.flush()
    samples = [
        {"title": "Đất thổ cư thôn Cổ Loa, ngõ ô tô 90m²", "type": "đất", "area": 90, "frontage": 5,
         "direction": "đông nam", "khu": "Cổ Loa", "address": "Ngõ 12, thôn Cổ Loa, Đông Anh",
         "lat": 21.1197, "lng": 105.8788, "price": 4500000000, "price_per_m2": 50000000,
         "legal": "sổ đỏ", "land": "thổ cư", "planning": "không dính quy hoạch", "division": "đã tách thửa",
         "source": "chính chủ",
         "status": "dang_ban", "img": "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=400",
         "desc": "Đất thổ cư 100%, ngõ ô tô tránh, gần khu di tích Cổ Loa. Sổ đỏ chính chủ.",
         "contacts": [{"type": "đầu chủ", "name": "Anh Tuấn", "phone": "0903123456"}]},
        {"title": "Đất mặt đường liên thôn Uy Nỗ 120m²", "type": "đất", "area": 120, "frontage": 6,
         "direction": "tây", "khu": "Uy Nỗ", "address": "Đường liên thôn Uy Nỗ, Đông Anh",
         "lat": 21.1452, "lng": 105.8501, "price": 7200000000, "price_per_m2": 60000000,
         "legal": "sổ đỏ", "land": "thổ cư", "planning": "không dính quy hoạch", "division": "đã tách thửa",
         "source": "qua cò",
         "status": "coc", "img": "https://images.unsplash.com/photo-1449844908441-8829872d2607?w=400",
         "desc": "Mặt đường kinh doanh, vuông vắn, tiện xây nhà hoặc mở cửa hàng.",
         "contacts": [{"type": "đầu chủ", "name": "Chị Lan", "phone": "0912987654"},
                       {"type": "khách quan tâm", "name": "Anh Minh", "phone": "0987000111"}]},
        {"title": "Đất dịch vụ thôn Đông Hội 75m²", "type": "đất", "area": 75, "frontage": 4,
         "direction": "nam", "khu": "Đông Hội", "address": "Khu dịch vụ thôn Đông Hội, Đông Anh",
         "lat": 21.1108, "lng": 105.8712, "price": 3000000000, "price_per_m2": 40000000,
         "legal": "sổ đỏ", "land": "thổ cư", "planning": "không dính quy hoạch", "division": "đã tách thửa",
         "source": "chính chủ",
         "status": "quan_tam", "img": "",
         "desc": "Đất khu dịch vụ, hạ tầng hoàn thiện, đường rộng 8m. Phù hợp đầu tư.",
         "contacts": [{"type": "đầu chủ", "name": "Anh Phúc", "phone": "0938222333"}]},
    ]
    for s in samples:
        cs = s.pop("contacts", [])
        p = Property(posted_by=admin.id, description=s.pop("desc", None), **s)
        db.session.add(p)
        db.session.flush()
        for c in cs:
            db.session.add(Contact(property_id=p.id, **c))
    db.session.commit()


with app.app_context():
    db.create_all()
    seed()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=os.getenv("FLASK_ENV") == "development")
