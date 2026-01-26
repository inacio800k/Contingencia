"use client"

import { Table, SortingState } from "@tanstack/react-table"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableFacetedFilter } from "./data-table-faceted-filter"

interface DataTableToolbarProps<TData> {
    table: Table<TData>
}

export function DataTableToolbar<TData>({
    table,
}: DataTableToolbarProps<TData>) {
    const isFiltered = table.getState().columnFilters.length > 0

    // Check if sorting is different from default (Data descending)
    const sorting = table.getState().sorting
    const isDefaultSort = sorting.length === 1 &&
        sorting[0].id === 'data' &&
        sorting[0].desc === true
    const isSortedDirty = !isDefaultSort

    // Debug logging
    // console.log('[Toolbar] Render', { isFiltered, dragging: false, sorting, isDefaultSort, showReset })


    const showReset = isFiltered || isSortedDirty

    const statusOptions = [
        { label: 'Inválido', value: 'Inválido' },
        { label: 'Caiu', value: 'Caiu' },
        { label: 'Verificar', value: 'Verificar' },
        { label: 'Maturando', value: 'Maturando' },
        { label: 'Vendedor', value: 'Vendedor' },
        { label: 'Waha.levezaativa', value: 'Waha.levezaativa' },
        { label: 'API Uazapi', value: 'API Uazapi' },
        { label: 'Recondicionar', value: 'Recondicionar' },
        { label: 'Sem Zap', value: 'Sem Zap' },
        { label: 'Criado', value: 'Criado' },
        { label: 'Maturador', value: 'Maturador' },
    ]

    return (
        <div className="flex items-center justify-between">
            <div className="flex flex-1 items-center space-x-2">
                <Input
                    placeholder="Filtrar todas as colunas..."
                    value={(table.getState().globalFilter as string) ?? ""}
                    onChange={(event) => table.setGlobalFilter(event.target.value)}
                    className="h-8 w-[150px] lg:w-[250px]"
                />
                {table.getColumn("status") && (
                    <DataTableFacetedFilter
                        column={table.getColumn("status")}
                        title="Status"
                        options={statusOptions}
                    />
                )}
                {showReset && (
                    <Button
                        variant="ghost"
                        onClick={() => {
                            // alert('Resetando filtros e ordenação') // Visual confirmation
                            console.log('[Toolbar] Reset clicked')
                            table.resetColumnFilters()
                            // setTimeout to ensure state updates don't conflict
                            setTimeout(() => {
                                table.setSorting([{ id: 'data', desc: true }])
                            }, 0)
                        }}
                        className="h-8 px-2 lg:px-3"
                    >
                        Limpar
                        <X className="ml-2 h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    )
}
