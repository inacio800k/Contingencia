CREATE OR REPLACE FUNCTION update_recondicionar_definitivo()
RETURNS void AS $$
BEGIN
  UPDATE "dispositivos" d
  SET "recondicionar_definitivo" = 
    -- 1. Values from Registros (Current Status from real-time data)
    COALESCE(
      (
        SELECT jsonb_object_agg(
          CASE WHEN instancia ~ '^\d+$' THEN 'INS' || instancia ELSE instancia END,
          jsonb_build_object('resetar', false)
        )
        FROM (
          SELECT DISTINCT instancia
          FROM "registros" r
          WHERE r.dispositivo = d.dispositivo
          AND r.status ILIKE '%Recondicionar%'
        ) sub
      ),
      '{}'::jsonb
    )
    ||
    -- 2. Preserved Values (Where resetar = true)
    -- These overwrite the calculated values if they exist, or are added if they don't exist in calculated
    COALESCE(
      (
        SELECT jsonb_object_agg(key, value)
        FROM jsonb_each(COALESCE(d.recondicionar_definitivo, '{}'::jsonb))
        WHERE (value->>'resetar')::boolean = true
      ),
      '{}'::jsonb
    );
END;
$$ LANGUAGE plpgsql;

-- Run immediately to apply new logic (though it won't change anything unless there are already resetar:true values)
SELECT update_recondicionar_definitivo();
