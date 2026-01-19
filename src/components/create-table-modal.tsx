'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Trash2, Loader2, CalendarIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface Column {
    name: string
    type: 'Texto' | 'Número' | 'Data'
    defaultValue: string
}

interface CreateTableModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    existingTableNames: string[]
}

export function CreateTableModal({ open, onOpenChange, onSuccess, existingTableNames }: CreateTableModalProps) {
    const [tableName, setTableName] = useState('')
    const [columns, setColumns] = useState<Column[]>([{ name: '', type: 'Texto', defaultValue: '' }])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleTableNameChange = (value: string) => {
        // Allow only alphanumeric and underscores
        if (/^[a-zA-Z0-9_]*$/.test(value)) {
            setTableName(value)
        }
    }

    const handleColumnChange = (index: number, field: keyof Column, value: string) => {
        const newColumns = [...columns]

        if (field === 'name') {
            // Allow only alphanumeric and underscores
            if (/^[a-zA-Z0-9_]*$/.test(value)) {
                newColumns[index].name = value
            }
        } else {
            newColumns[index][field] = value as any // Type assertion needed for strict string to union map if not careful

            // Reset default value if type changes
            if (field === 'type') {
                newColumns[index].defaultValue = ''
            }
        }
        setColumns(newColumns)
    }

    const addColumn = () => {
        setColumns([...columns, { name: '', type: 'Texto', defaultValue: '' }])
    }

    const removeColumn = (index: number) => {
        if (columns.length > 1) {
            setColumns(columns.filter((_, i) => i !== index))
        }
    }

    const validate = () => {
        if (!tableName) return 'Nome da tabela é obrigatório'
        if (existingTableNames.includes(tableName)) return 'Nome da tabela já existe'

        const columnNames = new Set()
        for (const col of columns) {
            if (!col.name) return 'Todos os campos devem ter um nome'
            if (col.name === 'id' || col.name === 'created_at') return `O nome de campo "${col.name}" não é permitido`
            if (columnNames.has(col.name)) return `Nome de campo duplicado: ${col.name}`
            columnNames.add(col.name)

            if (col.type === 'Número' && col.defaultValue && isNaN(Number(col.defaultValue))) {
                return `Valor default para o campo "${col.name}" deve ser numérico`
            }
        }

        return null
    }

    const handleSubmit = async () => {
        setError(null)
        const validationError = validate()
        if (validationError) {
            setError(validationError)
            return
        }

        setLoading(true)
        try {
            const { error: rpcError } = await supabase.rpc('create_dynamic_table', {
                table_name: tableName,
                columns: columns
            })


            if (rpcError) throw rpcError

            const { error: insertError } = await supabase
                .from('tabelada')
                .insert({
                    nome_da_tabela: tableName
                })

            if (insertError) throw insertError

            onSuccess()
            onOpenChange(false)
            setTableName('')
            setColumns([{ name: '', type: 'Texto', defaultValue: '' }])
        } catch (err: any) {
            console.error('Error creating table:', err)
            setError(err.message || 'Erro ao criar tabela')
        } finally {
            setLoading(false)
        }
    }


    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Criar Nova Tabela</DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Defina o nome da tabela e seus campos. "id" e "created_at" serão criados automaticamente.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="tableName">Nome da Tabela <span className="text-red-500">*</span></Label>
                        <Input
                            id="tableName"
                            placeholder="ex: clientes_sp"
                            value={tableName}
                            onChange={(e) => handleTableNameChange(e.target.value)}
                            className="bg-gray-800 border-gray-700 text-white"
                        />
                        <p className="text-xs text-gray-500">Apenas letras, números e underline.</p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>Campos <span className="text-red-500">*</span></Label>
                        </div>

                        {columns.map((col, index) => (
                            <div key={index} className="flex gap-4 items-start p-4 border border-gray-800 rounded-lg bg-gray-900/50">
                                <div className="space-y-2 flex-1">
                                    <Label className="text-xs">Nome do Campo</Label>
                                    <Input
                                        placeholder="nome_campo"
                                        value={col.name}
                                        onChange={(e) => handleColumnChange(index, 'name', e.target.value)}
                                        className="bg-gray-800 border-gray-700 text-white"
                                    />
                                </div>
                                <div className="space-y-2 w-[150px]">
                                    <Label className="text-xs">Tipo</Label>
                                    <Select
                                        value={col.type}
                                        onValueChange={(value: 'Texto' | 'Número' | 'Data') => handleColumnChange(index, 'type', value)}
                                    >
                                        <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-gray-800 border-gray-700">
                                            <SelectItem value="Texto" className="text-white hover:bg-gray-700">Texto</SelectItem>
                                            <SelectItem value="Número" className="text-white hover:bg-gray-700">Número</SelectItem>
                                            <SelectItem value="Data" className="text-white hover:bg-gray-700">Data</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 flex-1">
                                    <Label className="text-xs">Default (Opcional)</Label>
                                    {col.type === 'Texto' && (
                                        <Input
                                            placeholder="Valor padrão"
                                            value={col.defaultValue}
                                            onChange={(e) => handleColumnChange(index, 'defaultValue', e.target.value)}
                                            className="bg-gray-800 border-gray-700 text-white"
                                        />
                                    )}
                                    {col.type === 'Número' && (
                                        <Input
                                            placeholder="0"
                                            type="number"
                                            value={col.defaultValue}
                                            onChange={(e) => handleColumnChange(index, 'defaultValue', e.target.value)}
                                            className="bg-gray-800 border-gray-700 text-white"
                                        />
                                    )}
                                    {col.type === 'Data' && (
                                        <Select
                                            value={col.defaultValue || 'none'}
                                            onValueChange={(value) => handleColumnChange(index, 'defaultValue', value === 'none' ? '' : value)}
                                        >
                                            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-gray-800 border-gray-700">
                                                <SelectItem value="none" className="text-white hover:bg-gray-700">Nenhum</SelectItem>
                                                <SelectItem value="now()" className="text-white hover:bg-gray-700">Agora</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>
                                <div className="pt-8">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeColumn(index)}
                                        disabled={columns.length === 1}
                                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}

                        <Button
                            variant="outline"
                            onClick={addColumn}
                            className="w-full border-dashed border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white hover:bg-gray-800"
                        >
                            <Plus className="mr-2 h-4 w-4" /> Adicionar Campo
                        </Button>
                    </div>

                    {error && (
                        <div className="bg-red-900/20 border border-red-900 p-3 rounded text-sm text-red-200">
                            {error}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-transparent border-gray-700 text-white hover:bg-gray-800">
                        Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Criar Tabela
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
