create or replace function drop_dynamic_column(
  column_name_param text
)
returns void
language plpgsql
security definer
as $$
begin
  -- Validation: Check if column name contains only letters, numbers, and underscores
  if column_name_param !~ '^[a-zA-Z0-9_]+$' then
    raise exception 'Invalid column name format';
  end if;

  -- Protection: Prevent deletion of 'id' and 'created_at'
  if column_name_param = 'id' or column_name_param = 'created_at' then
      raise exception 'Cannot delete protected columns (id, created_at)';
  end if;

  -- Execute the ALTER TABLE statement
  execute format('alter table metricas_dinamicas drop column %I', column_name_param);
end;
$$;
