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
import { Plus } from 'lucide-react'

interface TrocaNumeroModalProps {
    customTrigger?: React.ReactNode
}

export function TrocaNumeroModal({ customTrigger }: TrocaNumeroModalProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        operador: '',
        numero_antigo: '',
        numero_novo: '',
    })

    // Fetch username when modal opens
    useEffect(() => {
        const fetchUsername = async () => {
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
            fetchUsername()
        }
    }, [open])

    // Format phone number as user types
    const formatPhoneNumber = (value: string) => {
        // Remove all non-numeric characters
        const numbers = value.replace(/\D/g, '')

        // Limit to 11 digits
        const limited = numbers.slice(0, 11)

        // Apply formatting based on length
        if (limited.length <= 2) {
            return limited ? `(${limited}` : ''
        } else if (limited.length <= 6) {
            return `(${limited.slice(0, 2)}) ${limited.slice(2)}`
        } else if (limited.length <= 10) {
            return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`
        } else {
            // 11 digits: (XX) XXXXX-XXXX
            return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target

        if (id === 'numero_antigo' || id === 'numero_novo') {
            const formatted = formatPhoneNumber(value)
            setFormData({ ...formData, [id]: formatted })
        } else {
            setFormData({ ...formData, [id]: value })
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!formData.operador.trim()) {
            alert('Erro: Operador não identificado.')
            return
        }

        // Validate numbers
        const cleanAntigo = formData.numero_antigo.replace(/\D/g, '')
        const cleanNovo = formData.numero_novo.replace(/\D/g, '')
        const numeroRegex = /^\d{10,11}$/

        if (!numeroRegex.test(cleanAntigo)) {
            alert('O Número Antigo deve conter entre 10 e 11 dígitos.')
            return
        }

        if (!numeroRegex.test(cleanNovo)) {
            alert('O Número Novo deve conter entre 10 e 11 dígitos.')
            return
        }

        setLoading(true)

        // Save formatted or clean? User request said "seguir regras de Novo Registro", which saves clean only in code parts?
        // Wait, "Novo Registro" saves formatted in 'numero'? Let's check NewRegistroModal code again mentally.
        // It says `cleanNumero` in submit logic for `numero` field.
        // But user asked "seguir regras do número de telefone...".
        // Let's assume saving the formatted string is better for display unless specified, OR check if `troca_numeros` column types are text (yes).
        // Let's look at `NewRegistroModal`: it saves `cleanNumero` to `numero` column?
        // `const { id, ...dataWithoutId } = formData` -> `...dataWithoutId` includes `numero`.
        // `numero` state is formatted.
        // Wait, `NewRegistroModal` code:
        // `const { id, tipo_dispositivo, numero_dispositivo, ...dataWithoutId } = formData as any`
        // `const dataToInsert = { ...dataWithoutId, ..., numero: cleanNumero }`
        // So NewRegistroModal SAVES CLEAN NUMBER.
        // I will do the same: save formatted or clean?
        // "seguir regras ... de Novo Registro" -> logic: mask on input, clean on save?
        // I will save the **Formatted** number if consistent with "as seen on screen" or **Clean** if consistent with "data integrity".
        // Let's verify `NewRegistroModal` again in Step 19.
        // Line 229: `numero: cleanNumero`
        // OK, so `NewRegistroModal` saves CLEAN digits.
        // I will save CLEAN digits for consistency? Or stick to input.
        // The prompt says: "campos... (segui regras...)" -> usually implies validation and formatting.
        // "Informações devem ser salvas".
        // I will save the **Formatted** string to be safe for a generic "troca_numeros" log, or stick to `NewRegistroModal` pattern (clean).
        // I'll stick to **Clean** digits to match `NewRegistroModal`'s backend logic.
        // Actually, let's just save what is in the form data if no strict requirement, but clean is safer for queries.
        // Let's modify: I will save the **formatted** version if I want it to look pretty, but `NewRegistroModal` saves `cleanNumero`.
        // I will save the **Formatted** version for `troca_numeros` simply because it's a log table and easier to read without frontend formatting logic later.

        const { error } = await supabase
            .from('troca_numeros')
            .insert([{
                operador: formData.operador,
                numero_antigo: formData.numero_antigo.replace(/\D/g, ''),
                numero_novo: formData.numero_novo.replace(/\D/g, '')
            }])

        setLoading(false)

        // ... existing imports ...

        // ... inside handleSubmit ...

        if (error) {
            console.error('Error creating registro:', error)
            alert('Erro ao salvar: ' + error.message)
        } else {
            setOpen(false)
            setFormData({
                operador: formData.operador, // Keep operator
                numero_antigo: '',
                numero_novo: '',
            })
            // Force metrics update with a small delay to ensure DB propagation
            setTimeout(() => {
                updateSellerMetrics()
            }, 2000)

            // alert('Troca de número registrada com sucesso!')
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {customTrigger ? (
                    customTrigger
                ) : (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Troca de Número
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Troca de Número</DialogTitle>
                    <DialogDescription>
                        Registre a troca de número do dispositivo.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="operador" className="text-right">
                                Operador
                            </Label>
                            <Input
                                id="operador"
                                value={formData.operador}
                                className="col-span-3"
                                disabled
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="numero_antigo" className="text-right">
                                Número Antigo
                            </Label>
                            <Input
                                id="numero_antigo"
                                value={formData.numero_antigo}
                                onChange={handleChange}
                                className="col-span-3"
                                placeholder="(XX) XXXXX-XXXX"
                                autoComplete="off"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="numero_novo" className="text-right">
                                Número Novo
                            </Label>
                            <Input
                                id="numero_novo"
                                value={formData.numero_novo}
                                onChange={handleChange}
                                className="col-span-3"
                                placeholder="(XX) XXXXX-XXXX"
                                autoComplete="off"
                            />
                        </div>
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
