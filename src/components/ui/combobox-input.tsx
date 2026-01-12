'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface ComboboxInputProps {
    id: string
    value: string
    onChange: (value: string) => void
    options: string[]
    placeholder?: string
    className?: string
}

export function ComboboxInput({
    id,
    value,
    onChange,
    options,
    placeholder = 'Selecione ou digite',
    className,
}: ComboboxInputProps) {
    const [open, setOpen] = React.useState(false)
    const inputRef = React.useRef<HTMLInputElement>(null)

    const handleSelect = (option: string) => {
        onChange(option)
        setOpen(false)
        // Schedule focus for next tick to ensure popover close doesn't steal focus
        setTimeout(() => {
            inputRef.current?.focus()
        }, 0)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div className="relative w-full">
                    <Input
                        ref={inputRef}
                        id={id}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        autoComplete="off"
                        className={cn('w-full pr-8', className)}
                        onClick={() => setOpen(true)}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg
                            className="h-4 w-4 opacity-50"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                    </div>
                </div>
            </PopoverTrigger>
            <PopoverContent
                className="w-[--radix-popover-trigger-width] p-1"
                align="start"
                sideOffset={4}
            >
                <div>
                    {options.map((option) => (
                        <div
                            key={option}
                            className={cn(
                                'cursor-pointer rounded-sm px-2 py-1.5 text-sm hover:bg-accent',
                                value === option && 'bg-accent'
                            )}
                            onClick={() => handleSelect(option)}
                        >
                            {option}
                        </div>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    )
}
