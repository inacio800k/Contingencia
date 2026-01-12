'use client'

import { useEffect, useState, memo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { updateSellerMetrics } from '@/lib/update-metrics'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, Plus, X, Users } from 'lucide-react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Metricas } from '@/types/schema'
import { DateRangePicker } from '@/components/date-range-picker'
import { DateRange } from 'react-day-picker'
import { subDays, format } from 'date-fns'

// Helper function to format UTC date
const formatDateUTC = (dateString: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const day = String(date.getUTCDate()).padStart(2, '0')
    const month = String(date.getUTCMonth() + 1).padStart(2, '0') // Months are 0-indexed
    const year = date.getUTCFullYear()
    return `${day}/${month}`
}

const getWeekDayUTC = (dateString: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const days = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.']
    return days[date.getUTCDay()]
}

// Helper function to get today's date in local timezone (YYYY-MM-DD format)
const getLocalToday = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

// Component for editing generic metric columns (whats_vendedores, whats_call)
// Component for editing generic metric columns (whats_vendedores, whats_call)
const MetricNameCell = memo(function MetricNameCell({
    metrica,
    field,
    title,
    onUpdate,
    isToday,
    updateTrigger,
    colorClass = "text-green-400"
}: {
    metrica: Metricas,
    field: 'whats_vendedores' | 'whats_call' | 'criados_pp' | 'troca_num_pp' | 'con_vende_nova_pp' | 'recon_vende_pp' | 'con_waha_pp' | 'con_uazapi_pp' | 'ins_recriadas_pp' | 'troca_proxy_pp' | 'email_pp',
    title: string,
    onUpdate: (dia: string, field: string, newData: any[]) => void,
    isToday: boolean,
    updateTrigger: number,
    colorClass?: string
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [newName, setNewName] = useState('')
    const [isAdding, setIsAdding] = useState(false)

    const items = metrica[field] || []

    const getItemName = (item: any) => {
        if (typeof item === 'object' && item !== null) {
            return Object.keys(item)[0] || 'Sem nome'
        }
        return String(item)
    }

    // Get the count for an item - use saved value from database
    const getItemCount = (item: any) => {
        if (typeof item === 'object' && item !== null) {
            const value = Object.values(item)[0]
            return typeof value === 'number' ? value : 0
        }
        return 0
    }

    // Calculate total count from saved values
    const totalCount = items.reduce((sum: number, item: any) => {
        return sum + getItemCount(item)
    }, 0)

    const handleAddItem = async () => {
        if (!newName.trim()) return

        // ONLY allow updates for today's row
        if (!isToday) {
            alert('Só é possível editar a linha do dia de hoje.')
            return
        }

        setIsAdding(true)
        try {
            // Create new item object with name as key and 0 as value
            const newItem = { [newName.trim()]: 0 }
            const updatedItems = [...items, newItem]

            const { error } = await supabase
                .from('metricas')
                .update({ [field]: updatedItems })
                .eq('dia', metrica.dia)

            if (error) {
                console.error(`Error adding item to ${field}:`, error)
                alert('Erro ao adicionar item: ' + error.message)
            } else {
                onUpdate(metrica.dia, field, updatedItems)
                setNewName('')
            }
        } finally {
            setIsAdding(false)
        }
    }

    const handleRemoveItem = async (index: number) => {
        // ONLY allow updates for today's row
        if (!isToday) {
            alert('Só é possível editar a linha do dia de hoje.')
            return
        }

        const updatedItems = items.filter((_: any, i: number) => i !== index)

        const { error } = await supabase
            .from('metricas')
            .update({ [field]: updatedItems })
            .eq('dia', metrica.dia)

        if (error) {
            console.error(`Error removing item from ${field}:`, error)
            alert('Erro ao remover item: ' + error.message)
        } else {
            onUpdate(metrica.dia, field, updatedItems)
        }
    }

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <div className="flex items-center gap-1 cursor-pointer hover:bg-gray-700/50 rounded px-2 py-1 justify-center transition-colors">
                    <Users className={`h-3 w-3 ${items.length === 0 ? 'text-gray-600' : colorClass.replace('text-', 'text-opacity-70 text-')}`} />
                    <span className={`font-bold ${totalCount === 0 ? 'text-gray-600' : colorClass}`}>{totalCount}</span>
                    <span className="text-gray-600 text-[10px]">({items.length})</span>
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-3 bg-gray-900 border-gray-700" align="start">
                <div className="space-y-3">
                    <div className="text-sm font-medium text-white">
                        {title} - {formatDateUTC(metrica.dia)}
                    </div>

                    {/* List of existing items with counts */}
                    {items.length > 0 && (
                        <div className="space-y-1 max-h-[200px] overflow-y-auto">
                            {items.map((item: any, index: number) => {
                                const name = getItemName(item)
                                const count = getItemCount(item)
                                return (
                                    <div
                                        key={index}
                                        className="flex items-center justify-between bg-gray-700/50 rounded px-2 py-1.5 text-sm"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-300">{name}</span>
                                            <span className={`font-bold bg-gray-800 px-1.5 rounded ${count === 0 ? 'text-gray-500' : colorClass}`}>
                                                {count}
                                            </span>
                                        </div>
                                        {isToday && (
                                            <button
                                                onClick={() => handleRemoveItem(index)}
                                                className="text-red-400 hover:text-red-300 p-1"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {items.length === 0 && (
                        <div className="text-gray-500 text-sm text-center py-2">
                            Nenhum registro encontrado
                        </div>
                    )}

                    {/* Add new item - only for today */}
                    {isToday && (
                        <div className="flex gap-2">
                            <Input
                                placeholder="Nome"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
                                className="bg-gray-700 border-gray-600 text-white text-sm h-8"
                            />
                            <Button
                                size="sm"
                                onClick={handleAddItem}
                                disabled={isAdding || !newName.trim()}
                                className="h-8 px-2 bg-green-600 hover:bg-green-500"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
})


export default function DashboardPage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [metricas, setMetricas] = useState<Metricas[]>([])

    const [wExistenteByDay, setWExistenteByDay] = useState<Record<string, number>>({})
    const [vendorRegistros, setVendorRegistros] = useState<{ obs: string }[]>([])
    const [updateTrigger, setUpdateTrigger] = useState(0) // Trigger to force VendedoresCell re-render

    // State for date range filter
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: subDays(new Date(), 6), // Last 7 days including today (6 days ago + today)
        to: new Date(),
    })

    useEffect(() => {
        const checkAuthAndFetch = async () => {
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                router.push('/login')
                return
            }

            // Fetch metricas
            const { data, error } = await supabase
                .from('metricas')
                .select('*')
                .order('dia', { ascending: true }) // Ascending: Oldest -> Newest (Newest on Right)

            if (error) {
                console.error('Error fetching metrics:', error)
            } else {
                setMetricas(data || [])
            }

            // Fetch registros for w_existente calculation
            // We need to count registros with tipo_chip = 'Whats Existente' per day (based on 'data' field)
            const { data: registros, error: registrosError } = await supabase
                .from('registros')
                .select('data')
                .eq('tipo_chip', 'Whats Existente')

            if (registrosError) {
                console.error('Error fetching registros for w_existente:', registrosError)
            } else if (registros) {
                // Count registros per day
                const countsByDay: Record<string, number> = {}
                registros.forEach((registro) => {
                    if (registro.data) {
                        // Extract just the date part (YYYY-MM-DD)
                        const dateKey = registro.data.split('T')[0]
                        countsByDay[dateKey] = (countsByDay[dateKey] || 0) + 1
                    }
                })
                setWExistenteByDay(countsByDay)
            }

            // Fetch ALL registros where status contains 'Vendedor' for seller counting
            // Count is cumulative across all registros, but we only UPDATE today's metrica
            const { data: vendorRegs, error: vendorError } = await supabase
                .from('registros')
                .select('obs')
                .ilike('status', '%Vendedor%')

            if (vendorError) {
                console.error('Error fetching vendor registros:', vendorError)
            } else if (vendorRegs) {
                setVendorRegistros(vendorRegs)
            }

            setLoading(false)

            // Trigger metric update to ensure today's row is populated correctly (backfill from history if needed)
            updateSellerMetrics()
        }

        checkAuthAndFetch()
    }, [router])

    // Real-time subscription for metricas table
    useEffect(() => {
        console.log('[Metrics] Setting up realtime subscription...')

        const subscription = supabase
            .channel('metricas-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'metricas' }, (payload) => {
                if (payload.eventType === 'UPDATE' && payload.new) {
                    const updatedMetrica = payload.new as Metricas
                    setMetricas(prev => prev.map(m => m.dia === updatedMetrica.dia ? updatedMetrica : m))

                    const today = getLocalToday()
                    const updatedDay = updatedMetrica.dia.split('T')[0]
                    if (updatedDay === today) {
                        setUpdateTrigger(prev => prev + 1)
                    }
                } else if (payload.eventType === 'INSERT' && payload.new) {
                    const newMetrica = payload.new as Metricas
                    setMetricas(prev => [newMetrica, ...prev].sort((a, b) => new Date(a.dia).getTime() - new Date(b.dia).getTime()))
                } else if (payload.eventType === 'DELETE' && payload.old) {
                    const deletedMetrica = payload.old as Metricas
                    setMetricas(prev => prev.filter(m => m.dia !== deletedMetrica.dia))
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(subscription)
        }
    }, [])

    // Real-time subscription for REGISTROS table
    useEffect(() => {
        const channels = ['registros', 'troca_numeros', 'conexao_vendedores', 'conexao_wahapi', 'proxy', 'criacao_email']
        const subscriptions = channels.map(table =>
            supabase.channel(`${table}-changes-metrics`)
                .on('postgres_changes', { event: '*', schema: 'public', table }, async () => {
                    await updateSellerMetrics()
                })
                .subscribe()
        )

        return () => {
            subscriptions.forEach(sub => supabase.removeChannel(sub))
        }
    }, [])

    // Function to count how many registros contain the seller name in obs (counts ALL registros)
    const getSellerCount = useCallback((sellerName: string): number => {
        return vendorRegistros.filter((r: { obs: string }) =>
            r.obs && r.obs.toLowerCase().includes(sellerName.toLowerCase())
        ).length
    }, [vendorRegistros])

    // Function to handle updates for any column
    const handleMetricUpdate = useCallback((dia: string, field: string, newData: any[]) => {
        setMetricas(prev => prev.map(m =>
            m.dia === dia ? { ...m, [field]: newData } : m
        ))
    }, [])

    const localToday = getLocalToday()

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        )
    }

    // Filter metrics based on selected date range
    const visibleMetricas = metricas.filter((metrica) => {
        if (!dateRange || !dateRange.from) return true
        const metricaDateStr = metrica.dia.split('T')[0]
        const fromDateStr = format(dateRange.from, 'yyyy-MM-dd')
        const toDateStr = dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : fromDateStr
        return metricaDateStr >= fromDateStr && metricaDateStr <= toDateStr
    })

    // Helper to render complex MetricNameCell
    const renderComplexCell = (metrica: Metricas, field: any, title: string, isToday: boolean, colorClass: string) => (
        <MetricNameCell
            key={`${field}-${metrica.dia}`}
            metrica={metrica}
            field={field}
            title={title}
            onUpdate={handleMetricUpdate}
            isToday={isToday}
            updateTrigger={isToday ? updateTrigger : 0}
            colorClass={colorClass}
        />
    )

    // Configuration for complex fields
    const complexFields = [
        { key: 'criados_pp', label: 'Criados por Pessoa', color: 'text-cyan-400', childColor: 'text-cyan-200/60' },
        { key: 'email_pp', label: 'Email', color: 'text-indigo-400', childColor: 'text-indigo-200/60' },
        { key: 'troca_proxy_pp', label: 'Troca Proxy', color: 'text-fuchsia-400', childColor: 'text-fuchsia-200/60' },
        { key: 'ins_recriadas_pp', label: 'Instâncias Recriadas', color: 'text-rose-400', childColor: 'text-rose-200/60' },
        { key: 'con_vende_nova_pp', label: 'Conexão Vendedores', color: 'text-orange-400', childColor: 'text-orange-200/60' },
        { key: 'recon_vende_pp', label: 'Reconexão Vendedores', color: 'text-amber-400', childColor: 'text-amber-200/60' },
        { key: 'con_waha_pp', label: 'Conexão Waha', color: 'text-lime-400', childColor: 'text-lime-200/60' },
        { key: 'con_uazapi_pp', label: 'Conexão Uazapi', color: 'text-teal-400', childColor: 'text-teal-200/60' },
        { key: 'troca_num_pp', label: 'Troca de Números', color: 'text-sky-400', childColor: 'text-sky-200/60' },
        { key: 'whats_vendedores', label: 'Whats Vendedores', color: 'text-violet-400', childColor: 'text-violet-200/60' },
        { key: 'whats_call', label: 'Whats Call', color: 'text-pink-400', childColor: 'text-pink-200/60' },
    ] as const

    const getUniqueKeys = (field: string) => {
        const keys = new Set<string>()
        visibleMetricas.forEach(m => {
            const items = (m[field as keyof Metricas] as any[]) || []
            items.forEach(item => {
                const key = Object.keys(item)[0]
                if (key) keys.add(key)
            })
        })
        return Array.from(keys).sort()
    }

    const rows: { label: React.ReactNode; render: (m: Metricas, isToday: boolean) => React.ReactNode; isChild?: boolean }[] = [
        {
            label: <span className="text-green-400">Whats Ativos</span>,
            render: (m: Metricas) => <span className={`font-bold ${m.w_ativos === 0 ? 'text-gray-600' : 'text-green-400'}`}>{m.w_ativos}</span>
        },
        {
            label: <span className="text-white">Criados Hoje</span>,
            render: (m: Metricas) => {
                const total = (m.chip?.físico_novo || 0) + (m.chip?.físico_recuperado || 0) + (m.chip?.virtual || 0)
                return <span className="font-bold text-white">{total}</span>
            }
        },
        {
            label: <span className="text-blue-400">Chip Físico Novo</span>,
            render: (m: Metricas) => <span className="text-blue-400">{m.chip?.físico_novo || 0}</span>
        },
        {
            label: <span className="text-yellow-400">Chip Físico Recuperado</span>,
            render: (m: Metricas) => <span className="text-yellow-400">{m.chip?.físico_recuperado || 0}</span>
        },
        {
            label: <span className="text-purple-400">Chip Virtual</span>,
            render: (m: Metricas) => <span className="text-purple-400">{m.chip?.virtual || 0}</span>
        },
        {
            label: <span className="text-emerald-400">Valor</span>,
            render: (m: Metricas) => (
                <span className="text-emerald-400">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.valor || 0)}
                </span>
            )
        },
        {
            label: <span className="text-gray-300">Whats Existente</span>,
            render: (m: Metricas) => {
                const val = wExistenteByDay[m.dia.split('T')[0]] || 0
                return <span className={val === 0 ? 'text-gray-600' : 'text-gray-300'}>{val}</span>
            }
        },
        {
            label: <span className="text-yellow-500">Verificar</span>,
            render: (m: Metricas) => <span className={`font-bold ${m.verificar === 0 ? 'text-gray-600' : 'text-yellow-500'}`}>{m.verificar}</span>
        },
        {
            label: <span className="text-red-500">Caíram</span>,
            render: (m: Metricas) => <span className={`font-bold ${m.cairam === 0 ? 'text-gray-600' : 'text-red-500'}`}>{m.cairam}</span>
        },
    ]

    complexFields.forEach(fieldConfig => {
        rows.push({
            label: <span className={fieldConfig.color}>{fieldConfig.label}</span>,
            render: (m, isToday) => renderComplexCell(m, fieldConfig.key, fieldConfig.label, isToday, fieldConfig.color)
        })

        const uniqueKeys = getUniqueKeys(fieldConfig.key)
        uniqueKeys.forEach(key => {
            rows.push({
                label: <span className={`pl-4 text-xs flex items-center gap-1 ${fieldConfig.childColor}`}>↳ {key}</span>,
                isChild: true,
                render: (m) => {
                    const items = (m[fieldConfig.key as keyof Metricas] as any[]) || []
                    const item = items.find(i => Object.keys(i)[0] === key)
                    const value = item ? Object.values(item)[0] as number : 0
                    return <span className={`text-xs ${value === 0 ? 'text-gray-700' : fieldConfig.color}`}>{value}</span>
                }
            })
        })
    })

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
            <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        onClick={() => router.push('/')}
                        variant="ghost"
                        className="text-gray-400 hover:text-white hover:bg-white/10"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar
                    </Button>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        Métricas Operacionais
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    <DateRangePicker
                        date={dateRange}
                        setDate={setDateRange}
                    />
                </div>
            </div>

            <Card className="bg-gray-800 border-gray-700 overflow-hidden">
                <CardHeader>
                    <CardTitle className="text-white">Registros Diários</CardTitle>
                    <CardDescription className="text-gray-400">
                        Visão transposta: Métricas nas linhas, Dias nas colunas.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="border-gray-700 hover:bg-gray-700/50">
                                <TableHead className="text-gray-300 min-w-[150px] font-bold bg-gray-900 sticky left-0 z-20 border-r border-gray-700">Métricas</TableHead>
                                {visibleMetricas.map((metrica) => {
                                    const isToday = metrica.dia.startsWith(localToday)
                                    return (
                                        <TableHead
                                            key={metrica.dia}
                                            className={`text-center min-w-[120px] border-r border-gray-700/50 ${isToday ? 'bg-green-500 text-black hover:bg-green-400' : 'text-gray-300'
                                                }`}
                                        >
                                            <div className="flex flex-col items-center justify-center py-1">
                                                <span className={`${isToday ? 'font-extrabold text-base' : 'font-medium'}`}>
                                                    {formatDateUTC(metrica.dia)}
                                                </span>
                                                <span className={`text-xs uppercase mt-0.5 ${isToday ? 'text-black font-semibold opacity-80' : 'text-orange-400 font-medium'
                                                    }`}>
                                                    {getWeekDayUTC(metrica.dia)}
                                                </span>
                                            </div>
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visibleMetricas.length === 0 ? (
                                <TableRow className="border-gray-700">
                                    <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                                        Nenhum registro de métricas encontrado para o período.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rows.map((row, index) => (
                                    <TableRow key={index} className="border-gray-700 hover:bg-gray-700/30">
                                        <TableCell className="font-medium text-gray-400 bg-gray-900 sticky left-0 z-10 border-r border-gray-700">
                                            {row.label}
                                        </TableCell>
                                        {visibleMetricas.map((metrica) => {
                                            const isToday = metrica.dia.startsWith(localToday)
                                            return (
                                                <TableCell key={`${row.label}-${metrica.dia}`} className="text-center">
                                                    {row.render(metrica, isToday)}
                                                </TableCell>
                                            )
                                        })}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
