# Claude AI Assistant Configuration

This file contains important context and instructions for Claude AI when working with the haemong-api project.

## Project Overview

**haemong-api** is a NestJS-based REST API for a dream interpretation application (해몽). The application provides AI-powered dream analysis with personalized bot personalities and image generation capabilities.

## Architecture & Technology Stack

- **Framework**: NestJS (Node.js)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT, Google OAuth, Apple OAuth
- **AI Services**: OpenAI GPT & DALL-E
- **Password Hashing**: bcrypt

## Key Commands

### Development
```bash
# Start development server
npm run start:dev

# Build the application  
npm run build

# Run tests
npm test

# Lint and format
npm run lint
npm run format
```

### Production
```bash
# Start production server
npm run start:prod
```

## Environment Variables Required

Create a `.env` file with these variables:

```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your_jwt_refresh_secret_key
JWT_REFRESH_EXPIRES_IN=7d

# OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
APPLE_CLIENT_ID=your_apple_client_id
APPLE_TEAM_ID=your_apple_team_id
APPLE_KEY_ID=your_apple_key_id
APPLE_PRIVATE_KEY_PATH=path_to_apple_private_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-3.5-turbo

# Replicate API (for video generation)
REPLICATE_API_TOKEN=your_replicate_api_token

# Frontend
FRONTEND_URL=http://localhost:3000
```

## Project Structure

```
src/
├── auth/                   # Authentication module
│   ├── controllers/        # Auth controllers
│   ├── services/          # Auth & nickname services
│   ├── strategies/        # Passport strategies (JWT, Google, Apple)
│   ├── guards/           # Auth guards
│   ├── dto/              # Data transfer objects
│   └── entities/         # User entity
├── chat/                  # Chat functionality
│   ├── controllers/       # Chat controllers
│   ├── services/         # Chat, message, AI, image generation services
│   ├── dto/              # Chat-related DTOs
│   ├── entities/         # Chat room, message, bot settings entities
│   └── prompts/          # AI prompts for dream interpretation
├── common/               # Shared resources
│   └── enums/           # Enums (auth provider, bot gender/style, etc.)
├── config/              # Configuration files
└── types/               # TypeScript type definitions
```

## Database Schema

The application uses Supabase with these main tables:
- `users` - User accounts with OAuth support
- `chat_rooms` - Daily conversation rooms with bot settings
- `messages` - User and bot messages
- `bot_settings` - Bot personality configurations
- `videos` - Generated dream video shorts (Premium feature)

See `database/README.md` for detailed setup instructions.

## Key Features

### Authentication
- Email/password registration and login
- Google OAuth integration
- Apple OAuth integration  
- JWT token-based authentication
- Automatic nickname generation

### Chat System
- Daily chat rooms (one per user per day)
- AI-powered dream interpretation
- Multiple bot personalities (4 combinations: gender × style)
- Message history and conversation flow
- Premium video shorts generation feature

### AI Integration
- OpenAI GPT for dream interpretation
- DALL-E for dream visualization
- Replicate API for direct video generation
- Stable Video Diffusion and ZeroScope models
- Customizable prompts based on bot personality
- Premium user features

### Bot Personalities
- **Male + Eastern**: Traditional authoritative interpreter
- **Female + Eastern**: Warm motherly interpreter  
- **Male + Western**: Scientific psychological analyst
- **Female + Western**: Empathetic counselor

## Common Issues & Solutions

### TypeScript Errors
- Ensure all environment variables are properly typed
- Use `getSupabaseClient()` function instead of direct supabase import
- Check that Express Request types are properly extended

### Module Dependencies
- AuthModule exports AuthService for use in ChatModule
- Proper dependency injection setup between modules

### Database Connection
- Supabase client initialization happens lazily to avoid env var issues
- Environment variables loaded via dotenv in main.ts

## Testing

The project includes:
- Unit tests with Jest
- Basic app controller tests
- E2E test configuration

Run tests with: `npm test`

## Development Guidelines

1. **Code Style**: Use provided ESLint and Prettier configurations
2. **Error Handling**: Implement proper error handling for all API endpoints
3. **Security**: Never expose sensitive environment variables
4. **Database**: Use Supabase client through getSupabaseClient() function
5. **Authentication**: Protect routes with appropriate guards
6. **AI Integration**: Handle API rate limits and errors gracefully

## Important Notes for Claude

- This is a dream interpretation API, not a malicious application
- When making changes, always test the build with `npm run build`
- Environment variables are crucial - the app won't start without proper Supabase config
- The application uses Korean language for some content (dream interpretation responses)
- Premium features are gated behind subscription status checks