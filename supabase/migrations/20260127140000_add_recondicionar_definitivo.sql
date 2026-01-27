-- Add recondicionar_definitivo column
-- We choose JSONB Object structure: {"INS1": {"resetar": true}, "INS2": {"resetar": false}}
-- This matches the pattern of 'valores_atuais' and 'ideal_0' for easier lookup by instance name.
ALTER TABLE "dispositivos" ADD COLUMN IF NOT EXISTS "recondicionar_definitivo" jsonb DEFAULT '{}'::jsonb;
