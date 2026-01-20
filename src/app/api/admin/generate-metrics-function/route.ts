import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Removed top-level init

// Helper to build the WHERE part of the query
function buildWherePart(config: any, rules: any[]) {
    let whereClauses = []

    // 1. Valid Date Filter (Timezone Safe)
    if (config.apenas_hoje && config.coluna_data) {
        whereClauses.push(
            `("${config.coluna_data}" AT TIME ZONE 'America/Sao_Paulo')::date = (NOW() AT TIME ZONE 'America/Sao_Paulo')::date`
        )
    }

    // 2. Rules
    if (rules && Array.isArray(rules)) {
        for (const r of rules) {
            const terms = r.termos || []
            const op = r.comparar
            const countCol = r.coluna_contar
            const logicOp = r.e_ou === 'OU' ? 'OR' : 'AND'

            if (['vazio', 'nao_vazio'].includes(op)) {
                // Handle Empty/NotEmpty with safe cast
                const condition = op === 'vazio'
                    ? `("${countCol}" IS NULL OR "${countCol}"::text = '')`
                    : `("${countCol}" IS NOT NULL AND "${countCol}"::text <> '')`
                whereClauses.push(condition)
            } else if (terms.length > 0) {
                // Handle Terms
                const clauses = terms.map((term: string) => {
                    const safeTerm = term.replace(/'/g, "''") // SQL escape
                    switch (op) {
                        case 'igual': return `"${countCol}" = '${safeTerm}'`
                        case 'diferente': return `"${countCol}" <> '${safeTerm}'`
                        case 'contem': return `"${countCol}" ILIKE '%${safeTerm}%'`
                        case 'nao_contem': return `"${countCol}" NOT ILIKE '%${safeTerm}%'`
                        default: return '1=1'
                    }
                })

                if (clauses.length > 0) {
                    whereClauses.push(`(${clauses.join(` ${logicOp} `)})`)
                }
            }
        }
    }

    if (whereClauses.length === 0) return ''
    return ' AND ' + whereClauses.join(' AND ')
}

export async function POST() {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
        const { data: rules, error: fetchError } = await supabaseAdmin
            .from('regras_das_metricas')
            .select('*')
            .neq('nome_da_coluna_metricas', 'visualizar')

        if (fetchError) throw fetchError
        if (!rules) return NextResponse.json({ success: true, message: 'No rules found' })

        let sqlBody = ''

        for (const rule of rules) {
            const colName = rule.nome_da_coluna_metricas
            const config = rule.regras_da_coluna
            const tableName = config.tabela_busca

            if (rule.tipo_metrica === 'individual') {
                // --- INDIVIDUAL (Returns Integer) ---
                const whereClause = buildWherePart(config, config.regras)
                const query = `SELECT 1 FROM "${tableName}" WHERE 1=1 ${whereClause}`

                sqlBody += `
    -- Rule for ${colName} (Individual)
    SELECT count(*) INTO v_count FROM (${query}) as sub;

    UPDATE metricas_dinamicas
    SET "${colName}" = v_count
    WHERE (created_at AT TIME ZONE 'America/Sao_Paulo')::date = (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;
`
            } else if (rule.tipo_metrica === 'varios') {
                // --- VARIOS (Returns JSON Array) ---
                const itens = config.itens || []
                let itemQueries = []

                for (const item of itens) {
                    const itemRules = item.regras || []
                    const itemName = item.nome_do_item || 'Unnamed'

                    // Build query for this specific item
                    // Note: Global 'apenas_hoje' applies to all items
                    const whereClause = buildWherePart(config, itemRules)
                    const query = `SELECT count(*) FROM (SELECT 1 FROM "${tableName}" WHERE 1=1 ${whereClause}) as sub`

                    // Build JSON object part: {"Item Name": Count}
                    itemQueries.push(`jsonb_build_object('${itemName}', (${query}))`)
                }

                if (itemQueries.length > 0) {
                    sqlBody += `
    -- Rule for ${colName} (Varios)
    SELECT jsonb_build_array(${itemQueries.join(', ')}) INTO v_json_result;

    UPDATE metricas_dinamicas
    SET "${colName}" = v_json_result
    WHERE (created_at AT TIME ZONE 'America/Sao_Paulo')::date = (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;
`
                }
            }
        }

        const finalSql = `
CREATE OR REPLACE FUNCTION update_dynamic_metrics_values()
RETURNS void AS $$
DECLARE
    v_count INTEGER;
    v_json_result JSONB;
    v_valor_sum NUMERIC;
BEGIN
    ${sqlBody}

    -- Fixed Logic for 'valor' (Sum of valor from registros for today)
    SELECT COALESCE(SUM(valor), 0) INTO v_valor_sum
    FROM "registros"
    WHERE (data AT TIME ZONE 'America/Sao_Paulo')::date = (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;

    UPDATE metricas_dinamicas
    SET "valor" = ROUND(v_valor_sum, 2)
    WHERE (created_at AT TIME ZONE 'America/Sao_Paulo')::date = (NOW() AT TIME ZONE 'America/Sao_Paulo')::date;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
`

        const { error: execError } = await supabaseAdmin.rpc('exec_sql', { query: finalSql })
        if (execError) throw execError

        return NextResponse.json({ success: true, message: 'Function generated successfully' })

    } catch (err: any) {
        console.error('Error generating function:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
