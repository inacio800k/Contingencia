'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { updateSellerMetrics } from '@/lib/update-metrics'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Link2 } from 'lucide-react'

interface ConexaoVendedoresModalProps {
    customTrigger?: React.ReactNode
}

export function ConexaoVendedoresModal({ customTrigger }: ConexaoVendedoresModalProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [vendedorOptions, setVendedorOptions] = useState<string[]>([])
    const [formData, setFormData] = useState({
        operador: '',
        vendedor: '',
        tipo_conexao: '',
        codigo: '',
    })

    // Helper to get today's date in local YYYY-MM-DD
    const getLocalToday = () => {
        const now = new Date()
        const year = now.getFullYear()
        const month = String(now.getMonth() + 1).padStart(2, '0')
        const day = String(now.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    // Fetch username and vendor options when modal opens
    useEffect(() => {
        const fetchData = async () => {
            // 1. Fetch current user (operador)
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', user.id)
                    .single()

                if (data?.username) {
                    setFormData(prev => ({ ...prev, operador: data.username }))
                }
            }

            // 2. Fetch today's metrics for vendors list
            const today = getLocalToday()
            const { data: metricas } = await supabase
                .from('metricas')
                .select('whats_vendedores')
                .eq('dia', today)
                .single()

            if (metricas?.whats_vendedores && Array.isArray(metricas.whats_vendedores)) {
                const options = metricas.whats_vendedores.map((item: any) => {
                    if (typeof item === 'object' && item !== null) {
                        return Object.keys(item)[0]
                    }
                    return String(item)
                })
                setVendedorOptions(options.filter(Boolean))
            }
        }

        if (open) {
            fetchData()
        }
    }, [open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.operador) {
            alert('Erro: Operador não identificado.')
            return
        }
        if (!formData.vendedor) {
            alert('Selecione um Vendedor.')
            return
        }
        if (!formData.tipo_conexao) {
            alert('Selecione o Tipo de Conexão.')
            return
        }

        setLoading(true)

        const { error } = await supabase
            .from('conexao_vendedores')
            .insert([{
                operador: formData.operador,
                vendedor: formData.vendedor,
                tipo_conexao: formData.tipo_conexao,
                codigo: formData.codigo
            }])

        setLoading(false)

        if (error) {
            console.error('Error saving conexao:', error)
            alert('Erro ao salvar: ' + error.message)
        } else {
            setOpen(false)
            setFormData(prev => ({
                ...prev,
                vendedor: '',
                tipo_conexao: '',
                codigo: ''
            }))

            // Force metrics update
            setTimeout(() => {
                updateSellerMetrics()
            }, 2000)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {customTrigger ? customTrigger : (
                    <Button variant="outline" className="gap-2">
                        <Link2 className="h-4 w-4" />
                        Conexão Vendedores
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Nova Conexão</DialogTitle>
                    <DialogDescription>
                        Registre uma nova conexão ou reconexão.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="operador" className="text-right">
                            Operador
                        </Label>
                        <Input
                            id="operador"
                            value={formData.operador}
                            disabled
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="vendedor" className="text-right">
                            Vendedor
                        </Label>
                        <Select
                            value={formData.vendedor}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, vendedor: value }))}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                {vendedorOptions.map(opt => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="tipo" className="text-right">
                            Tipo
                        </Label>
                        <Select
                            value={formData.tipo_conexao}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_conexao: value }))}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Nova">Nova</SelectItem>
                                <SelectItem value="Reconexão">Reconexão</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="codigo" className="text-right">
                            Código
                        </Label>
                        <Input
                            id="codigo"
                            autoComplete="off"
                            value={formData.codigo}
                            onChange={(e) => setFormData(prev => ({ ...prev, codigo: e.target.value }))}
                            className="col-span-3"
                        />
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
