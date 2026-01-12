'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { DateRangePicker } from '@/components/date-range-picker'
import { DateRange } from 'react-day-picker'
import { startOfDay, endOfDay } from 'date-fns'

interface EmailRecord {
    id: number
    created_at: string
    operador: string
    email: string
    senha: string
}

export default function CriacaoEmailPage() {
    const router = useRouter()
    const [data, setData] = useState<EmailRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [date, setDate] = useState<DateRange | undefined>()

    const fetchData = async () => {
        setLoading(true)
        let query = supabase
            .from('criacao_email')
            .select('*')
            .order('created_at', { ascending: false })

        if (date?.from) {
            const fromISO = startOfDay(date.from).toISOString()
            query = query.gte('created_at', fromISO)
        }

        if (date?.to) {
            const toISO = endOfDay(date.to).toISOString()
            query = query.lte('created_at', toISO)
        } else if (date?.from) {
            const toISO = endOfDay(date.from).toISOString()
            query = query.lte('created_at', toISO)
        }

        const { data: registros, error } = await query

        if (error) {
            console.error('Error fetching data:', error)
        } else {
            setData(registros || [])
        }
        setLoading(false)
    }

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.push('/login')
            } else {
                fetchData()
            }
        }
        checkAuth()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router])

    const formatDate = (dateString: string) => {
        if (!dateString) return '-'
        const dateObj = new Date(dateString)
        const day = String(dateObj.getDate()).padStart(2, '0')
        const month = String(dateObj.getMonth() + 1).padStart(2, '0')
        const year = dateObj.getFullYear()
        const hours = String(dateObj.getHours()).padStart(2, '0')
        const minutes = String(dateObj.getMinutes()).padStart(2, '0')
        const seconds = String(dateObj.getSeconds()).padStart(2, '0')

        return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-purple-950 text-gray-100 p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        onClick={() => router.push('/')}
                        className="hover:bg-white/10"
                    >
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            Criação Email
                        </h1>
                        <p className="text-gray-400">Histórico de emails criados</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <DateRangePicker date={date} setDate={setDate} />
                    <Button
                        onClick={fetchData}
                        variant="outline"
                        className="border-blue-500/30 hover:border-blue-400/50 bg-blue-500/10 hover:bg-blue-500/20"
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                </div>
            </div>

            {/* Table Container */}
            <div className="rounded-lg border border-white/10 bg-black/20 backdrop-blur-xl overflow-hidden shadow-xl">
                <Table>
                    <TableHeader>
                        <TableRow className="border-white/10 hover:bg-white/5">
                            <TableHead className="text-blue-200">Data</TableHead>
                            <TableHead className="text-blue-200">Operador</TableHead>
                            <TableHead className="text-blue-200">Email</TableHead>
                            <TableHead className="text-blue-200">Senha</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-400"></div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center text-gray-400">
                                    Nenhum registro encontrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((row) => (
                                <TableRow key={row.id} className="border-white/10 hover:bg-white/5 transition-colors">
                                    <TableCell className="font-mono text-gray-300">
                                        {formatDate(row.created_at)}
                                    </TableCell>
                                    <TableCell className="font-medium text-white">
                                        {row.operador}
                                    </TableCell>
                                    <TableCell className="text-purple-300 font-medium">
                                        {row.email}
                                    </TableCell>
                                    <TableCell className="text-gray-300 font-mono">
                                        {row.senha}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
