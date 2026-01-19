'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RulesConfigModal } from '@/components/rules-config-modal'
import { VisualizationConfigModal } from '@/components/visualization-config-modal'


export default function AdminRegrasMetricasPage() {
    const router = useRouter()

    // 1. All useState hooks must be at the top level, before any returns
    const [loading, setLoading] = useState(true)
    const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'user' | null>(null)
    const [error, setError] = useState<string | null>(null)

    // Metric Editing State
    const [isEditingMetrics, setIsEditingMetrics] = useState(false)
    const [isVisualizationModalOpen, setIsVisualizationModalOpen] = useState(false)
    const [loadingColumns, setLoadingColumns] = useState(false)
    const [metricsColumns, setMetricsColumns] = useState<{ column_name: string; data_type: string }[]>([])
    const [individualMetrics, setIndividualMetrics] = useState<string[]>([])
    const [allMetricsNames, setAllMetricsNames] = useState<string[]>([])
    const [groupMetrics, setGroupMetrics] = useState<{ name: string; items: any[] }[]>([])
    const [metricsError, setMetricsError] = useState<string | null>(null)

    // Add Column State
    const [isCreatingColumn, setIsCreatingColumn] = useState(false)
    const [newColumnName, setNewColumnName] = useState('')
    const [isIndividual, setIsIndividual] = useState(true)
    const [showConfirmation, setShowConfirmation] = useState(false)
    const [isSavingColumn, setIsSavingColumn] = useState(false)
    const [deletingColumn, setDeletingColumn] = useState<string | null>(null)
    const [selectedColumnForRules, setSelectedColumnForRules] = useState<{ column_name: string; data_type: string } | null>(null)




    // 2. useEffect hooks
    useEffect(() => {
        const checkAdmin = async () => {
            try {
                // Check if current user is admin
                const { data: { user } } = await supabase.auth.getUser()

                if (!user) {
                    router.push('/')
                    return
                }

                const { data: currentProfile, error: profileError } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()

                if (profileError) {
                    throw profileError
                }

                if (!currentProfile || currentProfile.role !== 'admin') {
                    router.push('/')
                    return
                }

                setCurrentUserRole(currentProfile.role)
            } catch (err: any) {
                console.error('Error checking admin status:', err)
                setError('Erro ao verificar permissões: ' + (err.message || 'Erro desconhecido'))
            } finally {
                setLoading(false)
            }
        }

        checkAdmin()
    }, [router])

    // 3. Handlers
    const fetchColumns = async () => {
        setLoadingColumns(true)
        setMetricsError(null)

        try {
            // Fetch Columns from metricas_dinamicas
            const response = await fetch('/api/admin/get-columns', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ table: 'metricas_dinamicas' }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao buscar colunas')
            }

            if (!data.columns || data.columns.length === 0) {
                // Fallback checking just in case
                setMetricsError('Tabela "metricas_dinamicas" não encontrada ou sem colunas.')
                setMetricsColumns([])
            } else {
                setMetricsColumns(data.columns)
            }

            // Fetch Individual Metrics
            const { data: individualData, error: individualError } = await supabase
                .from('regras_das_metricas')
                .select('nome_da_coluna_metricas')
                .eq('tipo_metrica', 'individual')

            if (individualError) throw individualError

            if (individualData) {
                setIndividualMetrics(individualData.map(r => r.nome_da_coluna_metricas))
            }

            // Fetch ALL metrics for Soma (except id 1)
            const { data: allMetricsData, error: allMetricsError } = await supabase
                .from('regras_das_metricas')
                .select('nome_da_coluna_metricas')
                .neq('id', 1)

            if (allMetricsError) throw allMetricsError

            if (allMetricsData) {
                setAllMetricsNames(allMetricsData.map(r => r.nome_da_coluna_metricas))
            }

            // Fetch Group Metrics (varios)
            const { data: groupData, error: groupError } = await supabase
                .from('regras_das_metricas')
                .select('nome_da_coluna_metricas, regras_da_coluna')
                .eq('tipo_metrica', 'varios')

            if (groupError) throw groupError

            if (groupData) {
                const groups = groupData.map(r => ({
                    name: r.nome_da_coluna_metricas,
                    // safe parsing or direct access depending on type. assuming jsonb returns object
                    items: (r.regras_da_coluna as any)?.itens || []
                }))
                setGroupMetrics(groups)
            }

        } catch (err: any) {
            console.error('Error fetching metrics data:', err)
            setMetricsError(err.message)
        } finally {
            setLoadingColumns(false)
        }
    }

    useEffect(() => {
        if (currentUserRole === 'admin') {
            fetchColumns()
        }
    }, [currentUserRole])

    const handleEditMetrics = async () => {
        setIsEditingMetrics(true)
        // fetchColumns() // Already fetching on mount, but refresher is good if needed. 
        // Let's call it ensuring freshness or just rely on state if already loaded.
        // For simplicity and correctness, let's refresh:
        fetchColumns()
    }

    const handleSaveColumn = async () => {
        setIsSavingColumn(true)
        setMetricsError(null)

        try {
            const response = await fetch('/api/admin/add-column', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    column_name: newColumnName,
                    is_individual: isIndividual
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao adicionar coluna')
            }

            // Success! Reset state and refresh columns
            setIsCreatingColumn(false)
            setNewColumnName('')
            setIsIndividual(true)
            setShowConfirmation(false)

            // Refresh list
            fetchColumns()

        } catch (err: any) {
            console.error('Error adding column:', err)
            setMetricsError(err.message)
            setShowConfirmation(false)
        } finally {
            setIsSavingColumn(false)
        }
    }

    const handleDeleteColumn = async (columnName: string) => {
        try {
            const response = await fetch('/api/admin/drop-column', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ column_name: columnName }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao deletar coluna')
            }

            // Success
            setDeletingColumn(null)
            fetchColumns() // Refresh list

        } catch (err: any) {
            console.error('Error deleting column:', err)
            setMetricsError(err.message)
            setDeletingColumn(null)
        }
    }

    const handleSaveRules = async () => {
        try {
            // 1. Call the new API to generate the SQL function directly
            const response = await fetch('/api/admin/generate-metrics-function', {
                method: 'POST',
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Erro ao gerar função de métricas')
            }

            console.log('Função de métricas atualizada com sucesso!', data)
            alert('Regras salvas e função de métricas atualizada!')

        } catch (error: any) {
            console.error('Erro ao atualizar função:', error)
            alert('Erro ao atualizar regras: ' + error.message)
        }
    }






    // 4. Conditional Returns (Loading/Error/Access)
    // IMPORTANT: These must be AFTER all hooks (useState, useEffect)

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
                <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-400"></div>
                    <p className="mt-4 text-blue-200 font-medium">Carregando...</p>
                </div>
            </div>
        )
    }

    if (currentUserRole !== 'admin') {
        return null
    }

    if (error) {
        return (
            <div className="container mx-auto py-10">
                <Card className="bg-gray-900 border-red-800">
                    <CardHeader>
                        <CardTitle className="text-2xl text-red-400">Erro</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-white">{error}</p>
                        <p className="text-gray-400 mt-4">Verifique o console do navegador para mais detalhes.</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // 5. Main Render
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-purple-950 text-gray-100 p-6">
            <div className="container mx-auto">
                <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl text-white">Regras das Métricas</CardTitle>
                                <CardDescription className="text-gray-400">
                                    Configure aqui as regras para cálculo das métricas.
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="secondary"
                                    className="bg-purple-600 hover:bg-purple-500 text-white border-none"
                                    onClick={() => setIsVisualizationModalOpen(true)}
                                >
                                    Editar Visualização
                                </Button>
                                <Button
                                    className="bg-blue-600 hover:bg-blue-500 text-white"
                                    onClick={handleSaveRules}
                                >
                                    Salvar Regras
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => router.push('/')}
                                    className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                                >
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Voltar ao Dashboard
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {/* Métricas Section */}
                            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                                <h2 className="text-xl font-semibold text-white">Métricas</h2>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleEditMetrics}
                                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Columns List Preview */}
                            <div className="bg-gray-900/30 rounded-lg p-4 border border-gray-800">
                                <h3 className="text-sm font-medium text-gray-400 mb-3">Colunas Atuais (metricas_dinamicas)</h3>
                                {loadingColumns && metricsColumns.length === 0 ? (
                                    <div className="flex justify-center py-4">
                                        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-400"></div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {metricsColumns.map((col, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-3 bg-gray-800 rounded border border-gray-700">
                                                <div className="flex items-center space-x-3">
                                                    <span className="font-medium text-blue-200">{col.column_name}</span>
                                                    <span className="text-xs px-2 py-1 bg-gray-900 rounded text-gray-400 border border-gray-800">
                                                        {col.data_type}
                                                    </span>
                                                </div>

                                                {(col.column_name !== 'id' && col.column_name !== 'created_at' && col.column_name !== 'valor') && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-xs h-8 bg-gray-900 border-gray-700 hover:bg-gray-800 text-gray-300"
                                                        onClick={() => {
                                                            console.log('Clicked Edit Rules for:', col);
                                                            setSelectedColumnForRules(col);
                                                        }}
                                                    >
                                                        Editar Regras
                                                    </Button>
                                                )}
                                            </div>
                                        ))}
                                        {metricsColumns.length === 0 && !loadingColumns && (
                                            <p className="text-gray-500 text-sm">Nenhuma coluna encontrada.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Metrics Edit Dialog */}
            {isEditingMetrics && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-lg shadow-xl p-6 relative">
                        <button
                            onClick={() => setIsEditingMetrics(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            ✕
                        </button>

                        <h3 className="text-xl font-semibold text-white mb-4">Métricas Dinâmicas</h3>

                        {isCreatingColumn ? (
                            <div className="bg-gray-800 p-4 rounded-lg mb-4 border border-gray-700">
                                <h4 className="text-white font-medium mb-3">Nova Coluna</h4>

                                <div className="space-y-4">
                                    <div>
                                        <Label htmlFor="colName" className="text-gray-300">Nome da Coluna</Label>
                                        <Input
                                            id="colName"
                                            value={newColumnName}
                                            onChange={(e) => {
                                                // Allow only letters, numbers, underscore
                                                const val = e.target.value
                                                if (/^[a-zA-Z0-9_]*$/.test(val)) {
                                                    setNewColumnName(val)
                                                }
                                            }}
                                            placeholder="ex: total_vendas"
                                            className="bg-gray-900 border-gray-600 text-white mt-1"
                                            disabled={showConfirmation}
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Apenas letras, números e underline.</p>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="individual"
                                            checked={isIndividual}
                                            onCheckedChange={(checked) => setIsIndividual(checked === true)}
                                            disabled={showConfirmation}
                                            className="border-gray-500 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                        />
                                        <Label htmlFor="individual" className="text-gray-300 cursor-pointer">Individual</Label>
                                    </div>

                                    {showConfirmation ? (
                                        <div className="pt-2">
                                            <p className="text-yellow-400 text-sm mb-2 font-medium">Confirmar criação?</p>
                                            <div className="flex space-x-2">
                                                <Button
                                                    size="sm"
                                                    variant="secondary"
                                                    onClick={() => setShowConfirmation(false)}
                                                    className="bg-gray-700 hover:bg-gray-600 text-white"
                                                    disabled={isSavingColumn}
                                                >
                                                    Cancelar
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={handleSaveColumn}
                                                    className="bg-green-600 hover:bg-green-500 text-white"
                                                    disabled={isSavingColumn}
                                                >
                                                    {isSavingColumn ? 'Salvando...' : 'Confirmar'}
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex space-x-2 pt-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setIsCreatingColumn(false)
                                                    setNewColumnName('')
                                                    setMetricsError(null)
                                                }}
                                                className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                                            >
                                                Cancelar
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    if (newColumnName.trim().length > 0) {
                                                        setShowConfirmation(true)
                                                    }
                                                }}
                                                disabled={newColumnName.trim().length === 0}
                                                className="bg-blue-600 hover:bg-blue-500 text-white"
                                            >
                                                Salvar
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-end mb-4">
                                <Button
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-500 text-white"
                                    onClick={() => setIsCreatingColumn(true)}
                                >
                                    <span className="mr-2">+</span> Adicionar Coluna
                                </Button>
                            </div>
                        )}

                        {loadingColumns ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-400"></div>
                            </div>
                        ) : metricsError ? (
                            <div className="p-4 bg-red-900/20 border border-red-900 rounded text-red-200">
                                {metricsError}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-400 mb-2">Colunas disponíveis na tabela:</p>
                                <div className="max-h-[300px] overflow-y-auto space-y-2">
                                    {metricsColumns.map((col, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-2 bg-gray-800 rounded border border-gray-700">
                                            <span className="font-medium text-white">{col.column_name}</span>

                                            <div className="flex items-center space-x-2">
                                                <span className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-300">{col.data_type}</span>

                                                {(col.column_name !== 'id' && col.column_name !== 'created_at') && (
                                                    deletingColumn === col.column_name ? (
                                                        <div className="flex items-center space-x-1 ml-2">
                                                            <span className="text-xs text-red-400 mr-1">Confirmar?</span>
                                                            <button
                                                                onClick={() => handleDeleteColumn(col.column_name)}
                                                                className="text-xs bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded"
                                                            >
                                                                Sim
                                                            </button>
                                                            <button
                                                                onClick={() => setDeletingColumn(null)}
                                                                className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded"
                                                            >
                                                                Não
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setDeletingColumn(col.column_name)}
                                                            className="p-1 hover:bg-red-900/30 rounded text-gray-500 hover:text-red-400 transition-colors ml-2"
                                                            title="Excluir coluna"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-6 flex justify-end">
                            <Button
                                onClick={() => setIsEditingMetrics(false)}
                                className="bg-gray-800 hover:bg-gray-700 text-white"
                            >
                                Fechar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Always render modal, control with open prop */}
            <RulesConfigModal
                open={!!selectedColumnForRules}
                onOpenChange={(open) => !open && setSelectedColumnForRules(null)}
                column={selectedColumnForRules || { column_name: '', data_type: '' }}
            />

            <VisualizationConfigModal
                open={isVisualizationModalOpen}
                onOpenChange={setIsVisualizationModalOpen}
                individualMetrics={individualMetrics}
                allMetricsNames={allMetricsNames}
                groupMetrics={groupMetrics}
            />
        </div>
    )
}
