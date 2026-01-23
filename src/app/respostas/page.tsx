'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react'
import Link from 'next/link'

function RespostasContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Get 'tabela' param. 
    // Note: In Next.js App Router client components, searchParams is dynamic.
    const currentTable = searchParams.get('tabela')

    const [tables, setTables] = useState<string[]>([])
    const [tableData, setTableData] = useState<any[]>([])
    const [columns, setColumns] = useState<string[]>([])
    const [loadingData, setLoadingData] = useState(false)
    const [loadingTables, setLoadingTables] = useState(true)

    // Fetch list of available tables from 'tabelada'
    useEffect(() => {
        const fetchTables = async () => {
            try {
                const { data, error } = await supabase
                    .from('tabelada')
                    .select('nome_da_tabela')

                if (error) {
                    console.error('Error fetching tables:', error)
                    return
                }

                if (data) {
                    // Extract table names
                    const names = data.map(item => item.nome_da_tabela).filter(Boolean)
                    setTables(names)
                }
            } catch (err) {
                console.error('Unexpected error fetching tables:', err)
            } finally {
                setLoadingTables(false)
            }
        }

        fetchTables()
    }, [])

    // Fetch data when currentTable changes
    useEffect(() => {
        const fetchData = async () => {
            if (!currentTable) {
                setTableData([])
                setColumns([])
                return
            }

            setLoadingData(true)
            try {
                // Determine the primary key or order column if possible, otherwise just select *
                // Since it's dynamic, we'll order by created_at if it exists, or just default behavior
                const { data, error } = await supabase
                    .from(currentTable)
                    .select('*')
                    .order('created_at', { ascending: false })

                if (error) {
                    console.error(`Error fetching data for ${currentTable}:`, error)
                    // If table doesn't exist or permission denied, handle gracefully
                    setTableData([])
                    setColumns([])
                } else if (data && data.length > 0) {
                    setTableData(data)
                    // Infer columns from the first record keys
                    setColumns(Object.keys(data[0]))
                } else {
                    setTableData([])
                    setColumns([])
                }
            } catch (err) {
                console.error(`Unexpected error fetching data for ${currentTable}:`, err)
                setTableData([])
                setColumns([])
            } finally {
                setLoadingData(false)
            }
        }

        fetchData()
    }, [currentTable])

    const handleTableChange = (value: string) => {
        // Update URL to reflect selection
        const params = new URLSearchParams(searchParams.toString())
        if (value) {
            params.set('tabela', value)
        } else {
            params.delete('tabela')
        }
        router.push(`/respostas?${params.toString()}`)
    }

    const refreshData = () => {
        if (currentTable) {
            // Trigger effect by briefly clearing or just re-running fetch logic? 
            // The cleanest way in this setup is to extract fetch logic or just force re-render.
            // For simplicity, let's just toggle a dummy state or call a refetch function if we extracted it.
            // But since I put fetch in useEffect depend on currentTable, I can just use a trick or better yet, extract the fetcher.
            // Let's reload window for hard refresh or re-trigger fetch.
            // Ideally: extract fetch function.
            window.location.reload()
        }
    }

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" asChild>
                            <Link href="/">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Voltar
                            </Link>
                        </Button>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            Visualizar Respostas
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <Select
                            value={currentTable || ''}
                            onValueChange={handleTableChange}
                            disabled={loadingTables}
                        >
                            <SelectTrigger className="w-[300px] bg-gray-800 border-gray-700 text-gray-100">
                                <SelectValue placeholder="Selecione uma tabela" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-700 text-gray-100">
                                {tables.map((table) => (
                                    <SelectItem key={table} value={table} className="focus:bg-gray-700 cursor-pointer">
                                        {table}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button
                            variant="outline"
                            size="icon"
                            onClick={refreshData}
                            disabled={!currentTable || loadingData}
                            className="bg-gray-800 border-gray-700 hover:bg-gray-700"
                        >
                            <RefreshCw className={`h-4 w-4 ${loadingData ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="bg-gray-900/50 rounded-lg border border-gray-800 backdrop-blur-sm overflow-hidden">
                    {!currentTable ? (
                        <div className="p-12 text-center text-gray-500">
                            Selecione uma tabela acima para visualizar os dados.
                        </div>
                    ) : loadingData ? (
                        <div className="flex items-center justify-center p-24">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                            <span className="ml-3 text-gray-400">Carregando dados...</span>
                        </div>
                    ) : tableData.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            Nenhum registro encontrado nesta tabela.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-gray-800/50 sticky top-0">
                                    <TableRow className="border-gray-700 hover:bg-gray-800/50">
                                        {columns.map((col) => (
                                            <TableHead key={col} className="text-gray-300 font-medium whitespace-nowrap">
                                                {col}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tableData.map((row, i) => (
                                        <TableRow key={i} className="border-gray-800 hover:bg-gray-800/30">
                                            {columns.map((col) => (
                                                <TableCell key={`${i}-${col}`} className="text-gray-300 whitespace-nowrap">
                                                    {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col])}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function RespostasPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-gray-900">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            </div>
        }>
            <RespostasContent />
        </Suspense>
    )
}
