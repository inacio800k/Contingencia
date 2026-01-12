'use client'

import { useReducer } from 'react'
import { Table, VisibilityState } from '@tanstack/react-table'
import { Settings2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger as ShadcnTrigger,
} from '@/components/ui/dropdown-menu'

interface DataTableViewOptionsProps<TData> {
    table: Table<TData>
    onSaveVisibility?: (visibility: VisibilityState) => void
}

export function DataTableViewOptions<TData>({
    table,
    onSaveVisibility,
}: DataTableViewOptionsProps<TData>) {
    // useReducer for reliable force updates
    const [, forceUpdate] = useReducer(x => x + 1, 0)

    const columns = table
        .getAllColumns()
        .filter((column) => typeof column.accessorFn !== 'undefined' && column.getCanHide())

    // Helper to get current visibility state and trigger save
    const triggerSave = () => {
        if (onSaveVisibility) {
            // Small delay to ensure table state has updated
            setTimeout(() => {
                const visibility = table.getState().columnVisibility
                console.log('[VIEW OPTIONS] Triggering save with:', visibility)
                onSaveVisibility(visibility)
            }, 50)
        }
    }

    const handleShowAll = () => {
        columns.forEach((column) => column.toggleVisibility(true))
        setTimeout(() => forceUpdate(), 0)
        triggerSave()
    }

    const handleClearAll = () => {
        columns.forEach((column) => column.toggleVisibility(false))
        setTimeout(() => forceUpdate(), 0)
        triggerSave()
    }

    return (
        <DropdownMenu>
            <ShadcnTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="ml-auto hidden h-8 lg:flex"
                >
                    <Settings2 className="mr-2 h-4 w-4" />
                    Visualização
                </Button>
            </ShadcnTrigger>
            <DropdownMenuContent align="end" className="w-[150px]">
                <DropdownMenuLabel>Alternar colunas</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="flex gap-1 px-2 py-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 flex-1 text-xs"
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleShowAll()
                        }}
                    >
                        Tudo
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 flex-1 text-xs"
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            handleClearAll()
                        }}
                    >
                        Limpar
                    </Button>
                </div>
                <DropdownMenuSeparator />
                {columns.map((column) => {
                    return (
                        <DropdownMenuCheckboxItem
                            key={column.id}
                            className="capitalize"
                            checked={column.getIsVisible()}
                            onCheckedChange={(value) => {
                                column.toggleVisibility(!!value)
                                setTimeout(() => forceUpdate(), 0)
                                triggerSave()
                            }}
                            onSelect={(e) => e.preventDefault()}
                        >
                            {column.id}
                        </DropdownMenuCheckboxItem>
                    )
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
