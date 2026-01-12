'use client'

import { Column, ColumnDef, Row, Table, CellContext } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown, Check, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateSellerMetrics } from '@/lib/update-metrics'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { useState, useMemo, useEffect, useRef } from 'react'
import { Registro } from '@/types/schema'
import { format } from 'date-fns'
import { supabase } from '@/lib/supabase'
import { EditableCell as EditableCellComponent } from '@/components/editable-cell'
import { DatePickerCell as DatePickerCellComponent } from '@/components/date-picker-cell'

// Extend TableMeta to include role and cell editing
declare module '@tanstack/react-table' {
    interface TableMeta<TData> {
        role?: 'admin' | 'user' | null
        selectedCell?: { rowId: string; columnId: string } | null
        editingCell?: { rowId: string; columnId: string; replaceContent: boolean } | null
        onCellSelect?: (rowId: string, columnId: string) => void
        onCellStartEdit?: (rowId: string, columnId: string, replaceContent?: boolean) => void
        onCellSave?: (rowId: string, columnId: string, newValue: string | null) => Promise<void>
        onCellCancel?: () => void
    }
}

interface DataTableColumnHeaderProps<TData, TValue>
    extends React.HTMLAttributes<HTMLDivElement> {
    column: Column<TData, TValue>
    title: string
}

export function DataTableColumnHeader<TData, TValue>({
    column,
    title,
    className,
}: DataTableColumnHeaderProps<TData, TValue>) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')

    // Recalculate unique values whenever faceted values change
    const uniqueValues = useMemo(() => {
        const values = new Set<string>()
        const faceted = column.getFacetedUniqueValues()
        faceted.forEach((value, key) => {
            values.add(String(key))
        })
        return Array.from(values).sort()
    }, [column.getFacetedUniqueValues()])

    const filteredValues = useMemo(() => {
        if (!search) return uniqueValues
        return uniqueValues.filter((value) =>
            value.toLowerCase().includes(search.toLowerCase())
        )
    }, [uniqueValues, search])

    if (!column.getCanSort() && !column.getCanFilter()) {
        return <div className={cn(className)}>{title}</div>
    }

    // Get current filter value or default to all unique values
    const currentFilterValue = column.getFilterValue() as string[] | undefined
    const defaultValues = useMemo(() => {
        return uniqueValues
    }, [uniqueValues])

    const selectedValues = new Set(currentFilterValue || defaultValues)

    return (
        <div className={cn('flex items-center space-x-2', className)}>
            <div className="flex items-center space-x-1">
                <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-3 h-8 data-[state=open]:bg-accent"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    <span>{title}</span>
                    {column.getIsSorted() === 'desc' ? (
                        <ArrowDown className="ml-2 h-4 w-4" />
                    ) : column.getIsSorted() === 'asc' ? (
                        <ArrowUp className="ml-2 h-4 w-4" />
                    ) : (
                        <ChevronsUpDown className="ml-2 h-4 w-4" />
                    )}
                </Button>
                {column.getCanFilter() && (
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                            >
                                <Filter className="h-4 w-4" />
                                <span className="sr-only">Filtrar</span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0" align="start">
                            <Command shouldFilter={false}>
                                <CommandInput
                                    placeholder={`Filtrar ${title}...`}
                                    value={search}
                                    onValueChange={setSearch}
                                />
                                <div className="border-b p-1">
                                    <div
                                        onClick={() => {
                                            const newSelected = new Set(selectedValues)
                                            filteredValues.forEach(v => newSelected.add(v))
                                            const filterValues = Array.from(newSelected)
                                            column.setFilterValue(filterValues)
                                        }}
                                        className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground justify-center text-center font-medium"
                                    >
                                        Selecionar Todos
                                    </div>
                                    <div
                                        onClick={() => {
                                            const newSelected = new Set(selectedValues)
                                            filteredValues.forEach(v => newSelected.delete(v))
                                            const filterValues = Array.from(newSelected)
                                            column.setFilterValue(filterValues)
                                        }}
                                        className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground justify-center text-center"
                                    >
                                        Desmarcar Todos
                                    </div>
                                </div>
                                <CommandList>
                                    <CommandEmpty>Nenhum resultado.</CommandEmpty>
                                    <CommandGroup>
                                        {filteredValues.map((value) => {
                                            const isSelected = selectedValues.has(value)
                                            return (
                                                <CommandItem
                                                    key={value}
                                                    value={value}
                                                    onSelect={() => {
                                                        if (isSelected) {
                                                            selectedValues.delete(value)
                                                        } else {
                                                            selectedValues.add(value)
                                                        }
                                                        // Pass filterValues directly to allow empty array
                                                        const filterValues = Array.from(selectedValues)
                                                        column.setFilterValue(filterValues)
                                                    }}
                                                >
                                                    <div
                                                        className={cn(
                                                            "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                            isSelected
                                                                ? "bg-primary text-primary-foreground"
                                                                : "opacity-50 [&_svg]:invisible"
                                                        )}
                                                    >
                                                        <Check className={cn("h-4 w-4")} />
                                                    </div>
                                                    <span className="truncate">{value || '(Vazio)'}</span>
                                                </CommandItem>
                                            )
                                        })}
                                    </CommandGroup >
                                </CommandList>
                            </Command >
                        </PopoverContent >
                    </Popover >
                )}
            </div >
        </div >
    )
}

// Helper function to check if a column is editable based on role
const isColumnEditable = (columnId: string, role: 'admin' | 'user' | null) => {
    if (role === 'admin') return true
    if (role === 'user') {
        return ['status', 'info', 'obs', 'waha_dia', 'caiu_dia'].includes(columnId)
    }
    return false
}

// Standard editable cell renderer
const EditableCell = (props: CellContext<Registro, unknown>) => {
    const { getValue, row, column, table } = props
    const value = getValue() as string | number | null

    const rowId = String(row.original.id)
    const columnId = column.id
    const role = table.options.meta?.role
    const selectedCell = table.options.meta?.selectedCell
    const editingCell = table.options.meta?.editingCell
    const onCellSelect = table.options.meta?.onCellSelect
    const onCellStartEdit = table.options.meta?.onCellStartEdit
    const onCellSave = table.options.meta?.onCellSave
    const onCellCancel = table.options.meta?.onCellCancel

    const isSelected = selectedCell?.rowId === rowId && selectedCell?.columnId === columnId
    const isEditing = editingCell?.rowId === rowId && editingCell?.columnId === columnId
    const canEdit = isColumnEditable(columnId, role ?? null)

    return (
        <EditableCellComponent
            value={value}
            rowId={rowId}
            columnId={columnId}
            isSelected={isSelected}
            isEditing={isEditing}
            canEdit={canEdit}
            replaceContent={editingCell?.replaceContent} // Pass replaceContent
            onSelect={onCellSelect || (() => { })}
            onStartEdit={onCellStartEdit || ((_r: string, _c: string, _rc?: boolean) => { })}
            onSave={onCellSave || (async () => { })}
            onCancel={onCellCancel || (() => { })}
        />
    )
}

// Codigo cell with create session button when obs is "NÃO CONECTADO"
const CodigoCell = (props: CellContext<Registro, unknown>) => {
    const { getValue, row, column, table } = props
    const value = getValue() as string | null
    const obs = row.original.obs
    const codigo = row.original.codigo
    const [isCreating, setIsCreating] = useState(false)
    const [showPopover, setShowPopover] = useState(false)
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
    const [showQrDialog, setShowQrDialog] = useState(false)
    const [pollingMessage, setPollingMessage] = useState<string | null>(null)
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const pollingCountRef = useRef(0)

    // Cleanup interval on unmount
    useEffect(() => {
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current)
            }
        }
    }, [])

    const startPolling = () => {
        // Reset state
        setPollingMessage(null)
        pollingCountRef.current = 0

        // Clear existing interval if any
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
        }

        pollingIntervalRef.current = setInterval(async () => {
            pollingCountRef.current += 1

            if (pollingCountRef.current > 4) {
                if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
                setPollingMessage("Não foi possível reconectar no momento")
                return
            }

            try {
                const response = await fetch('https://n8nnovo.levezaativa.site/webhook/atualizar-qr-code-waha-abd', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ instanceName: codigo })
                })

                const contentType = response.headers.get('content-type')

                if (contentType && contentType.includes('image')) {
                    const blob = await response.blob()
                    const imageUrl = URL.createObjectURL(blob)
                    setQrCodeUrl(imageUrl)
                    // Continue polling (do not clear interval)
                } else {
                    // Assume text response logic
                    // The user said: "se receber uma mensagem de texto... exiba o texto... e pare o ciclo"
                    // We need to check if it's JSON or plain text.
                    // If JSON, looks for message? Or just treat body as text?
                    // "se receber uma mensagem de texto" -> implies non-image response is text message

                    const text = await response.text()
                    // Check if it looks like an error or success message
                    // User said: "se retornar uma imagem, substitua... se receber uma mensagem de texto, tire a imagem... e pare"

                    // Note: API might return JSON with image inside too, but previous logic handled content-type image.
                    // Let's try to parse JSON to see if it's base64 image hidden in text

                    let isImageInJson = false
                    try {
                        const json = JSON.parse(text)
                        if (json.items || json.base64 || json.qrCode || json.qr) {
                            // It might be an image response in JSON format
                            // If it is, we should process it as image and continue polling?
                            // User instructions: "se retornar uma imagem... continue no ciclo"
                            // "se receber uma mensagem de texto... pare"

                            // Let's assume if we can extract an image, it is an image response.
                            let newQr = json.base64 || json.qrCode || json.qr || json.image
                            if (newQr) {
                                if (!newQr.startsWith('data:') && !newQr.startsWith('http')) {
                                    newQr = `data:image/png;base64,${newQr}`
                                }
                                setQrCodeUrl(newQr)
                                isImageInJson = true
                            }
                        }
                    } catch (e) {
                        // Not JSON, so it is plain text
                    }

                    if (!isImageInJson) {
                        // Treat as text message
                        setPollingMessage(text)
                        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
                    }
                }

            } catch (error) {
                console.error("Polling error:", error)
                // Continue polling on error? Or stop? 
                // Usually retry.
            }

        }, 30000) // 30 seconds
    }

    const rowId = String(row.original.id)
    const columnId = column.id
    const role = table.options.meta?.role
    const selectedCell = table.options.meta?.selectedCell
    const editingCell = table.options.meta?.editingCell
    const onCellSelect = table.options.meta?.onCellSelect
    const onCellStartEdit = table.options.meta?.onCellStartEdit
    const onCellSave = table.options.meta?.onCellSave
    const onCellCancel = table.options.meta?.onCellCancel

    const isSelected = selectedCell?.rowId === rowId && selectedCell?.columnId === columnId
    const isEditing = editingCell?.rowId === rowId && editingCell?.columnId === columnId
    const canEdit = isColumnEditable(columnId, role ?? null)

    const showCreateButton = obs === 'NÃO CONECTADO'
    const showConnectUazapi = obs === 'CON UAZAPI'

    const handleCreateSession = async () => {
        if (!codigo) {
            alert('Código não disponível')
            return
        }

        setIsCreating(true)
        try {
            const response = await fetch('https://n8nnovo.levezaativa.site/webhook/criar-instancia-waha-abd', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ instanceName: codigo }),
            })

            if (response.ok) {
                const contentType = response.headers.get('content-type')

                // Handle image response directly
                if (contentType && contentType.includes('image')) {
                    const blob = await response.blob()
                    const imageUrl = URL.createObjectURL(blob)
                    setQrCodeUrl(imageUrl)
                    setShowPopover(false)
                    setShowQrDialog(true)
                    startPolling() // Start polling here
                } else {
                    // Try to parse as JSON
                    const data = await response.json()

                    // Check for QR code in response (various formats)
                    let qrCode = null
                    if (data.qrCode) {
                        qrCode = data.qrCode
                    } else if (data.qr) {
                        qrCode = data.qr
                    } else if (data.qrcode) {
                        qrCode = data.qrcode
                    } else if (data.image) {
                        qrCode = data.image
                    } else if (data.base64) {
                        qrCode = data.base64
                    }

                    if (qrCode) {
                        // Handle base64 or URL
                        if (qrCode.startsWith('data:image')) {
                            setQrCodeUrl(qrCode)
                        } else if (qrCode.startsWith('http')) {
                            setQrCodeUrl(qrCode)
                        } else {
                            // Assume it's base64 without prefix
                            setQrCodeUrl(`data:image/png;base64,${qrCode}`)
                        }
                        setShowPopover(false)
                        setShowQrDialog(true)
                        startPolling() // Start polling here
                    } else {
                        alert('Sessão criada! QR code não encontrado na resposta.')
                        setShowPopover(false)
                    }
                }
            } else {
                const errorText = await response.text()
                alert('Erro ao criar sessão: ' + errorText)
            }
        } catch (error) {
            console.error('Error creating session:', error)
            alert('Erro ao criar sessão')
        } finally {
            setIsCreating(false)
        }
    }

    if (showCreateButton || showConnectUazapi) {
        return (
            <>
                <Popover open={showPopover} onOpenChange={setShowPopover}>
                    <PopoverTrigger asChild>
                        <div
                            className={cn(
                                "h-8 w-full cursor-pointer hover:bg-accent px-1 py-2 rounded flex items-center",
                                (isSelected || showPopover) && "ring-2 ring-blue-500 ring-inset bg-blue-50/10"
                            )}
                            onClick={() => {
                                onCellSelect && onCellSelect(rowId, columnId)
                                setShowPopover(true)
                            }}
                        >
                            <span className="text-sm truncate text-orange-400">
                                {value || '(Vazio)'}
                            </span>
                        </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-[220px] p-3 bg-gray-800 border-gray-700" align="start">
                        <div className="space-y-3">
                            <div className="text-sm text-gray-300">
                                <span className="font-medium">Código:</span> {codigo}
                            </div>
                            <div className="text-xs text-orange-400">
                                Status: {showConnectUazapi ? 'CON UAZAPI' : 'NÃO CONECTADO'}
                            </div>
                            {showConnectUazapi ? (
                                <Button
                                    onClick={async () => {
                                        if (!codigo) {
                                            alert('Código não disponível')
                                            return
                                        }

                                        setIsCreating(true)
                                        try {
                                            // Step 1: Init instance
                                            const initResponse = await fetch('https://levezaativasite.uazapi.com/instance/init', {
                                                method: 'POST',
                                                headers: {
                                                    'Accept': 'application/json',
                                                    'Content-Type': 'application/json',
                                                    'admintoken': 'JssNSqzWEMzUlBWQ3eTDPm5x14xhqc200awasgxKyOcVAdETqV'
                                                },
                                                body: JSON.stringify({
                                                    name: codigo,
                                                    systemName: 'levezaativasite'
                                                })
                                            })

                                            const initData = await initResponse.json()

                                            // Check struct based on description: "campo instance e dentro de instance vai ter um campo token"
                                            const token = initData.instance?.token || initData.token

                                            if (!token) {
                                                console.error('Init response:', initData)
                                                alert('Erro: Token não encontrado na resposta de inicialização.')
                                                return
                                            }

                                            // Step 2: Connect instance
                                            const connectResponse = await fetch('https://levezaativasite.uazapi.com/instance/connect', {
                                                method: 'POST',
                                                headers: {
                                                    'Accept': 'application/json',
                                                    'Content-Type': 'application/json',
                                                    'token': token
                                                },
                                                body: JSON.stringify({})
                                            })

                                            const connectData = await connectResponse.json()

                                            // Check struct: "campo instance, dessa vez vai ter um campo qrcode"
                                            const qrcodeRaw = connectData.instance?.qrcode || connectData.qrcode

                                            if (qrcodeRaw) {
                                                // "faça um split na vírgula ',', pegue o último item, item [1], é um base 64"
                                                const parts = qrcodeRaw.split(',')
                                                const base64Data = parts[1] || parts[0] // Fallback to 0 if no comma, assuming raw base64

                                                if (base64Data) {
                                                    const imageUrl = `data:image/png;base64,${base64Data}`
                                                    setQrCodeUrl(imageUrl)
                                                    setShowPopover(false)
                                                    setShowQrDialog(true)
                                                    // No polling for Uazapi as per instructions? User only mentioned Waha logic "Criar Sessão"
                                                    // "quando clico em Criar Sessão... para criar a sessão no waha"
                                                    // So Uazapi is excluded from polling logic.
                                                } else {
                                                    alert('Erro: QR code vazio após processamento.')
                                                }
                                            } else {
                                                console.error('Connect response:', connectData)
                                                alert('Erro: QR code não encontrado na resposta de conexão.')
                                            }

                                        } catch (error) {
                                            console.error('Error connecting Uazapi:', error)
                                            alert('Erro ao conectar Uazapi: ' + String(error))
                                        } finally {
                                            setIsCreating(false)
                                        }
                                    }}
                                    disabled={isCreating}
                                    size="sm"
                                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500"
                                >
                                    {isCreating ? 'Conectando...' : 'Conectar Uazapi'}
                                </Button>
                            ) : (
                                <Button
                                    onClick={handleCreateSession}
                                    disabled={isCreating}
                                    size="sm"
                                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500"
                                >
                                    {isCreating ? 'Criando...' : 'Criar Sessão'}
                                </Button>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>

                {/* QR Code Dialog */}
                <Dialog open={showQrDialog} onOpenChange={(open) => {
                    setShowQrDialog(open)
                    if (!open) {
                        // Optional: Stop polling if dialog closes? 
                        // User said: "mesmo se a pessoa fechar, mantenha fazendo os ciclos"
                        // So we do NOT clear interval here.
                    }
                }}>
                    <DialogContent className="sm:max-w-[400px] bg-gray-900 border-gray-700">
                        <DialogHeader>
                            <DialogTitle className="text-white">QR Code - {codigo}</DialogTitle>
                            <DialogDescription className="text-gray-400">
                                {pollingMessage || 'Escaneie o QR code com o WhatsApp para conectar'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-center p-4">
                            {pollingMessage ? (
                                <div className="text-center text-white text-lg font-medium p-4 border border-gray-600 rounded bg-gray-800">
                                    {pollingMessage}
                                </div>
                            ) : qrCodeUrl ? (
                                <img
                                    src={qrCodeUrl}
                                    alt="QR Code"
                                    className="max-w-[280px] max-h-[280px] rounded-lg"
                                />
                            ) : null}
                        </div>
                        <div className="flex justify-center gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setShowQrDialog(false)}
                                className="border-gray-600 hover:bg-gray-800 hover:text-white"
                            >
                                Fechar
                            </Button>
                            {!pollingMessage && (
                                <Button
                                    onClick={async () => {
                                        try {
                                            setIsCreating(true)

                                            // 1. Get current username (operador)
                                            const { data: { user } } = await supabase.auth.getUser()
                                            if (!user) {
                                                alert('Erro: Usuário não autenticado.')
                                                setIsCreating(false)
                                                return
                                            }

                                            const { data: profile } = await supabase
                                                .from('profiles')
                                                .select('username')
                                                .eq('id', user.id)
                                                .single()

                                            const operador = profile?.username || user.email

                                            if (showConnectUazapi) {
                                                // --- UAZAPI LOGIC ---
                                                // 2. Determine connection type (Nova vs Reconexão) for Uazapi
                                                const { count, error: countError } = await supabase
                                                    .from('conexao_wahapi')
                                                    .select('*', { count: 'exact', head: true })
                                                    .eq('numero', row.original.numero)
                                                    .eq('conectado_em', 'Uazapi')

                                                if (countError) {
                                                    console.error('Error checking existing connections:', countError)
                                                    alert('Erro ao verificar conexões: ' + countError.message)
                                                    setIsCreating(false)
                                                    return
                                                }

                                                const tipoConexao = (count && count > 0) ? 'Reconexão' : 'Nova'

                                                // 3. Insert into conexao_wahapi
                                                const { error: insertError } = await supabase
                                                    .from('conexao_wahapi')
                                                    .insert([{
                                                        codigo: codigo,
                                                        operador: operador,
                                                        conectado_em: 'Uazapi',
                                                        tipo_conta: row.original.tipo_de_conta,
                                                        numero: row.original.numero,
                                                        tipo_conexao: tipoConexao
                                                    }])

                                                if (insertError) {
                                                    console.error('Error inserting conexao_wahapi:', insertError)
                                                    alert('Erro ao registrar conexão: ' + insertError.message)
                                                    setIsCreating(false)
                                                    return
                                                }

                                                // 4. Update registros for Uazapi
                                                const today = new Date()
                                                const year = today.getFullYear()
                                                const month = String(today.getMonth() + 1).padStart(2, '0')
                                                const day = String(today.getDate()).padStart(2, '0')

                                                const obsStr = `UAZAPI - ${day}/${month}`

                                                // Determine new status
                                                let currentStatus = row.original.status || ''
                                                let newStatus = currentStatus
                                                if (!currentStatus.includes('API Uazapi')) {
                                                    if (currentStatus === '' || currentStatus === null) {
                                                        newStatus = 'API Uazapi'
                                                    } else {
                                                        newStatus = `${currentStatus}, API Uazapi`
                                                    }
                                                }

                                                const { error: updateError } = await supabase
                                                    .from('registros')
                                                    .update({
                                                        status: newStatus,
                                                        obs: obsStr
                                                    })
                                                    .eq('id', row.original.id)

                                                if (updateError) {
                                                    console.error('Error updating registros:', updateError)
                                                    alert('Erro ao atualizar registro: ' + updateError.message)
                                                } else {
                                                    setShowQrDialog(false)
                                                    setShowPopover(false)
                                                    updateSellerMetrics()
                                                }

                                            } else {
                                                // --- WAHA LOGIC (Existing) ---
                                                // 2. Determine connection type (Nova vs Reconexão) for Waha
                                                const { count, error: countError } = await supabase
                                                    .from('conexao_wahapi')
                                                    .select('*', { count: 'exact', head: true })
                                                    .eq('numero', row.original.numero)
                                                    .eq('conectado_em', 'Waha')

                                                if (countError) {
                                                    console.error('Error checking existing connections:', countError)
                                                    alert('Erro ao verificar conexões: ' + countError.message)
                                                    setIsCreating(false)
                                                    return
                                                }

                                                const tipoConexao = (count && count > 0) ? 'Reconexão' : 'Nova'

                                                // 3. Insert into conexao_wahapi
                                                const { error: insertError } = await supabase
                                                    .from('conexao_wahapi')
                                                    .insert([{
                                                        codigo: codigo,
                                                        operador: operador,
                                                        conectado_em: 'Waha',
                                                        tipo_conta: row.original.tipo_de_conta,
                                                        numero: row.original.numero,
                                                        tipo_conexao: tipoConexao
                                                    }])

                                                if (insertError) {
                                                    console.error('Error inserting conexao_wahapi:', insertError)
                                                    alert('Erro ao registrar conexão: ' + insertError.message)
                                                    setIsCreating(false)
                                                    return
                                                }

                                                // 4. Update registros for Waha
                                                const today = new Date()
                                                today.setHours(3, 0, 0, 0) // Set time to 03:00:00 as requested

                                                const year = today.getFullYear()
                                                const month = String(today.getMonth() + 1).padStart(2, '0')
                                                const day = String(today.getDate()).padStart(2, '0')
                                                const wahaDiaStr = `${year}-${month}-${day}T03:00:00`

                                                const infoStr = `Waha.levezaativa - ${day}/${month}`

                                                const { error: updateError } = await supabase
                                                    .from('registros')
                                                    .update({
                                                        status: 'Waha.levezaativa',
                                                        waha_dia: wahaDiaStr,
                                                        info: infoStr,
                                                        obs: '' // Set to empty string instead of null
                                                    })
                                                    .eq('id', row.original.id)

                                                if (updateError) {
                                                    console.error('Error updating registros:', updateError)
                                                    alert('Erro ao atualizar registro: ' + updateError.message)
                                                } else {
                                                    setShowQrDialog(false)
                                                    setShowPopover(false)
                                                    updateSellerMetrics()
                                                }
                                            }
                                        } catch (e) {
                                            console.error('Error in handleConnectionSuccess:', e)
                                            alert('Erro inesperado ao atualizar status')
                                        } finally {
                                            setIsCreating(false)
                                        }
                                    }}
                                    disabled={isCreating}
                                    className="bg-green-600 hover:bg-green-500 text-white border-none"
                                >
                                    {isCreating ? 'Processando...' : 'Conectado com Sucesso'}
                                </Button>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>
            </>
        )
    }

    // Default editable behavior
    return (
        <EditableCellComponent
            value={value}
            rowId={rowId}
            columnId={columnId}
            isSelected={isSelected}
            isEditing={isEditing}
            canEdit={canEdit}
            replaceContent={editingCell?.replaceContent} // Pass replaceContent
            onSelect={onCellSelect || (() => { })}
            onStartEdit={onCellStartEdit || ((_r: string, _c: string, _rc?: boolean) => { })}
            onSave={onCellSave || (async () => { })}
            onCancel={onCellCancel || (() => { })}
        />
    )
}

const DatePickerCell = (props: CellContext<Registro, unknown>) => {
    const { getValue, row, column, table } = props
    const value = getValue() as string | null

    const rowId = String(row.original.id)
    const columnId = column.id
    const selectedCell = table.options.meta?.selectedCell
    const onCellSelect = table.options.meta?.onCellSelect
    const onCellSave = table.options.meta?.onCellSave

    const isSelected = selectedCell?.rowId === rowId && selectedCell?.columnId === columnId

    return (
        <DatePickerCellComponent
            value={value}
            rowId={rowId}
            columnId={columnId}
            isSelected={isSelected}
            onSelect={onCellSelect || (() => { })}
            onSave={onCellSave || (async () => { })}
        />
    )
}

// Status column with multi-select popover
const StatusCell = (props: CellContext<Registro, unknown>) => {
    const { getValue, row, column, table } = props
    const value = getValue() as string | null
    const [statusPopoverOpen, setStatusPopoverOpen] = useState(false)

    const rowId = String(row.original.id)
    const columnId = column.id
    const selectedCell = table.options.meta?.selectedCell
    const onCellSelect = table.options.meta?.onCellSelect

    const isSelected = selectedCell?.rowId === rowId && selectedCell?.columnId === columnId

    const updateStatus = async (newValue: string) => {
        console.log('[StatusCell] Updating status:', { id: row.original.id, newValue })
        const { data: returnedData, error } = await supabase
            .from('registros')
            .update({ status: newValue })
            .eq('id', row.original.id)
            .select()

        if (error) {
            console.error('Error updating status:', error)
            alert('Erro ao atualizar: ' + error.message)
        } else {
            if (!returnedData || returnedData.length === 0) {
                console.warn('[StatusCell] Update succeeded but returned no data.')
            } else {
                console.log('[StatusCell] Update successful:', returnedData[0])
            }
            // Update seller metrics when status changes
            // updateSellerMetrics()
            // NOTE: Commented out - Realtime subscription now handles seller metrics updates
        }
    }

    const statusOptions = [
        'Inválido',
        'Caiu',
        'Verificar',
        'Maturando',
        'Vendedor',
        'Waha.levezaativa',
        'API Uazapi',
        'Recondicionar',
        'Sem Zap',
    ]

    const currentValues = value ? String(value).split(', ').filter(Boolean) : []
    const selectedSet = new Set(currentValues)

    return (
        <Popover open={statusPopoverOpen} onOpenChange={setStatusPopoverOpen}>
            <PopoverTrigger asChild>
                <div
                    className={cn(
                        "h-8 w-full cursor-pointer hover:bg-accent px-1 py-2 rounded flex items-center",
                        (isSelected || statusPopoverOpen) && "ring-2 ring-blue-500 ring-inset bg-blue-50/10"
                    )}
                    onClick={() => onCellSelect && onCellSelect(rowId, columnId)}
                >
                    <span className="text-sm truncate">
                        {value || '(Vazio)'}
                    </span>
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-2" align="end">
                <div className="space-y-1 max-h-[300px] overflow-y-auto">
                    {statusOptions.map((option) => {
                        const isOptionSelected = selectedSet.has(option)
                        return (
                            <div
                                key={option}
                                className="flex items-center space-x-2 cursor-pointer hover:bg-accent rounded-sm p-1"
                                onClick={() => {
                                    if (isOptionSelected) {
                                        selectedSet.delete(option)
                                    } else {
                                        selectedSet.add(option)
                                    }
                                    const newValue = Array.from(selectedSet).join(', ')
                                    updateStatus(newValue)
                                }}
                            >
                                <Checkbox checked={isOptionSelected} />
                                <span className="text-sm">{option}</span>
                            </div>
                        )
                    })}
                </div>
                <div className="flex items-center justify-end pt-2 border-t mt-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                            updateStatus('')
                            setStatusPopoverOpen(false)
                        }}
                    >
                        Limpar
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )
}

export const columns: ColumnDef<Registro>[] = [
    {
        id: 'select',
        header: ({ table }) => (
            <div className="flex justify-center px-2">
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected() ||
                        (table.getIsSomePageRowsSelected() && 'indeterminate')
                    }
                    onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                    aria-label="Selecionar todos"
                    className="translate-y-[2px]"
                />
            </div>
        ),
        cell: ({ row }) => (
            <div className="flex justify-center px-2">
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) => row.toggleSelected(!!value)}
                    aria-label="Selecionar linha"
                    className="translate-y-[2px]"
                />
            </div>
        ),
        enableSorting: false,
        enableHiding: false,
    },
    {
        accessorKey: 'id',
        header: ({ column }) => <DataTableColumnHeader column={column} title="ID" />,
        cell: ({ row, column, table }) => {
            const rowId = String(row.original.id)
            const columnId = column.id
            const selectedCell = table.options.meta?.selectedCell
            const onCellSelect = table.options.meta?.onCellSelect
            const isSelected = selectedCell?.rowId === rowId && selectedCell?.columnId === columnId

            return (
                <EditableCellComponent
                    value={row.getValue('id')}
                    rowId={rowId}
                    columnId={columnId}
                    isSelected={isSelected}
                    isEditing={false}
                    canEdit={false}
                    onSelect={onCellSelect || (() => { })}
                    onStartEdit={() => { }}
                    onSave={async () => { }}
                    onCancel={() => { }}
                    className="w-[50px] justify-center"
                />
            )
        },
        enableHiding: true,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'data',
        header: ({ column }) => <DataTableColumnHeader column={column} title="DATA" />,
        cell: ({ row, column, table }) => {
            const date = new Date(row.getValue('data'))
            const formatted = format(date, 'dd/MM/yyyy HH:mm:ss')

            const rowId = String(row.original.id)
            const columnId = column.id
            const selectedCell = table.options.meta?.selectedCell
            const onCellSelect = table.options.meta?.onCellSelect
            const isSelected = selectedCell?.rowId === rowId && selectedCell?.columnId === columnId

            return (
                <EditableCellComponent
                    value={formatted}
                    rowId={rowId}
                    columnId={columnId}
                    isSelected={isSelected}
                    isEditing={false}
                    canEdit={false}
                    onSelect={onCellSelect || (() => { })}
                    onStartEdit={() => { }}
                    onSave={async () => { }}
                    onCancel={() => { }}
                    className="w-[150px]"
                />
            )
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'ultima_att',
        header: ({ column }) => <DataTableColumnHeader column={column} title="ÚLTIMA ALT." />,
        cell: ({ row, column, table }) => {
            const date = new Date(row.getValue('ultima_att'))
            const formatted = format(date, 'dd/MM/yyyy HH:mm:ss')

            const rowId = String(row.original.id)
            const columnId = column.id
            const selectedCell = table.options.meta?.selectedCell
            const onCellSelect = table.options.meta?.onCellSelect
            const isSelected = selectedCell?.rowId === rowId && selectedCell?.columnId === columnId

            return (
                <EditableCellComponent
                    value={formatted}
                    rowId={rowId}
                    columnId={columnId}
                    isSelected={isSelected}
                    isEditing={false}
                    canEdit={false}
                    onSelect={onCellSelect || (() => { })}
                    onStartEdit={() => { }}
                    onSave={async () => { }}
                    onCancel={() => { }}
                    className="w-[150px]"
                />
            )
        },
        enableHiding: true,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'operador',
        header: ({ column }) => <DataTableColumnHeader column={column} title="OPERADOR" />,
        cell: EditableCell,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'tipo_de_conta',
        header: ({ column }) => <DataTableColumnHeader column={column} title="CONTA" />,
        cell: EditableCell,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'tipo_chip',
        header: ({ column }) => <DataTableColumnHeader column={column} title="TIPO CHIP" />,
        cell: EditableCell,
        enableHiding: true,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'valor',
        header: ({ column }) => <DataTableColumnHeader column={column} title="VALOR" />,
        cell: EditableCell,
        enableHiding: true,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'dispositivo',
        header: ({ column }) => <DataTableColumnHeader column={column} title="DISP" />,
        cell: EditableCell,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'instancia',
        header: ({ column }) => <DataTableColumnHeader column={column} title="INST" />,
        cell: EditableCell,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'numero',
        header: ({ column }) => <DataTableColumnHeader column={column} title="NÚMERO" />,
        cell: EditableCell,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'status',
        header: ({ column }) => <DataTableColumnHeader column={column} title="STATUS" />,
        cell: StatusCell,
        filterFn: (row, id, filterValue) => {
            const cellValue = row.getValue(id) as string
            if (!cellValue) return filterValue.includes('')

            // Simply check if the exact cell value is in the filter
            return filterValue.includes(cellValue)
        },
    },
    {
        accessorKey: 'info',
        header: ({ column }) => <DataTableColumnHeader column={column} title="INFO" />,
        cell: EditableCell,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'obs',
        header: ({ column }) => <DataTableColumnHeader column={column} title="OBS" />,
        cell: EditableCell,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        id: 'waha_dia',
        header: ({ column }) => <DataTableColumnHeader column={column} title="WAHA" />,
        accessorFn: (row) => row.waha_dia ? format(new Date(row.waha_dia), 'dd/MM/yyyy') : null,
        cell: DatePickerCell,
        enableHiding: true,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        id: 'caiu_dia',
        header: ({ column }) => <DataTableColumnHeader column={column} title="CAIU" />,
        accessorFn: (row) => row.caiu_dia ? format(new Date(row.caiu_dia), 'dd/MM/yyyy') : null,
        cell: DatePickerCell,
        enableHiding: true,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        id: 'dife',
        header: ({ column }) => <DataTableColumnHeader column={column} title="DIFE" />,
        accessorFn: (row) => {
            try {
                const wahaValue = row.waha_dia
                const caiuValue = row.caiu_dia

                if (wahaValue && caiuValue) {
                    const waha = new Date(wahaValue)
                    const caiu = new Date(caiuValue)

                    if (!isNaN(waha.getTime()) && !isNaN(caiu.getTime())) {
                        const diffTime = Math.abs(waha.getTime() - caiu.getTime())
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                        return `${diffDays} dias`
                    }
                }
            } catch (error) {
                // Keep empty
            }
            return ''
        },
        cell: ({ row, column, table }) => {
            const rowId = String(row.original.id)
            const columnId = column.id
            const selectedCell = table.options.meta?.selectedCell
            const onCellSelect = table.options.meta?.onCellSelect
            const isSelected = selectedCell?.rowId === rowId && selectedCell?.columnId === columnId

            return (
                <EditableCellComponent
                    value={row.getValue('dife')}
                    rowId={rowId}
                    columnId={columnId}
                    isSelected={isSelected}
                    isEditing={false}
                    canEdit={false}
                    onSelect={onCellSelect || (() => { })}
                    onStartEdit={() => { }}
                    onSave={async () => { }}
                    onCancel={() => { }}
                />
            )
        },
        enableHiding: true,
    },
    {
        id: 'data_s_hora',
        header: ({ column }) => <DataTableColumnHeader column={column} title="DATA S. HORA" />,
        accessorFn: (row) => row.data.substring(0, 10),
        cell: ({ row, column, table }) => {
            const rowId = String(row.original.id)
            const columnId = column.id
            const selectedCell = table.options.meta?.selectedCell
            const onCellSelect = table.options.meta?.onCellSelect
            const isSelected = selectedCell?.rowId === rowId && selectedCell?.columnId === columnId

            return (
                <EditableCellComponent
                    value={row.getValue('data_s_hora')}
                    rowId={rowId}
                    columnId={columnId}
                    isSelected={isSelected}
                    isEditing={false}
                    canEdit={false}
                    onSelect={onCellSelect || (() => { })}
                    onStartEdit={() => { }}
                    onSave={async () => { }}
                    onCancel={() => { }}
                />
            )
        },
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
    {
        accessorKey: 'codigo',
        header: ({ column }) => <DataTableColumnHeader column={column} title="CÓDIGO" />,
        cell: CodigoCell,
        filterFn: (row, id, value) => {
            return value.includes(row.getValue(id))
        },
    },
]
