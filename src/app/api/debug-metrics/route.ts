
import { createClient } from '@supabase/supabase-js'
import { updateSellerMetrics } from '@/lib/update-metrics'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

        if (!supabaseServiceKey) {
            return NextResponse.json({ error: 'No Service Key' }, { status: 500 })
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        console.log('[Debug] Triggering manual update with internal logs...')
        await updateSellerMetrics(supabase) // This will now log to stdout (Vercel logs)
        console.log('[Debug] Manual update finished.')

        return NextResponse.json({
            success: true,
            message: 'Update executed. Please check Vercel Function Logs for "[updateSellerMetrics]" messages.'
        })

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
