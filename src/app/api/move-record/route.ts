
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { id, direction, status, operator } = body
        const op = operator || 'Sistema (API)'

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

            // 1.5. Log History (Explicitly)
            const { data: historyData, error: historyError } = await supabase
                .from('historico')
                .insert({
                    id_registro: id,
                    operador: op,
                    coluna_mudanca: 'status',
                    valor_anterior: record.status,
                    valor_posterior: status
                })
                .select() // Force return of data

            if (historyError) {
                console.error('[MoveAPI] History insert error:', historyError)
                throw new Error('History insert failed: ' + (historyError as any)?.message)
            }

            if (!historyData || historyData.length === 0) {
                console.error('[MoveAPI] History insert returned no data!')
                throw new Error('History insert returned no data. Possible RLS/Permission issue even with Service Key?')
            }
            console.log('[MoveAPI] History inserted successfully:', historyData[0])

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

            return NextResponse.json({
                success: true,
                message: 'Moved to invalidos [V_DEBUG_FINAL]',
                historyError: historyError ? (historyError as any).message : null,
                historyDebug: historyData
            })

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

            // 1.5. Log History (Ideally we should log history even when restoring)
            // Restore means insert into registros. The history trigger on registros usually handles updates, 
            // but this is an INSERT. So new record. History usually tracks changes.
            // If we want to track "Restored from invalidos", we might want to log it once inserted?
            // Or log here? Since ID stays same?
            // Let's log it here too for completeness if they want "history" of the flow.
            const { error: historyError } = await supabase
                .from('historico')
                .insert({
                    id_registro: id, // ID is preserved
                    operador: op,
                    coluna_mudanca: 'status',
                    valor_anterior: record.status, // previous status in invalidos
                    valor_posterior: status // new status in registros
                })

            if (historyError) {
                console.error('[MoveAPI] History insert error (restore):', historyError)
                throw new Error('History insert failed (restore): ' + historyError.message)
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

            return NextResponse.json({ success: true, message: 'Restored to registros', historyError: historyError ? (historyError as any).message : null })
        }

        return NextResponse.json({ error: 'Invalid direction' }, { status: 400 })

    } catch (error: any) {
        console.error('[MoveAPI] Critical error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
