import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2, Plus, GripVertical } from 'lucide-react'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core'
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Simple ID generator since uuid is not installed
const genId = () => Math.random().toString(36).substr(2, 9)

// Palette based on the Google Docs/Sheets color picker 10x8 grid
const PRESET_COLORS = [
    // Row 1: Grayscale + White
    '#000000', '#434343', '#666666', '#999999', '#B7B7B7', '#CCCCCC', '#D9D9D9', '#EFEFEF', '#F3F3F3', '#FFFFFF',
    // Row 2: Primaries (Dark Red -> Majenta)
    '#980000', '#FF0000', '#FF9900', '#FFFF00', '#00FF00', '#00FFFF', '#4A86E8', '#0000FF', '#9900FF', '#FF00FF',
    // Row 3
    '#E6B8AF', '#F4CCCC', '#FCE5CD', '#FFF2CC', '#D9EAD3', '#D0E0E3', '#C9DAF8', '#CFE2F3', '#D9D2E9', '#EAD1DC',
    // Row 4
    '#DD7E6B', '#EA9999', '#F9CB9C', '#FFE599', '#B6D7A8', '#A2C4C9', '#A4C2F4', '#9FC5E8', '#B4A7D6', '#D5A6BD',
    // Row 5
    '#CC4125', '#E06666', '#F6B26B', '#FFD966', '#93C47D', '#76A5AF', '#6D9EEB', '#6FA8DC', '#8E7CC3', '#C27BA0',
    // Row 6
    '#A61C00', '#CC0000', '#E69138', '#F1C232', '#6AA84F', '#45818E', '#3C78D8', '#3D85C6', '#674EA7', '#A64D79',
    // Row 7
    '#85200C', '#990000', '#B45F06', '#BF9000', '#38761D', '#134F5C', '#1155CC', '#0B5394', '#351C75', '#741B47',
    // Row 8 (Darkest)
    '#5B0F00', '#660000', '#783F04', '#7F6000', '#274E13', '#0C343D', '#1C4587', '#073763', '#20124D', '#4C1130'
]

interface VisualizationItem {
    id: string
    type: 'individual' | 'grupo' | 'soma' | 'divisor'
    column?: string
    label?: string
    bgColor?: string
    textColor?: 'black' | 'white'

    // Group fields
    groupName?: string
    activeSubItems?: string[] // list of original names of active subitems
    subItemsNames?: Record<string, string> // map original subitem name to display name
    groupSubitemsBgColor?: string
    groupSubitemsTextColor?: 'black' | 'white'

    // Soma fields
    sumItems?: string[]
}

interface VisualizationConfigModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    individualMetrics: string[]
    allMetricsNames: string[]
    groupMetrics: { name: string; items: any[] }[]
}

const ColorPickerTrigger = ({ color, onChange, label }: { color?: string, onChange: (c: string) => void, label?: string }) => {
    return (
        <div className="flex flex-col gap-1">
            {label && <Label className="text-[10px] text-gray-400">{label}</Label>}
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-8 px-2 justify-start border-gray-600 bg-gray-800 text-xs">
                        {color ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full border border-gray-500" style={{ backgroundColor: color }}></div>
                                <span className="text-gray-300">{color}</span>
                            </div>
                        ) : (
                            <span className="text-gray-500 italic">Sem cor</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3 bg-gray-800 border-gray-700">
                    <div className="grid grid-cols-10 gap-1.5">
                        {PRESET_COLORS.map(c => (
                            <button
                                key={c}
                                className={cn(
                                    "w-5 h-5 rounded-full border border-gray-600 hover:scale-125 transition-transform",
                                    color === c && "ring-2 ring-white ring-offset-1 ring-offset-gray-800 z-10"
                                )}
                                style={{ backgroundColor: c }}
                                onClick={() => onChange(c)}
                                title={c}
                            />
                        ))}
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    )
}

const TextColorSelector = ({ color, onChange, label, previewBgColor }: { color?: 'black' | 'white', onChange: (c: 'black' | 'white') => void, label?: string, previewBgColor?: string }) => {
    // Default to a dark gray if no background color is selected, to ensure visibility of white text.
    // However, if the user requested default white background, we stick to that.
    // But for the *preview* of contrast, we strictly use the previewBgColor.
    const bgStyle = previewBgColor ? { backgroundColor: previewBgColor } : {}
    return (
        <div className="flex flex-col gap-1">
            {label && <Label className="text-[10px] text-gray-400">{label}</Label>}
            <div className="flex bg-gray-800 rounded border border-gray-600 p-0.5 h-8 w-fit gap-1">
                <button
                    onClick={() => onChange('black')}
                    className={cn(
                        "flex items-center justify-center w-7 rounded px-0 text-xs transition-transform border border-transparent",
                        color === 'black' ? "ring-2 ring-white ring-offset-1 ring-offset-gray-800 scale-105" : "hover:opacity-80"
                    )}
                    style={bgStyle}
                    title="Preto"
                >
                    <span className="text-black font-bold">A</span>
                </button>
                <button
                    onClick={() => onChange('white')}
                    className={cn(
                        "flex items-center justify-center w-7 rounded px-0 text-xs transition-transform border border-transparent",
                        color === 'white' ? "ring-2 ring-white ring-offset-1 ring-offset-gray-800 scale-105" : "hover:opacity-80"
                    )}
                    style={bgStyle}
                    title="Branco"
                >
                    <span className="text-white font-bold">A</span>
                </button>
            </div>
        </div>
    )
}

function SortableItem({ item, onRemoveItem, onUpdateItem, handleGroupColumnChange, handleSubItemNameChange, handleRemoveSubItem, handleAddSubItem, handleAddSumMetric, handleRemoveSumMetric, handleUpdateSumMetric, availableMetrics, somaAvailableMetrics, groupMetrics }: any) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: item.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.8 : 1,
    }

    // Helper to get current group config if type is group
    const currentGroupConfig = item.type === 'grupo' && item.column
        ? groupMetrics.find((g: any) => g.name === item.column)
        : null

    return (
        <div ref={setNodeRef} style={style} className={cn("bg-gray-900 border border-gray-700 p-4 rounded-md flex gap-4 animated fade-in relative", isDragging && "shadow-xl border-blue-500/50")}>
            {/* Drag Handle */}
            <div className="flex flex-col justify-center">
                <button
                    {...attributes}
                    {...listeners}
                    className="p-1 rounded hover:bg-gray-800 cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 transition-colors"
                >
                    <GripVertical className="h-5 w-5" />
                </button>
            </div>

            <div className="flex flex-col gap-4 flex-1">
                <div className="flex justify-between items-start gap-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                        {/* Common: Type Selection */}
                        <div className="space-y-1">
                            <Label className="text-xs text-gray-400">Tipo de Item</Label>
                            <Select
                                value={item.type}
                                onValueChange={(val: any) => onUpdateItem(item.id, {
                                    type: val,
                                    column: '',
                                    label: '',
                                    groupName: '',
                                    subItemsNames: {},
                                    // Defaults for Group type
                                    groupSubitemsBgColor: val === 'grupo' ? '#FFFFFF' : undefined,
                                    groupSubitemsTextColor: val === 'grupo' ? 'black' : undefined
                                })}
                            >
                                <SelectTrigger className="bg-gray-800 border-gray-600 text-white h-9">
                                    <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                    <SelectItem value="individual">Métrica Individual</SelectItem>
                                    <SelectItem value="grupo">Métrica de Grupo</SelectItem>
                                    <SelectItem value="soma">Soma de Métricas</SelectItem>
                                    <SelectItem value="divisor">Linha Divisória</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* INDIVIDUAL LOGIC */}
                        {item.type === 'individual' && (
                            <>
                                <div className="space-y-1">
                                    <Label className="text-xs text-gray-400">Coluna (Métrica)</Label>
                                    <Select
                                        value={item.column}
                                        onValueChange={(val) => onUpdateItem(item.id, { column: val })}
                                    >
                                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white h-9">
                                            <SelectValue placeholder="Selecione a coluna" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-gray-800 border-gray-700 text-white max-h-60">
                                            <SelectItem value="valor">valor</SelectItem>
                                            {availableMetrics.map((metricName: string) => (
                                                <SelectItem key={metricName} value={metricName}>
                                                    {metricName}
                                                </SelectItem>
                                            ))}
                                            {availableMetrics.length === 0 && (
                                                <div className="p-2 text-xs text-gray-500 text-center">Nenhuma métrica individual encontrada</div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1 md:col-span-2">
                                    <Label className="text-xs text-gray-400">Nome na Visualização</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={item.label || ''}
                                            onChange={(e) => onUpdateItem(item.id, { label: e.target.value })}
                                            placeholder="Ex: Total de Vendas"
                                            className="bg-gray-800 border-gray-600 text-white h-9 flex-1"
                                        />
                                        <ColorPickerTrigger
                                            color={item.bgColor}
                                            onChange={(c) => onUpdateItem(item.id, { bgColor: c })}
                                            label="Fundo"
                                        />
                                        <TextColorSelector
                                            color={item.textColor}
                                            onChange={(c) => onUpdateItem(item.id, { textColor: c })}
                                            label="Texto"
                                            previewBgColor={item.bgColor}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* GROUP LOGIC */}
                        {item.type === 'grupo' && (
                            <>
                                <div className="space-y-1">
                                    <Label className="text-xs text-gray-400">Coluna (Grupo)</Label>
                                    <Select
                                        value={item.column}
                                        onValueChange={(val) => handleGroupColumnChange(item.id, val)}
                                    >
                                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white h-9">
                                            <SelectValue placeholder="Selecione o grupo" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-gray-800 border-gray-700 text-white max-h-60">
                                            {groupMetrics.map((group: any) => (
                                                <SelectItem key={group.name} value={group.name}>
                                                    {group.name}
                                                </SelectItem>
                                            ))}
                                            {groupMetrics.length === 0 && (
                                                <div className="p-2 text-xs text-gray-500 text-center">Nenhum grupo encontrado</div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {item.column && (
                                    <>
                                        <div className="space-y-1 md:col-span-2">
                                            <Label className="text-xs text-gray-400">Nome do Grupo</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={item.groupName || ''}
                                                    onChange={(e) => onUpdateItem(item.id, { groupName: e.target.value })}
                                                    placeholder="Ex: Por Operador"
                                                    className="bg-gray-800 border-gray-600 text-white h-9 flex-1"
                                                />
                                                <ColorPickerTrigger
                                                    color={item.bgColor}
                                                    onChange={(c) => onUpdateItem(item.id, { bgColor: c })}
                                                    label="Fundo"
                                                />
                                                <TextColorSelector
                                                    color={item.textColor}
                                                    onChange={(c) => onUpdateItem(item.id, { textColor: c })}
                                                    label="Texto"
                                                    previewBgColor={item.bgColor}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1 md:col-span-2">
                                            <Label className="text-xs text-gray-400">Estilo Subitens</Label>
                                            <div className="flex gap-2">
                                                <div className="flex gap-2 w-full">
                                                    <ColorPickerTrigger
                                                        color={item.groupSubitemsBgColor}
                                                        onChange={(c) => onUpdateItem(item.id, { groupSubitemsBgColor: c })}
                                                        label="Fundo Sub"
                                                    />
                                                    <TextColorSelector
                                                        color={item.groupSubitemsTextColor}
                                                        onChange={(c) => onUpdateItem(item.id, { groupSubitemsTextColor: c })}
                                                        label="Texto Sub"
                                                        previewBgColor={item.groupSubitemsBgColor}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {item.column && currentGroupConfig && (
                                    <div className="md:col-span-2 bg-gray-900/50 p-3 rounded border border-gray-800 mt-2">
                                        <div className="flex justify-between items-center mb-2">
                                            <Label className="text-xs text-gray-400 font-medium">Subitens ({item.activeSubItems?.length || 0})</Label>

                                            {/* Dropdown to add missing subitems */}
                                            {(() => {
                                                const allSubItems = currentGroupConfig.items.map((i: any) => i.nome_do_item)
                                                const activeSet = new Set(item.activeSubItems || [])
                                                const availableToAdd = allSubItems.filter((i: string) => !activeSet.has(i))

                                                if (availableToAdd.length === 0) return null

                                                return (
                                                    <Select onValueChange={(val) => handleAddSubItem(item.id, val)}>
                                                        <SelectTrigger className="h-6 text-[10px] bg-blue-600 border-none text-white w-auto px-2">
                                                            <span>+ Adicionar</span>
                                                        </SelectTrigger>
                                                        <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                                            {availableToAdd.map((subItemName: string) => (
                                                                <SelectItem key={subItemName} value={subItemName} className="text-xs">
                                                                    {subItemName}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )
                                            })()}
                                        </div>

                                        <div className="grid grid-cols-1 gap-3 max-h-[130px] overflow-y-auto pr-2">
                                            {(item.activeSubItems || []).map((subItemName: string, idx: number) => {
                                                return (
                                                    <div key={subItemName} className="flex items-center gap-3 group/subitem">
                                                        <Label className="text-[10px] text-gray-400 w-1/3 truncate text-right" title={subItemName}>
                                                            {subItemName}
                                                        </Label>
                                                        <Input
                                                            value={item.subItemsNames?.[subItemName] || ''}
                                                            onChange={(e) => handleSubItemNameChange(item.id, subItemName, e.target.value)}
                                                            placeholder="Nome do Subitem"
                                                            className="bg-gray-800 border-gray-700 text-white h-7 text-xs flex-1"
                                                        />
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleRemoveSubItem(item.id, subItemName)
                                                            }}
                                                            className="h-7 w-7 p-0 text-gray-500 hover:text-red-400 opacity-0 group-hover/subitem:opacity-100 transition-opacity"
                                                            title="Remover subitem"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                )
                                            })}
                                            {(item.activeSubItems || []).length === 0 && (
                                                <div className="text-center py-4 text-xs text-gray-600 italic">
                                                    Nenhum subitem selecionado.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* SOMA LOGIC */}
                        {item.type === 'soma' && (
                            <>
                                <div className="space-y-1 md:col-span-2">
                                    <Label className="text-xs text-gray-400">Nome na Visualização</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            value={item.label || ''}
                                            onChange={(e) => onUpdateItem(item.id, { label: e.target.value })}
                                            placeholder="Ex: Soma Total"
                                            className="bg-gray-800 border-gray-600 text-white h-9 flex-1"
                                        />
                                        <ColorPickerTrigger
                                            color={item.bgColor}
                                            onChange={(c) => onUpdateItem(item.id, { bgColor: c })}
                                            label="Fundo"
                                        />
                                        <TextColorSelector
                                            color={item.textColor}
                                            onChange={(c) => onUpdateItem(item.id, { textColor: c })}
                                            label="Texto"
                                            previewBgColor={item.bgColor}
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2 space-y-2 mt-2 bg-gray-900/50 p-3 rounded border border-gray-800">
                                    <div className="flex justify-between items-center mb-1">
                                        <Label className="text-xs text-gray-400 font-medium">Itens da Soma</Label>
                                        <Button
                                            size="sm"
                                            onClick={() => handleAddSumMetric(item.id)}
                                            className="h-6 text-[10px] bg-blue-600 border-none text-white px-2"
                                        >
                                            + Adicionar
                                        </Button>
                                    </div>

                                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                        {(item.sumItems || []).map((sumItem: string, idx: number) => (
                                            <div key={idx} className="flex gap-2 items-center">
                                                <Select
                                                    value={sumItem}
                                                    onValueChange={(val) => handleUpdateSumMetric(item.id, idx, val)}
                                                >
                                                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-8 text-xs flex-1">
                                                        <SelectValue placeholder="Selecione métrica" />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-gray-800 border-gray-700 text-white max-h-60">
                                                        {somaAvailableMetrics.filter((m: string) => m !== 'visualizar').map((metricName: string) => (
                                                            <SelectItem key={metricName} value={metricName} className="text-xs">
                                                                {metricName}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>

                                                {(item.sumItems || []).length > 2 && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveSumMetric(item.id, idx)}
                                                        className="h-8 w-8 p-0 text-gray-500 hover:text-red-400 hover:bg-red-900/20"
                                                        title="Remover item"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                    </div>

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveItem(item.id)}
                        className="text-gray-500 hover:text-red-400 hover:bg-red-900/20 -mt-1"
                        title="Remover item de visualização"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

export function VisualizationConfigModal({ open, onOpenChange, individualMetrics, allMetricsNames, groupMetrics }: VisualizationConfigModalProps) {
    const [items, setItems] = useState<VisualizationItem[]>([])

    // No need to filter type anymore, we have the list directly
    const availableMetrics = individualMetrics
    const somaAvailableMetrics = allMetricsNames

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            setItems((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over?.id);

                return arrayMove(items, oldIndex, newIndex);
            });
        }
    }

    const handleAddItem = () => {
        setItems([...items, {
            id: genId(),
            type: 'individual',
            column: '',
            label: '',
            bgColor: '#FFFFFF', // New Default: White
            textColor: 'black'  // New Default: Black
        }])
    }

    const handleRemoveItem = (id: string) => {
        setItems(items.filter(item => item.id !== id))
    }

    const handleUpdateItem = (id: string, updates: Partial<VisualizationItem>) => {
        setItems(items.map(item => {
            if (item.id !== id) return item

            // If switching to 'soma', init with 2 empty slots if not present
            if (updates.type === 'soma' && (!item.sumItems || item.sumItems.length === 0)) {
                return { ...item, ...updates, sumItems: ['', ''] }
            }

            return { ...item, ...updates }
        }))
    }

    // Special handler for group column change to reset fields
    const handleGroupColumnChange = (id: string, column: string) => {
        const groupConfig = groupMetrics.find(g => g.name === column)
        const initialSubItems = groupConfig?.items.map((i: any) => i.nome_do_item || '').filter(Boolean) || []

        setItems(items.map(item => {
            if (item.id !== id) return item

            // If changing column, reset groupName, subItemsNames, and set all as active initially
            return {
                ...item,
                column,
                groupName: '',
                activeSubItems: initialSubItems,
                subItemsNames: {}
            }
        }))
    }

    const handleSubItemNameChange = (itemId: string, subItemOriginalName: string, newName: string) => {
        setItems(items.map(item => {
            if (item.id !== itemId) return item

            return {
                ...item,
                subItemsNames: {
                    ...(item.subItemsNames || {}),
                    [subItemOriginalName]: newName
                }
            }
        }))
    }

    const handleRemoveSubItem = (itemId: string, subItemName: string) => {
        setItems(prevItems => prevItems.map(item => {
            if (item.id !== itemId) return item
            return {
                ...item,
                activeSubItems: (item.activeSubItems || []).filter(i => i !== subItemName)
            }
        }))
    }

    const handleAddSubItem = (itemId: string, subItemName: string) => {
        setItems(prevItems => prevItems.map(item => {
            if (item.id !== itemId) return item
            return {
                ...item,
                activeSubItems: [...(item.activeSubItems || []), subItemName]
            }
        }))
    }

    const handleAddSumMetric = (itemId: string) => {
        setItems(prevItems => prevItems.map(item => {
            if (item.id !== itemId) return item
            return {
                ...item,
                sumItems: [...(item.sumItems || []), '']
            }
        }))
    }

    const handleRemoveSumMetric = (itemId: string, indexToRemove: number) => {
        setItems(prevItems => prevItems.map(item => {
            if (item.id !== itemId) return item
            return {
                ...item,
                sumItems: (item.sumItems || []).filter((_, idx) => idx !== indexToRemove)
            }
        }))
    }

    const handleUpdateSumMetric = (itemId: string, indexToUpdate: number, newValue: string) => {
        setItems(prevItems => prevItems.map(item => {
            if (item.id !== itemId) return item
            const newSumItems = [...(item.sumItems || [])]
            newSumItems[indexToUpdate] = newValue
            return {
                ...item,
                sumItems: newSumItems
            }
        }))
    }

    const handleSave = () => {
        console.log('Regras de visualização (Visual Only):', items)
        // Placeholder save logic
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-4xl h-[95vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Visualização</DialogTitle>
                    <DialogDescription className="text-gray-400">
                        Configure os itens que serão exibidos na visualização de métricas. Arraste para reordenar.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="text-sm font-medium text-gray-300">Itens de Visualização</h4>
                            <Button
                                size="sm"
                                onClick={handleAddItem}
                                className="bg-blue-600 hover:bg-blue-500 text-white h-8"
                            >
                                <Plus className="h-3 w-3 mr-1" /> Adicionar Item
                            </Button>
                        </div>

                        {items.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 text-sm border-2 border-dashed border-gray-700 rounded-lg">
                                Nenhum item configurado. Clique em "Adicionar Item" para começar.
                            </div>
                        ) : (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={items.map(i => i.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="space-y-3">
                                        {items.map((item) => (
                                            <SortableItem
                                                key={item.id}
                                                item={item}
                                                onRemoveItem={handleRemoveItem}
                                                onUpdateItem={handleUpdateItem}
                                                handleGroupColumnChange={handleGroupColumnChange}
                                                handleSubItemNameChange={handleSubItemNameChange}
                                                handleRemoveSubItem={handleRemoveSubItem}
                                                handleAddSubItem={handleAddSubItem}
                                                handleAddSumMetric={handleAddSumMetric}
                                                handleRemoveSumMetric={handleRemoveSumMetric}
                                                handleUpdateSumMetric={handleUpdateSumMetric}
                                                availableMetrics={availableMetrics}
                                                somaAvailableMetrics={somaAvailableMetrics}
                                                groupMetrics={groupMetrics}
                                            />
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleSave}
                        className="bg-green-600 hover:bg-green-500 text-white"
                    >
                        Salvar Configuração
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
