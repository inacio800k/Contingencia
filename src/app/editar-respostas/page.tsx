'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react'
import Link from 'next/link'
import { EditableCell } from '@/components/editable-cell'

interface FormInfo {
    name: string
    table: string
}

function EditarRespostasContent() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Get 'tabela' param.
    const currentTableParam = searchParams.get('tabela')

    const [forms, setForms] = useState<FormInfo[]>([])
    const [currentTable, setCurrentTable] = useState<string | null>(null)
    const [tableData, setTableData] = useState<any[]>([])
    const [columns, setColumns] = useState<string[]>([])
    const [loadingData, setLoadingData] = useState(false)
    const [loadingForms, setLoadingForms] = useState(true)

    // State for EditableCell coordination
    const [editingCell, setEditingCell] = useState<{ rowId: string, columnId: string } | null>(null)
    const [selectedCell, setSelectedCell] = useState<{ rowId: string, columnId: string } | null>(null)

    // Fetch list of available forms from 'formularios'
    useEffect(() => {
        const fetchForms = async () => {
            try {
                const { data, error } = await supabase
                    .from('formularios')
                    .select('nome_formulario, tabela_linkada')

                if (error) {
                    console.error('Error fetching formularios:', error)
                    alert('Erro ao carregar formulários')
                    return
                }

                if (data) {
                    // Unique forms by table name to avoid duplicates in dropdown if multiple forms point to same table
                    // But maybe user wants to see by Form Name? The request said "no dropdown Respostas a pessoa clica qual formulário ela quer ver"
                    // So we listed forms.
                    // "Default vai abrir para o primeiro formulário da tabela formulários"

                    const mappedForms = data.map(item => ({
                        name: item.nome_formulario,
                        table: item.tabela_linkada
                    })).filter(item => item.table) // Ensure table exists

                    setForms(mappedForms)

                    // Handle default selection if no param
                    if (!currentTableParam && mappedForms.length > 0) {
                        const firstFormTable = mappedForms[0].table
                        // Update URL without full reload if possible, or just set internal state
                        // Better to sync with URL
                        router.replace(`/editar-respostas?tabela=${encodeURIComponent(firstFormTable)}`)
                    }
                }
            } catch (err) {
                console.error('Unexpected error fetching forms:', err)
                alert('Erro inesperado ao carregar formulários')
            } finally {
                setLoadingForms(false)
            }
        }

        fetchForms()
    }, [currentTableParam, router])

    // Update currentTable when param changes
    useEffect(() => {
        if (currentTableParam) {
            setCurrentTable(currentTableParam)
        }
    }, [currentTableParam])

    // Fetch data when currentTable changes
    useEffect(() => {
        const fetchData = async () => {
            if (!currentTable) {
                setTableData([])
                setColumns([])
                return
            }

            setLoadingData(true)
            try {
                const { data, error } = await supabase
                    .from(currentTable)
                    .select('*')
                    .order('created_at', { ascending: false })

                if (error) {
                    console.error(`Error fetching data for ${currentTable}:`, error)
                    alert(`Erro ao carregar dados da tabela: ${currentTable}`)
                    setTableData([])
                    setColumns([])
                } else if (data && data.length > 0) {
                    setTableData(data)
                    // Infer columns from the first record keys
                    // Prioritize 'id' and 'created_at' to be first if possible, or just alphabetical?
                    // Usually original keys order is fine.
                    setColumns(Object.keys(data[0]))
                } else {
                    setTableData([])
                    setColumns([])
                }
            } catch (err) {
                console.error(`Unexpected error fetching data for ${currentTable}:`, err)
                alert(`Erro inesperado ao carregar dados`)
                setTableData([])
                setColumns([])
            } finally {
                setLoadingData(false)
            }
        }

        fetchData()
    }, [currentTable])

    const handleFormChange = (tableName: string) => {
        router.push(`/editar-respostas?tabela=${encodeURIComponent(tableName)}`)
    }

    const refreshData = () => {
        window.location.reload()
    }

    // EditableCell Handlers
    const handleSelect = (rowId: string, columnId: string) => {
        setSelectedCell({ rowId, columnId })
        setEditingCell(null) // Stop editing others
    }

    const handleStartEdit = (rowId: string, columnId: string, replaceContent?: boolean) => {
        setEditingCell({ rowId, columnId })
        setSelectedCell({ rowId, columnId })
    }

    const handleCancelEdit = () => {
        setEditingCell(null)
    }

    const handleSave = async (rowId: string, columnId: string, newValue: string) => {
        if (!currentTable) return

        // Optimistic update
        const originalData = [...tableData]
        const updatedData = tableData.map(row => {
            if (String(row.id) === rowId) {
                return { ...row, [columnId]: newValue }
            }
            return row
        })
        setTableData(updatedData)
        setEditingCell(null)

        try {
            const { error } = await supabase
                .from(currentTable)
                .update({ [columnId]: newValue })
                .eq('id', rowId)

            if (error) {
                throw error
            }
            console.log('Valor atualizado com sucesso')
        } catch (err) {
            console.error('Error updating value:', err)
            alert('Erro ao atualizar valor. Revertendo...')
            setTableData(originalData) // Revert
        }
    }

    // Find the current form name for display
    const currentFormName = forms.find(f => f.table === currentTable)?.name || currentTable

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" asChild>
                            <Link href="/">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Voltar
                            </Link>
                        </Button>
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                            Editar Respostas
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <Select
                            value={currentTable || ''}
                            onValueChange={handleFormChange}
                            disabled={loadingForms}
                        >
                            <SelectTrigger className="w-[300px] bg-gray-800 border-gray-700 text-gray-100">
                                <SelectValue placeholder="Selecione um formulário" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-700 text-gray-100">
                                {forms.map((form, index) => (
                                    <SelectItem key={`${form.table}-${index}`} value={form.table} className="focus:bg-gray-700 cursor-pointer">
                                        {form.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Button
                            variant="outline"
                            size="icon"
                            onClick={refreshData}
                            disabled={!currentTable || loadingData}
                            className="bg-gray-800 border-gray-700 hover:bg-gray-700"
                        >
                            <RefreshCw className={`h-4 w-4 ${loadingData ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="bg-gray-900/50 rounded-lg border border-gray-800 backdrop-blur-sm overflow-hidden">
                    {!currentTable ? (
                        <div className="p-12 text-center text-gray-500">
                            Carregando formulários...
                        </div>
                    ) : loadingData ? (
                        <div className="flex items-center justify-center p-24">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                            <span className="ml-3 text-gray-400">Carregando dados...</span>
                        </div>
                    ) : tableData.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            Nenhum registro encontrado nesta tabela.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-gray-800/50 sticky top-0">
                                    <TableRow className="border-gray-700 hover:bg-gray-800/50">
                                        {columns.map((col) => (
                                            <TableHead key={col} className="text-gray-300 font-medium whitespace-nowrap px-2 py-3 h-auto">
                                                {col}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tableData.map((row, i) => {
                                        const rowId = String(row.id || i) // Fallback to index if no ID (should rely on ID for editing)
                                        const canEditRow = !!row.id // Only allow editing if we have an ID to update

                                        return (
                                            <TableRow key={rowId} className="border-gray-800 hover:bg-gray-800/30">
                                                {columns.map((col) => {
                                                    const cellValue = row[col]
                                                    const isSelected = selectedCell?.rowId === rowId && selectedCell?.columnId === col
                                                    const isEditing = editingCell?.rowId === rowId && editingCell?.columnId === col

                                                    // Disable editing for id or created_at usually, but user said "edit values".
                                                    // Let's allow editing everything except maybe ID?
                                                    // Usually key columns shouldn't be edited.
                                                    const isReadOnly = col === 'id' || col === 'created_at'

                                                    return (
                                                        <TableCell key={`${rowId}-${col}`} className="p-0 border-r border-gray-800/50 last:border-0 relative">
                                                            {typeof cellValue === 'object' ? (
                                                                <div className="p-2 text-gray-400 italic text-sm">
                                                                    {JSON.stringify(cellValue)}
                                                                </div>
                                                            ) : isReadOnly ? (
                                                                <div className="p-2 text-gray-400">
                                                                    {String(cellValue)}
                                                                </div>
                                                            ) : (
                                                                <EditableCell
                                                                    value={cellValue}
                                                                    rowId={rowId}
                                                                    columnId={col}
                                                                    isSelected={isSelected}
                                                                    isEditing={isEditing}
                                                                    canEdit={canEditRow}
                                                                    onSelect={handleSelect}
                                                                    onStartEdit={handleStartEdit}
                                                                    onSave={handleSave}
                                                                    onCancel={handleCancelEdit}
                                                                    className="text-gray-300 min-h-[40px] flex items-center"
                                                                    preventBackspaceClear={true}
                                                                    preventTypeToEdit={true}
                                                                />
                                                            )}
                                                        </TableCell>
                                                    )
                                                })}
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function EditarRespostasPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen bg-gray-900">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
            </div>
        }>
            <EditarRespostasContent />
        </Suspense>
    )
}
