-- 해몽 API 완전한 데이터베이스 설정 (영상 기능 포함)
-- 프리미엄 사용자를 위한 10초 꿈 해몽 영상 생성 기능

-- 기존 테이블들이 있다면 삭제 (개발 환경에서만 사용)
-- DROP TABLE IF EXISTS videos CASCADE;
-- DROP TABLE IF EXISTS messages CASCADE;
-- DROP TABLE IF EXISTS chat_rooms CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

-- 1. 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  nickname VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255), -- OAuth 사용자는 NULL 가능
  provider VARCHAR(20) NOT NULL DEFAULT 'email', -- 'email', 'google', 'apple'
  provider_id VARCHAR(100), -- OAuth 제공업체의 사용자 ID
  subscription_status VARCHAR(20) NOT NULL DEFAULT 'free', -- 'free', 'premium'
  premium_expires_at TIMESTAMPTZ, -- 프리미엄 만료일
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 채팅방 테이블
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL DEFAULT '오늘의 꿈 이야기',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  bot_gender VARCHAR(10) NOT NULL DEFAULT 'female', -- 'male', 'female'
  bot_style VARCHAR(10) NOT NULL DEFAULT 'eastern', -- 'eastern', 'western'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date) -- 사용자당 하루 하나의 채팅방만
);

-- 3. 메시지 테이블
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL, -- 'user', 'bot'
  content TEXT NOT NULL,
  image_url TEXT, -- 생성된 이미지 URL (선택사항)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 영상 테이블 (프리미엄 기능)
CREATE TABLE IF NOT EXISTS videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL, -- 꿈 해몽 해석 내용
  video_url TEXT NOT NULL, -- 생성된 10초 영상 URL
  style JSONB NOT NULL, -- 봇 스타일 정보 (성별, 접근방식)
  dream_content TEXT NOT NULL, -- 원본 꿈 내용
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_user_date ON chat_rooms(user_id, date);
CREATE INDEX IF NOT EXISTS idx_messages_chat_room ON messages(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_chat_room_id ON videos(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);

-- RLS (Row Level Security) 활성화
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성
-- 사용자 테이블: 자신의 정보만 접근 가능
DROP POLICY IF EXISTS "users_self_policy" ON users;
CREATE POLICY "users_self_policy" ON users
  FOR ALL USING (id = auth.uid());

-- 채팅방 테이블: 자신의 채팅방만 접근 가능
DROP POLICY IF EXISTS "chat_rooms_user_policy" ON chat_rooms;
CREATE POLICY "chat_rooms_user_policy" ON chat_rooms
  FOR ALL USING (user_id = auth.uid());

-- 메시지 테이블: 자신의 채팅방 메시지만 접근 가능
DROP POLICY IF EXISTS "messages_user_policy" ON messages;
CREATE POLICY "messages_user_policy" ON messages
  FOR ALL USING (
    chat_room_id IN (
      SELECT id FROM chat_rooms WHERE user_id = auth.uid()
    )
  );

-- 영상 테이블: 자신의 영상만 접근 가능
DROP POLICY IF EXISTS "videos_user_policy" ON videos;
CREATE POLICY "videos_user_policy" ON videos
  FOR ALL USING (user_id = auth.uid());

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at 트리거 생성
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_rooms_updated_at ON chat_rooms;
CREATE TRIGGER update_chat_rooms_updated_at
  BEFORE UPDATE ON chat_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_videos_updated_at ON videos;
CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 기존 함수들 삭제 (충돌 방지)
DROP FUNCTION IF EXISTS get_or_create_todays_chat_room(UUID);
DROP FUNCTION IF EXISTS get_message_count(UUID);
DROP FUNCTION IF EXISTS get_user_videos(UUID);
DROP FUNCTION IF EXISTS get_chat_room_videos(UUID, UUID);
DROP FUNCTION IF EXISTS get_video_stats(UUID);
DROP FUNCTION IF EXISTS get_bot_settings_options();

-- 유틸리티 함수들

-- 1. 오늘의 채팅방 가져오기 또는 생성
CREATE OR REPLACE FUNCTION get_or_create_todays_chat_room(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  date DATE,
  bot_gender VARCHAR(10),
  bot_style VARCHAR(10),
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  room_id UUID;
BEGIN
  -- 오늘 날짜의 채팅방 찾기
  SELECT cr.id INTO room_id
  FROM chat_rooms cr
  WHERE cr.user_id = user_uuid AND cr.date = CURRENT_DATE;
  
  -- 없으면 새로 생성
  IF room_id IS NULL THEN
    INSERT INTO chat_rooms (user_id, date)
    VALUES (user_uuid, CURRENT_DATE)
    RETURNING chat_rooms.id INTO room_id;
  END IF;
  
  -- 결과 반환
  RETURN QUERY
  SELECT cr.id, cr.title, cr.date, cr.bot_gender, cr.bot_style, cr.created_at
  FROM chat_rooms cr
  WHERE cr.id = room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 메시지 수 조회
CREATE OR REPLACE FUNCTION get_message_count(room_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  msg_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO msg_count
  FROM messages
  WHERE chat_room_id = room_uuid;
  
  RETURN COALESCE(msg_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 사용자의 영상 목록 조회
CREATE OR REPLACE FUNCTION get_user_videos(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  video_url TEXT,
  style JSONB,
  dream_content TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.title,
    v.description,
    v.video_url,
    v.style,
    v.dream_content,
    v.created_at,
    v.updated_at
  FROM videos v
  WHERE v.user_id = user_uuid
  ORDER BY v.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 특정 채팅방의 영상 조회
CREATE OR REPLACE FUNCTION get_chat_room_videos(room_uuid UUID, user_uuid UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  video_url TEXT,
  style JSONB,
  dream_content TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.title,
    v.description,
    v.video_url,
    v.style,
    v.dream_content,
    v.created_at
  FROM videos v
  WHERE v.chat_room_id = room_uuid 
    AND v.user_id = user_uuid
  ORDER BY v.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 영상 통계 조회
CREATE OR REPLACE FUNCTION get_video_stats(user_uuid UUID)
RETURNS TABLE (
  total_videos BIGINT,
  this_month_videos BIGINT,
  today_videos BIGINT,
  latest_video_date TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_videos,
    COUNT(CASE WHEN v.created_at >= date_trunc('month', NOW()) THEN 1 END) as this_month_videos,
    COUNT(CASE WHEN v.created_at >= date_trunc('day', NOW()) THEN 1 END) as today_videos,
    MAX(v.created_at) as latest_video_date
  FROM videos v
  WHERE v.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 봇 설정 옵션 조회
CREATE OR REPLACE FUNCTION get_bot_settings_options()
RETURNS TABLE (
  genders JSONB,
  styles JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    '[
      {"value": "male", "label": "남성"},
      {"value": "female", "label": "여성"}
    ]'::jsonb as genders,
    '[
      {"value": "eastern", "label": "동양풍"},
      {"value": "western", "label": "서양풍"}
    ]'::jsonb as styles;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 샘플 데이터 삽입 (개발/테스트용 - 필요시 주석 해제)
/*
-- 테스트 사용자 생성
INSERT INTO users (email, nickname, subscription_status, premium_expires_at) 
VALUES 
  ('premium@example.com', '프리미엄사용자', 'premium', NOW() + INTERVAL '1 year'),
  ('free@example.com', '무료사용자', 'free', NULL)
ON CONFLICT (email) DO NOTHING;

-- 테스트 채팅방 생성
INSERT INTO chat_rooms (user_id, title, bot_gender, bot_style)
SELECT u.id, '테스트 꿈 이야기', 'female', 'eastern'
FROM users u WHERE u.email = 'premium@example.com'
ON CONFLICT (user_id, date) DO NOTHING;

-- 테스트 영상 데이터
INSERT INTO videos (user_id, chat_room_id, title, description, video_url, style, dream_content)
SELECT 
  u.id,
  cr.id,
  '🌙 꿈해몽: 하늘을 나는 꿈의 의미',
  '하늘을 날아다니는 꿈은 자유에 대한 갈망과 현실의 제약에서 벗어나고 싶은 마음을 나타냅니다.',
  'https://example.com/dream-video.mp4',
  '{"gender": "female", "approach": "eastern"}'::jsonb,
  '어제 꿈에서 하늘을 자유롭게 날아다녔어요. 구름 위를 날면서 정말 기분이 좋았습니다.'
FROM users u
CROSS JOIN chat_rooms cr
WHERE u.email = 'premium@example.com'
AND cr.user_id = u.id
LIMIT 1;
*/

-- 완료 메시지
SELECT 
  '✅ 해몽 API 데이터베이스 설정이 완료되었습니다!' as message,
  '🎬 10초 영상 생성 기능이 포함되어 있습니다.' as video_feature,
  '🔒 모든 테이블에 RLS 보안이 적용되었습니다.' as security_info;