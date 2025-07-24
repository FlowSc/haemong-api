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