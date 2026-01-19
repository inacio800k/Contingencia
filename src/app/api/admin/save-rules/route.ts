import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Initialize Supabase client inside the handler to prevent build-time static generation issues
// with missing environment variables.

export async function POST(request: Request) {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
        const { column_name, metric_type, rules_config } = await request.json()

        if (!column_name || !metric_type || !rules_config) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Check if rule exists
        const { data: existingRule, error: fetchError } = await supabaseAdmin
            .from('regras_das_metricas')
            .select('id')
            .eq('nome_da_coluna_metricas', column_name)
            .single()

        let error;

        if (existingRule) {
            // Update
            const { error: updateError } = await supabaseAdmin
                .from('regras_das_metricas')
                .update({
                    tipo_metrica: metric_type,
                    regras_da_coluna: rules_config,
                    ultima_att: new Date().toISOString()
                })
                .eq('id', existingRule.id)
            error = updateError
        } else {
            // Insert
            const { error: insertError } = await supabaseAdmin
                .from('regras_das_metricas')
                .insert({
                    nome_da_coluna_metricas: column_name,
                    tipo_metrica: metric_type,
                    regras_da_coluna: rules_config,
                    ultima_att: new Date().toISOString()
                })
            error = insertError
        }

        if (error) {
            console.error('Error saving rules:', error)
            return NextResponse.json({ error: 'Database error saving rules' }, { status: 500 })
        }

        return NextResponse.json({ success: true })

    } catch (err: any) {
        console.error('API Error:', err)
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
    }
}
