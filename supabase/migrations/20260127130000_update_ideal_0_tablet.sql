CREATE OR REPLACE FUNCTION update_ideal_0_batch()
RETURNS void AS $$
BEGIN
  UPDATE "dispositivos"
  SET "ideal_0" = (
    SELECT jsonb_object_agg(
      instance_name,
      jsonb_build_object(
        'num_gb',       COALESCE((val->>'num_gb')::numeric, 0)       - COALESCE("dispositivos".num_gb, 0),
        'num_normal',   COALESCE((val->>'num_normal')::numeric, 0)   - COALESCE("dispositivos".num_normal, 0),
        'clone_normal', COALESCE((val->>'clone_normal')::numeric, 0) - COALESCE("dispositivos".clone_normal, 0),
        'num_business', COALESCE((val->>'num_business')::numeric, 0) - COALESCE("dispositivos".num_business, 0),
        'clone_business',COALESCE((val->>'clone_business')::numeric, 0)- COALESCE("dispositivos".clone_business, 0)
      )
    )
    FROM (
      -- Logic for NON-Tablets: Use keys from valores_atuais, but handle NULL valores_atuais
      SELECT key as instance_name, value as val
      FROM jsonb_each(COALESCE("dispositivos".valores_atuais, '{}'::jsonb))
      WHERE "dispositivos".tipo IS DISTINCT FROM 'Tablet'

      UNION ALL

      -- Logic for TAblets: Force specific keys.
      -- We LEFT JOIN the actual values to our forced list of keys to ensure they exist.
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

-- Run immediately to update existing
SELECT update_ideal_0_batch();
