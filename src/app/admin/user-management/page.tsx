
'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from '@/hooks/useSession';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/types';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/page-header';

const UserManagementPage = () => {
    const { session, isLoading } = useSession();
    const router = useRouter();
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        employeeId: '',
        role: 'Operator' as User['role'],
        password: '',
    });

    useEffect(() => {
        if (!isLoading && (!session.isLoggedIn || (session.role !== 'Admin' && session.role !== 'Manager'))) {
            router.push('/login');
        }
    }, [session, isLoading, router]);

    useEffect(() => {
        if (session.isLoggedIn) {
            fetchUsers();
        }
    }, [session.isLoggedIn]);

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            } else {
                toast({ variant: "destructive", title: "Error", description: "Failed to fetch users." });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "An error occurred while fetching users." });
        }
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement> | string, fieldName?: string) => {
        if (typeof e === 'string') {
            setFormData(prev => ({ ...prev, [fieldName!]: e as User['role'] }));
        } else {
            const { name, value } = e.target;
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.role !== 'Operator' && (!formData.email || !formData.password && !editingUser)) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "Email and password are required for non-operator roles.",
            });
            return;
        }

        const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
        const method = editingUser ? 'PUT' : 'POST';
        
        const body: any = {
            name: formData.name,
            role: formData.role,
            employeeId: formData.employeeId,
        };

        if (formData.role !== 'Operator') {
            body.email = formData.email;
            if (formData.password) {
                body.password = formData.password;
            }
        } else {
            // For operators, email is optional
             if (formData.email) {
                body.email = formData.email;
            }
        }

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (res.ok) {
                toast({ title: "Success", description: `User ${editingUser ? 'updated' : 'created'} successfully.` });
                resetFormAndClose();
                fetchUsers();
            } else {
                const errorData = await res.json();
                toast({ variant: "destructive", title: "Error", description: errorData.message || `Failed to ${editingUser ? 'update' : 'create'} user.` });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: `An unexpected error occurred.` });
        }
    };
    
    const resetFormAndClose = () => {
        setIsFormOpen(false);
        setEditingUser(null);
        setFormData({ name: '', email: '', employeeId: '', role: 'Operator', password: '' });
    }

    const openEditDialog = (user: User) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            email: user.email || '',
            employeeId: user.employeeId || '',
            role: user.role,
            password: '',
        });
        setIsFormOpen(true);
    };

    const openCreateDialog = () => {
        resetFormAndClose();
        setIsFormOpen(true);
    };
    
    const handleDeleteUser = async (userId: string) => {
        if (!confirm('Are you sure you want to delete this user?')) return;

        try {
            const res = await fetch(`/api/users/${userId}`, { method: 'DELETE' });
            if (res.ok) {
                toast({ title: "Success", description: "User deleted successfully." });
                fetchUsers();
            } else {
                const errorData = await res.json();
                toast({ variant: "destructive", title: "Error", description: errorData.message || "Failed to delete user." });
            }
        } catch (error) {
            toast({ variant: "destructive", title: "Error", description: "An error occurred while deleting the user." });
        }
    };


    const columns: ColumnDef<User>[] = [
        { accessorKey: 'name', header: 'Name' },
        { accessorKey: 'email', header: 'Email', cell: ({row}) => row.original.email || 'N/A' },
        { accessorKey: 'employeeId', header: 'Employee ID' },
        { accessorKey: 'role', header: 'Role' },
        {
            id: 'actions',
            cell: ({ row }) => (
                <div className="flex space-x-2">
                    <Button size="sm" onClick={() => openEditDialog(row.original)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteUser(row.original.id)}>Delete</Button>
                </div>
            ),
        },
    ];

    if (isLoading) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    return (
        <div className="flex flex-col gap-8">
            <PageHeader title="User Management" description="Add, edit, and remove users from the system." />
            
            <div className="flex justify-end">
                <Button onClick={openCreateDialog}>Create User</Button>
            </div>

            <Card>
                 <DataTable columns={columns} data={users} />
            </Card>

            <Dialog open={isFormOpen} onOpenChange={resetFormAndClose}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingUser ? 'Edit User' : 'Create User'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleFormSubmit} className="space-y-4 py-4">
                        <Input name="name" value={formData.name} onChange={handleFormChange} placeholder="Full Name" required />
                        <Input name="employeeId" value={formData.employeeId} onChange={handleFormChange} placeholder="Employee ID" />
                        <Select name="role" value={formData.role} onValueChange={(value) => handleFormChange(value, 'role')}>
                            <SelectTrigger>
                                <SelectValue placeholder="Role" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Admin">Admin</SelectItem>
                                <SelectItem value="Manager">Manager</SelectItem>
                                <SelectItem value="Supervisor">Supervisor</SelectItem>
                                <SelectItem value="Operator">Operator</SelectItem>
                            </SelectContent>
                        </Select>
                         {formData.role !== 'Operator' ? (
                            <>
                                <Input name="email" type="email" value={formData.email} onChange={handleFormChange} placeholder="Email Address" required />
                                <Input name="password" type="password" value={formData.password} onChange={handleFormChange} placeholder={editingUser ? 'New Password (optional)' : 'Password'} required={!editingUser} />
                            </>
                        ) : (
                            <p className='text-sm text-muted-foreground px-1'>Operators do not require an email or password for system access.</p>
                        )}
                        <div className="flex justify-end pt-4">
                            <Button type="submit">{editingUser ? 'Update User' : 'Create User'}</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default UserManagementPage;
