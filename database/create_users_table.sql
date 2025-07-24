-- Create users table for haemong chatbot API
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  nickname VARCHAR(8) NOT NULL UNIQUE,
  password VARCHAR(255), -- NULL for OAuth users
  provider VARCHAR(20) NOT NULL DEFAULT 'email' CHECK (provider IN ('email', 'google', 'apple')),
  provider_id VARCHAR(255), -- OAuth provider's user ID
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_nickname ON users(nickname);
CREATE INDEX IF NOT EXISTS idx_users_provider_id ON users(provider, provider_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add constraints
ALTER TABLE users ADD CONSTRAINT check_oauth_provider_id 
  CHECK (
    (provider = 'email' AND provider_id IS NULL AND password IS NOT NULL) OR
    (provider IN ('google', 'apple') AND provider_id IS NOT NULL AND password IS NULL)
  );

-- Add RLS (Row Level Security) policies if needed
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their own data
CREATE POLICY users_select_own ON users 
  FOR SELECT 
  USING (auth.uid() = id);

-- Policy to allow users to update their own data
CREATE POLICY users_update_own ON users 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON users TO anon;
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;