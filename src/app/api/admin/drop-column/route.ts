import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { column_name } = await request.json()

        if (!column_name) {
            return NextResponse.json({ error: 'Column name is required' }, { status: 400 })
        }

        // Initialize Supabase client with Service Role Key
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Call the RPC function
        const { error } = await supabase.rpc('drop_dynamic_column', {
            column_name_param: column_name
        })

        if (error) {
            console.error('Error dropping column:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Unexpected error:', error)
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
    }
}
