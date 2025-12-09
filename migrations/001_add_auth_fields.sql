-- Migration: Add authentication fields to app_users table
-- This migration adds email and password_hash columns for custom JWT authentication

-- Add email and password_hash columns to app_users table
ALTER TABLE app_users 
ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);

-- Add comments
COMMENT ON COLUMN app_users.email IS 'User email address for login';
COMMENT ON COLUMN app_users.password_hash IS 'Bcrypt hashed password';
