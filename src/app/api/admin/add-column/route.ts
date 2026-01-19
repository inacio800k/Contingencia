import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    if (!supabaseServiceKey) {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Initialize Supabase with Service Role Key (Admin)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    try {
        const body = await request.json()
        const { column_name, is_individual } = body

        if (!column_name) {
            return NextResponse.json({ error: 'Nome da coluna é obrigatório' }, { status: 400 })
        }

        // Regex validation: Letters, numbers, underscore only. No spaces.
        // Although RPC checks this, checking here gives faster feedback and saves a DB call.
        const nameRegex = /^[a-zA-Z0-9_]+$/
        if (!nameRegex.test(column_name)) {
            return NextResponse.json({ error: 'Nome da coluna inválido. Use apenas letras, números e underline.' }, { status: 400 })
        }

        const dataType = is_individual ? 'numeric' : 'jsonb'

        const { error } = await supabase.rpc('add_column_to_metricas_dinamicas', {
            column_name_param: column_name,
            data_type_param: dataType
        })

        if (error) {
            console.error('Error adding column:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })

    } catch (err: any) {
        console.error('Unexpected error:', err)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
