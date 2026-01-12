'use client'

import { useState } from 'react'
import { format, parse, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Clock, Calendar as CalendarIcon, Trash2 } from 'lucide-react'

interface DatePickerCellProps {
    value: string | null
    rowId: string
    columnId: string
    isSelected: boolean
    onSelect: (rowId: string, columnId: string) => void
    onSave: (rowId: string, columnId: string, newValue: string | null) => Promise<void>
}

export function DatePickerCell({
    value,
    rowId,
    columnId,
    isSelected,
    onSelect,
    onSave,
}: DatePickerCellProps) {
    const [open, setOpen] = useState(false)
    const [showCalendar, setShowCalendar] = useState(false)

    // Helper to format date for display or DB
    const formatDateForDB = (date: Date) => {
        // Strip milliseconds: YYYY-MM-DDTHH:mm:ssZ
        return date.toISOString().split('.')[0] + 'Z'
    }

    const handleSelectCurrent = async () => {
        const now = new Date()
        await onSave(rowId, columnId, formatDateForDB(now))
        setOpen(false)
    }

    const handleSelectDate = async (date: Date | undefined) => {
        if (date) {
            await onSave(rowId, columnId, formatDateForDB(date))
            setOpen(false)
            setShowCalendar(false)
        }
    }

    const handleClear = async () => {
        await onSave(rowId, columnId, null)
        setOpen(false)
    }

    // Helper to parse potential dd/MM/yyyy
    const getDateObject = (val: string | null) => {
        if (!val) return undefined
        // Try standard Date first (for ISO)
        let d = new Date(val)
        if (isValid(d) && val.includes('-')) return d

        // Try parse dd/MM/yyyy
        d = parse(val, 'dd/MM/yyyy', new Date())
        if (isValid(d)) return d

        return undefined
    }

    const displayValue = value
        ? getDateObject(value)
            ? format(getDateObject(value)!, 'dd/MM/yyyy', { locale: ptBR })
            : value // Fallback if parsing fails
        : ''

    return (
        <Popover open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen)
            if (!isOpen) setShowCalendar(false)
        }}>
            <PopoverTrigger asChild>
                <div
                    onClick={() => {
                        onSelect(rowId, columnId)
                        setOpen(true)
                    }}
                    className={cn(
                        "h-8 w-full cursor-pointer hover:bg-accent px-1 py-2 rounded flex items-center truncate",
                        (isSelected || open) && "ring-2 ring-blue-500 ring-inset bg-blue-50/10"
                    )}
                >
                    <span className="text-sm truncate">
                        {displayValue || <span className="text-muted-foreground opacity-50">(Vazio)</span>}
                    </span>
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2 bg-gray-900 border-gray-700" align="start">
                {!showCalendar ? (
                    <div className="flex flex-col gap-2">
                        <Button
                            variant="outline"
                            className="bg-emerald-900/30 border-emerald-800 text-emerald-400 hover:bg-emerald-900/50 hover:text-emerald-300 justify-start"
                            onClick={handleSelectCurrent}
                        >
                            <Clock className="mr-2 h-4 w-4" />
                            Agora
                        </Button>
                        <Button
                            variant="outline"
                            className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white justify-start"
                            onClick={() => setShowCalendar(true)}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            Selecionar Data
                        </Button>
                        <Button
                            variant="outline"
                            className="bg-red-900/30 border-red-800 text-red-400 hover:bg-red-900/50 hover:text-red-300 justify-start"
                            onClick={handleClear}
                        >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Apagar
                        </Button>
                    </div>
                ) : (
                    <div className="p-0">
                        <div className="flex items-center justify-between mb-2 px-1">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowCalendar(false)}
                                className="h-6 px-2 text-gray-400 hover:text-white"
                            >
                                ← Voltar
                            </Button>
                        </div>
                        <Calendar
                            mode="single"
                            selected={getDateObject(value)}
                            onSelect={handleSelectDate}
                            initialFocus
                        />
                    </div>
                )}
            </PopoverContent>
        </Popover >
    )
}
