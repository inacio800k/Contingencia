'use client'

import { useEffect, useState } from 'react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button'
import { ChevronDown, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { DynamicFormModal } from './dynamic-form-modal'

interface Formulario {
    nome_formulario: string
    campos_formulario: any[] // Using any[] to match the flexible JSON structure, passed to DynamicFormModal which types it
    tabela_linkada: string
    preenchimento_da_linkada: any[]
}

export function FormulariosDropdown() {
    const [formularios, setFormularios] = useState<Formulario[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedForm, setSelectedForm] = useState<Formulario | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    useEffect(() => {
        const fetchFormularios = async () => {
            try {
                const { data, error } = await supabase
                    .from('formularios')
                    .select('nome_formulario, campos_formulario, tabela_linkada, preenchimento_da_linkada')

                if (error) {
                    console.error('Error fetching formularios:', error)
                    return
                }

                if (data) {
                    setFormularios(data)
                }
            } catch (err) {
                console.error('Unexpected error fetching formularios:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchFormularios()
    }, [])

    const handleFormClick = (form: Formulario) => {
        setSelectedForm(form)
        setIsModalOpen(true)
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-green-500/30 hover:border-green-400/50 bg-green-500/10 hover:bg-green-500/20 text-green-200 hover:text-green-100 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20"
                    >
                        <FileText className="mr-2 h-4 w-4" />
                        Formulários <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="max-h-[300px] overflow-y-auto">
                    {loading ? (
                        <DropdownMenuItem disabled>Carregando...</DropdownMenuItem>
                    ) : formularios.length === 0 ? (
                        <DropdownMenuItem disabled>Nenhum formulário encontrado</DropdownMenuItem>
                    ) : (
                        formularios.map((form, index) => (
                            <DropdownMenuItem
                                key={index}
                                onClick={() => handleFormClick(form)}
                                className="cursor-pointer"
                            >
                                {form.nome_formulario}
                            </DropdownMenuItem>
                        ))
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {selectedForm && (
                <DynamicFormModal
                    open={isModalOpen}
                    onOpenChange={setIsModalOpen}
                    formName={selectedForm.nome_formulario}
                    fields={selectedForm.campos_formulario}
                    targetTable={selectedForm.tabela_linkada}
                    mappingRules={selectedForm.preenchimento_da_linkada}
                />
            )}
        </>
    )
}
