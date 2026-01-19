import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const { table } = body

        if (!table) {
            return NextResponse.json({ error: 'Table name is required' }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

        if (!supabaseServiceKey) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
        }

        // Initialize Supabase with Service Role Key to bypass RLS and access information_schema if needed
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Query information_schema to get columns and types
        // Note: Direct access to information_schema via RPC or raw query is best. 
        // Since we don't have a dedicated RPC `get_columns`, and raw SQL depends on library support 
        // (Supabase JS doesn't expose raw query easily without RPC).
        // LIMITATION: 'rpc' call requires the function to exist in DB.

        // ALTERNATIVE: Use the Postgres "rpc" trick if 'execute_sql' functionality was exposed to client? No.

        // WORKAROUND: We can use the 'postgres' library if installed, but it's not.
        // We can use Supabase's `rpc` capabilities if we create a function. 
        // BUT, I can't create function easily if I don't control migrations heavily here.

        // BETTER WORKAROUND (if no RPC): Fetch one row? No, types missing.

        // WAIT: I inspected the `move-record` route. It doesn't do raw SQL.

        // Let's try to query `information_schema.columns` as a regular table.
        // Supabase often exposes information_schema in the API if permissions allow.
        // With Service Role Key, we should be able to SELECT from it?
        // Actually, PostgREST (Supabase) DOES NOT expose information_schema by default.

        // RE-EVALUATION: The USER (Agent) has `mcp_supabase-mcp-server_execute_sql`. 
        // I can pre-fetch the columns NOW and hardcode them if I want.
        // But the user asked for *dynamic* "procure a tabela".

        // OK, I will assume there is an RPC function OR I will create one.
        // Since I have `mcp_supabase-mcp-server_apply_migration`, I CAN create a function safely!
        // This is the most robust way.

        // I will create a migration to add `get_table_info` function first.
        // Then call it here.

        // Wait, for this step, I'll just write the API route assuming the RPC exists, 
        // AND then I'll use the 'apply_migration' tool to create it.

        const { data, error } = await supabase.rpc('get_table_info', { table_name_param: table })

        if (error) {
            console.error('Error fetching columns:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ columns: data })

    } catch (error: any) {
        console.error('API Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
