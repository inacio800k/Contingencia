-- Add column_preferences JSONB column to profiles table
-- This will store each user's column visibility preferences

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS column_preferences JSONB DEFAULT '{}'::jsonb;

-- Ensure users can update their own preferences
-- Drop existing policy if it exists to avoid conflicts
DROP POLICY IF EXISTS "Users can update own profile preferences" ON profiles;

CREATE POLICY "Users can update own profile preferences"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Add comment for documentation
COMMENT ON COLUMN profiles.column_preferences IS 'Stores user column visibility preferences as JSON object';
