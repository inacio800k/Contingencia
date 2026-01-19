'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Table as TableIcon, Pencil, Trash2, RefreshCcw } from 'lucide-react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, FileText } from 'lucide-react'
import { CreateTableModal } from '@/components/create-table-modal'
import { CreateFormModal } from '@/components/create-form-modal'
import { EditFormModal } from '@/components/edit-form-modal'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface TableInfo {
    table_name: string
    formulario_linkado?: string
}

export default function AdminTablesPage() {
    const router = useRouter()
    const [tables, setTables] = useState<TableInfo[]>([])
    const [loading, setLoading] = useState(true)
    const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'user' | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isCreateFormModalOpen, setIsCreateFormModalOpen] = useState(false)
    const [isEditFormModalOpen, setIsEditFormModalOpen] = useState(false)
    const [selectedFormToEdit, setSelectedFormToEdit] = useState<{ formName: string; tableName: string } | null>(null)
    const [deleteFormConfig, setDeleteFormConfig] = useState<{ open: boolean; formName: string; tableName: string } | null>(null)

    const handleEditForm = (formName: string, tableName: string) => {
        setSelectedFormToEdit({ formName, tableName })
        setIsEditFormModalOpen(true)
    }

    const confirmDeleteForm = (formName: string, tableName: string) => {
        setDeleteFormConfig({ open: true, formName, tableName })
    }

    const handleDeleteForm = async () => {
        if (!deleteFormConfig) return

        const { formName, tableName } = deleteFormConfig
        setLoading(true)

        try {
            // 1. Unlink form from table in 'tabelada' (using single quotes for null if needed, or just setting to null)
            const { error: updateError } = await supabase
                .from('tabelada')
                .update({ formulario_linkado: null })
                .eq('nome_da_tabela', tableName)

            if (updateError) throw updateError

            // 2. Delete form from 'formularios'
            const { error: deleteError } = await supabase
                .from('formularios')
                .delete()
                .eq('nome_formulario', formName)

            if (deleteError) throw deleteError

            await fetchTables()
            setDeleteFormConfig(null)
        } catch (err: any) {
            console.error('Error deleting form:', err)
            setError(`Erro ao deletar formulário: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    const fetchTables = async () => {
        // Fetch tables from 'tabelada' table
        const { data, error } = await supabase
            .from('tabelada')
            .select('nome_da_tabela, formulario_linkado')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Error fetching tables:', error)
            setError(`Erro ao buscar tabelas: ${error.message}`)
        } else {
            setTables(data?.map((t: any) => ({
                table_name: t.nome_da_tabela,
                formulario_linkado: t.formulario_linkado
            })) || [])
        }
    }

    useEffect(() => {
        const checkAdminAndFetchTables = async () => {
            // Check if current user is admin
            const { data: { user } } = await supabase.auth.getUser()

            if (!user) {
                router.push('/')
                return
            }

            const { data: currentProfile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (!currentProfile || currentProfile.role !== 'admin') {
                router.push('/')
                return
            }

            setCurrentUserRole(currentProfile.role)

            await fetchTables()

            setLoading(false)
        }

        checkAdminAndFetchTables()
    }, [router])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-purple-950">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-400"></div>
            </div>
        )
    }

    if (currentUserRole !== 'admin') {
        return null
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-purple-950 p-10">
                <div className="container mx-auto">
                    <Card className="bg-gray-900 border-red-800">
                        <CardHeader>
                            <CardTitle className="text-2xl text-red-400">Erro</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-white">{error}</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-purple-950 p-10">
            <div className="container mx-auto">
                <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl text-white flex items-center gap-2">
                                    <TableIcon className="h-6 w-6 text-blue-400" />
                                    Gerenciar Tabelas
                                </CardTitle>
                                <CardDescription className="text-gray-400">
                                    Lista de todas as tabelas do projeto na Supabase
                                </CardDescription>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={fetchTables}
                                    variant="outline"
                                    className="bg-gray-800/50 border-gray-700 text-white hover:bg-gray-700 hover:text-white"
                                    title="Recarregar tabela"
                                >
                                    <RefreshCcw className="h-4 w-4" />
                                </Button>
                                <Button
                                    onClick={() => setIsCreateModalOpen(true)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Criar Tabela
                                </Button>
                                <Button
                                    onClick={() => setIsCreateFormModalOpen(true)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    <FileText className="mr-2 h-4 w-4" />
                                    Criar Formulário
                                </Button>
                                <Button
                                    variant="outline"
                                    asChild
                                    className="bg-gray-800/50 border-gray-700 text-white hover:bg-gray-700 hover:text-white"
                                >
                                    <Link href="/">
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Voltar ao Dashboard
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border border-gray-800">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-gray-800 hover:bg-gray-800/50">
                                        <TableHead className="text-gray-400">Nome da Tabela</TableHead>
                                        <TableHead className="text-gray-400">Formulário</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {tables.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={2} className="text-center text-gray-500 py-8">
                                                Nenhuma tabela encontrada.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        tables.map((table, index) => (
                                            <TableRow key={index} className="border-gray-800 hover:bg-gray-800/30">
                                                <TableCell className="text-white font-mono">
                                                    {table.table_name}
                                                </TableCell>
                                                <TableCell className="text-gray-400">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <span>{table.formulario_linkado || '-'}</span>
                                                        {table.formulario_linkado && (
                                                            <>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => handleEditForm(table.formulario_linkado!, table.table_name)}
                                                                    className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                                                                >
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() => confirmDeleteForm(table.formulario_linkado!, table.table_name)}
                                                                    className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="mt-4 text-xs text-gray-500 text-right">
                            Total de tabelas: {tables.length}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <CreateTableModal
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
                onSuccess={() => {
                    fetchTables()
                }}
                existingTableNames={tables.map(t => t.table_name)}
            />

            <CreateFormModal
                open={isCreateFormModalOpen}
                onOpenChange={setIsCreateFormModalOpen}
                tableNames={tables
                    .filter(t => !t.formulario_linkado)
                    .map(t => t.table_name)}
            />

            {selectedFormToEdit && (
                <EditFormModal
                    open={isEditFormModalOpen}
                    onOpenChange={setIsEditFormModalOpen}
                    formName={selectedFormToEdit.formName}
                    linkedTable={selectedFormToEdit.tableName}
                />
            )}

            <Dialog open={!!deleteFormConfig?.open} onOpenChange={(open) => !open && setDeleteFormConfig(null)}>
                <DialogContent className="bg-gray-900 border-gray-800 text-white sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Tem certeza?</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Tem Certeza de que quer apagar o formulário <span className="text-white font-semibold">{deleteFormConfig?.formName}</span>, que preenche a tabela <span className="text-white font-semibold">{deleteFormConfig?.tableName}</span>?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-2 sm:justify-end">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteFormConfig(null)}
                            className="bg-transparent border-gray-700 text-white hover:bg-gray-800"
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleDeleteForm}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Sim, quero apagar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
