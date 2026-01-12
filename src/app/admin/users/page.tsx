'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Profile {
    id: string
    email: string
    role: 'admin' | 'user'
    username?: string
}

export default function AdminUsersPage() {
    const router = useRouter()
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [loading, setLoading] = useState(true)
    const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'user' | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [editingUser, setEditingUser] = useState<Profile | null>(null)
    const [newUsername, setNewUsername] = useState('')
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    useEffect(() => {
        const checkAdminAndFetchUsers = async () => {
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

            // Fetch all users
            console.log('Fetching profiles...')
            const { data, error } = await supabase
                .from('profiles')
                .select('id, email, role, username')
                .order('email', { ascending: true })

            console.log('Profiles query result:', { data, error })

            if (error) {
                console.error('Error fetching profiles:', error)
                setError(`Erro ao buscar usuários: ${error.message}. Verifique as políticas RLS no Supabase.`)
            } else {
                setProfiles(data || [])
                console.log(`Loaded ${data?.length || 0} profiles`)
            }

            setLoading(false)
        }

        checkAdminAndFetchUsers()
    }, [router])

    const handleRoleChange = async (userId: string, newRole: 'admin' | 'user') => {
        const { error } = await supabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', userId)

        if (error) {
            console.error('Error updating role:', error)
            alert('Erro ao atualizar role: ' + error.message)
        } else {
            // Update local state
            setProfiles(profiles.map(profile =>
                profile.id === userId ? { ...profile, role: newRole } : profile
            ))
        }
    }

    const openEditDialog = (profile: Profile) => {
        setEditingUser(profile)
        setNewUsername(profile.username || '')
        setIsDialogOpen(true)
    }

    const handleUsernameSave = async () => {
        if (!editingUser) return

        const { error } = await supabase
            .from('profiles')
            .update({ username: newUsername })
            .eq('id', editingUser.id)

        if (error) {
            console.error('Error updating username:', error)
            alert('Erro ao atualizar username: ' + error.message)
        } else {
            // Update local state
            setProfiles(profiles.map(profile =>
                profile.id === editingUser.id ? { ...profile, username: newUsername } : profile
            ))
            setIsDialogOpen(false)
            setEditingUser(null)
            setNewUsername('')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-gray-400">Carregando...</p>
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

    return (
        <div className="container mx-auto py-10">
            <Card className="bg-gray-900 border-gray-800">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-2xl text-white">Gerenciar Usuários</CardTitle>
                            <CardDescription className="text-gray-400">
                                Gerencie os roles (permissões) e usernames de todos os usuários do sistema
                            </CardDescription>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => router.push('/')}
                            className="bg-gray-800 border-gray-700 text-white hover:bg-gray-700"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Voltar ao Dashboard
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="border-gray-800 hover:bg-gray-800/50">
                                <TableHead className="text-gray-400">Email</TableHead>
                                <TableHead className="text-gray-400">Username</TableHead>
                                <TableHead className="text-gray-400">Role</TableHead>
                                <TableHead className="text-gray-400 text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {profiles.map((profile) => (
                                <TableRow key={profile.id} className="border-gray-800 hover:bg-gray-800/30">
                                    <TableCell className="text-white">{profile.email}</TableCell>
                                    <TableCell className="text-white">{profile.username || '-'}</TableCell>
                                    <TableCell>
                                        <Select
                                            value={profile.role}
                                            onValueChange={(value: 'admin' | 'user') => handleRoleChange(profile.id, value)}
                                        >
                                            <SelectTrigger className="w-[120px] bg-gray-800 border-gray-700 text-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-gray-800 border-gray-700">
                                                <SelectItem value="admin" className="text-white hover:bg-gray-700">
                                                    Admin
                                                </SelectItem>
                                                <SelectItem value="user" className="text-white hover:bg-gray-700">
                                                    User
                                                </SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => openEditDialog(profile)}
                                            className="text-gray-400 hover:text-white hover:bg-gray-800"
                                        >
                                            Editar Username
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="bg-gray-900 border-gray-800 text-white">
                    <DialogHeader>
                        <DialogTitle>Editar Username</DialogTitle>
                        <DialogDescription className="text-gray-400">
                            Digite o novo username para {editingUser?.email}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Label htmlFor="username" className="text-right mb-2 block">
                            Novo Username
                        </Label>
                        <Input
                            id="username"
                            value={newUsername}
                            onChange={(e) => setNewUsername(e.target.value)}
                            className="bg-gray-800 border-gray-700 text-white"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="bg-transparent border-gray-700 text-white hover:bg-gray-800">
                            Cancelar
                        </Button>
                        <Button onClick={handleUsernameSave} className="bg-blue-600 hover:bg-blue-700 text-white">
                            Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
