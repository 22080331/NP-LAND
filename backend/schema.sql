-- ==========================================================
-- BDS ĐÔNG ANH — SCHEMA v2 (khớp đúng frontend)
-- PostgreSQL
-- ==========================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Người dùng (nhân viên văn phòng) -----------------------------
CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username      VARCHAR(50)  UNIQUE NOT NULL,
    name          VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role          VARCHAR(20)  DEFAULT 'staff' CHECK (role IN ('admin','staff')),
    created_at    TIMESTAMP DEFAULT now()
);

-- Tin bất động sản --------------------------------------------
CREATE TABLE IF NOT EXISTS properties (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title         VARCHAR(255) NOT NULL,
    description   TEXT,                       -- map -> JSON "desc"
    type          VARCHAR(30)  NOT NULL,      -- đất | nhà | căn hộ | shop | văn phòng
    area          REAL,
    frontage      REAL,
    direction     VARCHAR(30),
    khu           VARCHAR(60),                -- tên thôn
    address       VARCHAR(500),
    lat           DOUBLE PRECISION,
    lng           DOUBLE PRECISION,
    price         BIGINT,
    price_per_m2  BIGINT,
    legal         VARCHAR(30),                -- sổ đỏ | sổ hồng | ...
    land          VARCHAR(30),                -- thổ cư | ...
    planning      VARCHAR(120),
    division      VARCHAR(120),
    source        VARCHAR(30),                -- chính chủ | qua cò
    status        VARCHAR(20) DEFAULT 'dang_ban'
                    CHECK (status IN ('dang_ban','coc','da_ban','quan_tam')),
    img           TEXT,                       -- URL ảnh đại diện (cover)
    images        TEXT,                       -- JSON list các URL ảnh
    posted_by     UUID REFERENCES users(id) ON DELETE SET NULL,
    is_archived   BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMP DEFAULT now(),
    updated_at    TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prop_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_prop_type   ON properties(type);
CREATE INDEX IF NOT EXISTS idx_prop_khu    ON properties(khu);
CREATE INDEX IF NOT EXISTS idx_prop_price  ON properties(price);
CREATE INDEX IF NOT EXISTS idx_prop_created ON properties(created_at DESC);

-- Người liên quan (đầu chủ / khách quan tâm) ------------------
CREATE TABLE IF NOT EXISTS contacts (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id  UUID REFERENCES properties(id) ON DELETE CASCADE,
    type         VARCHAR(30) NOT NULL,        -- "đầu chủ" | "khách quan tâm"
    name         VARCHAR(100),
    phone        VARCHAR(20),
    created_at   TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_contact_prop ON contacts(property_id);

-- Ảnh (nhiều tấm cho mỗi tin) ---------------------------------
CREATE TABLE IF NOT EXISTS images (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id  UUID REFERENCES properties(id) ON DELETE CASCADE,
    url          TEXT NOT NULL,
    ord          INT DEFAULT 0,
    created_at   TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_image_prop ON images(property_id);

-- Auto cập nhật updated_at ------------------------------------
CREATE OR REPLACE FUNCTION touch_updated() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_prop_touch ON properties;
CREATE TRIGGER trg_prop_touch BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION touch_updated();
