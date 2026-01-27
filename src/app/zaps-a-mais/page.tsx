"use client"

import { useEffect, useState, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import { DataTable } from "@/components/data-table"
import { DataTableColumnHeader } from "@/components/columns"
import { Registro, ZapsSobrando } from "@/types/schema"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, RefreshCw } from "lucide-react"
import Link from "next/link"
import { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"

const TIPO_CONTA_MAP: Record<keyof ZapsSobrando, string[]> = {
    "Whats": ["Whats 1", "Whats 2"],
    "Whats Business": ["Whats Business"],
    "Clone Whats": ["Clone Whats 1", "Clone Whats 2"],
    "Clone Business": ["Clone Business 1", "Clone Business 2", "Clone Business 3"],
    "Whats GB": ["Whats GB"]
}

const readOnlyColumns: ColumnDef<Registro>[] = [
    {
        accessorKey: 'data',
        header: ({ column, table }) => <DataTableColumnHeader column={column} title="DATA" table={table} />,
        cell: ({ row }) => {
            const val = row.getValue('data')
            if (!val) return <div className="w-[150px] text-muted-foreground">-</div>
            const date = new Date(val as string)
            return <div className="w-[150px]">{format(date, 'dd/MM/yyyy HH:mm:ss')}</div>
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'operador',
        header: ({ column, table }) => <DataTableColumnHeader column={column} title="OPERADOR" table={table} />,
        cell: ({ row }) => <div>{row.getValue('operador')}</div>,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'dispositivo',
        header: ({ column, table }) => <DataTableColumnHeader column={column} title="DISP" table={table} />,
        cell: ({ row }) => <div>{row.getValue('dispositivo')}</div>,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'instancia',
        header: ({ column, table }) => <DataTableColumnHeader column={column} title="INST" table={table} />,
        cell: ({ row }) => <div>{row.getValue('instancia')}</div>,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'tipo_de_conta',
        header: ({ column, table }) => <DataTableColumnHeader column={column} title="CONTA" table={table} />,
        cell: ({ row }) => <div>{row.getValue('tipo_de_conta')}</div>,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'numero',
        header: ({ column, table }) => <DataTableColumnHeader column={column} title="NÚMERO" table={table} />,
        cell: ({ row }) => <div>{row.getValue('numero')}</div>,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'status',
        header: ({ column, table }) => <DataTableColumnHeader column={column} title="STATUS" table={table} />,
        cell: ({ row }) => <div>{row.getValue('status')}</div>,
        filterFn: (row, id, filterValue) => {
            const cellValue = row.getValue(id) as string
            if (!cellValue) return filterValue.includes('')
            return filterValue.includes(cellValue)
        },
    },
    {
        accessorKey: 'codigo',
        header: ({ column, table }) => <DataTableColumnHeader column={column} title="CÓDIGO" table={table} />,
        cell: ({ row }) => <div>{row.getValue('codigo')}</div>,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'tipo_chip',
        header: ({ column, table }) => <DataTableColumnHeader column={column} title="TIPO CHIP" table={table} />,
        cell: ({ row }) => <div>{row.getValue('tipo_chip')}</div>,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
]

export default function ZapsAMaisPage() {
    const [registros, setRegistros] = useState<Registro[]>([])
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

    const fetchData = async () => {
        setLoading(true)
        try {
            // 1. Fetch dispositivos with excesses
            const { data: dispositivos, error: dispError } = await supabase
                .from('dispositivos')
                .select('dispositivo, ideal_0')

            if (dispError) throw dispError

            if (!dispositivos) {
                setRegistros([])
                return
            }

            // Filter locally to ensure valid objects
            const validDispositivos = dispositivos.filter((d: any) =>
                d.ideal_0 &&
                Object.keys(d.ideal_0).length > 0 &&
                JSON.stringify(d.ideal_0) !== '{}'
            )

            if (validDispositivos.length === 0) {
                setRegistros([])
                return
            }

            // 2. Build Query
            const orConditions: string[] = []

            const IDEAL_TO_DISPLAY_MAP: Record<string, keyof ZapsSobrando> = {
                num_normal: 'Whats',
                num_business: 'Whats Business',
                clone_normal: 'Clone Whats',
                clone_business: 'Clone Business',
                num_gb: 'Whats GB'
            }

            validDispositivos.forEach((d: any) => {
                const deviceName = d.dispositivo
                const ideal0 = d.ideal_0 || {}

                Object.keys(ideal0).forEach(instanciaKey => {
                    const values = ideal0[instanciaKey]

                    // Normalize Instance Name: Remove "INS" prefix if present
                    const cleanInstancia = instanciaKey.replace(/^INS/, '')

                    Object.entries(values).forEach(([key, value]) => {
                        // Only consider positive values (excess)
                        if (typeof value === 'number' && value > 0) {
                            const uiKey = IDEAL_TO_DISPLAY_MAP[key]
                            if (uiKey) {
                                const targetTypes = TIPO_CONTA_MAP[uiKey]
                                if (targetTypes) {
                                    const typesString = `(${targetTypes.map(t => `"${t}"`).join(',')})` // formatting for .in()
                                    const condition = `and(dispositivo.eq."${deviceName}",instancia.eq."${cleanInstancia}",tipo_de_conta.in.${typesString})`
                                    orConditions.push(condition)
                                }
                            }
                        }
                    })
                })
            })

            if (orConditions.length === 0) {
                setRegistros([])
                return
            }

            // Helper to chunk array
            const chunkArray = (array: string[], size: number) => {
                const result = []
                for (let i = 0; i < array.length; i += size) {
                    result.push(array.slice(i, i + size))
                }
                return result
            }

            // Split conditions into chunks of 15 to avoid URL length limits
            const chunks = chunkArray(orConditions, 15)

            // Fetch all chunks in parallel
            const results = await Promise.all(chunks.map(async (chunk) => {
                const orFilter = chunk.join(',')
                const { data, error } = await supabase
                    .from('registros')
                    .select('*')
                    .or(orFilter)

                if (error) throw error
                return data || []
            }))

            // Combine and deduplicate records (though duplicates shouldn't theoretically happen with this logic)
            const allRecordsMap = new Map<number, Registro>()
            results.flat().forEach(record => {
                if (record && record.id) {
                    allRecordsMap.set(record.id, record)
                }
            })

            const records = Array.from(allRecordsMap.values())

            // Helper to get normalized type for sorting
            const getNormalizedTipo = (t: string) => {
                for (const [key, values] of Object.entries(TIPO_CONTA_MAP)) {
                    if (values.includes(t)) return key
                }
                return t
            }

            // Sort Client-side: Dispositivo DESC, Instancia DESC, Tipo de Conta (Normalized) DESC
            const sortedRecords = records.sort((a, b) => {
                // 1. Dispositivo
                const dispA = a.dispositivo || ''
                const dispB = b.dispositivo || ''
                const resDisp = dispA.localeCompare(dispB, undefined, { numeric: true, sensitivity: 'base' })
                if (resDisp !== 0) return resDisp

                // 2. Instancia
                const instA = a.instancia || ''
                const instB = b.instancia || ''
                const resInst = instA.localeCompare(instB, undefined, { numeric: true, sensitivity: 'base' })
                if (resInst !== 0) return resInst

                // 3. Tipo de Conta (Normalized)
                const normA = getNormalizedTipo(a.tipo_de_conta || '')
                const normB = getNormalizedTipo(b.tipo_de_conta || '')
                const resNorm = normA.localeCompare(normB, undefined, { numeric: true, sensitivity: 'base' })
                if (resNorm !== 0) return resNorm

                // 4. Tipo de Conta (Actual - strictly for consistent ordering within group)
                return (a.tipo_de_conta || '').localeCompare(b.tipo_de_conta || '')
            })

            setRegistros(sortedRecords)
            setLastUpdated(new Date())

        } catch (error) {
            console.error("Error fetching Zaps a Mais:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const rowColorMap = useMemo(() => {
        const map = new Map<string, string>()
        let isEven = false
        let lastKey = ''

        // Same helper here for usage in map grouping
        const getNormalizedTipo = (t: string) => {
            for (const [key, values] of Object.entries(TIPO_CONTA_MAP)) {
                if (values.includes(t)) return key
            }
            return t
        }

        registros.forEach(row => {
            // Group Key now uses NORMALIZED type
            const normType = getNormalizedTipo(row.tipo_de_conta || '')
            const key = `${row.dispositivo || ''}-${row.instancia || ''}-${normType}`

            if (key !== lastKey) {
                isEven = !isEven
                lastKey = key
            }

            // Use distinct styles for visual grouping
            if (isEven) {
                // Group A: Darker background + Blue Left Border
                map.set(String(row.id), 'bg-blue-900/20 border-l-4 border-l-blue-500 hover:bg-blue-900/30')
            } else {
                // Group B: Transparent (Default) + Transparent Left Border (to align text)
                map.set(String(row.id), 'bg-transparent border-l-4 border-l-transparent hover:bg-gray-800/30')
            }
        })
        return map
    }, [registros])

    return (
        <div className="container mx-auto py-10 space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Zaps a Mais</h1>
                        <p className="text-muted-foreground">
                            Registros identificados como excedentes baseados nas regras de negócio.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                        {lastUpdated ? `Atualizado às ${lastUpdated.toLocaleTimeString()}` : 'Carregando...'}
                    </span>
                    <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                    <CardTitle className="text-xl text-blue-400">Registros Encontrados: {registros.length}</CardTitle>
                </CardHeader>
                <CardContent>
                    <DataTable
                        columns={readOnlyColumns}
                        data={registros}
                        disableStickyHeader={true}
                        meta={{
                            userRole: 'admin',
                            getRowClassName: (row: any) => rowColorMap.get(String(row.original.id)) || ''
                        } as any}
                        pageSize={500}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
