CREATE OR REPLACE FUNCTION public.handle_registros_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
declare
    _col text;
    _old_val text;
    _new_val text;
    _operador text;
    _codigo_val text;
begin
    select username into _operador from public.profiles where id = auth.uid();
    
    if _operador is null then
        _operador := 'Sistema/Desconhecido';
    end if;

    -- Capture the code (fallback to old if new is null/missing)
    _codigo_val := COALESCE(new.codigo, old.codigo);

    if new.data is distinct from old.data then
        insert into public.historico (id_registro, operador, coluna_mudanca, valor_anterior, valor_posterior, codigo)
        values (new.id, _operador, 'data', old.data::text, new.data::text, _codigo_val);
    end if;

    if new.operador is distinct from old.operador then
        insert into public.historico (id_registro, operador, coluna_mudanca, valor_anterior, valor_posterior, codigo)
        values (new.id, _operador, 'operador', old.operador::text, new.operador::text, _codigo_val);
    end if;

    if new.tipo_de_conta is distinct from old.tipo_de_conta then
        insert into public.historico (id_registro, operador, coluna_mudanca, valor_anterior, valor_posterior, codigo)
        values (new.id, _operador, 'tipo_de_conta', old.tipo_de_conta::text, new.tipo_de_conta::text, _codigo_val);
    end if;

    if new.dispositivo is distinct from old.dispositivo then
        insert into public.historico (id_registro, operador, coluna_mudanca, valor_anterior, valor_posterior, codigo)
        values (new.id, _operador, 'dispositivo', old.dispositivo::text, new.dispositivo::text, _codigo_val);
    end if;

    if new.instancia is distinct from old.instancia then
        insert into public.historico (id_registro, operador, coluna_mudanca, valor_anterior, valor_posterior, codigo)
        values (new.id, _operador, 'instancia', old.instancia::text, new.instancia::text, _codigo_val);
    end if;

    if new.numero is distinct from old.numero then
        insert into public.historico (id_registro, operador, coluna_mudanca, valor_anterior, valor_posterior, codigo)
        values (new.id, _operador, 'numero', old.numero::text, new.numero::text, _codigo_val);
    end if;

    if new.codigo is distinct from old.codigo then
        insert into public.historico (id_registro, operador, coluna_mudanca, valor_anterior, valor_posterior, codigo)
        values (new.id, _operador, 'codigo', old.codigo::text, new.codigo::text, _codigo_val);
    end if;

    if new.status is distinct from old.status then
        insert into public.historico (id_registro, operador, coluna_mudanca, valor_anterior, valor_posterior, codigo)
        values (new.id, _operador, 'status', old.status::text, new.status::text, _codigo_val);
    end if;

    if new.info is distinct from old.info then
        insert into public.historico (id_registro, operador, coluna_mudanca, valor_anterior, valor_posterior, codigo)
        values (new.id, _operador, 'info', old.info::text, new.info::text, _codigo_val);
    end if;
     
    if new.obs is distinct from old.obs then
        insert into public.historico (id_registro, operador, coluna_mudanca, valor_anterior, valor_posterior, codigo)
        values (new.id, _operador, 'obs', old.obs::text, new.obs::text, _codigo_val);
    end if;

    if new.tipo_chip is distinct from old.tipo_chip then
        insert into public.historico (id_registro, operador, coluna_mudanca, valor_anterior, valor_posterior, codigo)
        values (new.id, _operador, 'tipo_chip', old.tipo_chip::text, new.tipo_chip::text, _codigo_val);
    end if;

    if new.valor is distinct from old.valor then
        insert into public.historico (id_registro, operador, coluna_mudanca, valor_anterior, valor_posterior, codigo)
        values (new.id, _operador, 'valor', old.valor::text, new.valor::text, _codigo_val);
    end if;

    if new.waha_dia is distinct from old.waha_dia then
        insert into public.historico (id_registro, operador, coluna_mudanca, valor_anterior, valor_posterior, codigo)
        values (new.id, _operador, 'waha_dia', old.waha_dia::text, new.waha_dia::text, _codigo_val);
    end if;

    if new.caiu_dia is distinct from old.caiu_dia then
        insert into public.historico (id_registro, operador, coluna_mudanca, valor_anterior, valor_posterior, codigo)
        values (new.id, _operador, 'caiu_dia', old.caiu_dia::text, new.caiu_dia::text, _codigo_val);
    end if;

    return new;
end;
$function$
