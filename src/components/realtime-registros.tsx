'use client'

import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { Registro } from '@/types/schema'
import { DataTable } from '@/components/data-table'
import { columns } from '@/components/columns'
import { ColumnOrderState, VisibilityState } from '@tanstack/react-table'

interface RealtimeRegistrosProps {
    onTableReady?: (table: any) => void
    onSaveVisibilityReady?: (saveFunc: (visibility: VisibilityState) => void) => void
}

export default function RealtimeRegistros({ onTableReady, onSaveVisibilityReady }: RealtimeRegistrosProps) {
    const [registros, setRegistros] = useState<Registro[]>([])
    const [loading, setLoading] = useState(true)
    const [preferencesLoaded, setPreferencesLoaded] = useState(false)
    const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null)
    const [username, setUsername] = useState<string>('')
    const [columnPreferences, setColumnPreferences] = useState<any>(null)
    const [columnOrder, setColumnOrder] = useState<ColumnOrderState | null>(null)
    const [updatedRowId, setUpdatedRowId] = useState<number | null>(null)

    // Refs to track last saved values - these update SYNCHRONOUSLY unlike state
    const lastSavedVisibilityRef = useRef<string | null>(null)
    const lastSavedOrderRef = useRef<string | null>(null)

    useEffect(() => {
        if (updatedRowId !== null) {
            const timer = setTimeout(() => setUpdatedRowId(null), 2000) // Remove highlight after 2s
            return () => clearTimeout(timer)
        }
    }, [updatedRowId])

    useEffect(() => {
        const fetchRegistros = async () => {
            let allregistros: Registro[] = []
            let from = 0
            const step = 1000
            let more = true

            while (more) {
                const { data, error } = await supabase
                    .from('registros')
                    .select('*')
                    .range(from, from + step - 1)
                    .order('id', { ascending: false })

                if (error) {
                    console.error('Error fetching registros:', error)
                    more = false
                } else {
                    if (data && data.length > 0) {
                        allregistros = [...allregistros, ...data]
                        from += step
                        // If we got fewer than step, we're done
                        if (data.length < step) {
                            more = false
                        }
                    } else {
                        more = false
                    }
                }
            }

            // Remove potential duplicates if any (just in case)
            const uniqueRegistros = Array.from(new Map(allregistros.map(item => [item.id, item])).values())
            setRegistros(uniqueRegistros)
            setLoading(false)
        }

        const fetchUserData = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('role, column_preferences, column_order, username')
                    .eq('id', user.id)
                    .single()

                if (data) {
                    setUserRole(data.role as 'admin' | 'user')
                    setUsername(data.username || user.email || 'Sistema')
                    if (data.column_preferences && Object.keys(data.column_preferences).length > 0) {
                        setColumnPreferences(data.column_preferences)
                        // CRITICAL: Initialize ref with database value to prevent false "different" detections
                        lastSavedVisibilityRef.current = JSON.stringify(data.column_preferences)
                    }
                    if (data.column_order && Array.isArray(data.column_order) && data.column_order.length > 0) {
                        setColumnOrder(data.column_order)
                        // CRITICAL: Initialize ref with database value to prevent false "different" detections
                        lastSavedOrderRef.current = JSON.stringify(data.column_order)
                    }
                }
            }
            // Mark preferences as loaded even if user doesn't exist
            setPreferencesLoaded(true)
        }

        fetchRegistros()
        fetchUserData()

        const channel = supabase
            .channel('registros')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'registros',
                },
                (payload) => {
                    console.log('Change received!', payload)
                    if (payload.eventType === 'INSERT') {
                        setRegistros((prev) => [payload.new as Registro, ...prev])
                        setUpdatedRowId(payload.new.id)
                    } else if (payload.eventType === 'UPDATE') {
                        console.log('[DEBUG REALTIME] UPDATE received for id:', payload.new.id)
                        setRegistros((prev) =>
                            prev.map((registro) =>
                                registro.id === payload.new.id ? (payload.new as Registro) : registro
                            )
                        )
                        setUpdatedRowId(payload.new.id)
                    } else if (payload.eventType === 'DELETE') {
                        setRegistros((prev) =>
                            prev.filter((registro) => registro.id !== payload.old.id)
                        )
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const handleColumnVisibilityChange = useCallback(async (visibility: any) => {
        const visibilityStr = JSON.stringify(visibility)

        console.log('[DEBUG VISIBILITY] Incoming:', visibilityStr.slice(0, 100))
        console.log('[DEBUG VISIBILITY] Saved ref:', lastSavedVisibilityRef.current?.slice(0, 100) || 'null')

        // CRITICAL: Compare against ref (synchronous) not state (async)
        // This prevents duplicate saves when callback fires multiple times quickly
        if (visibilityStr === lastSavedVisibilityRef.current) {
            console.log('[DEBUG VISIBILITY] Skipping - values match')
            return
        }

        // Update ref IMMEDIATELY (synchronous) - before anything else
        lastSavedVisibilityRef.current = visibilityStr

        console.log('[DEBUG VISIBILITY] SAVING - values are different!')

        // Update local state for UI sync
        setColumnPreferences(visibility)

        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    column_preferences: visibility
                })
        }
    }, []) // Empty deps - function never changes

    // Expose save functions to parent (for DataTableViewOptions) - only once
    const hasExposedRef = useRef(false)
    useEffect(() => {
        if (onSaveVisibilityReady && !hasExposedRef.current) {
            hasExposedRef.current = true
            onSaveVisibilityReady(handleColumnVisibilityChange)
        }
    }, [onSaveVisibilityReady, handleColumnVisibilityChange])

    const handleColumnOrderChange = async (order: ColumnOrderState) => {
        const orderStr = JSON.stringify(order)

        // CRITICAL: Compare against ref (synchronous) not state (async)
        // This prevents duplicate saves when callback fires multiple times quickly
        if (orderStr === lastSavedOrderRef.current) {
            console.log('[DEBUG ORDER] Skipping - already saved this exact value')
            return
        }

        // Update ref IMMEDIATELY (synchronous) - before anything else
        lastSavedOrderRef.current = orderStr

        console.log('[DEBUG ORDER] Saving new order')
        setColumnOrder(order)

        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    column_order: order
                })
        }
    }

    // Determine initial visibility: Preferences > Role Defaults
    // Memoize to prevent DataTable from resetting state on every render due to ref change
    const initialVisibility = useMemo(() => {
        if (columnPreferences) {
            return columnPreferences
        }

        return userRole === 'admin'
            ? {
                // Admin sees all columns - explicitly set to true
                id: true,
                data: true,
                ultima_att: true,
                operador: true,
                tipo_de_conta: true,
                dispositivo: true,
                instancia: true,
                numero: true,
                codigo: true,
                status: true,
                waha_dia: true,
                caiu_dia: true,
                dife: false, // Temporarily disabled
            }
            : {
                // User role hides admin-only columns
                id: false,
                ultima_att: false,
                waha_dia: false,
                caiu_dia: false,
                dife: false,
            }
    }, [columnPreferences, userRole])

    // Determine initial column order: Saved order > Default order from columns definition
    // Always ensure 'select' column is first
    const initialColumnOrder = useMemo((): ColumnOrderState => {
        const defaultOrder = columns.map((col: any) => col.id || col.accessorKey).filter(Boolean)

        if (columnOrder) {
            // Remove 'select' from saved order if present, then add it to the front
            const orderWithoutSelect = columnOrder.filter(col => col !== 'select')
            return ['select', ...orderWithoutSelect]
        }

        // Return default order (select should already be first from columns definition)
        return defaultOrder
    }, [columnOrder])

    const handleRowUpdate = (rowId: string | number, updateData: Partial<Registro>) => {
        setRegistros(prev => prev.map(row => {
            // Compare as strings to avoid type mismatches
            if (String(row.id) === String(rowId)) {
                return { ...row, ...updateData }
            }
            return row
        }))
        // Ensure rowId is number for updatedRowId state if needed, or update state type
        setUpdatedRowId(typeof rowId === 'string' ? parseInt(rowId) : rowId)
    }

    if (loading || !preferencesLoaded) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Carregando...</p>
            </div>
        )
    }

    return (
        <DataTable
            data={registros}
            columns={columns}
            meta={{ role: userRole || 'user', operator: username }}
            initialColumnVisibility={initialVisibility}
            initialColumnOrder={initialColumnOrder}
            updatedRowId={updatedRowId}
            onTableReady={onTableReady}
            onColumnVisibilityChange={handleColumnVisibilityChange}
            onColumnOrderChange={handleColumnOrderChange}
            onRowUpdate={handleRowUpdate}
            initialSorting={[{ id: 'data', desc: true }]}
        />
    )
}
