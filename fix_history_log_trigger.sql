CREATE OR REPLACE FUNCTION public.move_invalid_registros()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions'
AS $function$
DECLARE
    _operador_atual text;
    _codigo_final text;
BEGIN
    -- DEBUG LOG - Log EVERYTHING
    RAISE LOG '[Trigger: move_invalid_registros] Fired. ID: %, Status: ''%''.', NEW.id, NEW.status;
    RAISE LOG '[Trigger: move_invalid_registros] DEBUG DATA: NEW.codigo: ''%'', OLD.codigo: ''%''', NEW.codigo, OLD.codigo;

    -- Strict condition: Check if status IS 'Inválido' (trimmed)
    IF TRIM(NEW.status) = 'Inválido' AND (OLD.status IS DISTINCT FROM 'Inválido') THEN
        
        -- Determine the code using fallback
        _codigo_final := COALESCE(NEW.codigo, OLD.codigo);
        RAISE LOG '[Trigger: move_invalid_registros] Selected Code: ''%''', _codigo_final;

        -- Get current user for history logging
        select coalesce(username, email) into _operador_atual from public.profiles where id = auth.uid();
        if _operador_atual is null then
            _operador_atual := 'Sistema/Desconhecido';
        end if;

        -- Explicitly log the status change to historico
        INSERT INTO public.historico (
            id_registro, 
            operador, 
            coluna_mudanca, 
            valor_anterior, 
            valor_posterior,
            codigo
        )
        VALUES (
            NEW.id, 
            _operador_atual, 
            'status', 
            OLD.status::text, 
            NEW.status::text,
            _codigo_final
        );

        -- Move to invalidos with Upsert (ON CONFLICT)
        INSERT INTO invalidos (
            id, operador, tipo_de_conta, tipo_chip, valor, dispositivo, 
            instancia, numero, codigo, status, info, obs, waha_dia, caiu_dia, 
            data, ultima_att
        )
        VALUES (
            NEW.id, NEW.operador, NEW.tipo_de_conta, NEW.tipo_chip, NEW.valor, NEW.dispositivo, 
            NEW.instancia, NEW.numero, _codigo_final, NEW.status, NEW.info, NEW.obs, NEW.waha_dia, 
            COALESCE(NEW.caiu_dia, date_trunc('second', NOW())), 
            NEW.data, NEW.ultima_att
        )
        ON CONFLICT (id) DO UPDATE SET
            operador = EXCLUDED.operador,
            tipo_de_conta = EXCLUDED.tipo_de_conta,
            tipo_chip = EXCLUDED.tipo_chip,
            valor = EXCLUDED.valor,
            dispositivo = EXCLUDED.dispositivo,
            instancia = EXCLUDED.instancia,
            numero = EXCLUDED.numero,
            codigo = EXCLUDED.codigo,
            status = EXCLUDED.status,
            info = EXCLUDED.info,
            obs = EXCLUDED.obs,
            waha_dia = EXCLUDED.waha_dia,
            caiu_dia = EXCLUDED.caiu_dia,
            data = EXCLUDED.data,
            ultima_att = EXCLUDED.ultima_att;
        
        DELETE FROM registros WHERE id = NEW.id;
        
        RAISE LOG '[Trigger: move_invalid_registros] Move complete.';
        RETURN NULL; 
    END IF;
    
    RETURN NEW;
END;
$function$
