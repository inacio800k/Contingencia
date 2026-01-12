"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { DataTable } from "@/components/data-table"
import { columns } from "@/components/columns"
import { Registro, Dispositivo, ZapsSobrando } from "@/types/schema"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, RefreshCw } from "lucide-react"
import Link from "next/link"

const TIPO_CONTA_MAP: Record<keyof ZapsSobrando, string[]> = {
    "Whats": ["Whats 1", "Whats 2"],
    "Whats Business": ["Whats Business"],
    "Clone Whats": ["Clone Whats 1", "Clone Whats 2"],
    "Clone Business": ["Clone Business 1", "Clone Business 2", "Clone Business 3"],
    "Whats GB": ["Whats GB"]
}

const DESIRED_COLUMNS = ['data', 'operador', 'dispositivo', 'instancia', 'tipo_de_conta', 'numero', 'status', 'codigo', 'tipo_chip']

const zapsColumns = DESIRED_COLUMNS.map(key =>
    columns.find(c => (c as any).accessorKey === key || c.id === key)
).filter(Boolean) as any[]

export default function ZapsAMaisPage() {
    const [registros, setRegistros] = useState<Registro[]>([])
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

    const fetchData = async () => {
        setLoading(true)
        try {
            // 1. Fetch dispositivos with excesses
            const { data: dispositivos, error: dispError } = await supabase
                .from('dispositivos')
                .select('dispositivo, zaps_sobrando')

            if (dispError) throw dispError

            if (!dispositivos) {
                setRegistros([])
                return
            }

            // Filter locally to ensure valid objects
            const validDispositivos = dispositivos.filter((d: any) =>
                d.zaps_sobrando &&
                Object.keys(d.zaps_sobrando).length > 0 &&
                JSON.stringify(d.zaps_sobrando) !== '{}'
            )

            if (validDispositivos.length === 0) {
                setRegistros([])
                return
            }

            // 2. Build Query
            // We need to construct a filter like:
            // (dispositivo.eq.X, instancia.eq.Y, tipo_de_conta.in.(A,B)) OR (...)

            // Supabase client doesn't support easy complex ORs with nested ANDs via simple chaining.
            // We will use the `or` syntax with comma-separated filters.
            // Format: and(dispositivo.eq.VAL,instancia.eq.VAL,tipo_de_conta.in.(VAL,VAL)),and(...)

            const orConditions: string[] = []

            validDispositivos.forEach((d: any) => {
                const deviceName = d.dispositivo
                const sobras = d.zaps_sobrando as Record<string, Partial<ZapsSobrando>>

                Object.keys(sobras).forEach(instanciaKey => {
                    const excessTypes = sobras[instanciaKey]

                    // Normalize Instance Name: Remove "INS" prefix if present
                    const cleanInstancia = instanciaKey.replace(/^INS/, '')

                    Object.keys(excessTypes).forEach((typeKey) => {
                        const targetTypes = TIPO_CONTA_MAP[typeKey as keyof ZapsSobrando]

                        if (targetTypes) {
                            // Syntax for Supabase .or():
                            // dispositivo.eq.NAME,instancia.eq.NAME,tipo_de_conta.in.(TYPE1,TYPE2)
                            // Wrapped in and()

                            const typesString = `(${targetTypes.map(t => `"${t}"`).join(',')})` // formatting for .in()

                            // Note: We construct a separate condition for EACH type group within an instance
                            // Actually, if an instance has multiple excesses (e.g. Whats and Business),
                            // we need to combine them carefully or just push multiple OR conditions.
                            // Pushing multiple OR conditions is safer and simpler.

                            const condition = `and(dispositivo.eq."${deviceName}",instancia.eq."${cleanInstancia}",tipo_de_conta.in.${typesString})`
                            orConditions.push(condition)
                        }
                    })
                })
            })

            if (orConditions.length === 0) {
                setRegistros([])
                return
            }

            // Join all conditions with comma for the OR filter
            const orFilter = orConditions.join(',')

            // 3. Fetch Registros
            const { data: records, error: regError } = await supabase
                .from('registros')
                .select('*')
                .or(orFilter)

            if (regError) throw regError

            // Sort Client-side: Dispositivo DESC, Instancia DESC, Tipo de Conta DESC
            // Note: User asked for sorting: Dispositivo -> Instancia -> Tipo de Conta
            // We assume ASCENDING for natural order, but typically dashboards might want data DESC?
            // "ordene pelo dispositivo, depois pela instancia, e por fim pelo tipo de conta" usually implies ASC unless specified.
            const sortedRecords = (records || []).sort((a, b) => {
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

                // 3. Tipo de Conta
                const tipoA = a.tipo_de_conta || ''
                const tipoB = b.tipo_de_conta || ''
                return tipoA.localeCompare(tipoB, undefined, { numeric: true, sensitivity: 'base' })
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
                        Atualizado às {lastUpdated.toLocaleTimeString()}
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
                        columns={zapsColumns}
                        data={registros}
                        disableStickyHeader={true}
                        meta={{ userRole: 'admin' } as any}
                        pageSize={500}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
