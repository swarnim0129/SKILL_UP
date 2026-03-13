'use client';

import React, { useEffect, useState } from 'react';
import {
    Briefcase,
    Users,
    FileCheck,
    Clock,
    TrendingUp,
    ArrowUpRight,
    BarChart3,
    Eye,
    CheckCircle2,
    XCircle,
    UserCheck,
    Sparkles,
    MapPin,
    Plus,
    Building2,
} from 'lucide-react';
import { useAuth, useUser } from '@clerk/nextjs';
import api from '@/lib/api';
import Link from 'next/link';

const statusConfig: Record<string, { color: string }> = {
    pending: { color: 'text-amber-500' },
    reviewed: { color: 'text-blue-500' },
    shortlisted: { color: 'text-emerald-500' },
    interviewed: { color: 'text-violet-500' },
    rejected: { color: 'text-red-500' },
    hired: { color: 'text-emerald-500' },
};

interface DashboardStats {
    jobs: { total: number; active: number; closed: number };
    applications: { total: number; pending: number; shortlisted: number; status: number };
    recentApplications: Array<{
        _id: string;
        job: { title: string };
        applicant: { name: string; email: string };
        status: string;
        createdAt: string;
    }>;
}

function ago(d: string) {
    const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
}

export default function CompanyDashboard() {
    const { getToken } = useAuth();
    const { user } = useUser();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [companyData, setCompanyData] = useState<any>(null);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const token = await getToken();
                const profileRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/onboarding/check`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const profileData = await profileRes.json();
                if (profileData.exists && profileData.role === 'company') {
                    setCompanyData(profileData.user);
                    if (profileData.user.status === 'active') {
                        const statsRes = await api.get('/company/stats', {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        setStats(statsRes.data);
                    }
                }
            } catch (error) { console.error('Failed to fetch stats:', error); }
            finally { setLoading(false); }
        };
        if (user) fetchStats();
    }, [user, getToken]);

    // Pending state
    if (companyData?.status === 'pending') {
        return (
            <div className="flex h-full items-center justify-center p-8 min-h-[60vh]">
                <div className="max-w-md w-full text-center bg-white dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-sm">
                    <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 ring-4 ring-yellow-50/50 dark:ring-yellow-500/5">
                        <Clock size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Account Pending Approval</h2>
                    <p className="text-slate-500 dark:text-slate-400">Your company account is currently pending admin approval. You'll be able to post jobs once your account is activated.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
                        Company Dashboard
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Manage your jobs, applicants, and hiring pipeline
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Link href="/company/jobs/new">
                        <button className="bg-[#4a6cf7] hover:bg-[#4a6cf7]/90 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm">
                            <Plus size={16} /> Post a Job
                        </button>
                    </Link>
                </div>
            </div>

            {/* Stats Grid — same style as admin */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Jobs', value: stats?.jobs.total || 0, icon: Briefcase },
                    { label: 'Active Jobs', value: stats?.jobs.active || 0, icon: FileCheck },
                    { label: 'Total Applicants', value: stats?.applications.total || 0, icon: Users },
                    { label: 'Pending Review', value: stats?.applications.pending || 0, icon: Clock },
                ].map((stat, i) => (
                    <div key={i} className="group relative p-6 bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-slate-800 hover:border-[#4a6cf7]/30 transition-all duration-300 shadow-sm hover:shadow-md">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-2.5 rounded-lg bg-[#4a6cf7]/5 text-[#4a6cf7] group-hover:bg-[#4a6cf7] group-hover:text-white transition-colors duration-300">
                                <stat.icon size={22} className="stroke-[1.5]" />
                            </div>
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-200 dark:bg-slate-800 group-hover:bg-[#4a6cf7] transition-colors"></span>
                        </div>
                        <div>
                            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                                {loading ? '...' : stat.value}
                            </h3>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 group-hover:text-[#4a6cf7] transition-colors">
                                {stat.label}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Secondary Section — 3-column split like admin */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column — Action Cards */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Company Profile Card */}
                    <div className="bg-white dark:bg-black p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center gap-3 mb-6">
                            <Building2 size={20} className="text-[#4a6cf7]" />
                            <h3 className="font-semibold text-slate-900 dark:text-white">Company Profile</h3>
                        </div>
                        <div className="space-y-3 mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-[#4a6cf7]/5 text-[#4a6cf7] flex items-center justify-center font-bold text-lg">
                                    {companyData?.companyName?.charAt(0)?.toUpperCase() || 'C'}
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900 dark:text-white">{companyData?.companyName || 'Your Company'}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{companyData?.industry || 'Industry not set'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                                {companyData?.location && (
                                    <span className="flex items-center gap-1"><MapPin size={14} />{companyData.location}</span>
                                )}
                                {companyData?.size && (
                                    <span className="flex items-center gap-1"><Users size={14} />{companyData.size}</span>
                                )}
                            </div>
                        </div>
                        <Link href="/company/profile" className="text-sm font-medium text-[#4a6cf7] hover:bg-[#4a6cf7]/5 px-3 py-1.5 rounded-md transition-colors self-end">
                            Edit Profile &rarr;
                        </Link>
                    </div>

                    {/* Pending Applications */}
                    <div className="bg-white dark:bg-black p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
                        <div className="flex items-center gap-3 mb-6">
                            <Clock size={20} className="text-[#4a6cf7]" />
                            <h3 className="font-semibold text-slate-900 dark:text-white">Pending Applications</h3>
                        </div>
                        <div className="flex items-end justify-between">
                            <div>
                                <span className="text-4xl font-bold text-slate-900 dark:text-white block mb-1">{stats?.applications.pending || 0}</span>
                                <span className="text-sm text-slate-500 dark:text-slate-400">Candidates awaiting review</span>
                            </div>
                            <Link href="/company/applicants" className="text-sm font-medium text-[#4a6cf7] hover:bg-[#4a6cf7]/5 px-3 py-1.5 rounded-md transition-colors">
                                Review &rarr;
                            </Link>
                        </div>
                    </div>

                    {/* Quick Management — same accent bar as admin */}
                    <div className="md:col-span-2 bg-[#4a6cf7] p-6 rounded-xl text-white shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <Briefcase size={120} />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-xl font-bold mb-4">Quick Management</h3>
                            <div className="flex gap-3 flex-wrap">
                                <Link href="/company/jobs" className="bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-white/10">
                                    Manage Jobs
                                </Link>
                                <Link href="/company/applicants" className="bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-white/10">
                                    View Applicants
                                </Link>
                                <Link href="/company/jobs/new" className="bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-white/10">
                                    Post New Job
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column — Hiring Metrics (like admin's Platform Metrics) */}
                <div className="bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                    <h3 className="font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                        <BarChart3 size={18} className="text-[#4a6cf7]" />
                        Hiring Metrics
                    </h3>

                    <div className="space-y-6">
                        {[
                            { label: 'Total Jobs Posted', value: stats?.jobs.total || 0, total: Math.max(stats?.jobs.total || 1, 1) },
                            { label: 'Active Job Listings', value: stats?.jobs.active || 0, total: Math.max(stats?.jobs.total || 1, 1) },
                            { label: 'Total Applications', value: stats?.applications.total || 0, total: Math.max(stats?.applications.total || 1, 100) },
                            { label: 'Shortlisted Candidates', value: stats?.applications.shortlisted || 0, total: Math.max(stats?.applications.total || 1, 1) },
                        ].map((s, i) => (
                            <div key={i}>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-slate-600 dark:text-slate-400">{s.label}</span>
                                    <span className="font-bold text-slate-900 dark:text-white">{s.value}</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-[#4a6cf7] rounded-full transition-all"
                                        style={{ width: `${Math.min((s.value / s.total) * 100, 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-xs text-center text-slate-400">
                            Last updated: Just now
                        </p>
                    </div>
                </div>
            </div>

            {/* Recent Applications */}
            <div className="bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="font-semibold text-slate-900 dark:text-white">Recent Applications</h3>
                    <Link href="/company/applicants" className="text-sm font-medium text-[#4a6cf7] hover:underline flex items-center gap-1">
                        View All <ArrowUpRight className="w-4 h-4" />
                    </Link>
                </div>
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#4a6cf7] border-t-transparent"></div>
                    </div>
                ) : stats?.recentApplications?.length ? (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {stats.recentApplications.map((app) => (
                            <div key={app._id} className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4a6cf7]/5 text-[#4a6cf7] font-bold text-base group-hover:bg-[#4a6cf7] group-hover:text-white transition-colors duration-300">
                                        {app.applicant?.name?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white group-hover:text-[#4a6cf7] transition-colors">
                                            {app.applicant?.name || 'Unknown Applicant'}
                                        </p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">
                                            Applied for {app.job?.title}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="hidden md:block text-right">
                                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Applied</p>
                                        <p className="text-sm text-slate-600 dark:text-slate-300">
                                            {ago(app.createdAt)}
                                        </p>
                                    </div>
                                    <span className={`capitalize text-sm font-semibold ${statusConfig[app.status]?.color || 'text-slate-500'}`}>
                                        {app.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <Users className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                        <h3 className="text-slate-900 dark:text-white font-medium mb-1">No applications yet</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">
                            Post a job to start receiving applications!
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
