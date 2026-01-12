'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { flexRender, Header } from '@tanstack/react-table'
import { GripVertical } from 'lucide-react'
import { TableHead } from '@/components/ui/table'

interface DataTableHeaderCellProps<TData, TValue> {
    header: Header<TData, TValue>
}

export function DataTableHeaderCell<TData, TValue>({
    header,
}: DataTableHeaderCellProps<TData, TValue>) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: header.column.id,
    })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    // Don't allow dragging the select column
    const isSelectColumn = header.column.id === 'select'

    return (
        <TableHead
            ref={setNodeRef}
            style={style}
            colSpan={header.colSpan}
            className="border-r border-gray-800 last:border-r-0 relative group"
        >
            <div className="flex items-center gap-2">
                {!isSelectColumn && (
                    <button
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Arrastar coluna"
                    >
                        <GripVertical className="h-4 w-4 text-gray-400" />
                    </button>
                )}
                <div className="flex-1">
                    {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                </div>
            </div>
        </TableHead>
    )
}
