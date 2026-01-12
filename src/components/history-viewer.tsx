import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { supabase } from "@/lib/supabase"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Loader2, History } from "lucide-react"

interface HistoryViewerProps {
    recordId: number
    trigger?: React.ReactNode
}

interface HistoryRecord {
    id: number
    created_at: string
    operador: string
    coluna_mudanca: string
    valor_anterior: string
    valor_posterior: string
    codigo: string | null
}

export function HistoryViewer({ recordId, trigger }: HistoryViewerProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [history, setHistory] = useState<HistoryRecord[]>([])
    // const supabase = createClientComponentClient()

    const fetchHistory = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('historico')
                .select('*')
                .eq('id_registro', recordId)
                .order('created_at', { ascending: false })
                .limit(5)

            if (error) throw error
            setHistory(data || [])
        } catch (error) {
            console.error('Error fetching history:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen)
        if (isOpen) {
            fetchHistory()
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <History className="h-4 w-4" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-[600px] max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle>Histórico de Alterações - ID {recordId}</DialogTitle>
                </DialogHeader>

                <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                    {loading ? (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : history.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground space-y-2">
                            <History className="h-10 w-10 opacity-20" />
                            <p>Nenhuma mudança encontrada nessa linha</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {history.map((record) => (
                                <div key={record.id} className="flex flex-col space-y-2 p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
                                    <div className="flex justify-between items-center border-b pb-2">
                                        <span className="font-semibold text-sm">Operador: {record.operador}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {format(new Date(record.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 gap-1 text-sm">
                                        <div className="flex gap-2">
                                            <span className="font-medium">Coluna alterada:</span>
                                            <span>{record.coluna_mudanca}</span>
                                        </div>

                                        <div className="flex flex-col gap-1 mt-1 bg-muted/50 p-2 rounded text-xs sm:text-sm">
                                            <div className="grid grid-cols-[80px_1fr] gap-2 items-baseline">
                                                <span className="text-muted-foreground font-medium text-right">Anterior:</span>
                                                <span className="break-words">{record.valor_anterior || '(vazio)'}</span>
                                            </div>
                                            <div className="grid grid-cols-[80px_1fr] gap-2 items-baseline">
                                                <span className="text-primary font-medium text-right">Novo:</span>
                                                <span className="break-words font-semibold">{record.valor_posterior || '(vazio)'}</span>
                                            </div>
                                        </div>

                                        {record.codigo && (
                                            <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                                                <span className="font-medium">Código do Registro:</span>
                                                <span>{record.codigo}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
