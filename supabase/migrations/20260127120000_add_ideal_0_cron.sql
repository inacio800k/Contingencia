-- Enable pg_cron if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Add the new column
ALTER TABLE "dispositivos" ADD COLUMN IF NOT EXISTS "ideal_0" jsonb;

-- Create the function to calculate ideal_0 for the whole table
CREATE OR REPLACE FUNCTION update_ideal_0_batch()
RETURNS void AS $$
BEGIN
  UPDATE "dispositivos"
  SET "ideal_0" = (
    SELECT jsonb_object_agg(
      key,
      jsonb_build_object(
        'num_gb', COALESCE((value->>'num_gb')::numeric, 0) - COALESCE("dispositivos".num_gb, 0),
        'num_normal', COALESCE((value->>'num_normal')::numeric, 0) - COALESCE("dispositivos".num_normal, 0),
        'clone_normal', COALESCE((value->>'clone_normal')::numeric, 0) - COALESCE("dispositivos".clone_normal, 0),
        'num_business', COALESCE((value->>'num_business')::numeric, 0) - COALESCE("dispositivos".num_business, 0),
        'clone_business', COALESCE((value->>'clone_business')::numeric, 0) - COALESCE("dispositivos".clone_business, 0)
      )
    )
    FROM jsonb_each("dispositivos".valores_atuais)
  )
  WHERE "valores_atuais" IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Schedule the cron job (1 * * * * = at minute 1 of every hour)
-- Safely unschedule if exists to avoid error
SELECT cron.unschedule(jobid) 
FROM cron.job 
WHERE jobname = 'update_ideal_0_hourly';

SELECT cron.schedule('update_ideal_0_hourly', '1 * * * *', 'SELECT update_ideal_0_batch()');

-- Run once immediately to populate data
SELECT update_ideal_0_batch();
