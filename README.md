# 🌙 Haemong API

> AI-powered dream interpretation API with personalized bot personalities

A comprehensive NestJS REST API that provides intelligent dream interpretation services using OpenAI's GPT models, featuring multiple bot personalities, OAuth authentication, and dream visualization through DALL-E integration.

## ✨ Features

### 🔐 Authentication & User Management
- **Multiple Auth Methods**: Email/password, Google OAuth, Apple OAuth
- **JWT Security**: Token-based authentication with refresh tokens
- **Auto Nickname Generation**: Korean-inspired random nicknames
- **Premium Subscriptions**: Tiered user access levels

### 💬 Intelligent Chat System
- **Daily Chat Rooms**: One conversation room per user per day
- **AI Dream Interpretation**: GPT-powered dream analysis
- **4 Bot Personalities**: Customizable interpreter styles
- **Message History**: Persistent conversation storage
- **Image Generation**: DALL-E dream visualization
- **🎬 Video Shorts Generation**: Premium feature for 10-second dream videos

### 🤖 Bot Personalities

| Style | Gender | Personality | Approach |
|-------|--------|-------------|----------|
| 🏮 Eastern | Male | Traditional Scholar | Authoritative, formal interpretation |
| 🏮 Eastern | Female | Caring Mother | Warm, nurturing guidance |
| 🏛️ Western | Male | Psychologist | Scientific, analytical approach |
| 🏛️ Western | Female | Counselor | Empathetic, therapeutic support |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd haemong-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Database Setup**
   - Follow instructions in `database/README.md`
   - Run the SQL scripts in your Supabase dashboard

5. **Start Development Server**
   ```bash
   npm run start:dev
   ```

The API will be available at `http://localhost:3000`

## 📋 Environment Variables

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT Configuration
JWT_SECRET=your_secure_jwt_secret
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your_refresh_token_secret
JWT_REFRESH_EXPIRES_IN=7d

# OAuth Providers
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
APPLE_CLIENT_ID=your_apple_oauth_client_id
APPLE_TEAM_ID=your_apple_team_id
APPLE_KEY_ID=your_apple_key_id
APPLE_PRIVATE_KEY_PATH=path_to_apple_private_key

# OpenAI Integration
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-3.5-turbo

# Replicate (Video Generation)
REPLICATE_API_TOKEN=your_replicate_api_token

# Frontend Configuration
FRONTEND_URL=http://localhost:3000
```

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run start:dev      # Start with hot reload
npm run start:debug    # Start with debug mode

# Production
npm run build          # Build the application
npm run start:prod     # Start production server

# Code Quality
npm run lint          # Run ESLint
npm run format        # Format with Prettier
npm test              # Run unit tests
npm run test:e2e      # Run end-to-end tests
npm run test:cov      # Run tests with coverage
```

### Project Structure

```
src/
├── 🔐 auth/                  # Authentication module
│   ├── controllers/          # Auth endpoints
│   ├── services/            # Auth business logic
│   ├── strategies/          # Passport strategies
│   ├── guards/              # Route protection
│   └── dto/                 # Data transfer objects
├── 💬 chat/                  # Chat functionality
│   ├── controllers/         # Chat endpoints
│   ├── services/           # Chat, AI, image services
│   ├── entities/           # Database models
│   ├── prompts/            # AI prompt templates
│   └── dto/                # Request/response objects
├── 🔧 common/               # Shared utilities
│   └── enums/              # Type definitions
├── ⚙️ config/               # Configuration files
└── 📝 types/               # TypeScript declarations
```

## 📡 API Endpoints

### Authentication
```
POST   /auth/register              # User registration
POST   /auth/login                 # User login
GET    /auth/profile               # Get user profile
GET    /auth/google                # Google OAuth
GET    /auth/google/callback       # Google OAuth callback
GET    /auth/apple                 # Apple OAuth
GET    /auth/apple/callback        # Apple OAuth callback
GET    /auth/check-nickname        # Check nickname availability
GET    /auth/generate-nickname     # Generate random nickname
```

### Chat System
```
GET    /chat/rooms/today           # Get today's chat room
GET    /chat/rooms                 # Get user's chat rooms
GET    /chat/rooms/:id             # Get specific chat room
POST   /chat/rooms                 # Create new chat room
POST   /chat/rooms/:id/messages    # Send message
GET    /chat/rooms/:id/messages    # Get chat history
PUT    /chat/rooms/:id/bot-settings # Update bot personality
POST   /chat/messages/generate-image # Generate dream image
POST   /chat/messages/generate-video # Generate dream video (Premium only)
GET    /chat/bot-settings/options   # Get available bot options
```

## 🗄️ Database Schema

### Core Tables
- **`users`** - User accounts and profiles
- **`chat_rooms`** - Daily conversation rooms
- **`messages`** - Chat message history
- **`bot_settings`** - Bot personality configurations
- **`videos`** - Generated dream video shorts (Premium feature)

### Key Features
- Row Level Security (RLS) enabled
- Automatic timestamp management
- Optimized indexes for performance
- User data isolation

See `database/README.md` for detailed schema information.

## 🎯 Usage Examples

### Authentication Flow
```javascript
// Register new user
POST /auth/register
{
  "email": "user@example.com",
  "password": "securePassword",
  "nickname": "dreamSeeker" // optional
}

// Login
POST /auth/login
{
  "email": "user@example.com", 
  "password": "securePassword"
}
```

### Dream Interpretation
```javascript
// Send dream for interpretation
POST /chat/rooms/today/messages
{
  "content": "I dreamed about flying over mountains",
  "type": "user"
}

// Bot responds with interpretation
// Automatic AI-generated response based on bot personality
```

### Image Generation
```javascript
// Generate dream visualization
POST /chat/messages/generate-image
{
  "dreamContent": "Flying over snowy mountains at sunset",
  "style": "mystical"
}
```

### Video Shorts Generation (Premium Only)
```javascript
// Generate 10-second dream video directly
POST /chat/messages/generate-video
{
  "dreamContent": "어제 꿈에서 하늘을 자유롭게 날아다녔어요. 구름 위를 날면서 정말 기분이 좋았습니다."
}

// Response includes direct 10-second video URL and interpretation
{
  "videoUrl": "https://replicate.delivery/pbxt/video123.mp4",
  "title": "🌙 꿈해몽: 하늘을 나는 꿈의 의미",
  "interpretation": "하늘을 나는 꿈은 자유에 대한 갈망과 현실 제약에서 벗어나고 싶은 마음을 나타냅니다...",
  "dreamContent": "어제 꿈에서 하늘을 자유롭게 날아다녔어요...",
  "style": {"gender": "female", "approach": "eastern"},
  "createdAt": "2025-01-24T10:30:00Z"
}
```

## 🧪 사용자 테스트 시나리오

### 📝 실제 테스트 가능한 시나리오

해몽 API를 실제로 테스트할 수 있는 완전한 사용자 시나리오입니다. 아래 순서대로 따라하면 모든 주요 기능을 확인할 수 있습니다.

#### 🚀 사전 준비
1. **서버 실행**
   ```bash
   npm run start:dev
   ```
   서버가 `http://localhost:3000`에서 실행됩니다.

2. **Postman 또는 curl 준비**
   - API 테스트 도구를 준비하세요
   - 모든 예시는 curl 명령어로 제공됩니다

#### 1️⃣ 회원가입 & 로그인 테스트
```bash
# 닉네임 중복 확인
curl -X GET "http://localhost:3000/auth/check-nickname?nickname=꿈해몽러"

# 랜덤 닉네임 생성
curl -X GET "http://localhost:3000/auth/generate-nickname"

# 회원가입
curl -X POST "http://localhost:3000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dreamer@example.com",
    "password": "mySecretPassword123!",
    "nickname": "꿈해몽러"
  }'

# 로그인 (토큰 받기)
curl -X POST "http://localhost:3000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dreamer@example.com",
    "password": "mySecretPassword123!"
  }'
```

**예상 결과**: 로그인 시 `access_token`과 `refresh_token`을 받습니다. 이 토큰을 다음 단계에서 사용하세요.

#### 2️⃣ 오늘의 채팅방 생성 테스트
```bash
# 로그인에서 받은 토큰을 사용 (YOUR_TOKEN_HERE를 실제 토큰으로 교체)
export TOKEN="YOUR_ACCESS_TOKEN_HERE"

# 오늘의 채팅방 가져오기 (없으면 자동 생성)
curl -X GET "http://localhost:3000/chat/rooms/today" \
  -H "Authorization: Bearer $TOKEN"

# 봇 설정 옵션 확인
curl -X GET "http://localhost:3000/chat/bot-settings/options" \
  -H "Authorization: Bearer $TOKEN"
```

**예상 결과**: 새로운 채팅방이 생성되고 기본 봇 설정이 적용됩니다.

#### 3️⃣ 봇 성격 설정 테스트
```bash
# 채팅방 ID를 받았다면 (ROOM_ID를 실제 ID로 교체)
export ROOM_ID="받은_채팅방_ID"

# 봇 성격을 동양식 여성으로 변경
curl -X PUT "http://localhost:3000/chat/rooms/$ROOM_ID/bot-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "gender": "female",
    "style": "eastern"
  }'
```

**예상 결과**: 봇이 따뜻하고 어머니 같은 성격으로 설정됩니다.

#### 4️⃣ 꿈 이야기 & AI 해몽 테스트
```bash
# 꿈 이야기 전송
curl -X POST "http://localhost:3000/chat/rooms/$ROOM_ID/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "어젯밤 꿈에서 하늘을 자유롭게 날아다녔어요. 구름 위를 날면서 바람을 느끼고 정말 기분이 좋았습니다. 그런데 갑자기 바다 위로 날아가서 큰 고래를 봤어요.",
    "type": "user"
  }'

# 채팅 기록 확인 (AI 봇의 해몽 답변 포함)
curl -X GET "http://localhost:3000/chat/rooms/$ROOM_ID/messages" \
  -H "Authorization: Bearer $TOKEN"
```

**예상 결과**: AI 봇이 동양식 여성 성격으로 꿈을 해석해 줍니다.

#### 5️⃣ 꿈 이미지 생성 테스트
```bash
# 꿈 장면을 이미지로 생성
curl -X POST "http://localhost:3000/chat/messages/generate-image" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dreamContent": "하늘을 날면서 바다 위의 큰 고래를 보는 장면",
    "style": "mystical"
  }'
```

**예상 결과**: DALL-E가 생성한 꿈 이미지 URL을 받습니다.

#### 6️⃣ 다양한 봇 성격 테스트
```bash
# 서양식 남성 심리학자로 변경
curl -X PUT "http://localhost:3000/chat/rooms/$ROOM_ID/bot-settings" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "gender": "male",
    "style": "western"
  }'

# 같은 꿈에 대해 다른 해석 요청
curl -X POST "http://localhost:3000/chat/rooms/$ROOM_ID/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "방금 전 꿈에 대해서 심리학적으로 분석해주세요.",
    "type": "user"
  }'
```

**예상 결과**: 같은 꿈이지만 과학적이고 분석적인 관점에서 다른 해석을 받습니다.

#### 7️⃣ 프리미엄 기능 - 비디오 쇼츠 생성 테스트
```bash
# 꿈 비디오 쇼츠 생성 (프리미엄 기능)
curl -X POST "http://localhost:3000/chat/messages/generate-video" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "dreamContent": "어제 꿈에서 하늘을 자유롭게 날아다녔어요. 구름 위를 날면서 정말 기분이 좋았습니다."
  }'
```

**예상 결과**: 10초 길이의 꿈 비디오 URL과 해몽이 포함된 응답을 받습니다.

#### 8️⃣ 사용자 프로필 & 채팅방 목록 확인
```bash
# 사용자 프로필 확인
curl -X GET "http://localhost:3000/auth/profile" \
  -H "Authorization: Bearer $TOKEN"

# 모든 채팅방 목록 확인
curl -X GET "http://localhost:3000/chat/rooms" \
  -H "Authorization: Bearer $TOKEN"
```

**예상 결과**: 사용자 정보와 생성된 채팅방 목록을 확인할 수 있습니다.

#### 🎯 테스트 성공 기준

모든 단계가 성공적으로 완료되면:
- ✅ 회원가입/로그인이 정상 작동
- ✅ 일일 채팅방이 자동 생성
- ✅ 4가지 봇 성격이 서로 다른 해몽 제공
- ✅ AI가 한국어로 자연스러운 꿈 해석 제공
- ✅ DALL-E 이미지 생성 정상 작동
- ✅ 채팅 기록이 정상 저장/조회
- ✅ JWT 인증이 모든 보호된 엔드포인트에서 작동

#### 🔧 문제 해결

**401 Unauthorized 오류**
- 토큰이 만료되었거나 잘못된 경우
- 로그인을 다시 하여 새 토큰 발급

**500 Internal Server Error**
- 환경변수 설정 확인 (특히 OPENAI_API_KEY)
- 데이터베이스 연결 상태 확인
- 서버 로그 확인

**빈 응답 또는 오류**
- API 키 잔액 확인
- 네트워크 연결 상태 확인
- 요청 데이터 형식 확인

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:cov

# End-to-end tests
npm run test:e2e
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based auth
- **OAuth Integration**: Google & Apple sign-in
- **Password Hashing**: bcrypt encryption
- **Rate Limiting**: API request throttling
- **Input Validation**: Request data sanitization
- **Row Level Security**: Database access control

## 🌍 Deployment

### Production Build
```bash
npm run build
npm run start:prod
```

### Environment Setup
1. Set `NODE_ENV=production`
2. Configure production database
3. Set secure JWT secrets
4. Enable HTTPS
5. Configure OAuth redirect URLs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the UNLICENSED License - see the package.json file for details.

## 🆘 Troubleshooting

### Common Issues

**Build Failures**
- Ensure all environment variables are set
- Check TypeScript configuration
- Verify dependency versions

**Database Connection**
- Validate Supabase credentials
- Check network connectivity
- Review database schema setup

**Authentication Issues**
- Verify OAuth app configurations
- Check JWT secret validity
- Review token expiration settings

### Support

For issues and questions:
1. Check existing GitHub issues
2. Review the troubleshooting guide
3. Create a new issue with detailed information

---

<div align="center">

**Made with ❤️ for dream interpretation enthusiasts**

[Documentation](./CLAUDE.md) • [Database Setup](./database/README.md) • [Contributing](#contributing)

</div>