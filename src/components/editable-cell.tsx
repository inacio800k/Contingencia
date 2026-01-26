'use client'

import { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { cn } from '@/lib/utils'
import { TableCell } from '@/components/ui/table'

interface EditableCellProps {
    value: string | number | null
    rowId: string
    columnId: string
    isSelected: boolean
    isEditing: boolean
    canEdit: boolean
    replaceContent?: boolean // New prop
    preventBackspaceClear?: boolean
    preventTypeToEdit?: boolean
    onSelect: (rowId: string, columnId: string) => void
    onStartEdit: (rowId: string, columnId: string, replaceContent?: boolean) => void
    onSave: (rowId: string, columnId: string, newValue: string) => Promise<void>
    onCancel: () => void
    formatDisplay?: (value: string | number | null) => React.ReactNode
    className?: string
}

export function EditableCell({
    value,
    rowId,
    columnId,
    isSelected,
    isEditing,
    canEdit,
    replaceContent, // Destructure new prop
    preventBackspaceClear,
    preventTypeToEdit,
    onSelect,
    onStartEdit,
    onSave,
    onCancel,
    formatDisplay,
    className
}: EditableCellProps) {
    const [editValue, setEditValue] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)
    const cellRef = useRef<HTMLTableCellElement>(null)

    // Focus input when entering edit mode
    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus()
            // ONLY select text if NOT replacing content
            if (!replaceContent) {
                inputRef.current.select()
            }
        }
    }, [isEditing, replaceContent])

    // Handle keyboard events when cell is selected but not editing
    useEffect(() => {
        if (!isSelected || isEditing) return

        const handleKeyDown = async (e: globalThis.KeyboardEvent) => {
            // Prevent if target is an input/textarea elsewhere
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return
            }

            // Copy: Ctrl+C
            if (e.ctrlKey && e.key === 'c') {
                e.preventDefault()
                const textValue = String(value ?? '')
                await navigator.clipboard.writeText(textValue)
                return
            }

            // Paste: Ctrl+V
            if (e.ctrlKey && e.key === 'v' && canEdit) {
                e.preventDefault()
                try {
                    const clipboardText = await navigator.clipboard.readText()
                    await onSave(rowId, columnId, clipboardText)
                } catch (err) {
                    console.error('Failed to paste:', err)
                }
                return
            }

            // Enter: Start editing (preserve content)
            if (e.key === 'Enter' && canEdit) {
                e.preventDefault()
                onStartEdit(rowId, columnId, false)
                return
            }

            // Alphanumeric: Start editing (replace content)
            if (canEdit && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                if (preventTypeToEdit) return // Block implicit edit start

                e.preventDefault()
                setEditValue(e.key)
                onStartEdit(rowId, columnId, true)
                return
            }

            // Backspace: Clear content
            if (e.key === 'Backspace' && canEdit && !preventBackspaceClear) {
                e.preventDefault()
                // Optimistically clear content
                await onSave(rowId, columnId, '')
                return
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [isSelected, isEditing, canEdit, value, rowId, columnId, onSave, onStartEdit])

    // Initialize edit value when entering edit mode
    useEffect(() => {
        if (isEditing) {
            // If editValue is empty, use current value
            if (editValue === '') {
                setEditValue(String(value ?? ''))
            }
        } else {
            // Reset when exiting edit mode
            setEditValue('')
        }
    }, [isEditing, value])

    const handleClick = () => {
        if (!isSelected) {
            onSelect(rowId, columnId)
        }
    }

    const handleDoubleClick = () => {
        if (canEdit && isSelected && !isEditing) {
            onStartEdit(rowId, columnId, false)
        }
    }

    const handleInputKeyDown = async (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            await onSave(rowId, columnId, editValue)
        } else if (e.key === 'Escape') {
            e.preventDefault()
            onCancel()
        }
    }

    const handleInputBlur = async () => {
        // Save on blur
        await onSave(rowId, columnId, editValue)
    }

    const displayValue = formatDisplay ? formatDisplay(value) : (value ?? '')

    return (
        <>
            {isEditing ? (
                <div
                    className={cn(
                        'h-8 w-full flex items-center',
                        'ring-2 ring-blue-500 ring-inset bg-blue-50/10'
                    )}
                >
                    <input
                        ref={inputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        onBlur={handleInputBlur}
                        className="w-full h-full bg-transparent border-none outline-none text-inherit px-1"
                    />
                </div>
            ) : (
                <div
                    ref={cellRef as any}
                    onClick={handleClick}
                    onDoubleClick={handleDoubleClick}
                    className={cn(
                        'h-8 w-full px-1 py-2 cursor-pointer transition-colors truncate',
                        isSelected && 'ring-2 ring-blue-500 ring-inset bg-blue-50/10',
                        !canEdit && 'cursor-default',
                        className
                    )}
                >
                    {displayValue}
                </div>
            )}
        </>
    )
}
