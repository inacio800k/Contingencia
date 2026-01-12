import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "./ui/scroll-area"
import { Link as LinkIcon, ExternalLink } from "lucide-react"
import Link from "next/link"
import { Dispositivo, ZapsSobrando } from '@/types/schema'

type ZapsSobrandoItem = {
    dispositivo: string
    sobras: Record<string, Partial<ZapsSobrando>>
}

export function ZapsSobrandoNotification() {
    const [items, setItems] = useState<ZapsSobrandoItem[]>([])
    const [loading, setLoading] = useState(false)
    const [open, setOpen] = useState(false)

    const fetchData = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('dispositivos')
                .select('dispositivo, zaps_sobrando')

            if (error) {
                console.error('Error fetching zaps sobrando:', error)
                return
            }

            if (data) {
                const formattedItems: ZapsSobrandoItem[] = data
                    .filter((item: any) => {
                        // Check if zaps_sobrando exists and is not empty object
                        return item.zaps_sobrando &&
                            Object.keys(item.zaps_sobrando).length > 0 &&
                            JSON.stringify(item.zaps_sobrando) !== '{}'
                    })
                    .map((item: any) => ({
                        dispositivo: item.dispositivo,
                        sobras: item.zaps_sobrando
                    }))
                    .sort((a, b) => a.dispositivo.localeCompare(b.dispositivo, undefined, { numeric: true, sensitivity: 'base' }))
                setItems(formattedItems)
            }
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (open) {
            fetchData()
        }
    }, [open])

    // Poll for updates every minute to show badge (optional, but good for "notification" feel)
    // For now, simpler implies check on click as per requirement, but let's do an initial fetch to show badge dot if needed
    useEffect(() => {
        fetchData()
    }, [])

    const hasItems = items.length > 0

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-blue-200 hover:text-white hover:bg-white/10">
                    <Bell className="h-5 w-5" />
                    {hasItems && (
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0 bg-gray-900 border-gray-700 text-gray-100" align="end">
                <div className="p-3 border-b border-gray-700">
                    <h4 className="font-medium leading-none mb-1">Zaps Sobrando</h4>
                    <p className="text-xs text-muted-foreground">Dispositivos excedendo limites</p>
                </div>
                <ScrollArea className="h-72">
                    <div className="p-3 space-y-3">
                        {loading ? (
                            <div className="text-center text-sm text-gray-400 py-4">Carregando...</div>
                        ) : !hasItems ? (
                            <div className="text-center text-sm text-green-400 py-4 flex flex-col items-center gap-2">
                                <span>Tudo Certo!</span>
                                <span className="text-xs text-gray-500">Nenhum limite excedido.</span>
                            </div>
                        ) : (
                            items.map((item, idx) => (
                                <div key={idx} className="bg-gray-800/50 rounded-lg p-3 space-y-2 border border-blue-500/20">
                                    <div className="font-semibold text-blue-300 text-sm border-b border-gray-700 pb-1 mb-2">
                                        {item.dispositivo}
                                    </div>
                                    <div className="space-y-3">
                                        {Object.entries(item.sobras).map(([instancia, counts]) => (
                                            <div key={instancia} className="text-xs">
                                                <div className="text-gray-400 font-medium mb-1 bg-gray-900/50 px-1.5 py-0.5 rounded w-fit text-[10px] uppercase tracking-wider">
                                                    {instancia}
                                                </div>
                                                <div className="pl-2 space-y-0.5">
                                                    {Object.entries(counts).map(([key, value]) => (
                                                        <div key={key} className="flex items-center gap-2 text-gray-300">
                                                            <span>{key}:</span>
                                                            <span className="text-red-400 font-bold">+{String(value)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
                {hasItems && (
                    <div className="p-3 border-t border-gray-700 bg-gray-900/50">
                        <Button asChild size="sm" className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                            <Link href="/zaps-a-mais">
                                Ver Detalhes <ExternalLink className="ml-2 h-3 w-3" />
                            </Link>
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
}
