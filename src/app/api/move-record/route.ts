
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { id, direction, status } = body

        if (!id || !direction || !status) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

        if (!supabaseServiceKey) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
        }

        // Initialize Supabase with Service Role Key (Admin)
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        if (direction === 'to_invalidos') {
            console.log(`[MoveAPI] Moving ${id} to invalidos`)

            // 1. Fetch from Registros
            const { data: record, error: fetchError } = await supabase
                .from('registros')
                .select('*')
                .eq('id', id)
                .single()

            if (fetchError || !record) {
                return NextResponse.json({ error: 'Record not found in registros' }, { status: 404 })
            }

            // 2. Prepare data for Invalidos
            const invalidosData = { ...record, status: status, ultima_att: new Date().toISOString() }

            // 3. Upsert into Invalidos (Handling potential ID conflicts)
            // We use upsert to be safe if it already exists there
            const { error: insertError } = await supabase
                .from('invalidos')
                .upsert(invalidosData)

            if (insertError) {
                console.error('[MoveAPI] Insert error:', insertError)
                return NextResponse.json({ error: 'Failed to insert into invalidos: ' + insertError.message }, { status: 500 })
            }

            // 4. Delete from Registros
            const { error: deleteError } = await supabase
                .from('registros')
                .delete()
                .eq('id', id)

            if (deleteError) {
                console.error('[MoveAPI] Delete error:', deleteError)
                return NextResponse.json({ error: 'Failed to delete from registros: ' + deleteError.message }, { status: 500 })
            }

            return NextResponse.json({ success: true, message: 'Moved to invalidos' })

        } else if (direction === 'to_registros') {
            console.log(`[MoveAPI] Moving ${id} from invalidos to registros`)

            // 1. Fetch from Invalidos
            const { data: record, error: fetchError } = await supabase
                .from('invalidos')
                .select('*')
                .eq('id', id)
                .single()

            if (fetchError || !record) {
                return NextResponse.json({ error: 'Record not found in invalidos' }, { status: 404 })
            }

            // 2. Prepare data for Registros
            const registrosData = { ...record, status: status, ultima_att: new Date().toISOString() }

            // 3. Upsert into Registros
            const { error: insertError } = await supabase
                .from('registros')
                .upsert(registrosData)

            if (insertError) {
                console.error('[MoveAPI] Insert error:', insertError)
                return NextResponse.json({ error: 'Failed to insert into registros: ' + insertError.message }, { status: 500 })
            }

            // 4. Delete from Invalidos
            const { error: deleteError } = await supabase
                .from('invalidos')
                .delete()
                .eq('id', id)

            if (deleteError) {
                console.error('[MoveAPI] Delete error:', deleteError)
                return NextResponse.json({ error: 'Failed to delete from invalidos: ' + deleteError.message }, { status: 500 })
            }

            return NextResponse.json({ success: true, message: 'Restored to registros' })
        }

        return NextResponse.json({ error: 'Invalid direction' }, { status: 400 })

    } catch (error: any) {
        console.error('[MoveAPI] Critical error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
