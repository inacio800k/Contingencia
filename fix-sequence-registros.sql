-- Fix the sequence for registros table to prevent duplicate key errors
-- This resets the sequence to the maximum ID + 1
-- Run this in your Supabase SQL Editor

-- Method 1: Using DO block (recommended)
DO $$
DECLARE
    max_id INTEGER;
    seq_name TEXT;
BEGIN
    -- Get the maximum ID from the registros table
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM registros;
    
    -- Get the actual sequence name for the id column
    SELECT pg_get_serial_sequence('registros', 'id') INTO seq_name;
    
    -- Reset the sequence to max_id + 1
    IF seq_name IS NOT NULL THEN
        EXECUTE format('SELECT setval(%L, %s, false)', seq_name, max_id + 1);
        RAISE NOTICE 'Sequence % reset to %', seq_name, max_id + 1;
    ELSE
        RAISE EXCEPTION 'Could not find sequence for registros.id';
    END IF;
END $$;

-- Method 2: Direct SQL (alternative if Method 1 doesn't work)
-- SELECT setval(
--     pg_get_serial_sequence('registros', 'id'),
--     COALESCE((SELECT MAX(id) FROM registros), 0) + 1,
--     false
-- );

