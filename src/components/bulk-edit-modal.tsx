'use client'

import { useState } from 'react'
import { Table } from '@tanstack/react-table'
import { Registro } from '@/types/schema'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Plus, Trash2, Loader2, Clock, CalendarIcon } from 'lucide-react'

// Fields that can be edited with their display names
const FIELD_OPTIONS: { value: string; label: string; adminOnly: boolean }[] = [
    { value: 'status', label: 'Status', adminOnly: false },
    { value: 'info', label: 'Info', adminOnly: false },
    { value: 'obs', label: 'Obs', adminOnly: false },
    { value: 'waha_dia', label: 'Waha Dia', adminOnly: false },
    { value: 'caiu_dia', label: 'Caiu Dia', adminOnly: false },
    { value: 'operador', label: 'Operador', adminOnly: true },
    { value: 'tipo_de_conta', label: 'Tipo de Conta', adminOnly: true },
    { value: 'tipo_chip', label: 'Tipo Chip', adminOnly: true },
    { value: 'valor', label: 'Valor', adminOnly: true },
    { value: 'dispositivo', label: 'Dispositivo', adminOnly: true },
    { value: 'instancia', label: 'Instância', adminOnly: true },
    { value: 'numero', label: 'Número', adminOnly: true },
    { value: 'codigo', label: 'Código', adminOnly: true },
]

// Fields that use date picker
const DATE_FIELDS = ['waha_dia', 'caiu_dia']

const STATUS_OPTIONS = [
    'Inválido',
    'Caiu',
    'Verificar',
    'Maturando',
    'Vendedor',
    'Waha.levezaativa',
    'API Uazapi',
    'Recondicionar',
    'Sem Zap',
]

interface FieldEdit {
    id: string
    field: string
    value: string
}

interface BulkEditModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    table: Table<Registro>
    role: 'admin' | 'user' | null
}

export function BulkEditModal({
    open,
    onOpenChange,
    table,
    role,
}: BulkEditModalProps) {
    const [fieldEdits, setFieldEdits] = useState<FieldEdit[]>([
        { id: '1', field: '', value: '' },
    ])
    const [saving, setSaving] = useState(false)
    const [statusPopoverOpen, setStatusPopoverOpen] = useState<string | null>(null)
    const [calendarPopoverOpen, setCalendarPopoverOpen] = useState<string | null>(null)

    const selectedRows = table.getFilteredSelectedRowModel().rows
    const selectedCount = selectedRows.length

    // Filter fields based on role
    const availableFields = FIELD_OPTIONS.filter(
        (field) => role === 'admin' || !field.adminOnly
    )

    // Get fields already selected
    const selectedFields = fieldEdits.map((fe) => fe.field).filter(Boolean)

    const addFieldEdit = () => {
        const newId = String(Date.now())
        setFieldEdits([...fieldEdits, { id: newId, field: '', value: '' }])
    }

    const removeFieldEdit = (id: string) => {
        if (fieldEdits.length > 1) {
            setFieldEdits(fieldEdits.filter((fe) => fe.id !== id))
        }
    }

    const updateFieldEdit = (id: string, updates: Partial<FieldEdit>) => {
        setFieldEdits(
            fieldEdits.map((fe) =>
                fe.id === id ? { ...fe, ...updates } : fe
            )
        )
    }

    const handleSave = async () => {
        // Filter out empty field edits
        const validEdits = fieldEdits.filter((fe) => fe.field && fe.value !== undefined)

        if (validEdits.length === 0) {
            alert('Selecione ao menos um campo para editar')
            return
        }

        setSaving(true)

        try {
            // Build the update object
            const updates: Record<string, string> = {}
            validEdits.forEach((fe) => {
                updates[fe.field] = fe.value
            })

            // Check if any codigo-related fields are being updated
            const codigoFields = ['dispositivo', 'instancia', 'numero']
            const isUpdatingCodigoFields = validEdits.some((fe) => codigoFields.includes(fe.field))

            if (isUpdatingCodigoFields) {
                // Need to update each row individually to calculate correct codigo
                for (const row of selectedRows) {
                    const currentData = row.original

                    // Get values, using new value if being updated, otherwise current value
                    const dispositivo = updates.dispositivo !== undefined ? updates.dispositivo : currentData.dispositivo || ''
                    const instancia = updates.instancia !== undefined ? updates.instancia : currentData.instancia || ''
                    const numero = updates.numero !== undefined ? updates.numero : currentData.numero || ''

                    // Fix: Add INS prefix to numbered instances
                    let formattedInstancia = instancia
                    if (/^\d+$/.test(instancia)) {
                        formattedInstancia = `INS${instancia}`
                    }

                    // Generate new codigo
                    const cleanNumero = numero.replace(/\D/g, '')

                    // DATE CHECK Rule: If created >= Jan 9, 2026, use FULL number. Else use last 4.
                    const cutoffDate = new Date('2026-01-09T00:00:00-03:00') // Local time start of day
                    let numberPart = cleanNumero.slice(-4) // Default old rule

                    if (currentData.data) {
                        const recordDate = new Date(currentData.data)
                        // If record date is valid and >= cutoff, use full number
                        if (!isNaN(recordDate.getTime()) && recordDate >= cutoffDate) {
                            numberPart = cleanNumero
                        }
                    }

                    const codigoParts = [dispositivo, formattedInstancia, numberPart].filter(Boolean)
                    const newCodigo = codigoParts.join('-')

                    // Update this row with the fields and generated codigo
                    const rowUpdates = { ...updates, codigo: newCodigo }

                    const { error } = await supabase
                        .from('registros')
                        .update(rowUpdates)
                        .eq('id', currentData.id)

                    if (error) {
                        console.error('Error updating row:', error)
                        throw error
                    }
                }
            } else {
                // No codigo fields being updated, do a simple bulk update
                const rowIds = selectedRows.map((row) => row.original.id)

                const { error } = await supabase
                    .from('registros')
                    .update(updates)
                    .in('id', rowIds)

                if (error) {
                    console.error('Error in bulk update:', error)
                    alert('Erro ao atualizar: ' + error.message)
                    setSaving(false)
                    return
                }
            }

            // Success - close modal and clear selection
            onOpenChange(false)
            table.resetRowSelection()
            setFieldEdits([{ id: '1', field: '', value: '' }])
        } catch (err) {
            console.error('Error in bulk update:', err)
            alert('Erro ao atualizar')
        } finally {
            setSaving(false)
        }
    }

    const handleClose = () => {
        onOpenChange(false)
        setFieldEdits([{ id: '1', field: '', value: '' }])
    }

    // Handle status multi-select
    const toggleStatusValue = (editId: string, statusOption: string, currentValue: string) => {
        const currentValues = currentValue ? currentValue.split(', ').filter(Boolean) : []
        const selectedSet = new Set(currentValues)

        if (selectedSet.has(statusOption)) {
            selectedSet.delete(statusOption)
        } else {
            selectedSet.add(statusOption)
        }

        const newValue = Array.from(selectedSet).join(', ')
        updateFieldEdit(editId, { value: newValue })
    }

    // Set date to current timestamp
    const setNowDate = (editId: string) => {
        const now = new Date().toISOString()
        updateFieldEdit(editId, { value: now })
    }

    // Set date from calendar (start of day)
    const setCalendarDate = (editId: string, date: Date | undefined) => {
        if (date) {
            // Set to start of day (00:00:00)
            const startOfDay = new Date(date)
            startOfDay.setHours(0, 0, 0, 0)
            updateFieldEdit(editId, { value: startOfDay.toISOString() })
            setCalendarPopoverOpen(null)
        }
    }

    // Format date for display
    const formatDateDisplay = (value: string) => {
        if (!value) return ''
        try {
            const date = new Date(value)
            return format(date, "dd/MM/yyyy HH:mm:ss", { locale: ptBR })
        } catch {
            return value
        }
    }

    // Render input based on field type
    const renderFieldInput = (fieldEdit: FieldEdit) => {
        if (!fieldEdit.field) return null

        // Status field - multi-select
        if (fieldEdit.field === 'status') {
            return (
                <Popover
                    open={statusPopoverOpen === fieldEdit.id}
                    onOpenChange={(open) => setStatusPopoverOpen(open ? fieldEdit.id : null)}
                >
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className="w-full justify-start bg-gray-800 border-gray-700 text-left font-normal"
                        >
                            {fieldEdit.value || 'Selecione os status...'}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[220px] p-2 bg-gray-800 border-gray-700" align="start">
                        <div className="space-y-1 max-h-[300px] overflow-y-auto">
                            {STATUS_OPTIONS.map((option) => {
                                const currentValues = fieldEdit.value ? fieldEdit.value.split(', ').filter(Boolean) : []
                                const isSelected = currentValues.includes(option)
                                return (
                                    <div
                                        key={option}
                                        className="flex items-center space-x-2 cursor-pointer hover:bg-gray-700 rounded-sm p-1"
                                        onClick={() => toggleStatusValue(fieldEdit.id, option, fieldEdit.value)}
                                    >
                                        <Checkbox checked={isSelected} />
                                        <span className="text-sm text-gray-200">{option}</span>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="flex items-center justify-end pt-2 border-t border-gray-700 mt-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => {
                                    updateFieldEdit(fieldEdit.id, { value: '' })
                                    setStatusPopoverOpen(null)
                                }}
                            >
                                Limpar
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>
            )
        }

        // Date fields - waha_dia, caiu_dia
        if (DATE_FIELDS.includes(fieldEdit.field)) {
            return (
                <div className="space-y-2">
                    {/* Display current value */}
                    {fieldEdit.value && (
                        <div className="text-sm text-blue-300 bg-blue-500/10 px-3 py-2 rounded border border-blue-500/30">
                            {formatDateDisplay(fieldEdit.value)}
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setNowDate(fieldEdit.id)}
                            className="flex-1 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-green-500/30 hover:border-green-400/50 text-green-300 hover:text-green-200"
                        >
                            <Clock className="mr-2 h-4 w-4" />
                            Agora
                        </Button>

                        <Popover
                            open={calendarPopoverOpen === fieldEdit.id}
                            onOpenChange={(open) => setCalendarPopoverOpen(open ? fieldEdit.id : null)}
                        >
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 bg-gray-800 border-gray-700 text-gray-300 hover:text-white"
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    Selecionar Data
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 bg-gray-800 border-gray-700" align="start">
                                <Calendar
                                    mode="single"
                                    selected={fieldEdit.value ? new Date(fieldEdit.value) : undefined}
                                    onSelect={(date) => setCalendarDate(fieldEdit.id, date)}
                                    locale={ptBR}
                                    className="rounded-md border-0"
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
            )
        }

        // Default - text input
        return (
            <Input
                placeholder="Novo valor"
                value={fieldEdit.value}
                onChange={(e) =>
                    updateFieldEdit(fieldEdit.id, { value: e.target.value })
                }
                className="bg-gray-800 border-gray-700"
            />
        )
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px] bg-gray-900 border-gray-700 text-gray-100">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-white">
                        Editar {selectedCount} {selectedCount === 1 ? 'registro' : 'registros'}
                    </DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Selecione os campos que deseja alterar e defina os novos valores.
                        As alterações serão aplicadas a todas as linhas selecionadas.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {fieldEdits.map((fieldEdit, index) => (
                        <div key={fieldEdit.id} className="flex items-start gap-2">
                            <div className="flex-1 space-y-2">
                                <Select
                                    value={fieldEdit.field}
                                    onValueChange={(value) =>
                                        updateFieldEdit(fieldEdit.id, { field: value, value: '' })
                                    }
                                >
                                    <SelectTrigger className="bg-gray-800 border-gray-700">
                                        <SelectValue placeholder="Selecione o campo" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-700">
                                        {availableFields.map((field) => (
                                            <SelectItem
                                                key={field.value}
                                                value={field.value}
                                                disabled={selectedFields.includes(field.value) && fieldEdit.field !== field.value}
                                            >
                                                {field.label}
                                                {field.adminOnly && (
                                                    <span className="ml-2 text-xs text-purple-400">(Admin)</span>
                                                )}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {renderFieldInput(fieldEdit)}
                            </div>

                            {fieldEdits.length > 1 && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeFieldEdit(fieldEdit.id)}
                                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 mt-1"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    ))}

                    {fieldEdits.length < availableFields.length && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={addFieldEdit}
                            className="w-full border-dashed border-gray-600 text-gray-400 hover:text-white hover:border-gray-500"
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Adicionar outro campo
                        </Button>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        className="border-gray-600 text-gray-300 hover:text-white"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving || fieldEdits.every((fe) => !fe.field)}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            'Salvar Alterações'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
