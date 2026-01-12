'use client'

import { Table } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Edit, X } from 'lucide-react'

interface BulkEditToolbarProps<TData> {
    table: Table<TData>
    onBulkEdit: () => void
}

export function BulkEditToolbar<TData>({
    table,
    onBulkEdit,
}: BulkEditToolbarProps<TData>) {
    const selectedRows = table.getFilteredSelectedRowModel().rows
    const selectedCount = selectedRows.length

    if (selectedCount === 0) {
        return null
    }

    return (
        <div className="fixed bottom-16 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-blue-500/30 bg-gradient-to-r from-gray-900/95 via-blue-900/95 to-purple-900/95 backdrop-blur-xl shadow-2xl shadow-blue-500/20">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-sm font-medium text-blue-200">
                        {selectedCount} {selectedCount === 1 ? 'linha selecionada' : 'linhas selecionadas'}
                    </span>
                </div>

                <div className="w-px h-6 bg-white/20" />

                <Button
                    onClick={onBulkEdit}
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white border-0 shadow-lg shadow-blue-500/25 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/30"
                >
                    <Edit className="mr-2 h-4 w-4" />
                    Editar Selecionados
                </Button>

                <Button
                    onClick={() => table.resetRowSelection()}
                    variant="ghost"
                    size="sm"
                    className="text-gray-400 hover:text-white hover:bg-white/10"
                >
                    <X className="mr-2 h-4 w-4" />
                    Limpar
                </Button>
            </div>
        </div>
    )
}
