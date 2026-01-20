'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { supabase } from '@/lib/supabase'

interface FormField {
    nome_campo_formulario: string
    identificador: string
    tipo_valor: 'texto' | 'select' | 'numero' | 'telefone' | 'operador'
    select?: { Nome: string, Valor: string }[]
    obrigatorio: boolean | string
    limite_min?: number | string
    limite_max?: number | string
}

interface DynamicFormModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    formName: string
    fields: FormField[]
    targetTable: string
    mappingRules: any[]
}

export function DynamicFormModal({ open, onOpenChange, formName, fields, targetTable, mappingRules }: DynamicFormModalProps) {
    const [values, setValues] = useState<Record<string, string>>({})
    const [errors, setErrors] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(false)
    const [currentUser, setCurrentUser] = useState<string>('')

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                // Try to get username from profiles table first
                const { data } = await supabase
                    .from('profiles')
                    .select('username')
                    .eq('id', user.id)
                    .single()

                if (data?.username) {
                    setCurrentUser(data.username)
                } else {
                    // Fallback to email if no username in profiles
                    setCurrentUser(user.email || '')
                }
            }
        }
        fetchUser()
    }, [])

    // Initialize default values for selects
    useEffect(() => {
        if (open) {
            const initialValues: Record<string, string> = {}
            fields.forEach(field => {
                if (field.tipo_valor === 'select' && field.select && field.select.length > 0) {
                    initialValues[field.identificador] = field.select[0].Valor
                } else if (field.tipo_valor === 'operador') {
                    initialValues[field.identificador] = currentUser
                } else {
                    initialValues[field.identificador] = ''
                }
            })
            setValues(initialValues)
            setErrors({})
        }
    }, [open, fields, currentUser])


    const formatPhoneNumber = (value: string, maxLimit?: number) => {
        // Remove all non-numeric characters
        const numbers = value.replace(/\D/g, '')

        // Limit to maxLimit digits if provided
        const limited = maxLimit ? numbers.slice(0, maxLimit) : numbers

        // Apply formatting based on length
        if (limited.length <= 2) {
            return limited ? `(${limited}` : ''
        } else if (limited.length <= 6) {
            return `(${limited.slice(0, 2)}) ${limited.slice(2)}`
        } else if (limited.length <= 10) {
            return `(${limited.slice(0, 2)}) ${limited.slice(2, 6)}-${limited.slice(6)}`
        } else {
            // 11 digits or more: (XX) XXXXX-XXXX...
            // Note: simple mask usually assumes 11 max for standard BR numbers. 
            // If strictly limited to < 11 by DB, the logic above handles it via 'limited' slicing.
            // If > 11, it appends the rest.
            return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`
        }
    }

    const handleChange = (identifier: string, value: string, type: string, maxLimit?: number | string) => {
        let newValue = value

        if (type === 'numero') {
            if (!/^\d*$/.test(value)) return // Only allow numbers
        } else if (type === 'telefone') {
            newValue = formatPhoneNumber(value, maxLimit ? Number(maxLimit) : undefined)
        }

        setValues(prev => ({ ...prev, [identifier]: newValue }))

        // Clear error on change
        if (errors[identifier]) {
            setErrors(prev => {
                const newErrors = { ...prev }
                delete newErrors[identifier]
                return newErrors
            })
        }
    }

    const validate = () => {
        const newErrors: Record<string, string> = {}
        let isValid = true

        fields.forEach(field => {
            const rawValue = values[field.identificador] || ''

            // For phone, validate the length of numbers only
            const valueToValidate = field.tipo_valor === 'telefone'
                ? rawValue.replace(/\D/g, '')
                : rawValue

            const length = valueToValidate.length

            // Handle potentially string boolean/numbers from JSON
            const isRequired = String(field.obrigatorio) === 'true'
            const minLimit = field.limite_min ? Number(field.limite_min) : 0

            if (isRequired) {
                if (!valueToValidate.trim()) {
                    newErrors[field.identificador] = 'Este campo é obrigatório.'
                    isValid = false
                    return // Priority over min length
                }
            }

            if (length > 0 && minLimit > 0 && length < minLimit) {
                newErrors[field.identificador] = `Mínimo de ${minLimit} caracteres.`
                isValid = false
            }
        })

        setErrors(newErrors)
        return isValid
    }

    const isSubmitting = useRef(false)

    // Reset lock when open changes
    useEffect(() => {
        if (open) {
            isSubmitting.current = false
        }
    }, [open])

    const handleSave = async () => {
        if (!validate()) return
        if (isSubmitting.current) return

        isSubmitting.current = true
        setLoading(true)
        try {
            const payload: Record<string, any> = {}

            // Iterate over mapping rules to construct the payload
            if (mappingRules && Array.isArray(mappingRules)) {
                mappingRules.forEach(rule => {
                    const parts = rule.padrao_preenchimento || []
                    let constructedValue = ''

                    parts.forEach((part: any) => {
                        if (part.t) {
                            constructedValue += part.t
                        } else if (part.v) {
                            // Get value from form values using identifier
                            let val = values[part.v] || ''

                            // Check if this field is a phone number and strip formatting if so
                            const field = fields.find(f => f.identificador === part.v)
                            if (field?.tipo_valor === 'telefone') {
                                val = val.replace(/\D/g, '')
                            }

                            constructedValue += val
                        }
                    })

                    payload[rule.campo_a_preencher] = constructedValue
                })
            }

            console.log('Saving to', targetTable, payload)

            const { error } = await supabase
                .from(targetTable)
                .insert([payload])

            if (error) {
                throw error
            }

            // alert('Registro salvo com sucesso!')
            onOpenChange(false)
            // No need to reset isSubmitting here as modal closes

        } catch (error: any) {
            console.error('Error saving form:', error)
            alert('Erro ao salvar: ' + (error.message || 'Erro desconhecido'))
            isSubmitting.current = false
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] bg-gray-900 text-gray-100 border-gray-800">
                <DialogHeader>
                    <DialogTitle>{formName}</DialogTitle>
                    <DialogDescription>Preencha os campos abaixo.</DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] pr-4">
                    <div className="space-y-4 py-4">
                        {fields.map((field) => (
                            <div key={field.identificador} className="space-y-2">
                                <Label htmlFor={field.identificador} className="text-gray-200">
                                    {field.nome_campo_formulario}
                                    {String(field.obrigatorio) === 'true' && <span className="text-red-500 ml-1">*</span>}
                                </Label>

                                {field.tipo_valor === 'select' ? (
                                    <Select
                                        value={values[field.identificador]}
                                        onValueChange={(val) => handleChange(field.identificador, val, 'select')}
                                    >
                                        <SelectTrigger className="bg-gray-800 border-gray-700 text-gray-100">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-gray-800 border-gray-700 text-gray-100">
                                            {field.select?.map((opt, idx) => (
                                                <SelectItem key={idx} value={opt.Valor}>{opt.Nome}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Input
                                        id={field.identificador}
                                        value={values[field.identificador] || ''}
                                        onChange={(e) => handleChange(field.identificador, e.target.value, field.tipo_valor, field.limite_max)}
                                        maxLength={field.tipo_valor === 'telefone' ? undefined : (field.limite_max ? Number(field.limite_max) : undefined)}
                                        className={`bg-gray-800 border-gray-700 text-gray-100 placeholder:text-gray-500 ${errors[field.identificador] ? 'border-red-500' : ''}`}
                                        placeholder={field.tipo_valor === 'texto' || field.tipo_valor === 'operador' ? 'Digite aqui...' : (field.tipo_valor === 'telefone' ? '(00) 00000-0000' : 'Apenas números')}
                                        autoComplete="off"
                                    />
                                )}
                                {errors[field.identificador] && (
                                    <p className="text-xs text-red-500">{errors[field.identificador]}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white bg-transparent">
                        Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white border-0">
                        {loading ? 'Salvando...' : 'Salvar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
