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
import { Plus } from 'lucide-react'
import { ComboboxInput } from '@/components/ui/combobox-input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface NewRegistroModalProps {
    customTrigger?: React.ReactNode
}

export function NewRegistroModal({ customTrigger }: NewRegistroModalProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        operador: '',
        tipo_de_conta: '',
        tipo_chip: '',
        valor: '0',
        dispositivo: '',
        tipo_dispositivo: '',
        numero_dispositivo: '',
        instancia: '',
        numero: '',
        codigo: '',
        status: '',
        obs: '',
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

    // Auto-generate codigo from dispositivo-instancia-last4digits
    // Auto-generate codigo from dispositivo-instancia-last4digits
    // Auto-generate codigo from dispositivo-instancia-fullnumber (NEW RULE from 2026-01-09)
    useEffect(() => {
        const { tipo_dispositivo, numero_dispositivo, instancia, numero } = formData

        // Construct dispositivo string
        let dispositivo = ''
        if (tipo_dispositivo && numero_dispositivo) {
            if (tipo_dispositivo === 'Tablet') {
                dispositivo = `T${numero_dispositivo}`
            } else {
                dispositivo = `${tipo_dispositivo}${numero_dispositivo}`
            }
        }

        if (dispositivo || instancia || numero) {
            // Remove formatting from numero
            const cleanNumero = numero.replace(/\D/g, '')
            // NEW RULE: Use FULL number for code generation, not just last 4 digits
            const numberPart = cleanNumero

            // Handle instancia formatting for code
            let formattedInstancia = instancia
            if (/^\d+$/.test(instancia)) {
                formattedInstancia = `INS${instancia}`
            }

            const codigoParts = [dispositivo, formattedInstancia, numberPart].filter(Boolean)
            const generatedCodigo = codigoParts.join('-')
            setFormData(prev => ({ ...prev, codigo: generatedCodigo, dispositivo }))
        }
    }, [formData.tipo_dispositivo, formData.numero_dispositivo, formData.instancia, formData.numero])

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

        // Special handling for numero field
        if (id === 'numero') {
            const formatted = formatPhoneNumber(value)
            setFormData({ ...formData, numero: formatted })
        } else if (id === 'valor') {
            // Allow numbers, one comma, or one dot
            if (/^\d*[.,]?\d*$/.test(value)) {
                setFormData({ ...formData, valor: value })
            }
        } else if (id === 'tipo_chip') {
            // When tipo_chip changes, update valor based on selection
            const newValor = value === 'Chip Virtual' ? '' : '0'
            setFormData({ ...formData, tipo_chip: value, valor: newValor })
        } else {
            setFormData({ ...formData, [id]: value })
        }
    }

    // Handlers for ComboboxInput fields (receive value directly)
    const handleComboboxChange = (field: string, value: string) => {
        if (field === 'tipo_chip') {
            const newValor = value === 'Chip Virtual' ? '' : '0'
            setFormData({ ...formData, tipo_chip: value, valor: newValor })
        } else {
            setFormData({ ...formData, [field]: value })
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validate required fields
        if (!formData.operador.trim()) {
            alert('O campo Operador é obrigatório.')
            return
        }
        if (!formData.tipo_de_conta.trim()) {
            alert('O campo Conta é obrigatório.')
            return
        }
        if (!formData.dispositivo.trim()) {
            alert('O campo Disp é obrigatório.')
            return
        }

        // Validate dispositivo
        if (!formData.tipo_dispositivo) {
            alert('Selecione o tipo de dispositivo.')
            return
        }

        const tipo = formData.tipo_dispositivo
        const num = formData.numero_dispositivo || ''

        // Validation rules
        if (tipo === 'Tablet') {
            if (num.length !== 2) {
                alert('Para Tablet, o número deve ter exatamente 2 dígitos.')
                return
            }
        } else {
            // PC or Fita
            if (num.length < 1 || num.length > 2) {
                alert('O número do dispositivo deve ter 1 ou 2 dígitos.')
                return
            }
        }

        // Construct final dispositivo value for validation/save
        let finalDispositivo = ''

        if (tipo === 'Tablet') {
            finalDispositivo = `T${num}`
        } else {
            finalDispositivo = `${tipo}${num}`
        }
        if (!formData.instancia.trim()) {
            alert('O campo Inst é obrigatório.')
            return
        }

        const inst = formData.instancia.trim()
        // Removed explicit INS length validation as options are fixed now
        if (!formData.status.trim()) {
            alert('O campo Status é obrigatório.')
            return
        }

        // Validate numero field - extract only digits
        const cleanNumero = formData.numero.replace(/\D/g, '')
        const numeroRegex = /^\d{10,11}$/

        if (!numeroRegex.test(cleanNumero)) {
            alert('O número deve conter entre 10 e 11 dígitos.')
            return // Keep modal open with current data
        }

        setLoading(true)

        // Prepare data for insert - use clean numero without formatting
        // Explicitly exclude 'id' to ensure database auto-generates it
        const { id, tipo_dispositivo, numero_dispositivo, ...dataWithoutId } = formData as any
        const dataToInsert = {
            ...dataWithoutId,
            dispositivo: finalDispositivo,
            numero: cleanNumero,
            valor: formData.valor ? formData.valor.replace(',', '.') : formData.valor
        }

        const { data, error } = await supabase
            .from('registros')
            .insert([dataToInsert])
            .select()

        setLoading(false)

        if (error) {
            console.error('Error creating registro:', error)
            // Provide more helpful error message for duplicate key errors
            if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
                alert('Erro: O registro já existe ou há um problema com a sequência do banco de dados. Por favor, recarregue a página e tente novamente.')
            } else {
                alert('Erro ao criar registro: ' + error.message)
            }
        } else {
            // Google Form Submission
            try {
                const encodeForUrl = (str: string) => encodeURIComponent(str).replace(/%20/g, '+')

                const formBaseUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSeEY0HET5WNL1PbJVhd_emIzfVzaJQGBBdS2BtP4KMMCzLskA/formResponse'
                const params = new URLSearchParams()

                // entry.119310671=__other_option__
                params.append('entry.119310671', '__other_option__')

                // entry.119310671.other_option_response={OPERADOR}
                params.append('entry.119310671.other_option_response', formData.operador)

                // entry.47446458={TIPO_DE_CONTA}
                params.append('entry.47446458', formData.tipo_de_conta)

                // entry.628548120={TIPO_DE_CHIP}
                params.append('entry.628548120', formData.tipo_chip)

                // entry.1539225161={TIPO_DE_DISPOSITIVO}
                params.append('entry.1539225161', formData.tipo_dispositivo)

                // entry.1731129671={NÚMERO_DISPOSITIVO}
                params.append('entry.1731129671', formData.numero_dispositivo)

                // entry.78500703={INSTÂNCIA}
                params.append('entry.78500703', formData.instancia)

                // entry.2129778114={NÙMERO_CRIADO}
                params.append('entry.2129778114', cleanNumero)

                // entry.1713904484=__other_option__
                params.append('entry.1713904484', '__other_option__')

                // entry.1713904484.other_option_response={PREÇO}
                params.append('entry.1713904484.other_option_response', formData.valor)

                // entry.1419561436=Criado
                params.append('entry.1419561436', 'Criado')

                // submit=Submit
                params.append('submit', 'Submit')

                // Construct final URL manually to ensure specific encoding requirements if needed, 
                // but URLSearchParams handles standard encoding. 
                // The user specifically asked to "replace %20 by +", which URLSearchParams does for spaces by default (application/x-www-form-urlencoded).
                // However, verification is key. URLSearchParams encodes space as '+'.

                // Note: The user provided a URL with query params. We can just fetch it.
                // We need to construct the full URL string because the user gave specific instruction about encoding.
                // Let's stick to the manual construction as requested to be 100% sure about specific field IDs and replacement behavior.

                const customParams = [
                    `entry.119310671=__other_option__`,
                    `entry.119310671.other_option_response=${encodeForUrl(formData.operador)}`,
                    `entry.47446458=${encodeForUrl(formData.tipo_de_conta)}`,
                    `entry.628548120=${encodeForUrl(formData.tipo_chip)}`,
                    `entry.1539225161=${formData.tipo_dispositivo}`, // "sem modificar"
                    `entry.1731129671=${formData.numero_dispositivo}`, // "apenas o valor" - assuming alphanumeric needs no special encoding or safe to encode
                    `entry.78500703=${formData.instancia}`, // "apenas o valor selecionado"
                    `entry.2129778114=${cleanNumero}`,
                    `entry.1713904484=__other_option__`,
                    `entry.1713904484.other_option_response=${encodeForUrl(formData.valor)}`,
                    `entry.1419561436=Criado`,
                    `submit=Submit`
                ].join('&')

                const finalUrl = `${formBaseUrl}?${customParams}`

                await fetch(finalUrl, {
                    mode: 'no-cors'
                })

            } catch (error) {
                console.error('Error submitting to Google Form:', error)
                // Don't block UI flow if analytics fails
            }

            setOpen(false)
            // Reset form
            setFormData({
                operador: '',
                tipo_de_conta: '',
                tipo_chip: '',
                valor: '0',
                dispositivo: '',
                tipo_dispositivo: '',
                numero_dispositivo: '',
                instancia: '',
                numero: '',
                codigo: '',
                status: '',
                obs: '',
            })
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {customTrigger ? (
                    customTrigger
                ) : (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Novo Registro
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Novo Registro</DialogTitle>
                    <DialogDescription>
                        Preencha os dados para criar um novo registro operacional.
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
                                onChange={handleChange}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="tipo_de_conta" className="text-right">
                                Conta
                            </Label>
                            <div className="col-span-3">
                                <Select
                                    value={formData.tipo_de_conta}
                                    onValueChange={(value) => handleComboboxChange('tipo_de_conta', value)}
                                >
                                    <SelectTrigger id="tipo_de_conta">
                                        <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {['Whats 1', 'Whats 2', 'Whats Business', 'Whats GB', 'Clone Whats 1', 'Clone Whats 2', 'Clone Business 1', 'Clone Business 2', 'Clone Business 3'].map((option) => (
                                            <SelectItem key={option} value={option}>
                                                {option}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="tipo_chip" className="text-right">
                                Tipo Chip
                            </Label>
                            <div className="col-span-3">
                                <Select
                                    value={formData.tipo_chip}
                                    onValueChange={(value) => handleComboboxChange('tipo_chip', value)}
                                >
                                    <SelectTrigger id="tipo_chip">
                                        <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {['Chip Virtual', 'Chip Físico Recuperado', 'Whats Existente'].map((option) => (
                                            <SelectItem key={option} value={option}>
                                                {option}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="valor" className="text-right">
                                Valor
                            </Label>
                            <Input
                                id="valor"
                                value={formData.valor}
                                onChange={handleChange}
                                className="col-span-3"
                                placeholder={formData.tipo_chip === 'Chip Virtual' ? 'Preencha o valor' : '0'}
                                type="text"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="dispositivo" className="text-right">
                                Dispositivo
                            </Label>
                            <div className="col-span-3 flex gap-2">
                                <div className="flex-1">
                                    <Select
                                        value={formData.tipo_dispositivo}
                                        onValueChange={(value) => handleComboboxChange('tipo_dispositivo', value)}
                                    >
                                        <SelectTrigger id="tipo_dispositivo">
                                            <SelectValue placeholder="Tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {['Tablet', 'Fita', 'PC'].map((option) => (
                                                <SelectItem key={option} value={option}>
                                                    {option}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-24">
                                    <Input
                                        id="numero_dispositivo"
                                        value={formData.numero_dispositivo || ''}
                                        onChange={(e) => {
                                            const val = e.target.value.slice(0, 2);
                                            setFormData({ ...formData, numero_dispositivo: val })
                                        }}
                                        placeholder="Nº (Ex: 01)"
                                        maxLength={2}
                                        className="text-center"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="instancia" className="text-right">
                                Instância
                            </Label>
                            <div className="col-span-3">
                                <div className="col-span-3">
                                    <Select
                                        value={formData.instancia}
                                        onValueChange={(value) => handleComboboxChange('instancia', value)}
                                    >
                                        <SelectTrigger id="instancia">
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {['PROP', '1', '2', '3', '4', '5', '6', '7', 'VISIT'].map((option) => (
                                                <SelectItem key={option} value={option}>
                                                    {option}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="numero" className="text-right">
                                Número
                            </Label>
                            <Input
                                id="numero"
                                value={formData.numero}
                                onChange={handleChange}
                                className="col-span-3"
                                placeholder="10-11 dígitos"
                                autoComplete="off"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="codigo" className="text-right">
                                Código
                            </Label>
                            <Input
                                id="codigo"
                                value={formData.codigo}
                                onChange={handleChange}
                                className="col-span-3"
                                placeholder="Auto-gerado"
                                disabled
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="status" className="text-right">
                                Status
                            </Label>
                            <div className="col-span-3">
                                <Select
                                    value={formData.status}
                                    onValueChange={(value) => handleComboboxChange('status', value)}
                                >
                                    <SelectTrigger id="status">
                                        <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {['Verificar', 'Waha.levezaativa', 'API Uazapi'].map((option) => (
                                            <SelectItem key={option} value={option}>
                                                {option}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="obs" className="text-right">
                                Obs
                            </Label>
                            <div className="col-span-3">
                                <ComboboxInput
                                    id="obs"
                                    value={formData.obs}
                                    onChange={(value) => handleComboboxChange('obs', value)}
                                    options={['NÃO CONECTADO']}
                                />
                            </div>
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
