'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface RecondicionarItem {
    dispositivo: string
    instancia: string
}

interface Registro {
    id: number
    data: string
    operador: string
    tipo_de_conta: string
    status: string
    numero: string
    codigo: string
    dispositivo: string
    instancia: string
}

type GroupedRegistros = {
    [dispositivo: string]: {
        [instancia: string]: Registro[]
    }
}

export default function RecondicionarPage() {
    const [data, setData] = useState<GroupedRegistros>({})
    const [loading, setLoading] = useState(true)
    const [expandedInstances, setExpandedInstances] = useState<{ [key: string]: boolean }>({})

    const [expandedDevices, setExpandedDevices] = useState<{ [key: string]: boolean }>({})

    const [deviceLimits, setDeviceLimits] = useState<{ [key: string]: number }>({})
    const [isSummaryVisible, setIsSummaryVisible] = useState(true)

    // Helper to toggle expand state for a specific device-instance key
    const toggleInstanceExpand = (key: string) => {
        setExpandedInstances(prev => ({ ...prev, [key]: !prev[key] }))
    }

    // Helper to toggle expand state for a specific device
    const toggleDeviceExpand = (device: string) => {
        setExpandedDevices(prev => ({ ...prev, [device]: !prev[device] }))
    }

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true)

                // 1. Fetch dispositivos with non-empty recondicionar array AND limit columns
                const { data: dispositivos, error: dispError } = await supabase
                    .from('dispositivos')
                    .select('dispositivo, recondicionar, num_normal, num_business, clone_normal, clone_business, num_gb')
                    .not('recondicionar', 'is', null)

                if (dispError) throw dispError

                // Filter and collect target items
                const targetItems: RecondicionarItem[] = []
                const deviceList: string[] = []
                const limitsMap: { [key: string]: number } = {}

                dispositivos?.forEach((row: any) => {
                    if (Array.isArray(row.recondicionar) && row.recondicionar.length > 0) {
                        deviceList.push(row.dispositivo)

                        // Calculate limit for this device
                        const limit = (row.num_normal || 0) +
                            (row.num_business || 0) +
                            (row.clone_normal || 0) +
                            (row.clone_business || 0) +
                            (row.num_gb || 0)
                        limitsMap[row.dispositivo] = limit

                        row.recondicionar.forEach((inst: string) => {
                            targetItems.push({ dispositivo: row.dispositivo, instancia: inst })
                        })
                    }
                })

                setDeviceLimits(limitsMap)

                if (targetItems.length === 0) {
                    setData({})
                    setLoading(false)
                    return
                }

                // 2. Fetch all matches from 'registros'
                // Strategy: Fetch all records for the involved devices using pagination
                const batchSize = 1000
                let allRegistros: Registro[] = []
                let from = 0
                let hasMore = true

                while (hasMore) {
                    const { data: batch, error: regError } = await supabase
                        .from('registros')
                        .select('id, data, operador, tipo_de_conta, status, numero, codigo, dispositivo, instancia')
                        .in('dispositivo', deviceList)
                        .order('data', { ascending: false })
                        .range(from, from + batchSize - 1)

                    if (regError) throw regError

                    if (batch && batch.length > 0) {
                        allRegistros = [...allRegistros, ...batch]
                        from += batchSize

                        // If we received fewer records than batchSize, we've reached the end
                        if (batch.length < batchSize) {
                            hasMore = false
                        }
                    } else {
                        hasMore = false
                    }
                }

                const registros = allRegistros


                // 3. Group and Filter
                const grouped: GroupedRegistros = {}

                // Initialize structure for all expected items to ensure they show up even if empty
                targetItems.forEach(item => {
                    if (!grouped[item.dispositivo]) {
                        grouped[item.dispositivo] = {}
                    }
                    if (!grouped[item.dispositivo][item.instancia]) {
                        grouped[item.dispositivo][item.instancia] = []
                    }
                })

                registros?.forEach(reg => {
                    // Check if this registry matches one of our targets
                    const isTarget = targetItems.some(
                        t => t.dispositivo === reg.dispositivo && t.instancia === reg.instancia
                    )

                    if (isTarget) {
                        if (!grouped[reg.dispositivo]) grouped[reg.dispositivo] = {}
                        if (!grouped[reg.dispositivo][reg.instancia]) grouped[reg.dispositivo][reg.instancia] = []
                        grouped[reg.dispositivo][reg.instancia].push(reg)
                    }
                })

                setData(grouped)

            } catch (error) {
                console.error("Error fetching recondicionar data:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [])

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando dados de recondicionamento...</div>
    }

    const deviceKeys = Object.keys(data).sort()

    // Calculate summary rows
    const summaryRows: { device: string, instance: string, count: number, limit: number }[] = []

    deviceKeys.forEach(device => {
        const instances = data[device]
        Object.keys(instances).forEach(inst => {
            const records = instances[inst]
            // Condition: ALL records must be 'Recondicionar' and there must be valid records
            if (records.length > 0 && records.every(r => r.status.includes('Recondicionar'))) {
                summaryRows.push({
                    device: device,
                    instance: inst,
                    count: records.length,
                    limit: deviceLimits[device] || 0
                })
            }
        })
    })

    // Sort by (Caídos - Limite) descending, then by Caídos descending
    summaryRows.sort((a, b) => {
        const diffA = a.count - a.limit
        const diffB = b.count - b.limit
        if (diffA !== diffB) {
            return diffB - diffA
        }
        return b.count - a.count
    })

    if (deviceKeys.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="w-full max-w-4xl px-4 py-4 flex justify-start">
                    <Link href="/">
                        <Button variant="outline" className="gap-2">
                            <ArrowLeft className="h-4 w-4" />
                            Voltar para Dashboard
                        </Button>
                    </Link>
                </div>
                <h2 className="text-2xl font-bold text-muted-foreground mt-8">Nenhum dispositivo para recondicionar</h2>
                <p className="text-sm text-muted-foreground mt-2">Tudo parece estar em ordem!</p>
            </div>
        )
    }

    return (
        <div className="p-6 space-y-8 animate-in fade-in duration-500">
            {/* Header Actions */}
            <div className="flex items-center gap-4">
                <Link href="/">
                    <Button variant="outline" className="gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Voltar
                    </Button>
                </Link>
            </div>

            {/* Summary Table */}
            {summaryRows.length > 0 && (
                <Card className="border-red-500/20 bg-red-500/5 shadow-sm">
                    <CardHeader className="p-4 pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-bold text-red-500 flex items-center gap-2">
                                ⚠️ Instâncias Críticas (100% Recondicionar)
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsSummaryVisible(!isSummaryVisible)}
                                className="h-8 w-8 p-0 text-red-500 hover:bg-red-500/10 hover:text-red-600"
                            >
                                {isSummaryVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                        </div>
                    </CardHeader>
                    {isSummaryVisible && (
                        <CardContent className="p-0 animate-in slide-in-from-top-2 duration-200">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-b-red-500/20">
                                        <TableHead className="text-gray-400 font-semibold">Dispositivo</TableHead>
                                        <TableHead className="text-gray-400 font-semibold">Instância</TableHead>
                                        <TableHead className="text-center text-gray-400 font-semibold">Caídos</TableHead>
                                        <TableHead className="text-center text-gray-400 font-semibold">Limite</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {summaryRows.map((row, idx) => (
                                        <TableRow key={`${row.device}-${row.instance}`} className="hover:bg-red-500/10 border-b-red-500/10 last:border-0">
                                            <TableCell className="font-medium text-gray-300">{row.device}</TableCell>
                                            <TableCell className="text-gray-300">{row.instance}</TableCell>
                                            <TableCell className="text-center font-bold text-red-400">{row.count}</TableCell>
                                            <TableCell className="text-center font-bold text-gray-300">{row.limit}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    )}
                </Card>
            )}

            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                    Recondicionar
                </h1>
                <Badge variant="outline" className="h-8 px-4 text-sm">
                    {deviceKeys.length} Dispositivos
                </Badge>
            </div>

            <div className="grid gap-6">
                {deviceKeys.map(device => {
                    const instances = data[device]
                    const instanceKeys = Object.keys(instances).sort()
                    const isDeviceExpanded = expandedDevices[device]

                    // Check if ANY instance in this device has ALL records marked as 'Recondicionar'
                    const hasCriticalInstance = Object.values(instances).some(
                        records => records.length > 0 && records.every(r => r.status.includes('Recondicionar'))
                    )

                    return (
                        <Card key={device} className="border-l-4 border-l-primary/50 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            <CardHeader className={cn(
                                "p-4 transition-colors",
                                hasCriticalInstance ? "bg-gray-200" : "bg-muted/20"
                            )}>
                                <div className="flex items-center justify-between">
                                    <CardTitle className={cn(
                                        "text-xl flex items-center gap-2",
                                        hasCriticalInstance ? "text-gray-900 font-bold" : ""
                                    )}>
                                        <div className={cn(
                                            "h-2 w-2 rounded-full",
                                            hasCriticalInstance ? "bg-gray-900" : "bg-primary"
                                        )} />
                                        {device}
                                    </CardTitle>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleDeviceExpand(device)}
                                        className={cn(
                                            "h-8 w-8 p-0",
                                            hasCriticalInstance ? "text-gray-900 hover:bg-gray-300" : ""
                                        )}
                                    >
                                        {isDeviceExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </CardHeader>
                            {isDeviceExpanded && (
                                <CardContent className="p-0 animate-in slide-in-from-top-2 duration-200">
                                    {instanceKeys.map((instancia, index) => {
                                        const uniqueKey = `${device}-${instancia}`
                                        const isExpanded = expandedInstances[uniqueKey]
                                        const records = instances[instancia]

                                        // Check if ALL records in this instance have 'Recondicionar' in status
                                        const allRecondicionar = records.length > 0 && records.every(r => r.status.includes('Recondicionar'))

                                        return (
                                            <div key={instancia} className={cn(
                                                "border-b last:border-b-0 mb-6 last:mb-0 rounded-lg overflow-hidden",
                                                // Instance Header Background Logic
                                                allRecondicionar ? "bg-red-900/20" : (index % 2 === 0 ? "bg-card" : "bg-muted/5")
                                            )}>
                                                <div className={cn(
                                                    "flex items-center justify-between p-4 transition-colors",
                                                    // Instance Header Hover/Active Logic
                                                    allRecondicionar ? "hover:bg-red-900/30" : "hover:bg-muted/10"
                                                )}>
                                                    <div className="flex items-center gap-4">
                                                        <h3 className={cn(
                                                            "text-sm font-semibold uppercase tracking-wider",
                                                            // Instance Name Color Logic
                                                            allRecondicionar ? "text-yellow-400 font-bold" : "text-muted-foreground"
                                                        )}>
                                                            Instância {instancia}
                                                        </h3>
                                                        <Badge variant={allRecondicionar ? "destructive" : "secondary"} className="text-xs">
                                                            {records.length} registros
                                                        </Badge>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => toggleInstanceExpand(uniqueKey)}
                                                        className="h-8 w-8 p-0"
                                                    >
                                                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                    </Button>
                                                </div>

                                                {isExpanded && (
                                                    <div className="border-t animate-in slide-in-from-top-2 duration-200">
                                                        {records.length > 0 ? (
                                                            <Table>
                                                                <TableHeader>
                                                                    <TableRow className="hover:bg-transparent border-b-primary/10">
                                                                        <TableHead className="w-[180px]">Data</TableHead>
                                                                        <TableHead className="w-[150px]">Operador</TableHead>
                                                                        <TableHead className="w-[150px]">Tipo de Conta</TableHead>
                                                                        <TableHead className="w-auto min-w-[300px]">Status</TableHead>
                                                                        <TableHead className="w-[150px]">Número</TableHead>
                                                                        <TableHead className="w-[180px]">Código</TableHead>
                                                                    </TableRow>
                                                                </TableHeader>
                                                                <TableBody>
                                                                    {records.map(reg => {
                                                                        const isRecondicionar = reg.status.includes('Recondicionar')
                                                                        return (
                                                                            <TableRow
                                                                                key={reg.id}
                                                                                className={cn(
                                                                                    "hover:opacity-80 transition-opacity border-b-black/20",
                                                                                    isRecondicionar
                                                                                        ? "bg-red-500/10 hover:bg-red-500/20 text-red-100"
                                                                                        : "bg-green-500/10 hover:bg-green-500/20 text-green-100"
                                                                                )}
                                                                            >
                                                                                <TableCell className="font-mono text-xs opacity-90">
                                                                                    {new Date(reg.data).toLocaleString('pt-BR')}
                                                                                </TableCell>
                                                                                <TableCell>{reg.operador}</TableCell>
                                                                                <TableCell>{reg.tipo_de_conta}</TableCell>
                                                                                <TableCell>
                                                                                    <div className="flex items-center gap-2">
                                                                                        <span className="truncate max-w-[200px]" title={reg.status}>
                                                                                            {reg.status}
                                                                                        </span>
                                                                                    </div>
                                                                                </TableCell>
                                                                                <TableCell className="font-medium">{reg.numero}</TableCell>
                                                                                <TableCell className="font-mono text-xs">{reg.codigo}</TableCell>
                                                                            </TableRow>
                                                                        )
                                                                    })}
                                                                </TableBody>
                                                            </Table>
                                                        ) : (
                                                            <div className="p-4 text-center text-sm text-muted-foreground italic">
                                                                Nenhum registro encontrado para esta instância.
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </CardContent>
                            )}
                        </Card>
                    )
                })}
            </div>
        </div>
    )
}
