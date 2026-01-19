-- Function to safely add a column to metricas_dinamicas table
CREATE OR REPLACE FUNCTION add_column_to_metricas_dinamicas(
    column_name_param text,
    data_type_param text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the creator (postgres/admin)
AS $$
BEGIN
    -- Validate column name (alphanumeric and underscore only) to prevent SQL injection
    IF column_name_param !~ '^[a-zA-Z0-9_]+$' THEN
        RAISE EXCEPTION 'Invalid column name format';
    END IF;

    -- Validate data type (allow only specific types for safety)
    IF data_type_param NOT IN ('numeric', 'jsonb') THEN
        RAISE EXCEPTION 'Invalid data type';
    END IF;

    -- Execute dynamic SQL
    EXECUTE format('ALTER TABLE metricas_dinamicas ADD COLUMN %I %s', column_name_param, data_type_param);
END;
$$;
