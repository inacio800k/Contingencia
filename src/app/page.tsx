'use client'

import { useEffect, useState, useCallback } from 'react'
import { VisibilityState } from '@tanstack/react-table'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import RealtimeRegistros from '@/components/realtime-registros'
import { Button } from '@/components/ui/button'
import { LogOut, X, Settings2, ChartArea } from 'lucide-react'
import { NewRegistroModal } from '@/components/new-registro-modal'
import { DataTableViewOptions } from '@/components/data-table-view-options'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Plus, ChevronDown, Replace, Link2, Cable, Monitor, Mail, RotateCcw } from 'lucide-react'





import { ZapsSobrandoNotification } from '@/components/zaps-sobrando-notification'
import { FormulariosDropdown } from '@/components/formularios-dropdown'
import { RespostasDropdown } from '@/components/respostas-dropdown'

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [table, setTable] = useState<any>(null)
  const [isFiltered, setIsFiltered] = useState(false)
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null)
  const [saveVisibility, setSaveVisibility] = useState<((visibility: VisibilityState) => void) | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
      } else {
        // Fetch user role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (profile) {
          setUserRole(profile.role as 'admin' | 'user')
        }

        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleClearFilters = () => {
    if (table) {
      table.resetColumnFilters()
    }
  }

  // Update isFiltered when table changes
  useEffect(() => {
    if (table) {
      const updateFilterStatus = () => {
        setIsFiltered(table.getState().columnFilters.length > 0)
      }

      // Initial check
      updateFilterStatus()

      // Set up interval to check for filter changes
      const interval = setInterval(updateFilterStatus, 100)

      return () => clearInterval(interval)
    }
  }, [table])

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-purple-950 text-gray-100 relative">
      {/* Animated Background Effects */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 -left-4 w-96 h-96 bg-blue-500/10 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
        <div className="absolute top-0 -right-4 w-96 h-96 bg-purple-500/10 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-pink-500/10 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      {/* Glassmorphism Header */}
      <div className="sticky top-0 z-50 w-full border-b border-white/10 backdrop-blur-xl bg-gradient-to-r from-gray-900/80 via-blue-900/80 to-purple-900/80 shadow-lg shadow-blue-500/5">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5"></div>
        <div className="relative flex h-16 items-center justify-between px-6">
          {/* Left: Logout and Admin Buttons */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="border-blue-500/30 hover:border-blue-400/50 bg-blue-500/10 hover:bg-blue-500/20 text-blue-200 hover:text-blue-100 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-blue-500/30 hover:border-blue-400/50 bg-blue-500/10 hover:bg-blue-500/20 text-blue-200 hover:text-blue-100 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20"
                >
                  Páginas Admin <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>

                {userRole === 'admin' && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/users" className="w-full cursor-pointer">
                        <Settings2 className="mr-2 h-4 w-4" />
                        Gerenciar Usuários
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/invalidos" className="w-full cursor-pointer">
                        Inválidos
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/gerenciar-tabelas" className="w-full cursor-pointer">
                        Gerenciar Tabelas
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/regras-metricas" className="w-full cursor-pointer">
                        Regras das Métricas
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <FormulariosDropdown />
          </div>

          {/* Center: Main Actions with enhanced styling */}
          <div className="flex items-center gap-3">
            <div className="transform transition-all duration-300 hover:scale-105">
              <NewRegistroModal />
            </div>
            <div className="transform transition-all duration-300 hover:scale-105">
              <RespostasDropdown />
            </div>

            <div className="transform transition-all duration-300 hover:scale-105">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-blue-500/30 hover:border-blue-400/50 bg-blue-500/10 hover:bg-blue-500/20 text-blue-200 hover:text-blue-100 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20"
                  >
                    Utilidades <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem asChild>
                    <Link href="/metricas" className="w-full cursor-pointer">
                      <ChartArea className="mr-2 h-4 w-4" />
                      Métricas
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/recondicionar" className="w-full cursor-pointer">
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Recondicionar
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/emails" className="w-full cursor-pointer">
                      <Mail className="mr-2 h-4 w-4" />
                      Emails
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            {isFiltered && (
              <Button
                variant="ghost"
                onClick={handleClearFilters}
                size="sm"
                className="h-10 border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-200 hover:text-purple-100 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20"
              >
                Limpar
                <X className="ml-2 h-4 w-4" />
              </Button>
            )}
            {table && (
              <div className="transform transition-all duration-300 hover:scale-105">
                <DataTableViewOptions
                  table={table}
                  onSaveVisibility={saveVisibility || undefined}
                />
              </div>
            )}
          </div>

          {/* Right: Notification and Logo */}
          <div className="flex items-center gap-4">
            <ZapsSobrandoNotification />

            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 animate-pulse"></div>
              <span className="text-sm font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Dashboard
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
        <RealtimeRegistros
          onTableReady={setTable}
          onSaveVisibilityReady={(fn) => setSaveVisibility(() => fn)}
        />
        <div className="fixed bottom-2 right-4 text-xs text-gray-500/50 pointer-events-none z-50">
          v3.1 (Fix Order Save)
        </div>
      </div>

      {/* Custom CSS for animations */}
      <style jsx global>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}
