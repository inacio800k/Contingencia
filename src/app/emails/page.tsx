'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
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
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react'
import Link from 'next/link'

function EmailsContent() {
    const router = useRouter()
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchData = async () => {
        setLoading(true)
        try {
            const { data: emails, error } = await supabase
                .from('Criacao_email')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) {
                console.error('Error fetching emails:', error)
            } else {
                setData(emails || [])
            }
        } catch (err) {
            console.error('Unexpected error:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleCheckboxChange = async (id: number, checked: boolean) => {
        // Optimistic update
        setData(prev => prev.map(item =>
            item.id === id ? { ...item, usado: checked } : item
        ))

        try {
            const { error } = await supabase
                .from('Criacao_email')
                .update({ usado: checked })
                .eq('id', id)

            if (error) {
                console.error('Error updating email usage:', error)
                // Revert if error
                fetchData()
            }
        } catch (err) {
            console.error('Unexpected error updating email:', err)
            fetchData()
        }
    }

    // Infer columns from first item, but ensure 'usado' is handled specially
    // Or better, hardcode important columns if known, but user said "all values".
    // I'll filter out 'usado' from the generic mapping and put it first or last.
    const columns = data.length > 0
        ? Object.keys(data[0]).filter(key => key !== 'usado' && key !== 'id')
        : []

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between gap-4 border-b border-gray-800 pb-6">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" asChild>
                            <Link href="/">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Voltar
                            </Link>
                        </Button>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            Gerenciar Emails
                        </h1>
                    </div>

                    <Button
                        variant="outline"
                        size="icon"
                        onClick={fetchData}
                        disabled={loading}
                        className="bg-gray-800 border-gray-700 hover:bg-gray-700"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>

                {/* Content */}
                <div className="bg-gray-900/50 rounded-lg border border-gray-800 backdrop-blur-sm overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center p-24">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                            <span className="ml-3 text-gray-400">Carregando emails...</span>
                        </div>
                    ) : data.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            Nenhum email encontrado.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-gray-800/50 sticky top-0">
                                    <TableRow className="border-gray-700 hover:bg-gray-800/50">
                                        <TableHead className="w-[100px] text-gray-300 font-medium">Usado</TableHead>
                                        {columns.map((col) => (
                                            <TableHead key={col} className="text-gray-300 font-medium whitespace-nowrap">
                                                {col}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.map((row) => (
                                        <TableRow key={row.id} className="border-gray-800 hover:bg-gray-800/30">
                                            <TableCell>
                                                <Checkbox
                                                    checked={!!row.usado}
                                                    onCheckedChange={(checked) => handleCheckboxChange(row.id, checked as boolean)}
                                                    className="border-gray-600 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500"
                                                />
                                            </TableCell>
                                            {columns.map((col) => (
                                                <TableCell key={`${row.id}-${col}`} className="text-gray-300 whitespace-nowrap">
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

export default function EmailsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-gray-900">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            </div>
        }>
            <EmailsContent />
        </Suspense>
    )
}
