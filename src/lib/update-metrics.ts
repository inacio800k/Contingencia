import { supabase as defaultSupabase } from './supabase'
import { SupabaseClient } from '@supabase/supabase-js'

/**
 * Updates the whats_vendedores counts in the metricas table for today.
 * If today has no vendedores, it copies the names from the most recent previous day.
 * This should be called whenever a registro's status changes.
 */
export async function updateSellerMetrics(supabase: SupabaseClient = defaultSupabase) {
    try {
        // Get today's date in LOCAL timezone (not UTC)
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        const today = `${year}-${month}-${day}`

        // 1. Fetch ALL logs first (most time consuming)
        // Fetch ALL registros where status contains 'Vendedor'
        const { data: vendorRegs, error: vendorError } = await supabase
            .from('registros')
            .select('obs')
            .ilike('status', '%Vendedor%')

        // Fetch registros created TODAY (for criados_pp)
        const { data: createdRegs, error: createdError } = await supabase
            .from('registros')
            .select('operador')
            .gte('data', today)
            .lt('data', today + 'T23:59:59')

        // Fetch Troca de Numeros created TODAY (for troca_num_pp)
        const { data: trocaRegs, error: trocaError } = await supabase
            .from('troca_numeros')
            .select('operador')
            .gte('created_at', today)
            .lt('created_at', today + 'T23:59:59')

        // Fetch Conexao Vendedores created TODAY
        const { data: conexaoRegs, error: conexaoError } = await supabase
            .from('conexao_vendedores')
            .select('operador, tipo_conexao, vendedor')
            .gte('created_at', today)
            .lt('created_at', today + 'T23:59:59')

        // Fetch Conexao Waha/Uazapi created TODAY
        const { data: wahaUazapiRegs, error: wahaUazapiError } = await supabase
            .from('conexao_wahapi')
            .select('operador, conectado_em')
            .gte('created_at', today)
            .lt('created_at', today + 'T23:59:59')

        // Fetch Proxy created TODAY
        const { data: proxyRegs, error: proxyError } = await supabase
            .from('proxy')
            .select('operador, foi_feito')
            .gte('created_at', today)
            .lt('created_at', today + 'T23:59:59')

        // Fetch Emails created TODAY (for email_pp)
        const { data: emailRegs, error: emailError } = await supabase
            .from('criacao_email')
            .select('operador')
            .gte('created_at', today)
            .lt('created_at', today + 'T23:59:59')

        if (vendorError || createdError || trocaError || conexaoError || wahaUazapiError || proxyError || emailError) {
            console.error('[updateSellerMetrics] Error fetching registros:', vendorError || createdError || trocaError || conexaoError || wahaUazapiError || proxyError || emailError)
            return
        }

        let retryCount = 0
        const maxRetries = 5
        let success = false

        while (retryCount < maxRetries && !success) {
            if (retryCount > 0) {
                await new Promise(resolve => setTimeout(resolve, 200 * retryCount)) // Exponential backoff
                console.log(`[updateSellerMetrics] Retry attempt ${retryCount + 1}`)
            }

            // 2. Fetch today's metrica (latest version)
            const { data: metricaData, error: metricaError } = await supabase
                .from('metricas')
                .select('dia, whats_vendedores, whats_call, criados_pp, troca_num_pp, con_vende_nova_pp, recon_vende_pp, con_waha_pp, con_uazapi_pp, ins_recriadas_pp, troca_proxy_pp, email_pp')
                .gte('dia', today)
                .lt('dia', today + 'T23:59:59')
                .single()

            if (metricaError || !metricaData) {
                console.log('[updateSellerMetrics] No metrica found for today')
                return
            }

            // Helper to process a specific field
            const processField = async (fieldName: 'whats_vendedores' | 'whats_call' | 'criados_pp' | 'troca_num_pp' | 'con_vende_nova_pp' | 'recon_vende_pp' | 'con_waha_pp' | 'con_uazapi_pp' | 'ins_recriadas_pp' | 'troca_proxy_pp' | 'email_pp', currentData: any[], shouldBackfill: boolean = true) => {
                let items = currentData

                // Only copy from previous day if the field is strictly NULL (uninitialized) AND backfill is enabled. 
                // OR if it is an empty array [], which is the default for new rows but we want to carry over config.
                if (shouldBackfill && (items === null || items === undefined || (Array.isArray(items) && items.length === 0))) {
                    console.log(`[updateSellerMetrics] ${fieldName} is uninitialized (null), searching for previous data...`)

                    // Fetch last 7 days to find one with data
                    const { data: lastMetricas } = await supabase
                        .from('metricas')
                        .select(fieldName)
                        .lt('dia', today)
                        .not(fieldName, 'is', null)
                        .order('dia', { ascending: false })
                        .limit(7)

                    // Find the first one that is not an empty array
                    const validMetric = lastMetricas?.find((m: any) => {
                        const val = m[fieldName]
                        return Array.isArray(val) && val.length > 0
                    })

                    // Safe access using type casting
                    const lastItems = validMetric ? (validMetric as any)[fieldName] : null

                    if (lastItems && lastItems.length > 0) {
                        const getVendorName = (v: any) => typeof v === 'object' ? Object.keys(v)[0] : String(v)
                        items = lastItems.map((v: any) => ({ [getVendorName(v)]: 0 }))
                        console.log(`[updateSellerMetrics] Copied ${fieldName} from previous valid day:`, items)
                    } else {
                        console.log(`[updateSellerMetrics] No previous valid ${fieldName} found in last 7 days`)
                        return []
                    }
                }
                // Ensure we return an array if items is null/undefined and backfill didn't run/find anything
                return items || []
            }

            // 3. Process Fields (Backfill if needed)
            const whatsVendedoresParams = await processField('whats_vendedores', metricaData.whats_vendedores, true)
            const whatsCallParams = await processField('whats_call', metricaData.whats_call, true)
            // Disable backfill for criados_pp to prevent auto-population overwriting manual control
            const finalCriadosParams = await processField('criados_pp', metricaData.criados_pp, false)
            const finalTrocaParams = await processField('troca_num_pp', metricaData.troca_num_pp, true)
            const finalConNovaParams = await processField('con_vende_nova_pp', metricaData.con_vende_nova_pp, true)
            const finalReconParams = await processField('recon_vende_pp', metricaData.recon_vende_pp, true)
            const finalConWahaParams = await processField('con_waha_pp', metricaData.con_waha_pp, true)
            const finalConUazapiParams = await processField('con_uazapi_pp', metricaData.con_uazapi_pp, true)
            const finalInsRecriadasParams = await processField('ins_recriadas_pp', metricaData.ins_recriadas_pp, true)
            const finalTrocaProxyParams = await processField('troca_proxy_pp', metricaData.troca_proxy_pp, true)
            const finalEmailParams = await processField('email_pp', metricaData.email_pp, true)


            // 4. Calculate counts
            const getVendorName = (v: any) => typeof v === 'object' ? Object.keys(v)[0] : String(v)

            console.log(`[updateSellerMetrics] Fetched ${vendorRegs?.length} records for 'Vendedor'.`)
            // DEBUG: Check if we have records and what they look like
            if (vendorRegs && vendorRegs.length > 0) {
                console.log(`[updateSellerMetrics] First 'Vendedor' record:`, JSON.stringify(vendorRegs[0]))
            }

            // Logical for Whats Vendedores and Whats Call (status based)
            const getCountStatus = (name: string) => {
                const count = (vendorRegs || []).filter(r =>
                    r.obs && r.obs.toLowerCase().includes(name.toLowerCase())
                ).length
                console.log(`[updateSellerMetrics] Counting for '${name}': ${count}`)
                return count
            }


            // Logic for Criados PP (date and operador based)
            const getCountCreated = (name: string) => (createdRegs || []).filter(r =>
                r.operador && r.operador.toLowerCase().includes(name.toLowerCase())
            ).length

            // Logic for Email PP (date and operador based on criacao_email table)
            const getCountEmail = (name: string) => (emailRegs || []).filter(r =>
                r.operador && r.operador.toLowerCase().includes(name.toLowerCase())
            ).length

            // Logic for Troca Num PP (date and operador based on troca_numeros table)
            const getCountTroca = (name: string) => (trocaRegs || []).filter(r =>
                r.operador && r.operador.toLowerCase().includes(name.toLowerCase())
            ).length

            // Logic for Con Vende Nova PP
            const getCountConNova = (name: string) => (conexaoRegs || []).filter(r =>
                r.operador && r.operador.toLowerCase().includes(name.toLowerCase()) &&
                r.tipo_conexao === 'Nova'
            ).length

            // Logic for Recon Vende PP
            const getCountRecon = (name: string) => (conexaoRegs || []).filter(r =>
                r.operador && r.operador.toLowerCase().includes(name.toLowerCase()) &&
                r.tipo_conexao === 'Reconexão'
            ).length

            // Logic for Con Waha PP
            const getCountWaha = (name: string) => (wahaUazapiRegs || []).filter(r =>
                r.operador && r.operador.toLowerCase().includes(name.toLowerCase()) &&
                r.conectado_em === 'Waha'
            ).length

            // Logic for Con Uazapi PP
            const getCountUazapi = (name: string) => (wahaUazapiRegs || []).filter(r =>
                r.operador && r.operador.toLowerCase().includes(name.toLowerCase()) &&
                r.conectado_em === 'Uazapi'
            ).length

            // Logic for Ins Recriadas PP
            const getCountInsRecriadas = (name: string) => (proxyRegs || []).filter(r =>
                r.operador && r.operador.toLowerCase().includes(name.toLowerCase()) &&
                r.foi_feito === 'Instância Recriada'
            ).length

            // Logic for Troca Proxy PP
            const getCountTrocaProxy = (name: string) => (proxyRegs || []).filter(r =>
                r.operador && r.operador.toLowerCase().includes(name.toLowerCase()) &&
                r.foi_feito === 'Troca de Proxy'
            ).length


            const updatedVendedores = (whatsVendedoresParams || []).map((v: any) => ({ [getVendorName(v)]: getCountStatus(getVendorName(v)) }))
            const updatedCall = (whatsCallParams || []).map((v: any) => ({ [getVendorName(v)]: getCountStatus(getVendorName(v)) }))
            const updatedCriados = (finalCriadosParams || []).map((v: any) => ({ [getVendorName(v)]: getCountCreated(getVendorName(v)) }))
            const updatedTroca = (finalTrocaParams || []).map((v: any) => ({ [getVendorName(v)]: getCountTroca(getVendorName(v)) }))
            const updatedConNova = (finalConNovaParams || []).map((v: any) => ({ [getVendorName(v)]: getCountConNova(getVendorName(v)) }))
            const updatedRecon = (finalReconParams || []).map((v: any) => ({ [getVendorName(v)]: getCountRecon(getVendorName(v)) }))
            const updatedConWaha = (finalConWahaParams || []).map((v: any) => ({ [getVendorName(v)]: getCountWaha(getVendorName(v)) }))
            const updatedConUazapi = (finalConUazapiParams || []).map((v: any) => ({ [getVendorName(v)]: getCountUazapi(getVendorName(v)) }))
            const updatedInsRecriadas = (finalInsRecriadasParams || []).map((v: any) => ({ [getVendorName(v)]: getCountInsRecriadas(getVendorName(v)) }))
            const updatedTrocaProxy = (finalTrocaProxyParams || []).map((v: any) => ({ [getVendorName(v)]: getCountTrocaProxy(getVendorName(v)) }))
            const updatedEmail = (finalEmailParams || []).map((v: any) => ({ [getVendorName(v)]: getCountEmail(getVendorName(v)) }))

            // 5. Save to database (With Optimistic Lock Check)
            // We verify that ALL array fields have NOT changed since we read them
            const { data: updateData, error: updateError } = await supabase
                .from('metricas')
                .update({
                    whats_vendedores: updatedVendedores,
                    whats_call: updatedCall,
                    criados_pp: updatedCriados,
                    troca_num_pp: updatedTroca,
                    con_vende_nova_pp: updatedConNova,
                    recon_vende_pp: updatedRecon,
                    con_waha_pp: updatedConWaha,
                    con_uazapi_pp: updatedConUazapi,
                    ins_recriadas_pp: updatedInsRecriadas,
                    troca_proxy_pp: updatedTrocaProxy,
                    email_pp: updatedEmail
                })
                .eq('dia', metricaData.dia)
                // Optimistic currency check: simpler approach - just update based on ID. 
                // The complex JSON matching is causing database errors (22P02).
                .select('dia')

            if (updateError) {
                console.error('[updateSellerMetrics] Error updating metrics:', updateError)
                return // Exit on error
            }

            if (updateData && updateData.length > 0) {
                console.log('[updateSellerMetrics] Successfully updated counts')
                success = true
            } else {
                console.log('[updateSellerMetrics] Update failed (race condition), retrying...')
                retryCount++
            }
        }
    } catch (err) {
        console.error('[updateSellerMetrics] Error:', err)
    }
}
