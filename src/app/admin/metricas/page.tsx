'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ArrowLeft, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function MetricasPage() {
    const [loading, setLoading] = useState(true)
    const [rules, setRules] = useState<any[]>([])
    const [metricsData, setMetricsData] = useState<any[]>([])
    const [dates, setDates] = useState<string[]>([])

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            setLoading(true)

            // Fetch rules
            const { data: rulesData, error: rulesError } = await supabase
                .from('regras_das_metricas')
                .select('regras_da_coluna')
                .eq('id', 1)
                .single()

            if (rulesError) throw rulesError

            // Fetch metrics data
            const { data: metrics, error: metricsError } = await supabase
                .from('metricas_dinamicas')
                .select('*')
                .order('created_at', { ascending: true })

            if (metricsError) throw metricsError

            // Process rules - including 'grupo', 'soma', 'linha'
            const activeRules = (rulesData.regras_da_coluna || []).filter(
                (rule: any) => ['individual', 'grupo', 'soma', 'linha'].includes(rule.tipo_item)
            )
            setRules(activeRules)

            // Process metrics and dates
            setMetricsData(metrics || [])

            const uniqueDates = Array.from(new Set(
                (metrics || []).map((m: any) =>
                    format(new Date(m.created_at), 'dd/MM/yyyy')
                )
            ))
            setDates(uniqueDates)

        } catch (error) {
            console.error('Error fetching metrics:', error)
        } finally {
            setLoading(false)
        }
    }

    const getMetricRecord = (dateStr: string) => {
        return metricsData.find(m =>
            format(new Date(m.created_at), 'dd/MM/yyyy') === dateStr
        )
    }

    const getIndividualValue = (dateStr: string, column: string) => {
        const record = getMetricRecord(dateStr)
        return record ? record[column] : '-'
    }

    const getGroupTotal = (dateStr: string, column: string) => {
        const record = getMetricRecord(dateStr)
        if (!record || !record[column] || !Array.isArray(record[column])) return 0

        return record[column].reduce((total: number, item: any) => {
            // Each item is like { "Key": Value }
            const value = Object.values(item)[0] as number
            return total + (Number(value) || 0)
        }, 0)
    }

    const getSubitemValue = (dateStr: string, column: string, itemRelacionado: string) => {
        const record = getMetricRecord(dateStr)
        if (!record || !record[column] || !Array.isArray(record[column])) return 0

        const item = record[column].find((obj: any) => Object.keys(obj)[0] === itemRelacionado)
        if (!item) return 0

        return Object.values(item)[0]
    }

    const getSumTotal = (dateStr: string, columns: string[] = []) => {
        const record = getMetricRecord(dateStr)
        if (!record) return 0

        return columns.reduce((total: number, col: string) => {
            const value = record[col]

            if (Array.isArray(value)) {
                // Sum all values in array objects
                const arraySum = value.reduce((arrTotal: number, item: any) => {
                    const val = Object.values(item)[0] as number
                    return arrTotal + (Number(val) || 0)
                }, 0)
                return total + arraySum
            } else {
                // Simple numeric value
                return total + (Number(value) || 0)
            }
        }, 0)
    }

    const router = useRouter()
    const [updating, setUpdating] = useState(false)

    // ... existing fetchData ... (fetching logic remains the same, just referenced)

    // Re-use fetchData but ensure it's available in scope or moved up if needed.
    // Ideally fetchData should be defined before this or inside component body which it is.

    const handleUpdateMetrics = async () => {
        try {
            setUpdating(true)
            const response = await fetch('/api/admin/update-metrics', {
                method: 'POST'
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Erro ao atualizar métricas')
            }

            alert('Métricas atualizadas com sucesso!')
            fetchData() // Refresh data
        } catch (error: any) {
            console.error('Error updating:', error)
            alert('Erro: ' + error.message)
        } finally {
            setUpdating(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        )
    }

    // Added font-bold to the root div to help cascade, and explicitly to table cells
    return (
        <div className="min-h-screen bg-gray-950 p-8 text-gray-100 font-bold">
            <div className="mb-6 flex justify-between items-center">
                <Button
                    variant="outline"
                    onClick={() => router.push('/')}
                    className="bg-gray-900 border-gray-800 text-gray-300 hover:bg-gray-800 hover:text-white"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar ao Dashboard
                </Button>

                <Button
                    onClick={handleUpdateMetrics}
                    disabled={updating}
                    className="bg-blue-600 hover:bg-blue-700 text-white border-0"
                >
                    {updating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCcw className="mr-2 h-4 w-4" />
                    )}
                    {updating ? 'Atualizando...' : 'Atualizar Métricas'}
                </Button>
            </div>

            <Card className="bg-gray-900 border-gray-800">
                <CardContent>
                    <div className="rounded-md border border-gray-800 overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-gray-900">
                                <TableRow className="border-gray-800 hover:bg-gray-900">
                                    <TableHead className="w-[300px] text-gray-400 font-bold border-r border-gray-800 text-center">
                                        Métrica
                                    </TableHead>
                                    {dates.map((date) => {
                                        const isToday = date === format(new Date(), 'dd/MM/yyyy')
                                        return (
                                            <TableHead
                                                key={date}
                                                className={`text-center min-w-[120px] font-bold ${isToday ? 'bg-[#00FF00] text-black' : 'text-gray-400'
                                                    }`}
                                            >
                                                {date.slice(0, 5)}
                                            </TableHead>
                                        )
                                    })}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {rules.map((rule, index) => {
                                    if (rule.tipo_item === 'individual') {
                                        return (
                                            <TableRow
                                                key={index}
                                                className="border-gray-800"
                                                style={{
                                                    backgroundColor: rule.cor_de_fundo || undefined,
                                                    color: rule.cor_do_texto || undefined
                                                }}
                                            >
                                                <TableCell className="font-bold border-r border-gray-800 text-center" style={{ color: 'inherit' }}>
                                                    {rule.nome_visualizacao}
                                                </TableCell>
                                                {dates.map((date) => (
                                                    <TableCell key={date} className="text-center font-bold" style={{ color: 'inherit' }}>
                                                        {getIndividualValue(date, rule.coluna)}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        )
                                    } else if (rule.tipo_item === 'grupo') {
                                        return (
                                            <>
                                                {/* Group Header Row */}
                                                <TableRow
                                                    key={`${index}-header`}
                                                    className="border-gray-800"
                                                    style={{
                                                        backgroundColor: rule.cor_de_fundo || undefined,
                                                        color: rule.cor_do_texto || undefined
                                                    }}
                                                >
                                                    <TableCell className="font-bold border-r border-gray-800 text-center" style={{ color: 'inherit' }}>
                                                        {rule.nome_visualizacao}
                                                    </TableCell>
                                                    {dates.map((date) => (
                                                        <TableCell key={date} className="text-center font-bold" style={{ color: 'inherit' }}>
                                                            {getGroupTotal(date, rule.coluna)}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                                {/* Subitems Rows */}
                                                {rule.subitens?.map((subitem: any, subIndex: number) => (
                                                    <TableRow
                                                        key={`${index}-sub-${subIndex}`}
                                                        className="border-gray-800"
                                                        style={{
                                                            backgroundColor: rule.cor_de_fundo_subitem || undefined,
                                                            color: rule.cor_do_texto_subitem || undefined
                                                        }}
                                                    >
                                                        <TableCell className="font-bold border-r border-gray-800 text-center" style={{ color: 'inherit' }}>
                                                            {subitem.nome_visualizacao}
                                                        </TableCell>
                                                        {dates.map((date) => (
                                                            <TableCell key={date} className="text-center font-bold" style={{ color: 'inherit' }}>
                                                                {getSubitemValue(date, rule.coluna, subitem.item_relacionado) as any}
                                                            </TableCell>
                                                        ))}
                                                    </TableRow>
                                                ))}
                                            </>
                                        )
                                    } else if (rule.tipo_item === 'soma') {
                                        return (
                                            <TableRow
                                                key={index}
                                                className="border-gray-800"
                                                style={{
                                                    backgroundColor: rule.cor_de_fundo || undefined,
                                                    color: rule.cor_do_texto || undefined
                                                }}
                                            >
                                                <TableCell className="font-bold border-r border-gray-800 text-center" style={{ color: 'inherit' }}>
                                                    {rule.nome_visualizacao}
                                                </TableCell>
                                                {dates.map((date) => (
                                                    <TableCell key={date} className="text-center font-bold" style={{ color: 'inherit' }}>
                                                        {getSumTotal(date, rule.colunas_soma)}
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        )
                                    } else if (rule.tipo_item === 'linha') {
                                        return (
                                            <TableRow key={index} className="hover:bg-transparent border-none">
                                                <TableCell
                                                    colSpan={dates.length + 1}
                                                    className="p-0 bg-black h-2"
                                                />
                                            </TableRow>
                                        )
                                    }
                                    return null
                                })}
                                {rules.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={dates.length + 1} className="h-24 text-center text-gray-500 font-bold">
                                            Nenhuma regra configurada.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
