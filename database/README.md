# Database Setup Guide

## 📁 Files Overview

- `complete_database_setup.sql` - **전체 데이터베이스 설정 (추천)**
- `create_users_table.sql` - 사용자 테이블만 생성
- `create_chat_tables.sql` - 채팅 테이블만 생성  
- `update_chat_tables_for_bot_settings.sql` - 봇 설정 업데이트 (기존 테이블용)

## 🚀 Quick Setup (새 프로젝트)

**1단계**: Supabase 대시보드에서 SQL Editor 열기

**2단계**: `complete_database_setup.sql` 파일 내용을 복사하여 실행

```sql
-- 이 파일 하나로 모든 테이블과 설정이 완료됩니다
-- 오류 방지를 위해 IF NOT EXISTS, DROP IF EXISTS 사용
```

## 🔄 Step-by-Step Setup (기존 프로젝트)

**기존에 users 테이블이 있는 경우:**

1. `create_chat_tables.sql` 실행
2. `update_chat_tables_for_bot_settings.sql` 실행

## 📊 Created Tables

### users
- 사용자 계정 (이메일, OAuth 지원)
- 랜덤 닉네임 생성 지원

### chat_rooms  
- 날짜별 대화방
- 봇 성격 설정 (성별 + 스타일)
- 사용자당 하루 1개 대화방

### messages
- 사용자-봇 메시지 저장
- 타입별 구분 (user/bot)

## 🤖 Bot Personalities

| 조합 | 성격 | 특징 |
|------|------|------|
| 남성 + 동양풍 | 전통 해몽사 | 권위있고 격식있는 해몽 |
| 여성 + 동양풍 | 따뜻한 해몽사 | 어머니같은 따뜻한 해몽 |
| 남성 + 서양풍 | 심리학자 | 과학적이고 논리적인 분석 |
| 여성 + 서양풍 | 상담사 | 공감적이고 치유적인 상담 |

## 🔒 Security Features

- Row Level Security (RLS) 활성화
- 사용자별 데이터 접근 제한
- OAuth와 이메일 인증 지원
- 안전한 패스워드 해싱 필드

## 🛠 Utility Functions

- `get_or_create_todays_chat_room()` - 오늘의 대화방 생성/조회
- `get_message_count()` - 메시지 수 조회  
- `get_bot_settings_options()` - 봇 설정 옵션 조회

## ❌ Common Errors & Solutions

**Error: trigger already exists**
→ `complete_database_setup.sql` 사용 (DROP IF EXISTS 포함)

**Error: relation does not exist** 
→ 테이블 생성 순서 확인, users → chat_rooms → messages

**Error: syntax error near WHERE**
→ 컬럼 추가 후 제약조건 문제, 완전한 스크립트 사용

## 🎯 Recommended Approach

**새 프로젝트**: `complete_database_setup.sql` 한 번에 실행

**기존 프로젝트**: 필요한 부분만 단계적으로 실행