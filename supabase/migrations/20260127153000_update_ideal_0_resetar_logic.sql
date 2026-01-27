CREATE OR REPLACE FUNCTION update_ideal_0_batch()
RETURNS void AS $$
BEGIN
  UPDATE "dispositivos"
  SET "ideal_0" = (
    SELECT jsonb_object_agg(
      instance_name,
      jsonb_build_object(
        'num_gb',       COALESCE((val->>'num_gb')::numeric, 0)       - CASE WHEN (COALESCE("dispositivos".recondicionar_definitivo, '{}'::jsonb) -> (CASE WHEN instance_name ~ '^\d+$' THEN 'INS' || instance_name ELSE instance_name END) ->> 'resetar')::boolean IS TRUE THEN 0 ELSE COALESCE("dispositivos".num_gb, 0) END,
        'num_normal',   COALESCE((val->>'num_normal')::numeric, 0)   - CASE WHEN (COALESCE("dispositivos".recondicionar_definitivo, '{}'::jsonb) -> (CASE WHEN instance_name ~ '^\d+$' THEN 'INS' || instance_name ELSE instance_name END) ->> 'resetar')::boolean IS TRUE THEN 0 ELSE COALESCE("dispositivos".num_normal, 0) END,
        'clone_normal', COALESCE((val->>'clone_normal')::numeric, 0) - CASE WHEN (COALESCE("dispositivos".recondicionar_definitivo, '{}'::jsonb) -> (CASE WHEN instance_name ~ '^\d+$' THEN 'INS' || instance_name ELSE instance_name END) ->> 'resetar')::boolean IS TRUE THEN 0 ELSE COALESCE("dispositivos".clone_normal, 0) END,
        'num_business', COALESCE((val->>'num_business')::numeric, 0) - CASE WHEN (COALESCE("dispositivos".recondicionar_definitivo, '{}'::jsonb) -> (CASE WHEN instance_name ~ '^\d+$' THEN 'INS' || instance_name ELSE instance_name END) ->> 'resetar')::boolean IS TRUE THEN 0 ELSE COALESCE("dispositivos".num_business, 0) END,
        'clone_business',COALESCE((val->>'clone_business')::numeric, 0)- CASE WHEN (COALESCE("dispositivos".recondicionar_definitivo, '{}'::jsonb) -> (CASE WHEN instance_name ~ '^\d+$' THEN 'INS' || instance_name ELSE instance_name END) ->> 'resetar')::boolean IS TRUE THEN 0 ELSE COALESCE("dispositivos".clone_business, 0) END
      )
    )
    FROM (
      -- Logic for NON-Tablets
      SELECT key as instance_name, value as val
      FROM jsonb_each(COALESCE("dispositivos".valores_atuais, '{}'::jsonb))
      WHERE "dispositivos".tipo IS DISTINCT FROM 'Tablet'

      UNION ALL

      -- Logic for Tablets
      SELECT
        keys.instance_name,
        COALESCE("dispositivos".valores_atuais -> keys.instance_name, '{}'::jsonb) as val
      FROM unnest(ARRAY['PROP', 'INS1', 'INS2', 'INS3', 'INS4', 'INS5', 'INS6', 'INS7', 'VISIT']) as keys(instance_name)
      WHERE "dispositivos".tipo = 'Tablet'
    ) sub
  )
  WHERE "valores_atuais" IS NOT NULL OR "tipo" = 'Tablet';
END;
$$ LANGUAGE plpgsql;

-- Run immediately to apply new logic
SELECT update_ideal_0_batch();
