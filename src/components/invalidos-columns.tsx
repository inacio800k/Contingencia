'use client'

import { Column, ColumnDef, Row, Table, CellContext } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown, Check, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { Checkbox } from '@/components/ui/checkbox'
import { useState, useMemo, useEffect } from 'react'
import { Registro } from '@/types/schema'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { EditableCell as EditableCellComponent } from '@/components/editable-cell'
import { DatePickerCell as DatePickerCellComponent } from '@/components/date-picker-cell'
import { DataTableColumnHeader } from '@/components/columns'

// Standard editable cell renderer for invalidos table
const EditableCell = (props: CellContext<Registro, unknown>) => {
    const { getValue, row, column, table } = props
    const value = getValue() as string | number | null

    const rowId = String(row.original.id)
    const columnId = column.id
    const role = table.options.meta?.role
    const selectedCell = table.options.meta?.selectedCell
    const editingCell = table.options.meta?.editingCell
    const onCellSelect = table.options.meta?.onCellSelect
    const onCellStartEdit = table.options.meta?.onCellStartEdit
    const onCellSave = table.options.meta?.onCellSave
    const onCellCancel = table.options.meta?.onCellCancel

    const isSelected = selectedCell?.rowId === rowId && selectedCell?.columnId === columnId
    const isEditing = editingCell?.rowId === rowId && editingCell?.columnId === columnId
    // Admin always can edit in invalidos page
    const canEdit = role === 'admin'

    return (
        <EditableCellComponent
            value={value}
            rowId={rowId}
            columnId={columnId}
            isSelected={isSelected}
            isEditing={isEditing}
            canEdit={canEdit}
            replaceContent={editingCell?.replaceContent} // Pass replaceContent
            onSelect={onCellSelect || (() => { })}
            onStartEdit={onCellStartEdit || ((_r: string, _c: string, _rc?: boolean) => { })}
            onSave={onCellSave || (async () => { })}
            onCancel={onCellCancel || (() => { })}
        />
    )
}

const DatePickerCell = (props: CellContext<Registro, unknown>) => {
    const { getValue, row, column, table } = props
    const value = getValue() as string | null

    const rowId = String(row.original.id)
    const columnId = column.id
    const selectedCell = table.options.meta?.selectedCell
    const onCellSelect = table.options.meta?.onCellSelect
    const onCellSave = table.options.meta?.onCellSave

    const isSelected = selectedCell?.rowId === rowId && selectedCell?.columnId === columnId

    return (
        <DatePickerCellComponent
            value={value}
            rowId={rowId}
            columnId={columnId}
            isSelected={isSelected}
            onSelect={onCellSelect || (() => { })}
            onSave={onCellSave || (async () => { })}
        />
    )
}

// Status column with multi-select popover for invalidos table
const StatusCell = (props: CellContext<Registro, unknown>) => {
    const { getValue, row, column, table } = props
    const value = getValue() as string | null
    const [statusPopoverOpen, setStatusPopoverOpen] = useState(false)
    const [localValue, setLocalValue] = useState(value)

    const rowId = String(row.original.id)
    const columnId = column.id
    const selectedCell = table.options.meta?.selectedCell
    const onCellSelect = table.options.meta?.onCellSelect
    const onCellSave = table.options.meta?.onCellSave

    const isSelected = selectedCell?.rowId === rowId && selectedCell?.columnId === columnId

    // Sync local value when external value changes
    useEffect(() => {
        setLocalValue(value)
    }, [value])

    const updateStatus = async (newValue: string) => {
        // Move to registros if status is NOT exactly 'Inválido'
        // (e.g. 'Inválido, Sem Zap', 'Verificar', 'Caiu' should all move to registros)
        const shouldMoveToRegistros = newValue !== 'Inválido' && newValue !== ''

        if (shouldMoveToRegistros) {
            // Move record from invalidos to registros
            console.log('[StatusCell invalidos] Moving record to registros:', { id: row.original.id, newStatus: newValue })

            try {
                // 1. Build record data explicitly (without id)
                const dataToInsert = {
                    data: row.original.data,
                    operador: row.original.operador,
                    tipo_de_conta: row.original.tipo_de_conta,
                    dispositivo: row.original.dispositivo,
                    instancia: row.original.instancia,
                    numero: row.original.numero,
                    codigo: row.original.codigo,
                    status: newValue, // Use the new status
                    info: row.original.info,
                    obs: row.original.obs,
                    tipo_chip: row.original.tipo_chip,
                    valor: row.original.valor,
                    waha_dia: row.original.waha_dia,
                    caiu_dia: row.original.caiu_dia,
                    ultima_att: new Date().toISOString(), // Update timestamp
                    id: row.original.id, // Preserve ID from invalidos table
                }

                // 2. Check if record with same codigo already exists in registros
                const { data: existingRecord } = await supabase
                    .from('registros')
                    .select('id')
                    .eq('codigo', row.original.codigo)
                    .single()

                let insertError = null

                if (existingRecord) {
                    // Update existing record
                    console.log('[StatusCell invalidos] Record exists, updating:', existingRecord.id)
                    // Do NOT update the ID of an existing record
                    const { id, ...dataToUpdate } = dataToInsert
                    const { error } = await supabase
                        .from('registros')
                        .update(dataToUpdate)
                        .eq('id', existingRecord.id)
                    insertError = error
                } else {
                    // Insert new record
                    console.log('[StatusCell invalidos] Inserting new record with ID:', dataToInsert.id)
                    const { error } = await supabase
                        .from('registros')
                        .insert(dataToInsert)
                    insertError = error
                }

                if (insertError) {
                    console.error('Error inserting/updating registros:', insertError)
                    console.error('Data:', JSON.stringify(dataToInsert, null, 2))
                    alert('Erro ao mover para registros: ' + insertError.message)
                    return
                }

                // 3. Delete from invalidos table
                const { error: deleteError } = await supabase
                    .from('invalidos')
                    .delete()
                    .eq('id', row.original.id)

                if (deleteError) {
                    console.error('Error deleting from invalidos:', deleteError)
                    alert('Erro ao remover de inválidos: ' + deleteError.message)
                    return
                }

                console.log('[StatusCell invalidos] Record moved successfully!')
                // The realtime subscription will handle removing it from the UI

            } catch (err) {
                console.error('Error moving record:', err)
                alert('Erro ao mover registro')
            }
        } else {
            // Just update the status in invalidos table
            setLocalValue(newValue)

            if (onCellSave) {
                await onCellSave(rowId, 'status', newValue)
            } else {
                console.log('[StatusCell invalidos] Updating status:', { id: row.original.id, newValue })
                const { error } = await supabase
                    .from('invalidos')
                    .update({ status: newValue })
                    .eq('id', row.original.id)

                if (error) {
                    console.error('Error updating status:', error)
                    alert('Erro ao atualizar: ' + error.message)
                    setLocalValue(value)
                }
            }
        }
    }

    const statusOptions = [
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

    const currentValues = localValue ? String(localValue).split(', ').filter(Boolean) : []
    const selectedSet = new Set(currentValues)

    return (
        <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
            <PopoverTrigger asChild>
                <div
                    className={cn(
                        "h-8 w-full cursor-pointer hover:bg-accent px-1 py-2 rounded flex items-center",
                        (isSelected || statusPopoverOpen) && "ring-2 ring-blue-500 ring-inset bg-blue-50/10"
                    )}
                    onClick={() => onCellSelect && onCellSelect(rowId, columnId)}
                >
                    <span className="text-sm truncate">
                        {localValue || '(Vazio)'}
                    </span>
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-2" align="end">
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                    {statusOptions.map((option) => {
                        const isOptionSelected = selectedSet.has(option)
                        return (
                            <div
                                key={option}
                                className="flex items-center space-x-2 cursor-pointer hover:bg-accent rounded-sm p-1"
                                onClick={() => {
                                    if (isOptionSelected) {
                                        selectedSet.delete(option)
                                    } else {
                                        selectedSet.add(option)
                                    }
                                    const newValue = Array.from(selectedSet).join(', ')
                                    updateStatus(newValue)
                                }}
                            >
                                <Checkbox checked={isOptionSelected} />
                                <span className="text-sm">{option}</span>
                            </div>
                        )
                    })}
                </div>
                <div className="flex items-center justify-end pt-2 border-t mt-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                            updateStatus('')
                            setStatusPopoverOpen(false)
                        }}
                    >
                        Limpar
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}

export const invalidosColumns: ColumnDef<Registro>[] = [
    {
        id: 'select',
        header: ({ table }) => (
            <div className="flex justify-center px-2">
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && 'indeterminate')
                    }
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Selecionar todos"
                    className="translate-y-[2px]"
                />
            </div>
        ),
        cell: ({ row }) => (
            <div className="flex justify-center px-2">
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Selecionar linha"
                    className="translate-y-[2px]"
                />
            </div>
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: 'id',
        header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
        cell: ({ row, column, table }) => {
            const rowId = String(row.original.id)
            const columnId = column.id
            const selectedCell = table.options.meta?.selectedCell
            const onCellSelect = table.options.meta?.onCellSelect
            const isSelected = selectedCell?.rowId === rowId && selectedCell?.columnId === columnId

            return (
                <EditableCellComponent
                    value={row.getValue('id')}
                    rowId={rowId}
                    columnId={columnId}
                    isSelected={isSelected}
                    isEditing={false}
                    canEdit={false}
                    onSelect={onCellSelect || (() => { })}
                    onStartEdit={() => { }}
                    onSave={async () => { }}
                    onCancel={() => { }}
                    className="w-[50px] justify-center"
                />
            )
        },
        enableHiding: true,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'data',
        header: ({ column }) => <DataTableColumnHeader column={column} title="DATA" />,
        cell: ({ row, column, table }) => {
            const date = new Date(row.getValue('data'))
            const formatted = format(date, 'dd/MM/yyyy HH:mm:ss')

            const rowId = String(row.original.id)
            const columnId = column.id
            const selectedCell = table.options.meta?.selectedCell
            const onCellSelect = table.options.meta?.onCellSelect
            const isSelected = selectedCell?.rowId === rowId && selectedCell?.columnId === columnId

            return (
                <EditableCellComponent
                    value={formatted}
                    rowId={rowId}
                    columnId={columnId}
                    isSelected={isSelected}
                    isEditing={false}
                    canEdit={false}
                    onSelect={onCellSelect || (() => { })}
                    onStartEdit={() => { }}
                    onSave={async () => { }}
                    onCancel={() => { }}
                    className="w-[150px]"
                />
            )
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'ultima_att',
        header: ({ column }) => <DataTableColumnHeader column={column} title="ÚLTIMA ALT." />,
        cell: ({ row, column, table }) => {
            const date = new Date(row.getValue('ultima_att'))
            const formatted = format(date, 'dd/MM/yyyy HH:mm:ss')

            const rowId = String(row.original.id)
            const columnId = column.id
            const selectedCell = table.options.meta?.selectedCell
            const onCellSelect = table.options.meta?.onCellSelect
            const isSelected = selectedCell?.rowId === rowId && selectedCell?.columnId === columnId

            return (
                <EditableCellComponent
                    value={formatted}
                    rowId={rowId}
                    columnId={columnId}
                    isSelected={isSelected}
                    isEditing={false}
                    canEdit={false}
                    onSelect={onCellSelect || (() => { })}
                    onStartEdit={() => { }}
                    onSave={async () => { }}
                    onCancel={() => { }}
                    className="w-[150px]"
                />
            )
        },
        enableHiding: true,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'operador',
        header: ({ column }) => <DataTableColumnHeader column={column} title="OPERADOR" />,
        cell: EditableCell,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'tipo_de_conta',
        header: ({ column }) => <DataTableColumnHeader column={column} title="CONTA" />,
        cell: EditableCell,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'tipo_chip',
        header: ({ column }) => <DataTableColumnHeader column={column} title="TIPO CHIP" />,
        cell: EditableCell,
        enableHiding: true,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'valor',
        header: ({ column }) => <DataTableColumnHeader column={column} title="VALOR" />,
        cell: EditableCell,
        enableHiding: true,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'dispositivo',
        header: ({ column }) => <DataTableColumnHeader column={column} title="DISP" />,
        cell: EditableCell,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'instancia',
        header: ({ column }) => <DataTableColumnHeader column={column} title="INST" />,
        cell: EditableCell,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'numero',
        header: ({ column }) => <DataTableColumnHeader column={column} title="NÚMERO" />,
        cell: EditableCell,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="STATUS" />,
        cell: StatusCell,
        filterFn: (row, id, filterValue) => {
            const cellValue = row.getValue(id) as string
            if (!cellValue) return filterValue.includes('')
            return filterValue.includes(cellValue)
        },
    },
    {
        accessorKey: 'info',
        header: ({ column }) => <DataTableColumnHeader column={column} title="INFO" />,
        cell: EditableCell,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'obs',
        header: ({ column }) => <DataTableColumnHeader column={column} title="OBS" />,
        cell: EditableCell,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'waha_dia',
        header: ({ column }) => <DataTableColumnHeader column={column} title="WAHA" />,
        cell: DatePickerCell,
        enableHiding: true,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'caiu_dia',
        header: ({ column }) => <DataTableColumnHeader column={column} title="CAIU" />,
        cell: DatePickerCell,
        enableHiding: true,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'codigo',
        header: ({ column }) => <DataTableColumnHeader column={column} title="CÓDIGO" />,
        cell: EditableCell,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
]
