-- Migration: Add column_order field to profiles table
-- This field stores the user's preferred column order as a JSONB array

-- Add column_order column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS column_order JSONB DEFAULT '{}'::jsonb;

-- Verify the column was added
COMMENT ON COLUMN profiles.column_order IS 'Stores user preferred column order as array of column IDs';

-- RLS policy for column_order already exists (users can update their own profiles)
-- No additional RLS changes needed
