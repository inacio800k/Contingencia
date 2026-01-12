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
import { Monitor } from 'lucide-react'

interface ProxyFormModalProps {
    customTrigger?: React.ReactNode
}

export function ProxyFormModal({ customTrigger }: ProxyFormModalProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // User info
    const [operador, setOperador] = useState('')

    // Dispositivo state
    const [dispType, setDispType] = useState('')
    const [dispChars, setDispChars] = useState('')

    // Proxy Code state
    const [proxyIP, setProxyIP] = useState('')
    const [proxyPort, setProxyPort] = useState('')
    const [proxyUser, setProxyUser] = useState('')
    const [proxyPass, setProxyPass] = useState('')

    // Other fields
    const [foiFeito, setFoiFeito] = useState('')
    const [instancia, setInstancia] = useState('')

    // Fetch username
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
                    setOperador(data.username)
                }
            }
        }

        if (open) {
            fetchUser()
        }
    }, [open])

    const formatDispositivo = () => {
        if (!dispType) return ''
        const chars = dispChars.trim()
        if (dispType === 'Tablet') return `T${chars}`
        return `${dispType}${chars}`
    }

    const validateIP = (ip: string) => {
        return (ip.match(/\./g) || []).length === 3
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!operador) {
            alert('Erro: Operador não identificado.')
            return
        }

        // Validate Dispositivo
        if (!dispType) {
            alert('Selecione o tipo de dispositivo.')
            return
        }
        if (dispChars.length === 0 || dispChars.length > 2) {
            alert('O código do dispositivo deve ter 1 ou 2 caracteres.')
            return
        }

        // Validate Proxy Code
        if (!proxyIP || !proxyPort || !proxyUser || !proxyPass) {
            alert('Preencha todos os campos do Código Proxy.')
            return
        }
        if (!validateIP(proxyIP)) {
            alert('O IP deve conter exatamente 3 pontos.')
            return
        }
        const codigoProxyCombined = `${proxyIP}:${proxyPort}:${proxyUser}:${proxyPass}`

        // Validate Selects
        if (!foiFeito) {
            alert('Selecione "O que foi Feito".')
            return
        }
        if (!instancia) {
            alert('Selecione a "Instância".')
            return
        }

        setLoading(true)

        const finalDispositivo = formatDispositivo()

        const { error } = await supabase
            .from('proxy')
            .insert([{
                operador: operador,
                dispositivo: finalDispositivo,
                codigo_proxy: codigoProxyCombined,
                foi_feito: foiFeito,
                instancia: instancia
            }])

        setLoading(false)

        if (error) {
            console.error('Error saving proxy:', error)
            alert('Erro ao salvar: ' + error.message)
        } else {
            setOpen(false)
            // Reset form
            setDispType('')
            setDispChars('')
            setProxyIP('')
            setProxyPort('')
            setProxyUser('')
            setProxyPass('')
            setFoiFeito('')
            setInstancia('')

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
                        <Monitor className="h-4 w-4" />
                        Registro Proxy
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Novo Registro de Proxy</DialogTitle>
                    <DialogDescription>
                        Preencha os dados do novo proxy.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">

                    {/* Operador */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="operador" className="text-right">
                            Operador
                        </Label>
                        <Input
                            id="operador"
                            value={operador}
                            disabled
                            className="col-span-3 bg-gray-100 dark:bg-gray-800"
                        />
                    </div>

                    {/* Dispositivo */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Dispositivo</Label>
                        <div className="col-span-3 flex gap-2">
                            <Select value={dispType} onValueChange={setDispType}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Tablet">Tablet</SelectItem>
                                    <SelectItem value="Fita">Fita</SelectItem>
                                    <SelectItem value="PC">PC</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input
                                placeholder="00"
                                maxLength={2}
                                value={dispChars}
                                onChange={(e) => setDispChars(e.target.value)}
                                className="w-20"
                            />
                        </div>
                    </div>

                    {/* Código Proxy (4 campos) */}
                    <div className="grid grid-cols-4 items-start gap-4">
                        <Label className="text-right pt-2">Cód. Proxy</Label>
                        <div className="col-span-3 grid grid-cols-2 gap-2">
                            <Input
                                placeholder="IP"
                                value={proxyIP}
                                onChange={(e) => setProxyIP(e.target.value)}
                            />
                            <Input
                                placeholder="Porta"
                                value={proxyPort}
                                onChange={(e) => setProxyPort(e.target.value)}
                            />
                            <Input
                                placeholder="Usuário"
                                value={proxyUser}
                                onChange={(e) => setProxyUser(e.target.value)}
                            />
                            <Input
                                placeholder="Senha"
                                value={proxyPass}
                                onChange={(e) => setProxyPass(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* O que foi Feito */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">O que foi Feito</Label>
                        <Select value={foiFeito} onValueChange={setFoiFeito}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Instância Recriada">Instância Recriada</SelectItem>
                                <SelectItem value="Troca de Proxy">Troca de Proxy</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Instância */}
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label className="text-right">Instância</Label>
                        <Select value={instancia} onValueChange={setInstancia}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="PROP">PROP</SelectItem>
                                <SelectItem value="INS1">INS1</SelectItem>
                                <SelectItem value="INS2">INS2</SelectItem>
                                <SelectItem value="INS3">INS3</SelectItem>
                                <SelectItem value="INS4">INS4</SelectItem>
                                <SelectItem value="INS5">INS5</SelectItem>
                                <SelectItem value="INS6">INS6</SelectItem>
                                <SelectItem value="INS7">INS7</SelectItem>
                                <SelectItem value="VISIT">VISIT</SelectItem>
                            </SelectContent>
                        </Select>
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
