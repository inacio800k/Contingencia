CREATE OR REPLACE FUNCTION update_recondicionar_definitivo()
RETURNS void AS $$
BEGIN
  UPDATE "dispositivos"
  SET "recondicionar_definitivo" = COALESCE(
    (
      SELECT jsonb_object_agg(
        -- Apply formatting: If numeric, prepend 'INS', else use original name
        CASE 
          WHEN instancia ~ '^\d+$' THEN 'INS' || instancia 
          ELSE instancia 
        END,
        jsonb_build_object('resetar', false)
      )
      FROM (
        SELECT DISTINCT instancia
        FROM "registros"
        WHERE "registros".dispositivo = "dispositivos".dispositivo
        AND "status" ILIKE '%Recondicionar%'
      ) sub
    ),
    '{}'::jsonb
  );
END;
$$ LANGUAGE plpgsql;

-- Run immediately to update existing data with new format
SELECT update_recondicionar_definitivo();
