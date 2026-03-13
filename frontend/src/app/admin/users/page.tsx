'use client';

import React, { useEffect, useState } from 'react';
import { Users, Ban, Check, Loader2, MapPin, Briefcase, Coins, Search, Eye } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

interface Candidate {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    status: 'active' | 'suspended';
    location: string;
    credits: number;
    jobPreferences?: {
        desiredRole: string;
    };
    createdAt: string;
}

export default function AdminUsersPage() {
    const router = useRouter();
    const [users, setUsers] = useState<Candidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [editingCredits, setEditingCredits] = useState<string | null>(null);
    const [creditValue, setCreditValue] = useState<string>('');
    const [creditLoading, setCreditLoading] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredUsers = users.filter(user =>
        user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500/api'}/admin/candidates`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setUsers(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        setActionLoading(id);
        try {
            const token = localStorage.getItem('adminToken');
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500/api'}/admin/candidates/${id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            setUsers(prev => prev.map(u => u._id === id ? { ...u, status: newStatus as any } : u));
        } catch (error) {
            console.error(error);
        } finally {
            setActionLoading(null);
        }
    };

    const handleCreditSave = async (id: string) => {
        const amount = parseInt(creditValue, 10);
        if (isNaN(amount) || amount < 0) return;

        setCreditLoading(id);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500/api'}/admin/candidates/${id}/credits`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ credits: amount })
            });
            const data = await res.json();
            if (data.success) {
                setUsers(prev => prev.map(u => u._id === id ? { ...u, credits: data.credits } : u));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setCreditLoading(null);
            setEditingCredits(null);
            setCreditValue('');
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-neutral-900">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in pb-12">
            <Header title="User Management" />

            <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="relative flex-1 max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search users..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>
                </div>

                <Card className="overflow-hidden bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400">
                                <tr>
                                    <th className="px-6 py-4 font-medium">User</th>
                                    <th className="px-6 py-4 font-medium">Role / Preference</th>
                                    <th className="px-6 py-4 font-medium">Location</th>
                                    <th className="px-6 py-4 font-medium">Credits</th>
                                    <th className="px-6 py-4 font-medium">Joined</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 text-slate-700 dark:text-neutral-300">
                                {filteredUsers.map((user) => (
                                    <tr 
                                        key={user._id} 
                                        onClick={() => router.push(`/admin/users/${user._id}`)} 
                                        className="hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-500">
                                                    <Users size={20} />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900 dark:text-white">
                                                        {user.firstName} {user.lastName}
                                                    </div>
                                                    <div className="text-xs text-slate-400">
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Briefcase size={14} className="text-slate-400" />
                                                <span>{user.jobPreferences?.desiredRole || 'Not specified'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-500">
                                                <MapPin size={14} />
                                                {user.location || 'Unknown'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {editingCredits === user._id ? (
                                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={creditValue}
                                                        onChange={(e) => setCreditValue(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') handleCreditSave(user._id);
                                                            if (e.key === 'Escape') { setEditingCredits(null); setCreditValue(''); }
                                                        }}
                                                        autoFocus
                                                        className="w-20 px-2 py-1 text-sm rounded-lg border border-slate-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/40"
                                                    />
                                                    {creditLoading === user._id ? (
                                                        <Loader2 size={16} className="animate-spin text-blue-500" />
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleCreditSave(user._id); }}
                                                                className="p-1 rounded text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                                                                title="Save"
                                                            >
                                                                <Check size={16} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setEditingCredits(null); setCreditValue(''); }}
                                                                className="p-1 rounded text-slate-400 hover:bg-slate-100 dark:hover:bg-neutral-700 text-xs"
                                                                title="Cancel"
                                                            >
                                                                ✕
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingCredits(user._id);
                                                        setCreditValue(String(user.credits || 0));
                                                    }}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                                                    title="Click to edit credits"
                                                >
                                                    <Coins size={14} />
                                                    {user.credits || 0}
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={user.status === 'active' ? 'success' : 'danger'}>
                                                {user.status || 'active'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end gap-2">
                                                {actionLoading === user._id ? (
                                                    <Loader2 size={18} className="animate-spin text-slate-400" />
                                                ) : (
                                                    <>
                                                        {(user.status === 'active' || !user.status) ? (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleStatusUpdate(user._id, 'suspended'); }}
                                                                title="Ban User"
                                                                className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                            >
                                                                <Ban size={18} />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleStatusUpdate(user._id, 'active'); }}
                                                                title="Unban"
                                                                className="p-2 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                                                            >
                                                                <Check size={18} />
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                            No users found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
}
