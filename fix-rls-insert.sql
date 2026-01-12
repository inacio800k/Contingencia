-- Fix RLS policies for registros table to allow INSERT for all authenticated users

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert registros" ON registros;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON registros;

-- Create new INSERT policy that allows all authenticated users to create records
CREATE POLICY "Enable insert for authenticated users"
ON registros
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Verify other policies are still in place
-- (Keep existing SELECT, UPDATE, DELETE policies as they were)
