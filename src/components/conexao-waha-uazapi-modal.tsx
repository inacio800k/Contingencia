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

interface ConexaoWahaUazapiModalProps {
    customTrigger?: React.ReactNode
}

export function ConexaoWahaUazapiModal({ customTrigger }: ConexaoWahaUazapiModalProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        operador: '',
        conectado_em: '',
        tipo_conta: '',
        tipo_conexao: '',
        codigo: '',
    })

    // Fetch username when modal opens
    useEffect(() => {
        const fetchUser = async () => {
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
        }

        if (open) {
            fetchUser()
        }
    }, [open])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.operador) {
            alert('Erro: Operador não identificado.')
            return
        }
        if (!formData.conectado_em) {
            alert('Selecione onde foi conectado.')
            return
        }
        if (!formData.tipo_conta) {
            alert('Selecione o Tipo de Conta.')
            return
        }
        if (!formData.tipo_conexao) {
            alert('Selecione o Tipo de Conexão.')
            return
        }

        setLoading(true)

        const { error } = await supabase
            .from('conexao_wahapi')
            .insert([{
                operador: formData.operador,
                conectado_em: formData.conectado_em,
                tipo_conta: formData.tipo_conta,
                tipo_conexao: formData.tipo_conexao,
                codigo: formData.codigo
            }])

        setLoading(false)

        if (error) {
            console.error('Error saving conexao waha/uazapi:', error)
            alert('Erro ao salvar: ' + error.message)
        } else {
            setOpen(false)
            setFormData(prev => ({
                ...prev,
                conectado_em: '',
                tipo_conta: '',
                tipo_conexao: '',
                codigo: ''
            }))
            // Trigger metrics update
            setTimeout(() => {
                updateSellerMetrics()
            }, 1000)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {customTrigger ? customTrigger : (
                    <Button variant="outline" className="gap-2">
                        <Link2 className="h-4 w-4" />
                        Conexão Waha-Uazapi
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Conexão Waha-Uazapi</DialogTitle>
                    <DialogDescription>
                        Registre nova conexão ou reconexão Waha/Uazapi.
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
                        <Label htmlFor="conectado_em" className="text-right">
                            Conectado em
                        </Label>
                        <Select
                            value={formData.conectado_em}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, conectado_em: value }))}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Waha">Waha</SelectItem>
                                <SelectItem value="Uazapi">Uazapi</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="tipo_conta" className="text-right">
                            Tipo de Conta
                        </Label>
                        <Select
                            value={formData.tipo_conta}
                            onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_conta: value }))}
                        >
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Whats 1">Whats 1</SelectItem>
                                <SelectItem value="Whats 2">Whats 2</SelectItem>
                                <SelectItem value="Whats Business">Whats Business</SelectItem>
                                <SelectItem value="Whats GB">Whats GB</SelectItem>
                                <SelectItem value="Clone Whats 1">Clone Whats 1</SelectItem>
                                <SelectItem value="Clone Whats 2">Clone Whats 2</SelectItem>
                                <SelectItem value="Clone Business 1">Clone Business 1</SelectItem>
                                <SelectItem value="Clone Business 2">Clone Business 2</SelectItem>
                                <SelectItem value="Clone Business 3">Clone Business 3</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="tipo_conexao" className="text-right">
                            Conexão
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
                            placeholder="Digite o código..."
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
