'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building2, Check, X, Ban, Loader2, Globe, MapPin, Search, Plus } from 'lucide-react';
import Header from '@/components/Header';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

interface Company {
    _id: string;
    companyName: string;
    email: string;
    status: 'pending' | 'active' | 'suspended';
    industry: string;
    industryOther?: string;
    location: string;
    website: string;
    size?: string;
    description?: string;
    createdAt: string;
    contactPerson?: {
        name: string;
        designation: string;
        phone: string;
    };
    document?: {
        type: string;
        number: string;
        url: string;
    };
}

export default function AdminCompaniesPage() {
    const router = useRouter();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCompanies = companies.filter(company =>
        company.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        company.industry.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500/api'}/admin/companies`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setCompanies(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (e: React.MouseEvent, id: string, newStatus: string) => {
        e.stopPropagation();
        setActionLoading(id);
        try {
            const token = localStorage.getItem('adminToken');
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500/api'}/admin/companies/${id}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });
            setCompanies(prev => prev.map(c => c._id === id ? { ...c, status: newStatus as any } : c));
        } catch (error) {
            console.error(error);
        } finally {
            setActionLoading(null);
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
            <Header title="Company Management" />

            <div className="p-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="relative flex-1 max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search companies..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>
                    <Link href="/admin/companies/new">
                        <button className="flex items-center gap-2 px-5 py-2 bg-[#4a6cf7] hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/20">
                            <Plus size={18} /> Add Company
                        </button>
                    </Link>
                </div>

                <Card className="overflow-hidden bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Company</th>
                                    <th className="px-6 py-4 font-medium">Industry</th>
                                    <th className="px-6 py-4 font-medium">Location</th>
                                    <th className="px-6 py-4 font-medium">Joined</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 text-slate-700 dark:text-neutral-300">
                                {filteredCompanies.map((company) => (
                                    <tr
                                        key={company._id}
                                        onClick={() => router.push(`/admin/companies/${company._id}`)}
                                        className="hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-500">
                                                    <Building2 size={20} />
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-slate-900 dark:text-white">
                                                        {company.companyName}
                                                    </div>
                                                    <a href={company.website} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-xs text-slate-400 hover:text-blue-500 flex items-center gap-1">
                                                        <Globe size={10} /> Visit Website
                                                    </a>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 capitalize">{company.industry || 'N/A'}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 text-slate-500">
                                                <MapPin size={14} />
                                                {company.location || 'Remote'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {new Date(company.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={
                                                company.status === 'active' ? 'success' :
                                                    company.status === 'suspended' ? 'danger' : 'warning'
                                            }>
                                                {company.status}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end gap-2">
                                                {actionLoading === company._id ? (
                                                    <Loader2 size={18} className="animate-spin text-slate-400" />
                                                ) : (
                                                    <>
                                                        {company.status === 'pending' && (
                                                            <>
                                                                <button
                                                                    onClick={(e) => handleStatusUpdate(e, company._id, 'active')}
                                                                    title="Approve"
                                                                    className="p-2 rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                                                                >
                                                                    <Check size={18} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => handleStatusUpdate(e, company._id, 'suspended')}
                                                                    title="Reject"
                                                                    className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                                >
                                                                    <X size={18} />
                                                                </button>
                                                            </>
                                                        )}
                                                        {company.status === 'active' && (
                                                            <button
                                                                onClick={(e) => handleStatusUpdate(e, company._id, 'suspended')}
                                                                title="Ban Company"
                                                                className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                            >
                                                                <Ban size={18} />
                                                            </button>
                                                        )}
                                                        {company.status === 'suspended' && (
                                                            <button
                                                                onClick={(e) => handleStatusUpdate(e, company._id, 'active')}
                                                                title="Reactivate"
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
                                {filteredCompanies.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                            No companies found.
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
