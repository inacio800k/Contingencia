'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
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
import { Mail } from 'lucide-react'
import { updateSellerMetrics } from '@/lib/update-metrics'

interface CriacaoEmailModalProps {
    customTrigger?: React.ReactNode
}

export function CriacaoEmailModal({ customTrigger }: CriacaoEmailModalProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        operador: '',
        email: '',
        senha: '',
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
            alert('Erro: Operador não identificado. Tente recarregar a página.')
            return
        }

        if (!formData.email || !formData.senha) {
            alert('Preencha todos os campos.')
            return
        }

        setLoading(true)

        const { error } = await supabase
            .from('criacao_email')
            .insert([{
                operador: formData.operador,
                email: formData.email,
                senha: formData.senha
            }])

        setLoading(false)

        if (error) {
            console.error('Error saving email:', error)
            alert('Erro ao salvar: ' + error.message)
        } else {
            setOpen(false)
            setFormData(prev => ({
                ...prev,
                email: '',
                senha: ''
            }))

            // Trigger metrics update if needed (although strictly speaking this might not affect existing metrics yet, 
            // but it's good practice to keep the pattern if we add an "Emails Criados" metric later)
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
                        <Mail className="h-4 w-4" />
                        Criação de Email
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Criação de Email</DialogTitle>
                    <DialogDescription>
                        Registre um novo email criado.
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
                            className="col-span-3 bg-gray-100 dark:bg-gray-800"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="email" className="text-right">
                            Email
                        </Label>
                        <Input
                            id="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            className="col-span-3"
                            placeholder="exemplo@email.com"
                            type="email"
                            autoComplete="off"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="senha" className="text-right">
                            Senha
                        </Label>
                        <Input
                            id="senha"
                            value={formData.senha}
                            onChange={(e) => setFormData(prev => ({ ...prev, senha: e.target.value }))}
                            className="col-span-3"
                            type="text"
                            autoComplete="off"
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
