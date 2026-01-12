'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { ColumnDef, ColumnOrderState, VisibilityState } from '@tanstack/react-table'
import { DataTable } from '@/components/data-table'
import { Button } from '@/components/ui/button'
import { Registro } from '@/types/schema'
import { invalidosColumns } from '@/components/invalidos-columns'

export default function AdminInvalidosPage() {
    const router = useRouter()
    const [invalidos, setInvalidos] = useState<Registro[]>([])
    const [loading, setLoading] = useState(true)
    const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'user' | null>(null)
    const [updatedRowId, setUpdatedRowId] = useState<number | null>(null)

    useEffect(() => {
        if (updatedRowId !== null) {
            const timer = setTimeout(() => setUpdatedRowId(null), 2000)
            return () => clearTimeout(timer)
        }
    }, [updatedRowId])

    useEffect(() => {
        const checkAdminAndFetch = async () => {
            // Check if current user is admin
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/')
                return
            }

            const { data: currentProfile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (!currentProfile || currentProfile.role !== 'admin') {
                router.push('/')
                return
            }

            setCurrentUserRole(currentProfile.role)

            // Fetch all invalidos
            let allInvalidos: Registro[] = []
            let from = 0
            const step = 1000
            let more = true

            while (more) {
                const { data, error } = await supabase
                    .from('invalidos')
                    .select('*')
                    .range(from, from + step - 1)
                    .order('id', { ascending: false })

                if (error) {
                    console.error('Error fetching invalidos:', error)
                    more = false
                } else {
                    if (data && data.length > 0) {
                        allInvalidos = [...allInvalidos, ...data]
                        from += step
                        if (data.length < step) {
                            more = false
                        }
                    } else {
                        more = false
                    }
                }
            }

            const uniqueInvalidos = Array.from(new Map(allInvalidos.map(item => [item.id, item])).values())
            setInvalidos(uniqueInvalidos)
            setLoading(false)
        }

        checkAdminAndFetch()

        // Set up realtime subscription for invalidos table
        const channel = supabase
            .channel('invalidos')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'invalidos',
                },
                (payload) => {
                    console.log('Invalidos change received!', payload)
                    if (payload.eventType === 'INSERT') {
                        setInvalidos((prev) => [payload.new as Registro, ...prev])
                        setUpdatedRowId(payload.new.id)
                    } else if (payload.eventType === 'UPDATE') {
                        setInvalidos((prev) =>
                            prev.map((registro) =>
                                registro.id === payload.new.id ? (payload.new as Registro) : registro
                            )
                        )
                        setUpdatedRowId(payload.new.id)
                    } else if (payload.eventType === 'DELETE') {
                        setInvalidos((prev) =>
                            prev.filter((registro) => registro.id !== payload.old.id)
                        )
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [router])

    const handleRowUpdate = (rowId: string | number, updateData: Partial<Registro>) => {
        setInvalidos(prev => prev.map(row => {
            if (String(row.id) === String(rowId)) {
                return { ...row, ...updateData }
            }
            return row
        }))
        setUpdatedRowId(typeof rowId === 'string' ? parseInt(rowId) : rowId)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
                <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-400"></div>
                    <p className="mt-4 text-blue-200 font-medium">Carregando...</p>
                </div>
            </div>
        )
    }

    if (currentUserRole !== 'admin') {
        return null
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-purple-950 text-gray-100 relative">
            {/* Animated Background Effects */}
            <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
                <div className="absolute top-0 -left-4 w-96 h-96 bg-red-500/10 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
                <div className="absolute top-0 -right-4 w-96 h-96 bg-orange-500/10 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-96 h-96 bg-yellow-500/10 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
            </div>

            {/* Header */}
            <div className="sticky top-0 z-50 w-full border-b border-white/10 backdrop-blur-xl bg-gradient-to-r from-gray-900/80 via-red-900/80 to-orange-900/80 shadow-lg shadow-red-500/5">
                <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-orange-500/5"></div>
                <div className="relative flex h-16 items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <Button
                            onClick={() => router.push('/')}
                            variant="outline"
                            size="sm"
                            className="border-red-500/30 hover:border-red-400/50 bg-red-500/10 hover:bg-red-500/20 text-red-200 hover:text-red-100 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/20"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Voltar ao Dashboard
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        <h1 className="text-xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                            Registros Inválidos
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-red-400 to-orange-400 animate-pulse"></div>
                        <span className="text-sm font-semibold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                            Admin
                        </span>
                    </div>
                </div>
            </div>

            <div className="p-4">
                <DataTable
                    data={invalidos}
                    columns={invalidosColumns}
                    meta={{ role: 'admin' }}
                    tableName="invalidos"
                    updatedRowId={updatedRowId}
                    onRowUpdate={handleRowUpdate}
                />
            </div>

            {/* Custom CSS for animations */}
            <style jsx global>{`
                @keyframes blob {
                    0% {
                        transform: translate(0px, 0px) scale(1);
                    }
                    33% {
                        transform: translate(30px, -50px) scale(1.1);
                    }
                    66% {
                        transform: translate(-20px, 20px) scale(0.9);
                    }
                    100% {
                        transform: translate(0px, 0px) scale(1);
                    }
                }
                .animate-blob {
                    animation: blob 7s infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                .animation-delay-4000 {
                    animation-delay: 4s;
                }
            `}</style>
        </div>
    )
}
