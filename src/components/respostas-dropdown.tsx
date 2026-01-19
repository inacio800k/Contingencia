'use client'

import { useEffect, useState } from 'react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button'
import { ChevronDown, MessageSquare } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export function RespostasDropdown() {
    const [forms, setForms] = useState<{ name: string, table: string }[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchForms = async () => {
            try {
                const { data, error } = await supabase
                    .from('formularios')
                    .select('nome_formulario, tabela_linkada')

                if (error) {
                    console.error('Error fetching formularios for respostas:', error)
                    return
                }

                if (data) {
                    // Filter out duplicates based on form name if needed, 
                    // map to a structure that has both name and target table
                    const uniqueForms = data.reduce((acc: { name: string, table: string }[], current) => {
                        if (!acc.find(item => item.name === current.nome_formulario)) {
                            acc.push({
                                name: current.nome_formulario,
                                table: current.tabela_linkada
                            })
                        }
                        return acc
                    }, [])

                    setForms(uniqueForms)
                }
            } catch (err) {
                console.error('Unexpected error fetching formularios for respostas:', err)
            } finally {
                setLoading(false)
            }
        }

        fetchForms()
    }, [])

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button>
                    Respostas <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="max-h-[300px] overflow-y-auto w-56">
                {loading ? (
                    <DropdownMenuItem disabled>Carregando...</DropdownMenuItem>
                ) : forms.length === 0 ? (
                    <DropdownMenuItem disabled>Nenhum formulário encontrado</DropdownMenuItem>
                ) : (
                    forms.map((form, index) => (
                        <DropdownMenuItem
                            key={index}
                            className="cursor-pointer"
                            asChild
                        >
                            <a
                                href={`/respostas?tabela=${encodeURIComponent(form.table || '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center w-full"
                            >
                                <MessageSquare className="mr-2 h-4 w-4" />
                                {form.name}
                            </a>
                        </DropdownMenuItem>
                    ))
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
