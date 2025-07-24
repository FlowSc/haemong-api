-- 영상(쇼츠) 테이블 생성
-- 프리미엄 사용자를 위한 꿈 해몽 영상 생성 기능 (10초 영상)

-- 기존 테이블이 있다면 삭제 (개발 환경에서만 사용)
-- DROP TABLE IF EXISTS videos;

-- videos 테이블 생성
CREATE TABLE IF NOT EXISTS videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chat_room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL, -- 꿈 해몽 해석 내용
  video_url TEXT NOT NULL, -- 생성된 영상 URL
  style JSONB NOT NULL, -- 봇 스타일 정보 (성별, 접근방식)
  dream_content TEXT NOT NULL, -- 원본 꿈 내용
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_chat_room_id ON videos(chat_room_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC);

-- RLS (Row Level Security) 활성화
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성 - 사용자는 자신의 영상만 접근 가능
DROP POLICY IF EXISTS "videos_user_policy" ON videos;
CREATE POLICY "videos_user_policy" ON videos
  FOR ALL USING (user_id = auth.uid());

-- updated_at 자동 업데이트 트리거 함수 생성 (이미 존재할 수 있음)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- updated_at 트리거 생성
DROP TRIGGER IF EXISTS update_videos_updated_at ON videos;
CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 영상 조회 함수 (사용자별)
CREATE OR REPLACE FUNCTION get_user_videos(user_uuid UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  duration INTEGER,
  scenes JSONB,
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
    v.duration,
    v.scenes,
    v.style,
    v.dream_content,
    v.created_at,
    v.updated_at
  FROM videos v
  WHERE v.user_id = user_uuid
  ORDER BY v.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 특정 채팅방의 영상 조회 함수
CREATE OR REPLACE FUNCTION get_chat_room_videos(room_uuid UUID, user_uuid UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  duration INTEGER,
  scenes JSONB,
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
    v.duration,
    v.scenes,
    v.style,
    v.dream_content,
    v.created_at
  FROM videos v
  WHERE v.chat_room_id = room_uuid 
    AND v.user_id = user_uuid
  ORDER BY v.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 영상 통계 조회 함수
CREATE OR REPLACE FUNCTION get_video_stats(user_uuid UUID)
RETURNS TABLE (
  total_videos BIGINT,
  total_duration INTEGER,
  this_month_videos BIGINT,
  avg_duration NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_videos,
    COALESCE(SUM(v.duration), 0) as total_duration,
    COUNT(CASE WHEN v.created_at >= date_trunc('month', NOW()) THEN 1 END) as this_month_videos,
    COALESCE(AVG(v.duration), 0) as avg_duration
  FROM videos v
  WHERE v.user_id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 샘플 데이터 삽입 (개발/테스트용 - 필요시 주석 해제)
/*
INSERT INTO videos (user_id, chat_room_id, title, description, duration, scenes, style, dream_content) 
SELECT 
  u.id,
  cr.id,
  '🌙 꿈해몽: 하늘을 나는 꿈의 의미는?',
  '하늘을 날아다니는 꿈은 자유에 대한 갈망과 현실의 제약에서 벗어나고 싶은 마음을 나타냅니다.',
  30,
  '[
    {"imageUrl": "https://example.com/scene1.jpg", "duration": 8, "order": 1},
    {"imageUrl": "https://example.com/scene2.jpg", "duration": 7, "order": 2},
    {"imageUrl": "https://example.com/scene3.jpg", "duration": 8, "order": 3},
    {"imageUrl": "https://example.com/scene4.jpg", "duration": 7, "order": 4}
  ]'::jsonb,
  '{"gender": "female", "approach": "eastern"}'::jsonb,
  '어제 꿈에서 하늘을 자유롭게 날아다녔어요. 구름 위를 날면서 정말 기분이 좋았습니다.'
FROM users u
CROSS JOIN chat_rooms cr
WHERE u.email LIKE '%@example.com%'
AND cr.user_id = u.id
LIMIT 1;
*/

-- 완료 메시지
SELECT 'Videos 테이블이 성공적으로 생성되었습니다!' as message;