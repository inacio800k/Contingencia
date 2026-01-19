import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Removed top-level init

export async function POST(request: Request) {
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
        const { column_name } = await request.json()

        if (!column_name) {
            return NextResponse.json({ error: 'Missing column_name' }, { status: 400 })
        }

        const { data, error } = await supabaseAdmin
            .from('regras_das_metricas')
            .select('regras_da_coluna')
            .eq('nome_da_coluna_metricas', column_name)
            .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 is no rows found
            console.error('Error fetching rules:', error)
            return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        if (!data) {
            return NextResponse.json({ found: false })
        }

        return NextResponse.json({ found: true, rules: data.regras_da_coluna })

    } catch (err: any) {
        console.error('API Error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
