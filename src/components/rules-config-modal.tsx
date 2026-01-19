'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface Rule {
    id: string
    countColumn: string
    operator: string
    terms: string[]
    logicOperator: 'E' | 'OU' | ''
}

interface JsonItem {
    id: string
    name: string
    rules: Rule[]
}

interface RulesConfigModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    column: {
        column_name: string
        data_type: string
    }
    onSave?: (config: any) => void
}

// Helper to generate IDs
const genId = () => Math.random().toString(36).substr(2, 9)

// Extracted Sub-component to prevent re-mounting on every render
const RulesEditor = ({ rules, onChange, tableColumns }: { rules: Rule[], onChange: (rules: Rule[]) => void, tableColumns: string[] }) => {
    const updateRule = (id: string, field: keyof Rule, value: any) => {
        onChange(rules.map(r => {
            if (r.id !== id) return r

            const updatedRule = { ...r, [field]: value }

            // Auto-update logicOperator when operator changes
            if (field === 'operator') {
                if (['igual', 'contem'].includes(value)) {
                    updatedRule.logicOperator = 'OU'
                } else if (['diferente', 'nao_contem'].includes(value)) {
                    updatedRule.logicOperator = 'E'
                } else if (['vazio', 'nao_vazio'].includes(value)) {
                    updatedRule.logicOperator = ''
                }
            }

            return updatedRule
        }))
    }

    const addTerm = (ruleId: string) => {
        const rule = rules.find(r => r.id === ruleId)
        if (rule) updateRule(ruleId, 'terms', [...rule.terms, ''])
    }

    const updateTerm = (ruleId: string, idx: number, val: string) => {
        const rule = rules.find(r => r.id === ruleId)
        if (rule) {
            const newTerms = [...rule.terms]
            newTerms[idx] = val
            updateRule(ruleId, 'terms', newTerms)
        }
    }

    const removeTerm = (ruleId: string, idx: number) => {
        const rule = rules.find(r => r.id === ruleId)
        if (rule && rule.terms.length > 1) {
            updateRule(ruleId, 'terms', rule.terms.filter((_, i) => i !== idx))
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-300">Regras</h4>
                <Button size="sm" variant="ghost" onClick={() => onChange([...rules, { id: genId(), countColumn: '', operator: 'igual', terms: [''], logicOperator: 'OU' }])} className="text-blue-400 text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Adicionar Regra
                </Button>
            </div>

            {rules.map((rule, idx) => (
                <div key={rule.id} className="bg-gray-800/50 p-3 rounded border border-gray-700 space-y-3">
                    <div className="flex justify-between items-start">
                        <span className="text-xs text-gray-500 font-mono">#{idx + 1}</span>
                        {rules.length > 1 && (
                            <button onClick={() => onChange(rules.filter(r => r.id !== rule.id))} className="text-red-500 hover:text-red-400">
                                <Trash2 className="h-3 w-3" />
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-12 gap-2">
                        <div className="col-span-5">
                            <Label className="text-xs text-gray-400">Contar</Label>
                            <Select value={rule.countColumn} onValueChange={(v) => updateRule(rule.id, 'countColumn', v)}>
                                <SelectTrigger className="h-8 bg-gray-900 border-gray-600 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                <SelectContent>
                                    {tableColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-4">
                            <Label className="text-xs text-gray-400">Onde</Label>
                            <Select value={rule.operator} onValueChange={(v) => updateRule(rule.id, 'operator', v)}>
                                <SelectTrigger className="h-8 bg-gray-900 border-gray-600 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="igual">Igual</SelectItem>
                                    <SelectItem value="diferente">Diferente</SelectItem>
                                    <SelectItem value="contem">Contém</SelectItem>
                                    <SelectItem value="nao_contem">Não Contém</SelectItem>
                                    <SelectItem value="vazio">Vazio</SelectItem>
                                    <SelectItem value="nao_vazio">Não Vazio</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {/* Logic Operator Select */}
                        {!['vazio', 'nao_vazio'].includes(rule.operator) && (
                            <div className="col-span-3">
                                <Label className="text-xs text-gray-400">E / OU</Label>
                                <Select value={rule.logicOperator} onValueChange={(v) => updateRule(rule.id, 'logicOperator', v)}>
                                    <SelectTrigger className="h-8 bg-gray-900 border-gray-600 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="E">E</SelectItem>
                                        <SelectItem value="OU">OU</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    {!['vazio', 'nao_vazio'].includes(rule.operator) && (
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <Label className="text-xs text-gray-400">Termos</Label>
                                <button onClick={() => addTerm(rule.id)} className="text-[10px] text-blue-400 hover:underline">+ Termo</button>
                            </div>
                            <div className="space-y-1">
                                {rule.terms.map((term, tIdx) => (
                                    <div key={tIdx} className="flex gap-1">
                                        <Input
                                            value={term}
                                            onChange={(e) => updateTerm(rule.id, tIdx, e.target.value)}
                                            className="h-7 text-xs bg-gray-900 border-gray-600"
                                            placeholder="Valor..."
                                        />
                                        {rule.terms.length > 1 && (
                                            <button onClick={() => removeTerm(rule.id, tIdx)} className="text-gray-500 hover:text-red-400 px-1">
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    )
}

export function RulesConfigModal({ open, onOpenChange, column, onSave }: RulesConfigModalProps) {
    const [loadingTables, setLoadingTables] = useState(false)
    const [loadingColumns, setLoadingColumns] = useState(false)
    const [availableTables, setAvailableTables] = useState<string[]>([])
    const [searchTable, setSearchTable] = useState('registros')
    const [tableColumns, setTableColumns] = useState<string[]>([])

    // Config State
    const [onlyToday, setOnlyToday] = useState(true)
    const [dateColumn, setDateColumn] = useState('')

    // Rules State
    const [numericRules, setNumericRules] = useState<Rule[]>([{ id: '1', countColumn: '', operator: 'igual', terms: [''], logicOperator: 'OU' }])
    const [jsonItems, setJsonItems] = useState<JsonItem[]>([{ id: '1', name: '', rules: [{ id: '1', countColumn: '', operator: 'igual', terms: [''], logicOperator: 'OU' }] }])

    // UI State
    const [showConfirmation, setShowConfirmation] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Load available tables
    useEffect(() => {
        if (open) {
            fetchTables()
            fetchExistingRules()
        }
    }, [open])

    // Load columns when table changes
    useEffect(() => {
        if (searchTable) {
            fetchColumns(searchTable)
        }
    }, [searchTable])

    const [loadingRules, setLoadingRules] = useState(true)

    const fetchExistingRules = async () => {
        setLoadingRules(true)
        try {
            const response = await fetch('/api/admin/get-rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ column_name: column.column_name })
            })
            const data = await response.json()

            if (data && data.found) {
                const config = data.rules

                // Populate Global Fields
                if (config.tabela_busca) setSearchTable(config.tabela_busca)
                if (config.apenas_hoje !== undefined) setOnlyToday(config.apenas_hoje)
                if (config.coluna_data) setDateColumn(config.coluna_data)

                const mapRules = (apiRules: any[]) => {
                    return apiRules.map((r: any) => ({
                        id: genId(),
                        countColumn: r.coluna_contar,
                        operator: r.comparar,
                        terms: (r.termos && r.termos.length > 0) ? r.termos : [''],
                        logicOperator: r.e_ou || (['igual', 'contem'].includes(r.comparar) ? 'OU' : (['diferente', 'nao_contem'].includes(r.comparar) ? 'E' : ''))
                    }))
                }

                if (column.data_type === 'numeric' && config.regras) {
                    setNumericRules(mapRules(config.regras))
                } else if (column.data_type !== 'numeric' && config.itens) {
                    setJsonItems(config.itens.map((item: any) => ({
                        id: genId(),
                        name: item.nome_do_item,
                        rules: mapRules(item.regras)
                    })))
                }
            } else {
                // Reset to default state if no rules found (Optional, but good for clean slate)
                // setNumericRules([{ id: genId(), countColumn: '', operator: 'igual', terms: [''] }])
                // setJsonItems([{ id: genId(), name: '', rules: [{ id: genId(), countColumn: '', operator: 'igual', terms: [''] }] }])
            }

        } catch (err) {
            console.error('Error loading rules:', err)
        } finally {
            setLoadingRules(false)
        }
    }

    const fetchTables = async () => {
        setLoadingTables(true)
        try {
            const { data, error } = await supabase.from('tabelada').select('nome_da_tabela')
            if (error) throw error
            const tables = data?.map(t => t.nome_da_tabela) || []
            setAvailableTables(['registros', ...tables])
        } catch (err) {
            console.error('Error fetching tables:', err)
        } finally {
            setLoadingTables(false)
        }
    }

    const fetchColumns = async (tableName: string) => {
        setLoadingColumns(true)
        try {
            const response = await fetch('/api/admin/get-columns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ table: tableName }),
            })
            const data = await response.json()
            if (data.columns) {
                setTableColumns(data.columns.map((c: any) => c.column_name))
            }
        } catch (err) {
            console.error('Error fetching columns:', err)
        } finally {
            setLoadingColumns(false)
        }
    }

    // Validation
    const validate = () => {
        setError(null)

        if (onlyToday && !dateColumn) return 'Selecione a "Coluna do dia".'

        if (column.data_type === 'numeric') {
            if (numericRules.length === 0) return 'Adicione pelo menos uma regra.'
            for (const rule of numericRules) {
                if (!rule.countColumn) return 'Selecione a coluna para "Contar".'
                if (!['vazio', 'nao_vazio'].includes(rule.operator) && rule.terms.some(t => !t.trim())) return 'Preencha todos os termos.'
            }
        } else {
            if (jsonItems.length === 0) return 'Adicione pelo menos um item.'
            for (const item of jsonItems) {
                if (!item.name.trim()) return 'Nome do item é obrigatório.'
                if (item.rules.length === 0) return `Adicione regras para o item "${item.name}".`
                for (const rule of item.rules) {
                    if (!rule.countColumn) return `Selecione a coluna "Contar" no item "${item.name}".`
                    if (!['vazio', 'nao_vazio'].includes(rule.operator) && rule.terms.some(t => !t.trim())) return `Preencha os termos no item "${item.name}".`
                }
            }
        }
        return null
    }

    const handleSaveClick = () => {
        const errorMsg = validate()
        if (errorMsg) {
            setError(errorMsg)
            return
        }
        setShowConfirmation(true)
    }

    const [saving, setSaving] = useState(false)

    const handleConfirm = async () => {
        setSaving(true)
        try {
            const isNumeric = column.data_type === 'numeric'
            const metricType = isNumeric ? 'individual' : 'varios'

            // Format Rules Helper
            const formatRules = (inputRules: Rule[]) => {
                const formatted = inputRules.map(r => {
                    const isVazio = ['vazio', 'nao_vazio'].includes(r.operator)
                    return {
                        coluna_contar: r.countColumn,
                        comparar: r.operator,
                        termos: isVazio ? [] : r.terms,
                        e_ou: isVazio ? '' : (r.logicOperator || (['igual', 'contem'].includes(r.operator) ? 'OU' : 'E')) // Fallback Default
                    }
                })
                console.log('Formatted Rules:', formatted)
                return formatted
            }

            // Construct Config Object
            let configPayload: any = {
                tabela_busca: searchTable,
                apenas_hoje: onlyToday,
                coluna_data: onlyToday ? dateColumn : ""
            }

            if (isNumeric) {
                configPayload.regras = formatRules(numericRules)
            } else {
                configPayload.itens = jsonItems.map(item => ({
                    nome_do_item: item.name,
                    regras: formatRules(item.rules)
                }))
            }

            console.log('Sending payload:', configPayload)

            const response = await fetch('/api/admin/save-rules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    column_name: column.column_name,
                    metric_type: metricType,
                    rules_config: configPayload
                })
            })

            if (!response.ok) {
                throw new Error('Falha ao salvar regras')
            }

            setShowConfirmation(false)
            onOpenChange(false)
            if (onSave) onSave(configPayload)

        } catch (err) {
            console.error('Error saving:', err)
            setError('Erro ao salvar regras. Tente novamente.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-gray-900 border-gray-800 text-gray-100 max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Configurar Regras: <span className="text-blue-400">{column.column_name}</span> ({column.data_type})</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {loadingRules ? (
                        <div className="flex justify-center items-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-400"></div>
                        </div>
                    ) : (
                        <>
                            {/* Common Fields */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Tabela de Busca</Label>
                                    <Select value={searchTable} onValueChange={setSearchTable}>
                                        <SelectTrigger className="bg-gray-800 border-gray-700">
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableTables.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center space-x-2 h-9 mt-1">
                                        <Checkbox
                                            id="today"
                                            checked={onlyToday}
                                            onCheckedChange={(c) => setOnlyToday(c === true)}
                                            className="border-gray-500 data-[state=checked]:bg-blue-600"
                                        />
                                        <Label htmlFor="today" className="cursor-pointer">Apenas Hoje</Label>
                                    </div>
                                    {onlyToday && (
                                        <div>
                                            <Label className="text-xs text-gray-400">Coluna do dia *</Label>
                                            <Select value={dateColumn} onValueChange={setDateColumn}>
                                                <SelectTrigger className="h-8 bg-gray-800 border-gray-700 text-xs mt-1">
                                                    <SelectValue placeholder="Selecione a coluna de data..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {tableColumns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="border-t border-gray-800 my-4"></div>

                            {/* Conditional Fields */}
                            {column.data_type === 'numeric' ? (
                                <RulesEditor rules={numericRules} onChange={setNumericRules} tableColumns={tableColumns} />
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-semibold text-gray-200">Itens</h4>
                                        <Button size="sm" onClick={() => setJsonItems([...jsonItems, { id: genId(), name: '', rules: [{ id: genId(), countColumn: '', operator: 'igual', terms: [''], logicOperator: 'OU' }] }])} className="bg-blue-600 hover:bg-blue-500 text-xs h-7">
                                            <Plus className="h-3 w-3 mr-1" /> Novo Item
                                        </Button>
                                    </div>

                                    {jsonItems.map((item, idx) => (
                                        <div key={item.id} className="border border-gray-700 rounded p-4 bg-gray-800/20">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="w-full mr-4">
                                                    <Label className="text-xs text-gray-400">Nome do Item</Label>
                                                    <Input
                                                        value={item.name}
                                                        onChange={(e) => setJsonItems(jsonItems.map(i => i.id === item.id ? { ...i, name: e.target.value } : i))}
                                                        className="bg-gray-900 border-gray-600 h-8"
                                                    />
                                                </div>
                                                {jsonItems.length > 1 && (
                                                    <Button variant="ghost" size="icon" onClick={() => setJsonItems(jsonItems.filter(i => i.id !== item.id))} className="text-red-400 hover:bg-red-900/20 mt-4">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>

                                            <RulesEditor
                                                rules={item.rules}
                                                onChange={(newRules) => setJsonItems(jsonItems.map(i => i.id === item.id ? { ...i, rules: newRules } : i))}
                                                tableColumns={tableColumns}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {error && (
                                <div className="p-3 bg-red-900/30 border border-red-800 rounded text-red-200 text-sm">
                                    {error}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    {showConfirmation ? (
                        <div className="w-full flex items-center justify-between bg-yellow-900/20 p-2 rounded border border-yellow-800/50">
                            <span className="text-yellow-200 text-sm pl-2">Confirmar alterações?</span>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setShowConfirmation(false)} className="h-7 text-gray-300">Cancelar</Button>
                                <Button size="sm" onClick={handleConfirm} disabled={saving} className="h-7 bg-green-600 hover:bg-green-500 text-white">
                                    {saving ? 'Salvando...' : 'Confirmar'}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white" onClick={handleSaveClick}>
                            Salvar Regras
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
