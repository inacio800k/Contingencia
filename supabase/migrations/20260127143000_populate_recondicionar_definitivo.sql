CREATE OR REPLACE FUNCTION update_recondicionar_definitivo()
RETURNS void AS $$
BEGIN
  UPDATE "dispositivos"
  SET "recondicionar_definitivo" = COALESCE(
    (
      SELECT jsonb_object_agg(
        instancia,
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

-- Safely unschedule if exists to avoid duplication issues if run multiple times manually
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'update_recondicionar_definitivo_job';

-- Schedule the cron job to match existing recondicionar update (hourly at minute 0)
SELECT cron.schedule('update_recondicionar_definitivo_job', '0 * * * *', 'SELECT update_recondicionar_definitivo()');

-- Run immediately to populate
SELECT update_recondicionar_definitivo();
