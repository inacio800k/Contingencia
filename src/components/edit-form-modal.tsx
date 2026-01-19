'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { FileText, Plus, Trash2, ArrowRight, X, Loader2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { supabase } from '@/lib/supabase'

interface SelectOption {
    label: string
    value: string
}

interface FormField {
    label: string
    identifier: string
    type: 'texto' | 'select' | 'numero' | 'telefone' | 'operador'
    options?: SelectOption[]
    required: boolean
    maxLength?: number
    minLength?: number
}

interface FillingRulePart {
    type: 'text' | 'variable'
    value: string
}

interface FillingRule {
    targetColumn: string
    pattern: FillingRulePart[]
}

interface EditFormModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    formName: string
    linkedTable: string
}

export function EditFormModal({ open, onOpenChange, formName, linkedTable }: EditFormModalProps) {
    const [fields, setFields] = useState<FormField[]>([])
    const [tableColumns, setTableColumns] = useState<string[]>([])
    const [fillingRules, setFillingRules] = useState<FillingRule[]>([])
    const [isConfirming, setIsConfirming] = useState(false)
    const [fetchError, setFetchError] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loadingData, setLoadingData] = useState(false)

    // Fetch Table Columns
    useEffect(() => {
        const fetchColumns = async () => {
            if (!linkedTable) return

            const { data, error } = await supabase.rpc('get_table_columns', { t_name: linkedTable })
            if (error) {
                console.error('Error fetching columns:', error)
                setFetchError('Erro ao buscar colunas da tabela linkada.')
            } else {
                const hiddenColumns = ['id', 'created_at']
                const columns = data?.map((d: any) => d.col_name).filter((col: string) => !hiddenColumns.includes(col)) || []
                setTableColumns(columns)
            }
        }

        fetchColumns()
    }, [linkedTable])

    // Fetch Form Data
    useEffect(() => {
        const fetchFormData = async () => {
            if (!formName || !open) return

            setLoadingData(true)
            setFetchError(null)

            try {
                // Fetch by linked table instead of form name for better robustness
                const { data, error } = await supabase
                    .from('formularios')
                    .select('*')
                    .eq('tabela_linkada', linkedTable)
                    .single()

                if (error) throw error

                if (data) {
                    // Map campos_formulario to fields
                    const mappedFields: FormField[] = (data.campos_formulario || []).map((f: any) => ({
                        label: f.nome_campo_formulario,
                        identifier: f.identificador,
                        type: f.tipo_valor,
                        options: f.select?.map((o: any) => ({ label: o.Nome, value: o.Valor })) || [],
                        required: f.obrigatorio === "true",
                        minLength: f.limite_min ? Number(f.limite_min) : undefined,
                        maxLength: f.limite_max ? Number(f.limite_max) : undefined
                    }))
                    setFields(mappedFields)

                    // Map preenchimento_da_linkada to fillingRules
                    const mappedRules: FillingRule[] = (data.preenchimento_da_linkada || []).map((r: any) => ({
                        targetColumn: r.campo_a_preencher,
                        pattern: (r.padrao_preenchimento || []).map((p: any) => {
                            if (p.v !== undefined) return { type: 'variable', value: p.v }
                            if (p.t !== undefined) return { type: 'text', value: p.t }
                            return { type: 'text', value: '' } // Fallback
                        })
                    }))
                    setFillingRules(mappedRules)
                }
            } catch (err: any) {
                console.error('Error fetching form data:', err)
                setFetchError(`Erro ao carregar dados do formulário: ${err.message}`)
            } finally {
                setLoadingData(false)
            }
        }

        fetchFormData()
    }, [formName, open])


    const handleFieldChange = (index: number, key: keyof FormField, value: any) => {
        const newFields = [...fields]

        if (key === 'identifier') {
            if (/^[a-zA-Z0-9_]*$/.test(value)) {
                newFields[index] = { ...newFields[index], [key]: value }
            }
        } else if (key === 'maxLength' || key === 'minLength') {
            if (value === '' || /^\d+$/.test(value)) {
                newFields[index] = { ...newFields[index], [key]: value === '' ? undefined : Number(value) }
            }
        } else if (key === 'type') {
            newFields[index] = { ...newFields[index], [key]: value }
            if (value === 'select' && !newFields[index].options) {
                newFields[index].options = [{ label: '', value: '' }]
            }
            if (value === 'telefone') {
                newFields[index].minLength = 10
                newFields[index].maxLength = 11
            }
            if (value === 'operador') {
                newFields[index].maxLength = 50
                newFields[index].required = true
                newFields[index].minLength = undefined
            }
        } else {
            newFields[index] = { ...newFields[index], [key]: value }
        }

        setFields(newFields)
    }

    const handleOptionChange = (fieldIndex: number, optionIndex: number, key: keyof SelectOption, value: string) => {
        const newFields = [...fields]
        const options = [...(newFields[fieldIndex].options || [])]

        if (key === 'value') {
            options[optionIndex] = { ...options[optionIndex], [key]: value }
        } else {
            options[optionIndex] = { ...options[optionIndex], [key]: value }
        }

        newFields[fieldIndex].options = options
        setFields(newFields)
    }

    const addField = () => {
        setFields([...fields, { label: '', identifier: '', type: 'texto', required: true }])
    }

    const removeField = (index: number) => {
        const fieldToRemove = fields[index]
        const isUsed = fillingRules.some(rule =>
            rule.pattern.some(part => part.type === 'variable' && part.value === fieldToRemove.identifier)
        )

        if (isUsed) {
            alert(`O campo "${fieldToRemove.label}" não pode ser removido pois está sendo usado em "Preenchimento Tabela Final".`)
            return
        }

        if (fields.length > 1) {
            setFields(fields.filter((_, i) => i !== index))
        }
    }

    const addOption = (fieldIndex: number) => {
        const newFields = [...fields]
        const options = [...(newFields[fieldIndex].options || [])]
        options.push({ label: '', value: '' })
        newFields[fieldIndex].options = options
        setFields(newFields)
    }

    const removeOption = (fieldIndex: number, optionIndex: number) => {
        const newFields = [...fields]
        const options = [...(newFields[fieldIndex].options || [])]
        if (options.length > 1) {
            options.splice(optionIndex, 1)
            newFields[fieldIndex].options = options
            setFields(newFields)
        }
    }

    const addFillingRule = () => {
        setFillingRules([...fillingRules, { targetColumn: '', pattern: [] }])
    }

    const removeFillingRule = (index: number) => {
        if (fillingRules.length > 1) {
            setFillingRules(fillingRules.filter((_, i) => i !== index))
        }
    }

    const updateFillingRule = (index: number, key: keyof FillingRule, value: any) => {
        const newRules = [...fillingRules]
        newRules[index] = { ...newRules[index], [key]: value }
        setFillingRules(newRules)
    }

    const addPatternPart = (ruleIndex: number, type: 'text' | 'variable') => {
        const newRules = [...fillingRules]
        const pattern = [...newRules[ruleIndex].pattern]
        pattern.push({ type, value: '' })
        newRules[ruleIndex].pattern = pattern
        setFillingRules(newRules)
    }

    const updatePatternPart = (ruleIndex: number, partIndex: number, value: string) => {
        const newRules = [...fillingRules]
        newRules[ruleIndex].pattern[partIndex].value = value
        setFillingRules(newRules)
    }

    const removePatternPart = (ruleIndex: number, partIndex: number) => {
        const newRules = [...fillingRules]
        newRules[ruleIndex].pattern = newRules[ruleIndex].pattern.filter((_, i) => i !== partIndex)
        setFillingRules(newRules)
    }

    const validate = () => {
        if (!formName.trim()) return 'Erro interno: Nome do formulário não identificado.'
        if (!linkedTable) return 'Erro interno: Tabela linkada não identificada.'

        if (fields.length === 0) return 'Adicione pelo menos um campo.'

        const identifiers = new Set()
        for (let i = 0; i < fields.length; i++) {
            const f = fields[i]
            if (!f.label.trim()) return `O nome do campo ${i + 1} é obrigatório.`
            if (!f.identifier.trim()) return `O identificador do campo ${i + 1} é obrigatório.`
            if (identifiers.has(f.identifier)) return `Identificador duplicado: ${f.identifier}`
            identifiers.add(f.identifier)

            if (f.type === 'select') {
                if (!f.options || f.options.length === 0) return `Adicione opções para o campo select ${f.label}.`
                const optionValues = new Set()
                for (let j = 0; j < f.options.length; j++) {
                    const opt = f.options[j]
                    if (!opt.label.trim()) return `O nome da opção ${j + 1} no campo ${f.label} é obrigatório.`
                    if (!opt.value.trim()) return `O valor da opção ${j + 1} no campo ${f.label} é obrigatório.`
                    if (optionValues.has(opt.value)) return `Valor de opção duplicado: ${opt.value} no campo ${f.label}`
                    optionValues.add(opt.value)
                }
            } else if (f.type !== 'operador') {
                if (f.maxLength !== undefined && f.maxLength === 0) return `O limite máximo do campo ${f.label} não pode ser 0.`
                if (f.maxLength !== undefined && f.minLength !== undefined && f.maxLength < f.minLength) return `O limite máximo deve ser maior ou igual ao limite mínimo no campo ${f.label}.`
            }
        }

        // Validate Filling Rules
        const validIdentifiers = new Set(fields.map(f => f.identifier).filter(id => id && id.trim() !== ''))
        const filledColumns = new Set()
        for (let i = 0; i < fillingRules.length; i++) {
            const rule = fillingRules[i]
            if (!rule.targetColumn) return `Selecione a "Nome do campo na tabela" para o preenchimento ${i + 1}.`
            if (filledColumns.has(rule.targetColumn)) return `A coluna "${rule.targetColumn}" foi selecionada mais de uma vez.`
            filledColumns.add(rule.targetColumn)
            if (rule.pattern.length === 0) return `Adicione pelo menos "Adicionar Variável" ou "Adicionar Texto" para o preenchimento da coluna "${rule.targetColumn}".`
            for (let j = 0; j < rule.pattern.length; j++) {
                const part = rule.pattern[j]
                if (!part.value || !part.value.trim()) return `Preencha o valor do item ${j + 1} (${part.type === 'variable' ? 'Variável' : 'Texto'}) no preenchimento da coluna "${rule.targetColumn}".`

                if (part.type === 'variable' && !validIdentifiers.has(part.value)) {
                    return `A variável "${part.value}" no preenchimento da coluna "${rule.targetColumn}" refere-se a um campo que não existe mais (possivelmente foi deletado).`
                }
            }
        }

        return null
    }

    const handleSubmit = () => {
        setError(null)
        const validationError = validate()
        if (validationError) {
            setError(validationError)
            return
        }
        setIsConfirming(true)
    }

    const handleFinalSubmit = async () => {
        try {
            const campos_formulario = fields.map(f => ({
                nome_campo_formulario: f.label,
                identificador: f.identifier,
                tipo_valor: f.type,
                select: f.type === 'select'
                    ? f.options?.map(o => ({ Nome: o.label, Valor: o.value })) || []
                    : [],
                obrigatorio: f.type === 'select' || f.type === 'operador' ? "true" : (f.required ? "true" : "false"),
                limite_min: (f.type === 'select' || f.type === 'operador') ? "" : (f.minLength?.toString() || ""),
                limite_max: f.type === 'select' ? "" : (f.type === 'operador' ? "50" : (f.maxLength?.toString() || ""))
            }))

            const preenchimento_da_linkada = fillingRules.map(r => ({
                campo_a_preencher: r.targetColumn,
                padrao_preenchimento: r.pattern.map(p =>
                    p.type === 'variable' ? { v: p.value } : { t: p.value }
                )
            }))

            const { error: updateError } = await supabase
                .from('formularios')
                .update({
                    campos_formulario,
                    preenchimento_da_linkada
                })
                .eq('nome_formulario', formName)

            if (updateError) throw updateError

            onOpenChange(false)
        } catch (err: any) {
            console.error('Error updating form:', err)
            setError(`Erro ao atualizar formulário: ${err.message}`)
            setIsConfirming(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-4xl max-h-[90vh] flex flex-col p-0">
                <div className="p-6 border-b border-gray-800">
                    <DialogHeader>
                        <DialogTitle>Editar Formulário</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Editando formulário: <span className="text-blue-400 font-mono">{formName}</span>
                        </DialogDescription>
                    </DialogHeader>
                </div>

                {loadingData ? (
                    <div className="flex-1 flex items-center justify-center min-h-[400px]">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                    </div>
                ) : (
                    <ScrollArea className="flex-1 p-6 overflow-y-auto">
                        <div className="grid gap-6">
                            {/* Basic Info Display */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-gray-500">Tabela Linkada</Label>
                                    <div className="p-2 bg-gray-950/50 rounded border border-gray-800 text-gray-400 font-mono text-sm">
                                        {linkedTable}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-gray-500">Nome do Formulário</Label>
                                    <div className="p-2 bg-gray-950/50 rounded border border-gray-800 text-gray-400 font-mono text-sm">
                                        {formName}
                                    </div>
                                </div>
                            </div>

                            {/* Fields Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                                    <h3 className="text-lg font-semibold text-white">Campos do Formulário</h3>
                                </div>

                                {fields.map((field, index) => (
                                    <div key={index} className="relative space-y-4 p-4 border border-gray-800 rounded-lg bg-gray-900/50">
                                        {/* Trash Button - Absolute Top Right */}
                                        <div className="absolute top-2 right-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeField(index)}
                                                disabled={fields.length === 1}
                                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20 h-8 w-8"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        {/* Row 1: Name and Identifier */}
                                        <div className="grid grid-cols-2 gap-4 pr-10">
                                            <div className="space-y-2">
                                                <Label className="text-xs">Nome do Campo <span className="text-red-500">*</span></Label>
                                                <Input
                                                    placeholder="ex: Nome Completo"
                                                    value={field.label}
                                                    onChange={(e) => handleFieldChange(index, 'label', e.target.value)}
                                                    className="bg-gray-800 border-gray-700 text-white h-9"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">Identificador <span className="text-red-500">*</span></Label>
                                                <Input
                                                    placeholder="ex: nome_completo"
                                                    value={field.identifier}
                                                    onChange={(e) => handleFieldChange(index, 'identifier', e.target.value)}
                                                    className="bg-gray-800 border-gray-700 text-white h-9 font-mono text-sm"
                                                />
                                            </div>
                                        </div>

                                        {/* Row 2: Type */}
                                        <div className="space-y-2">
                                            <Label className="text-xs">Tipo de Valor <span className="text-red-500">*</span></Label>
                                            <Select
                                                value={field.type}
                                                onValueChange={(value) => handleFieldChange(index, 'type', value)}
                                            >
                                                <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-9">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="bg-gray-800 border-gray-700">
                                                    <SelectItem value="texto" className="text-white hover:bg-gray-700">Texto</SelectItem>
                                                    <SelectItem value="select" className="text-white hover:bg-gray-700">Select</SelectItem>
                                                    <SelectItem value="numero" className="text-white hover:bg-gray-700">Número</SelectItem>
                                                    <SelectItem value="telefone" className="text-white hover:bg-gray-700">Telefone</SelectItem>
                                                    <SelectItem value="operador" className="text-white hover:bg-gray-700">Operador</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Row 3: Min/Max Chars and Allow Empty (Hidden for Select) */}
                                        {field.type !== 'select' && field.type !== 'operador' && (
                                            <div className="flex items-end gap-4">
                                                <div className="flex-1 space-y-2">
                                                    <Label className="text-xs">Limite Mínimo de Caracteres</Label>
                                                    <Input
                                                        type="text"
                                                        placeholder="0"
                                                        value={field.minLength || ''}
                                                        onChange={(e) => handleFieldChange(index, 'minLength', e.target.value)}
                                                        className="bg-gray-800 border-gray-700 text-white h-9"
                                                        disabled={field.type === 'telefone'}
                                                        readOnly={field.type === 'telefone'}
                                                    />
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <Label className="text-xs">Limite Máximo de Caracteres</Label>
                                                    <Input
                                                        type="text"
                                                        placeholder="∞"
                                                        value={field.maxLength || ''}
                                                        onChange={(e) => handleFieldChange(index, 'maxLength', e.target.value)}
                                                        className="bg-gray-800 border-gray-700 text-white h-9"
                                                        disabled={field.type === 'telefone'}
                                                        readOnly={field.type === 'telefone'}
                                                    />
                                                </div>
                                                <div className="pb-2.5">
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox
                                                            id={`edit-required-${index}`}
                                                            checked={field.required}
                                                            onCheckedChange={(checked) => handleFieldChange(index, 'required', checked)}
                                                            className="border-gray-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                                        />
                                                        <Label htmlFor={`edit-required-${index}`} className="text-xs cursor-pointer select-none">Obrigatório</Label>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Select Options Sub-section */}
                                        {field.type === 'select' && (
                                            <div className="ml-4 pl-4 border-l-2 border-blue-900/50 space-y-3 bg-blue-900/10 p-4 rounded-r-lg">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="text-sm font-medium text-blue-200">Opções do Select</h4>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => addOption(index)}
                                                        className="text-blue-300 hover:text-blue-100 h-6 text-xs"
                                                    >
                                                        <Plus className="mr-1 h-3 w-3" /> Add Opção
                                                    </Button>
                                                </div>
                                                <div className="grid gap-3">
                                                    {field.options?.map((option, optIndex) => (
                                                        <div key={optIndex} className="flex gap-3 items-end">
                                                            <div className="flex-1 space-y-1">
                                                                <Label className="text-[10px] text-gray-400">Nome formulário</Label>
                                                                <Input
                                                                    value={option.label}
                                                                    onChange={(e) => handleOptionChange(index, optIndex, 'label', e.target.value)}
                                                                    className="bg-gray-800 border-gray-700 text-white h-8 text-sm"
                                                                    placeholder="ex: Opção 1"
                                                                />
                                                            </div>
                                                            <ArrowRight className="h-4 w-4 text-gray-600 mb-2" />
                                                            <div className="flex-1 space-y-1">
                                                                <Label className="text-[10px] text-gray-400">Valor para tabela</Label>
                                                                <Input
                                                                    value={option.value}
                                                                    onChange={(e) => handleOptionChange(index, optIndex, 'value', e.target.value)}
                                                                    className="bg-gray-800 border-gray-700 text-white h-8 text-sm font-mono"
                                                                    placeholder="ex: opcao_1"
                                                                />
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => removeOption(index, optIndex)}
                                                                disabled={(field.options?.length || 0) <= 1}
                                                                className="text-red-400 hover:text-red-300 h-8 w-8 mb-0.5"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}


                                <Button
                                    variant="outline"
                                    onClick={addField}
                                    className="w-full border-dashed border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white hover:bg-gray-800"
                                >
                                    <Plus className="mr-2 h-4 w-4" /> Adicionar Campo
                                </Button>
                            </div>

                            {/* Preenchimento Tabela Final Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                                    <h3 className="text-lg font-semibold text-white">Preenchimento Tabela Final</h3>
                                </div>

                                {fillingRules.map((rule, index) => (
                                    <div key={index} className="relative space-y-4 p-4 border border-gray-800 rounded-lg bg-gray-900/50">
                                        <div className="absolute top-2 right-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeFillingRule(index)}
                                                disabled={fillingRules.length === 1}
                                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20 h-8 w-8"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>

                                        <div className="space-y-2 pr-10">
                                            <Label className="text-xs">Nome do campo na tabela</Label>
                                            <Select
                                                value={rule.targetColumn}
                                                onValueChange={(value) => updateFillingRule(index, 'targetColumn', value)}
                                            >
                                                <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-9">
                                                    <SelectValue placeholder="Selecione a coluna..." />
                                                </SelectTrigger>
                                                <SelectContent className="bg-gray-800 border-gray-700">
                                                    {tableColumns?.map((col) => {
                                                        const isSelected = fillingRules.some((r, i) => i !== index && r.targetColumn === col)
                                                        if (isSelected) return null
                                                        return (
                                                            <SelectItem key={col} value={col} className="text-white hover:bg-gray-700">
                                                                {col}
                                                            </SelectItem>
                                                        )
                                                    })}
                                                </SelectContent>
                                            </Select>
                                            {fetchError && <p className="text-[10px] text-red-400">{fetchError}</p>}
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-xs">Padrão de Preenchimento</Label>
                                            <div className="min-h-[60px] p-3 rounded-md border border-gray-700 bg-gray-950/50 space-y-3">
                                                {rule.pattern.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 items-center">
                                                        {rule.pattern.map((part, partIndex) => (
                                                            <div key={partIndex} className="flex items-center bg-gray-900 rounded border border-gray-700 overflow-hidden">
                                                                {part.type === 'text' ? (
                                                                    <Input
                                                                        value={part.value}
                                                                        onChange={(e) => updatePatternPart(index, partIndex, e.target.value)}
                                                                        className="h-8 border-0 focus-visible:ring-0 bg-transparent min-w-[80px] w-auto max-w-[200px]"
                                                                        placeholder="Texto..."
                                                                    />
                                                                ) : (
                                                                    <Select
                                                                        value={part.value}
                                                                        onValueChange={(value) => updatePatternPart(index, partIndex, value)}
                                                                    >
                                                                        <SelectTrigger className="h-8 border-0 focus:ring-0 bg-blue-900/20 text-blue-200 min-w-[100px]">
                                                                            <SelectValue placeholder="Var..." />
                                                                        </SelectTrigger>
                                                                        <SelectContent className="bg-gray-800 border-gray-700">
                                                                            {fields.map((f) => (
                                                                                f.identifier && (
                                                                                    <SelectItem key={f.identifier} value={f.identifier} className="text-white">
                                                                                        {f.identifier}
                                                                                    </SelectItem>
                                                                                )
                                                                            ))}
                                                                        </SelectContent>
                                                                    </Select>
                                                                )}
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => removePatternPart(index, partIndex)}
                                                                    className="h-8 w-8 text-gray-500 hover:text-red-400 rounded-none hover:bg-gray-800"
                                                                >
                                                                    <X className="h-3 w-3" />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="flex gap-2">
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => addPatternPart(index, 'variable')}
                                                        className="h-7 text-xs bg-blue-900/30 text-blue-300 hover:bg-blue-900/50 border border-blue-900/50"
                                                    >
                                                        <Plus className="mr-1 h-3 w-3" /> Adicionar Variável
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => addPatternPart(index, 'text')}
                                                        className="h-7 text-xs bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
                                                    >
                                                        <Plus className="mr-1 h-3 w-3" /> Adicionar Texto
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                <Button
                                    variant="outline"
                                    onClick={addFillingRule}
                                    className="w-full border-dashed border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white hover:bg-gray-800"
                                >
                                    <Plus className="mr-2 h-4 w-4" /> Adicionar Preenchimento
                                </Button>
                            </div>
                        </div>
                    </ScrollArea>
                )}

                <div className="p-6 border-t border-gray-800">
                    {error && (
                        <div className="text-sm text-red-400 mb-4 bg-red-950/50 p-3 rounded border border-red-900/50">
                            {error}
                        </div>
                    )}
                    <DialogFooter>
                        {!isConfirming ? (
                            <>
                                <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent border-gray-700 text-white hover:bg-gray-800">
                                    Cancelar
                                </Button>
                                <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white" disabled={loadingData}>
                                    Salvar Alterações
                                </Button>
                            </>
                        ) : (
                            <div className="flex flex-col w-full gap-4">
                                <div className="text-center p-4 bg-blue-900/20 rounded border border-blue-900/50">
                                    <h4 className="text-lg font-semibold text-blue-200">Confirmar Edição</h4>
                                    <p className="text-sm text-gray-400">Deseja realmente atualizar este formulário?</p>
                                </div>
                                <div className="flex justify-between gap-3">
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsConfirming(false)}
                                        className="flex-1 bg-transparent border-gray-700 text-white hover:bg-gray-800"
                                    >
                                        Continuar editando
                                    </Button>
                                    <Button
                                        onClick={handleFinalSubmit}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        Confirmar
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog >
    )
}
