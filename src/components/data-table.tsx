'use client'

import * as React from 'react'

import {
    ColumnDef,
    ColumnFiltersState,
    ColumnOrderState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFacetedRowModel,
    getFacetedUniqueValues,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
    TableMeta,
} from '@tanstack/react-table'

import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core'
import {
    arrayMove,
    SortableContext,
    horizontalListSortingStrategy,
} from '@dnd-kit/sortable'

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'

import { DataTablePagination } from '@/components/data-table-pagination'
import { DataTableHeaderCell } from '@/components/data-table-header-cell'
import { BulkEditToolbar } from '@/components/bulk-edit-toolbar'
import { BulkEditModal } from '@/components/bulk-edit-modal'
import { Registro } from '@/types/schema'
import { supabase } from '@/lib/supabase'
import { DataTableToolbar } from '@/components/data-table-toolbar'

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    data: TData[]
    meta?: TableMeta<TData>
    initialColumnVisibility?: VisibilityState
    initialColumnOrder?: ColumnOrderState
    updatedRowId?: number | null
    tableName?: 'registros' | 'invalidos'
    onTableReady?: (table: any) => void
    onColumnVisibilityChange?: (visibility: VisibilityState) => void
    onColumnOrderChange?: (order: ColumnOrderState) => void
    onRowUpdate?: (rowId: string | number, data: Partial<TData>) => void
    initialSorting?: SortingState
    disableStickyHeader?: boolean
    pageSize?: number
    enableColumnOrdering?: boolean
}

export function DataTable<TData, TValue>({
    columns,
    data,
    meta,
    initialColumnVisibility,
    initialColumnOrder,
    updatedRowId,
    tableName = 'registros',
    onTableReady,
    onColumnVisibilityChange,
    onColumnOrderChange,
    onRowUpdate,
    initialSorting,
    disableStickyHeader = false,
    pageSize = 50,
    enableColumnOrdering = true,
}: DataTableProps<TData, TValue>) {
    const [rowSelection, setRowSelection] = React.useState({})
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
        initialColumnVisibility || {}
    )
    const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>(
        initialColumnOrder || []
    )
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [sorting, setSorting] = React.useState<SortingState>(initialSorting || [])
    const [isHeaderFixed, setIsHeaderFixed] = React.useState(false)
    const [tableWidth, setTableWidth] = React.useState(0)
    const [globalFilter, setGlobalFilter] = React.useState('')

    // Cell selection and editing state
    const [selectedCell, setSelectedCell] = React.useState<{ rowId: string; columnId: string } | null>(null)
    const [editingCell, setEditingCell] = React.useState<{ rowId: string; columnId: string; replaceContent: boolean } | null>(null)

    // Bulk edit modal state
    const [bulkEditOpen, setBulkEditOpen] = React.useState(false)

    // Refs for scroll tracking
    const tableContainerRef = React.useRef<HTMLDivElement>(null)
    const headerRef = React.useRef<HTMLTableSectionElement>(null)
    const fixedHeaderRef = React.useRef<HTMLDivElement>(null)
    const fixedScrollbarRef = React.useRef<HTMLDivElement>(null)

    // Scroll detection for sticky header and scrollbar
    React.useEffect(() => {
        const syncColumnWidths = () => {
            if (!headerRef.current || !fixedHeaderRef.current) return

            const originalTable = headerRef.current.closest('table')
            const fixedTable = fixedHeaderRef.current.querySelector('table')

            if (!originalTable || !fixedTable) return

            // Set fixed table to same width as original
            const tableWidth = originalTable.getBoundingClientRect().width
            fixedTable.style.width = `${tableWidth}px`
            setTableWidth(tableWidth)

            // Get all th elements from both headers
            const originalHeaders = headerRef.current.querySelectorAll('th')
            const fixedHeaders = fixedHeaderRef.current.querySelectorAll('th')

            // Apply exact widths to each column
            originalHeaders.forEach((originalTh, index) => {
                if (fixedHeaders[index]) {
                    const rect = originalTh.getBoundingClientRect()
                    fixedHeaders[index].style.width = `${rect.width}px`
                    fixedHeaders[index].style.minWidth = `${rect.width}px`
                    fixedHeaders[index].style.maxWidth = `${rect.width}px`
                }
            })

            // Sync horizontal scroll position immediately
            if (tableContainerRef.current && fixedHeaderRef.current) {
                fixedHeaderRef.current.scrollLeft = tableContainerRef.current.scrollLeft
            }
        }

        const handleScroll = () => {
            if (disableStickyHeader) return
            if (!tableContainerRef.current || !headerRef.current) return

            const tableRect = tableContainerRef.current.getBoundingClientRect()
            const headerHeight = 56 // Main page header height in pixels

            // Show fixed header when table header scrolls above main header
            if (tableRect.top <= headerHeight && tableRect.bottom > headerHeight + 50) {
                if (!isHeaderFixed) {
                    setIsHeaderFixed(true)
                    // Sync immediately when becoming fixed
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            syncColumnWidths()
                        })
                    })
                }
            } else {
                setIsHeaderFixed(false)
            }
        }

        // Sync horizontal scroll between table and fixed header/scrollbar
        const syncHorizontalScroll = (e: Event) => {
            const scrollLeft = (e.target as HTMLDivElement).scrollLeft
            if (fixedHeaderRef.current && e.target !== fixedHeaderRef.current) {
                fixedHeaderRef.current.scrollLeft = scrollLeft
            }
            if (tableContainerRef.current && e.target !== tableContainerRef.current) {
                tableContainerRef.current.scrollLeft = scrollLeft
            }
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        window.addEventListener('resize', () => {
            if (isHeaderFixed) syncColumnWidths()
            // Update table width for fixed scrollbar
            if (tableContainerRef.current) {
                const table = tableContainerRef.current.querySelector('table')
                if (table) {
                    setTableWidth(table.getBoundingClientRect().width)
                }
            }
        }, { passive: true })

        tableContainerRef.current?.addEventListener('scroll', syncHorizontalScroll, { passive: true })
        fixedScrollbarRef.current?.addEventListener('scroll', syncHorizontalScroll, { passive: true })

        // Initial check and width measurement
        handleScroll()
        if (tableContainerRef.current) {
            const table = tableContainerRef.current.querySelector('table')
            if (table) {
                setTableWidth(table.getBoundingClientRect().width)
            }
        }

        return () => {
            window.removeEventListener('scroll', handleScroll)
            window.removeEventListener('resize', () => {
                if (isHeaderFixed) syncColumnWidths()
            })
            tableContainerRef.current?.removeEventListener('scroll', syncHorizontalScroll)
        }
    }, [isHeaderFixed])

    // Cell editing handlers
    const handleCellSelect = (rowId: string, columnId: string) => {
        setSelectedCell({ rowId, columnId })
        setEditingCell(null)
    }

    const handleCellStartEdit = (rowId: string, columnId: string, replaceContent?: boolean) => {
        setEditingCell({ rowId, columnId, replaceContent: replaceContent ?? false })
    }

    const handleCellSave = async (rowId: string, columnId: string, newValue: string | null) => {
        try {
            // Fields that affect codigo generation
            const codigoFields = ['dispositivo', 'instancia', 'numero']

            let updateData: Record<string, string | null> = { [columnId]: newValue }

            // If editing a field that affects codigo, regenerate it
            if (codigoFields.includes(columnId)) {
                // Find the current row data
                const currentRow = data.find((r: any) => String(r.id) === rowId) as any
                if (currentRow) {
                    // Get current values, replacing with new value if it's the field being edited
                    const dispositivo = columnId === 'dispositivo' ? (newValue || '') : currentRow.dispositivo || ''
                    const instancia = columnId === 'instancia' ? (newValue || '') : currentRow.instancia || ''
                    const numero = columnId === 'numero' ? (newValue || '') : currentRow.numero || ''

                    // Fix: Add INS prefix to numbered instances
                    let formattedInstancia = instancia
                    if (/^\d+$/.test(instancia)) {
                        formattedInstancia = `INS${instancia}`
                    }

                    // For numero, check creating date
                    const recordDate = new Date(currentRow.data)
                    const CUTOFF_DATE = new Date('2026-01-09T00:00:00-03:00')

                    // Remove non-digits from numero
                    const cleanNumero = numero.replace(/\D/g, '')

                    let numeroPart = cleanNumero.slice(-4) // Default to last 4
                    if (recordDate >= CUTOFF_DATE) {
                        numeroPart = cleanNumero // Use full number
                    }

                    const codigoParts = [dispositivo, formattedInstancia, numeroPart].filter(Boolean)
                    updateData['codigo'] = codigoParts.join('-')
                }
            }

            if (onRowUpdate) {
                onRowUpdate(rowId, updateData as unknown as Partial<TData>)
            }

            // Default implementation: update directly in Supabase
            console.log('[DataTable] Saving cell:', { tableName, rowId, columnId, newValue, updateData })

            const { data: returnedData, error } = await supabase
                .from(tableName)
                .update(updateData)
                .eq('id', rowId)
                .select() // Return the updated row to verify

            if (error) throw error

            if (!returnedData || returnedData.length === 0) {
                console.warn('[DataTable] Update succeeded but returned no data. Check RLS or IDs.')
            } else {
                console.log('[DataTable] Save successful:', returnedData[0])
            }

        } catch (err: any) {
            console.error('Error saving cell:', err)
            alert('Erro ao salvar: ' + (err.message || String(err)))
        } finally {
            // Exit edit mode
            setEditingCell(null)
        }
    }

    const handleCellCancel = () => {
        setEditingCell(null)
    }

    // Global keyboard listener for copy/paste
    React.useEffect(() => {
        if (!selectedCell) return

        const handleKeyDown = async (e: KeyboardEvent) => {
            const isInputFocused = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement

            // Ctrl+C: Copy cell value (works even in inputs)
            if (e.ctrlKey && e.key === 'c') {
                e.preventDefault()

                // Find the cell value using table model to support accessors/getters
                const row = table.getCoreRowModel().rows.find((r) => String((r.original as any).id) === selectedCell.rowId)
                if (row) {
                    const value = row.getValue(selectedCell.columnId)
                    const textValue = String(value ?? '')
                    await navigator.clipboard.writeText(textValue)
                }
                return
            }


            // Ctrl+V: Paste to cell (but NOT when input is focused to avoid interference)
            if (e.ctrlKey && e.key === 'v') {
                // If input is focused, let default paste behavior happen
                if (isInputFocused) {
                    return
                }

                e.preventDefault()

                // Check if user can edit this column
                const role = meta?.role
                const canEdit = role === 'admin' ||
                    (role === 'user' && ['status', 'info', 'obs', 'waha_dia', 'caiu_dia'].includes(selectedCell.columnId))

                if (!canEdit) {
                    return
                }

                try {
                    const clipboardText = await navigator.clipboard.readText()
                    await handleCellSave(selectedCell.rowId, selectedCell.columnId, clipboardText)
                } catch (err) {
                    console.error('Failed to paste:', err)
                }
                return
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [selectedCell, data, meta, handleCellSave])

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            columnVisibility,
            rowSelection,
            columnFilters,
            columnOrder: enableColumnOrdering ? columnOrder : undefined, // Only pass order if enabled
            globalFilter,
        },
        onGlobalFilterChange: setGlobalFilter,
        initialState: {
            pagination: {
                pageSize: pageSize,
            },
        },
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        onColumnFiltersChange: setColumnFilters,
        // BOTH visibility and order are managed internally, saved only from explicit user actions
        onColumnVisibilityChange: setColumnVisibility,
        onColumnOrderChange: enableColumnOrdering ? setColumnOrder : undefined,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
        meta: {
            ...meta,
            selectedCell,
            editingCell,
            onCellSelect: handleCellSelect,
            onCellStartEdit: handleCellStartEdit,
            onCellSave: handleCellSave,
            onCellCancel: handleCellCancel,
        },
        // Prevent automatic reset of state when data changes (e.g. realtime updates)
        // Using autoResetAll: false to cover all state including visibility and order
        autoResetAll: false,
    })

    // Pass table instance to parent
    React.useEffect(() => {
        if (onTableReady) {
            onTableReady(table)
        }
    }, [table, onTableReady])

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor)
    )

    // Handle drag end - directly call save callback, no useEffect involved!
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const oldIndex = columnOrder.indexOf(active.id as string)
            const newIndex = columnOrder.indexOf(over.id as string)

            const newOrder = arrayMove(columnOrder, oldIndex, newIndex)
            setColumnOrder(newOrder)

            // Call save callback DIRECTLY from user action - not via useEffect!
            if (onColumnOrderChange) {
                console.log('[DRAG END] Saving new order directly')
                onColumnOrderChange(newOrder)
            }
        }
    }

    const TableContent = () => (
        <div className="space-y-4 pb-6">
            {/* Fixed Header Clone - appears when scrolling */}
            {isHeaderFixed && (
                <div
                    ref={fixedHeaderRef}
                    className="fixed top-[56px] left-0 right-0 z-40 overflow-x-auto bg-gray-900 border-b border-gray-800"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    <style jsx>{`
                            div::-webkit-scrollbar {
                                display: none;
                            }
                        `}</style>
                    <div className="rounded-md border-gray-800 bg-gray-900">
                        <table className="w-full caption-bottom text-sm">
                            <thead className="bg-gray-900">
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <tr key={`fixed-${headerGroup.id}`} className="border-b border-gray-800">
                                        {headerGroup.headers.map((header) => (
                                            <th
                                                key={`fixed-${header.id}`}
                                                className="h-12 px-4 text-left align-middle font-medium text-gray-400 border-r border-gray-800/30 last:border-r-0"
                                            >
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(
                                                        header.column.columnDef.header,
                                                        header.getContext()
                                                    )}
                                            </th>
                                        ))}
                                    </tr>
                                ))}
                            </thead>
                        </table>
                    </div>
                </div>
            )}

            <div ref={tableContainerRef} className="rounded-md border border-gray-800 bg-gray-900/50 overflow-x-auto w-full">
                <Table>
                    <TableHeader ref={headerRef}>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <TableRow key={headerGroup.id} className="border-b border-gray-800 bg-gray-900 hover:bg-gray-900">
                                {enableColumnOrdering ? (
                                    <SortableContext
                                        items={columnOrder}
                                        strategy={horizontalListSortingStrategy}
                                    >
                                        {headerGroup.headers.map((header) => (
                                            <DataTableHeaderCell key={header.id} header={header} />
                                        ))}
                                    </SortableContext>
                                ) : (
                                    <>
                                        {headerGroup.headers.map((header) => (
                                            <TableHead
                                                key={header.id}
                                                colSpan={header.colSpan}
                                                className="border-r border-gray-800 last:border-r-0 relative group"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1">
                                                        {header.isPlaceholder
                                                            ? null
                                                            : flexRender(
                                                                header.column.columnDef.header,
                                                                header.getContext()
                                                            )}
                                                    </div>
                                                </div>
                                            </TableHead>
                                        ))}
                                    </>
                                )}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            (() => {
                                // Calculate duplicates once for the current page/view
                                const allRows = table.getCoreRowModel().rows
                                const numberCounts = new Map<string, number>()
                                const codigoCounts = new Map<string, number>()

                                allRows.forEach(row => {
                                    const numero = (row.original as Registro).numero
                                    if (numero) {
                                        numberCounts.set(numero, (numberCounts.get(numero) || 0) + 1)
                                    }
                                    const codigo = (row.original as Registro).codigo
                                    if (codigo) {
                                        codigoCounts.set(codigo, (codigoCounts.get(codigo) || 0) + 1)
                                    }
                                })

                                return table.getRowModel().rows.map((row) => {
                                    const numero = (row.original as Registro).numero
                                    const codigo = (row.original as Registro).codigo

                                    const isNumberDuplicate = numero && (numberCounts.get(numero) || 0) > 1
                                    const isCodigoDuplicate = codigo && (codigoCounts.get(codigo) || 0) > 1

                                    let rowClassName = `border-b border-gray-800/50 hover:bg-gray-800/30 ${(row.original as Registro).id === updatedRowId ? 'animate-pulse bg-blue-900/20' : ''}`

                                    if (isCodigoDuplicate) {
                                        rowClassName += ' bg-red-500/20 hover:bg-red-500/30'
                                    } else if (isNumberDuplicate) {
                                        rowClassName += ' bg-purple-500/20 hover:bg-purple-500/30'
                                    }

                                    // Apply custom row class from meta if provided
                                    if (table.options.meta?.getRowClassName) {
                                        // @ts-ignore
                                        const customClass = table.options.meta.getRowClassName(row)
                                        if (customClass) {
                                            rowClassName += ` ${customClass}`
                                        }
                                    }

                                    return (
                                        <TableRow
                                            key={row.id}
                                            data-state={row.getIsSelected() && 'selected'}
                                            className={rowClassName}
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <TableCell key={cell.id} className="border-r border-gray-800/30 last:border-r-0">
                                                    {flexRender(
                                                        cell.column.columnDef.cell,
                                                        cell.getContext()
                                                    )}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    )
                                })
                            })()
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    Sem resultados.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <DataTablePagination table={table} />

            {/* Bulk Edit Toolbar - appears when rows are selected */}
            <BulkEditToolbar
                table={table}
                onBulkEdit={() => setBulkEditOpen(true)}
            />

            {/* Bulk Edit Modal */}
            <BulkEditModal
                open={bulkEditOpen}
                onOpenChange={setBulkEditOpen}
                table={table as any}
                role={meta?.role || null}
            />
        </div>
    )

    if (enableColumnOrdering) {
        return (
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <TableContent />
            </DndContext>
        )
    }

    return <TableContent />
}
