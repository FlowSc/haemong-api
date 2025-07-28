# Database Schema Documentation

## Overview
This application uses Supabase (PostgreSQL) as the database. Below is the complete schema documentation.

## Tables

### users
Stores user account information with OAuth support.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, DEFAULT uuid_generate_v4() |
| email | VARCHAR(255) | User email | UNIQUE, NOT NULL |
| password | VARCHAR(255) | Hashed password | NULL (for OAuth users) |
| nickname | VARCHAR(50) | User nickname | NOT NULL |
| provider | VARCHAR(50) | Auth provider (local/google/apple) | NOT NULL |
| provider_id | VARCHAR(255) | OAuth provider user ID | NULL |
| is_premium | BOOLEAN | Premium subscription status | DEFAULT false |
| created_at | TIMESTAMP | Account creation time | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | Last update time | DEFAULT CURRENT_TIMESTAMP |

### bot_personalities
Stores different bot personality configurations.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | INTEGER | Primary key | PK, SERIAL |
| name | VARCHAR(50) | Internal name | UNIQUE, NOT NULL |
| display_name | VARCHAR(100) | Display name | NOT NULL |
| gender | VARCHAR(10) | Bot gender (male/female) | NOT NULL |
| style | VARCHAR(20) | Interpretation style (eastern/western) | NOT NULL |
| personality_traits | JSONB | Personality configuration | NOT NULL |
| system_prompt | TEXT | AI system prompt | NOT NULL |
| welcome_message | TEXT | Initial greeting | NOT NULL |
| image_style_prompt | TEXT | Image generation style | NULL |
| is_active | BOOLEAN | Active status | DEFAULT true |
| created_at | TIMESTAMP | Creation time | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | Last update time | DEFAULT CURRENT_TIMESTAMP |

### chat_rooms
Stores daily chat rooms for each user.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, DEFAULT uuid_generate_v4() |
| user_id | UUID | User reference | FK → users(id), NOT NULL |
| title | VARCHAR(255) | Chat room title | NOT NULL |
| date | DATE | Chat date (YYYY-MM-DD) | NOT NULL |
| personality_id | INTEGER | Selected bot personality | FK → bot_personalities(id), NOT NULL |
| is_active | BOOLEAN | Active status | DEFAULT true |
| created_at | TIMESTAMP | Creation time | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | Last update time | DEFAULT CURRENT_TIMESTAMP |

**Indexes:**
- UNIQUE INDEX on (user_id, date, is_active) - Ensures one active room per user per day
- INDEX on personality_id - For query performance

### messages
Stores all chat messages.

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, DEFAULT uuid_generate_v4() |
| chat_room_id | UUID | Chat room reference | FK → chat_rooms(id), NOT NULL |
| sender | VARCHAR(50) | Message sender (user/bot) | NOT NULL |
| content | TEXT | Message content | NOT NULL |
| image_url | TEXT | Generated image URL | NULL |
| created_at | TIMESTAMP | Message time | DEFAULT CURRENT_TIMESTAMP |

**Indexes:**
- INDEX on chat_room_id - For message retrieval

### videos
Stores generated dream video information (Premium feature).

| Column | Type | Description | Constraints |
|--------|------|-------------|-------------|
| id | UUID | Primary key | PK, DEFAULT uuid_generate_v4() |
| user_id | UUID | User reference | FK → users(id), NOT NULL |
| chat_room_id | UUID | Chat room reference | FK → chat_rooms(id), NOT NULL |
| message_id | UUID | Related message | FK → messages(id), NOT NULL |
| video_url | TEXT | Generated video URL | NOT NULL |
| thumbnail_url | TEXT | Video thumbnail | NULL |
| duration | INTEGER | Video duration (seconds) | DEFAULT 3 |
| status | VARCHAR(50) | Generation status | DEFAULT 'pending' |
| created_at | TIMESTAMP | Creation time | DEFAULT CURRENT_TIMESTAMP |
| updated_at | TIMESTAMP | Last update time | DEFAULT CURRENT_TIMESTAMP |

## Default Data

### Bot Personalities
The system includes 4 default bot personalities:

1. **Male Eastern** (ID: 1)
   - Traditional authoritative interpreter
   - Uses formal language and classical references

2. **Female Eastern** (ID: 2) - DEFAULT
   - Warm motherly interpreter
   - Gentle and nurturing approach

3. **Male Western** (ID: 3)
   - Scientific psychological analyst
   - Uses technical terminology

4. **Female Western** (ID: 4)
   - Empathetic counselor
   - Supportive and understanding

## Migrations

To apply database migrations, run the SQL files in the `migrations` folder in order:

1. `initial_schema.sql` - Creates all base tables
2. `add_personality_id_to_chat_rooms.sql` - Adds personality support to chat rooms

## Row Level Security (RLS)

Supabase RLS policies should be configured to:
- Allow users to only access their own data
- Prevent unauthorized access to other users' chat rooms and messages
- Admin operations should use service role key

## Notes

- All timestamps are stored in UTC
- The `personality_id` in chat_rooms defaults to 2 (Female Eastern)
- Chat rooms are unique per user per day (enforced by unique index)
- OAuth users have NULL passwords
- Premium features (video generation) require is_premium = true