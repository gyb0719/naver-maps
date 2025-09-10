-- 🎯 ULTRATHINK: 네이버 지도 필지 관리 - 클린 스키마
-- 버전: 2.0 (재구축)
-- 생성일: 2025-01-11

-- 기존 테이블 삭제 (완전 초기화)
DROP TABLE IF EXISTS memos;
DROP TABLE IF EXISTS parcels;
DROP TABLE IF EXISTS users;

-- 1. 필지 정보 테이블
CREATE TABLE parcels (
    id SERIAL PRIMARY KEY,
    pnu TEXT UNIQUE NOT NULL,                    -- 필지고유번호 (고유식별자)
    parcel_number TEXT NOT NULL,                 -- 지번 (예: 서초구 서초동 1376-1) 
    address TEXT,                                -- 전체 주소
    color TEXT DEFAULT 'transparent',            -- 색상 (투명/빨강/파랑/등)
    coordinates JSONB NOT NULL,                  -- GeoJSON 좌표 데이터
    area DECIMAL(15,2),                          -- 면적(㎡)
    land_type TEXT,                              -- 지목
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. 메모 정보 테이블  
CREATE TABLE memos (
    id SERIAL PRIMARY KEY,
    pnu TEXT NOT NULL,                           -- 필지고유번호 (parcels 테이블 참조)
    title TEXT DEFAULT '',                       -- 메모 제목
    content TEXT DEFAULT '',                     -- 메모 내용
    price DECIMAL(15,2),                         -- 가격(만원)
    land_area DECIMAL(10,2),                     -- 토지면적(㎡) 
    building_area DECIMAL(10,2),                 -- 건축면적(㎡)
    floor_area DECIMAL(10,2),                    -- 연면적(㎡)
    building_coverage DECIMAL(5,2),              -- 건폐율(%)
    floor_area_ratio DECIMAL(5,2),               -- 용적률(%)
    land_use TEXT DEFAULT '',                    -- 용도지역
    contact_person TEXT DEFAULT '',              -- 연락처 담당자
    contact_phone TEXT DEFAULT '',               -- 연락처
    notes TEXT DEFAULT '',                       -- 비고
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- 외래키 제약조건 (필지가 삭제되면 메모도 함께 삭제)
    CONSTRAINT fk_memos_pnu FOREIGN KEY (pnu) REFERENCES parcels(pnu) ON DELETE CASCADE
);

-- 3. 사용자 테이블 (Google OAuth용 - 나중에 구현)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    google_id TEXT UNIQUE NOT NULL,              -- Google OAuth ID
    email TEXT UNIQUE NOT NULL,                  -- 이메일
    name TEXT NOT NULL,                          -- 이름
    avatar_url TEXT,                             -- 프로필 이미지 URL
    is_active BOOLEAN DEFAULT TRUE,              -- 활성 상태
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX idx_parcels_pnu ON parcels(pnu);
CREATE INDEX idx_parcels_parcel_number ON parcels(parcel_number);
CREATE INDEX idx_parcels_color ON parcels(color);
CREATE INDEX idx_memos_pnu ON memos(pnu);
CREATE INDEX idx_users_google_id ON users(google_id);

-- RLS (Row Level Security) 설정 - 나중에 인증 구현 시 사용
ALTER TABLE parcels ENABLE ROW LEVEL SECURITY;
ALTER TABLE memos ENABLE ROW LEVEL SECURITY; 
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 임시로 모든 사용자에게 접근 허용 (인증 구현 전까지)
CREATE POLICY "Allow all access for now" ON parcels FOR ALL USING (true);
CREATE POLICY "Allow all access for now" ON memos FOR ALL USING (true);
CREATE POLICY "Allow all access for now" ON users FOR ALL USING (true);

-- 샘플 데이터 (테스트용)
INSERT INTO parcels (pnu, parcel_number, address, coordinates) VALUES 
('1165010100113760001', '서초구 서초동 1376-1', '서울특별시 서초구 서초동 1376-1', 
 '{"type":"Polygon","coordinates":[[[127.026,37.495],[127.027,37.495],[127.027,37.496],[127.026,37.496],[127.026,37.495]]]}');

COMMENT ON TABLE parcels IS '필지 기본 정보 저장';
COMMENT ON TABLE memos IS '필지별 메모 및 상세 정보 저장'; 
COMMENT ON TABLE users IS 'Google OAuth 사용자 정보 (나중에 구현)';