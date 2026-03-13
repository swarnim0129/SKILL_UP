'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import {
    Loader2,
    Search,
    Briefcase,
    MapPin,
    Calendar,
    Filter,
    MoreHorizontal,
    Mail,
    Phone,
    Download,
    ExternalLink,
    CheckCircle2,
    XCircle,
    Clock,
    UserCheck,
    Sparkles,
    Eye,
    ChevronDown,
    X,
    FileText as FileTextIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import Header from '@/components/Header';

// Types
interface Application {
    _id: string;
    status: 'pending' | 'reviewed' | 'shortlisted' | 'interviewed' | 'rejected' | 'hired';
    createdAt: string;
    notes?: string;
    coverLetter?: string;
    job: {
        _id: string;
        title: string;
        location: string;
        type: string;
    };
    resume?: string; // Application specific resume
    applicant: {
        _id: string;
        name: string;
        email: string;
        phone?: string;
        skills?: string[];
        experience?: string;
        resumeUrl?: string; // Profile resume
        linkedIn?: string;
        portfolio?: string;
        firstName?: string;
        lastName?: string;
    };
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    pending: { label: 'Pending', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', icon: Clock },
    reviewed: { label: 'Reviewed', color: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10', icon: Eye },
    shortlisted: { label: 'Shortlisted', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', icon: Sparkles },
    interviewed: { label: 'Interviewed', color: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10', icon: UserCheck },
    rejected: { label: 'Rejected', color: 'text-red-700 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10', icon: XCircle },
    hired: { label: 'Hired', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', icon: CheckCircle2 },
};

/* ── Update Modal ── */
function UpdateModal({ isOpen, onClose, app, onUpdate }: {
    isOpen: boolean; onClose: () => void; app: Application | null;
    onUpdate: (status: string, notes: string) => Promise<void>;
}) {
    const [newStatus, setNewStatus] = useState<string>(app?.status || 'pending');
    const [notes, setNotes] = useState(app?.notes || '');
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        if (app) { setNewStatus(app.status); setNotes(app.notes || ''); }
    }, [app]);

    if (!isOpen || !app) return null;

    const handleSubmit = async () => {
        setUpdating(true);
        await onUpdate(newStatus, notes);
        setUpdating(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800"
            >
                <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center bg-neutral-50/50 dark:bg-neutral-900">
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Update Status</h3>
                    <button onClick={onClose} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white"><X size={20} /></button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Status Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Application Status</label>
                        <div className="grid grid-cols-3 gap-2">
                            {Object.keys(statusConfig).map((statusKey) => {
                                const config = statusConfig[statusKey];
                                const isActive = newStatus === statusKey;
                                return (
                                    <button
                                        key={statusKey}
                                        onClick={() => setNewStatus(statusKey)}
                                        className={cn(
                                            "flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium border transition-all",
                                            isActive
                                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                                                : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                                        )}
                                    >
                                        <config.icon size={14} />
                                        {config.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add internal notes about this candidate..."
                            className="w-full min-h-[100px] p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-3 bg-neutral-50/50 dark:bg-neutral-900">
                    <Button variant="outline" onClick={onClose} disabled={updating}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={updating} className="bg-blue-600 hover:bg-blue-700 text-white">
                        {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                        Save Changes
                    </Button>
                </div>
            </motion.div>
        </div>
    );
}

export default function ApplicantsPage() {
    const { getToken } = useAuth();
    const searchParams = useSearchParams();

    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [jobFilter, setJobFilter] = useState(searchParams.get('job') || '');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedApp, setSelectedApp] = useState<Application | null>(null);
    const [updateModalOpen, setUpdateModalOpen] = useState(false);

    // Fetch data
    const fetchApplications = async () => {
        try {
            const token = await getToken();
            const params = new URLSearchParams();
            if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
            if (jobFilter && jobFilter !== 'all') params.append('jobId', jobFilter);

            const response = await api.get(`/applications?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            setApplications(response.data.applications);
        } catch (error) {
            console.error('Failed to fetch applications:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, [statusFilter, jobFilter, getToken]);

    // Unique jobs for filter
    const uniqueJobs = useMemo(() => {
        const jobs = new Map();
        applications.forEach(app => {
            if (app.job) {
                jobs.set(app.job._id, app.job.title);
            }
        });
        return Array.from(jobs.entries());
    }, [applications]);

    // Filtered list
    const filteredApplications = useMemo(() => {
        return applications.filter(app => {
            const matchesSearch =
                (app.applicant?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (app.applicant?.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (app.job?.title || '').toLowerCase().includes(searchQuery.toLowerCase());

            return matchesSearch;
        }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }, [applications, searchQuery]);

    // Stats
    const stats = {
        total: applications.length,
        pending: applications.filter(a => a.status === 'pending').length,
        shortlisted: applications.filter(a => a.status === 'shortlisted').length,
        hired: applications.filter(a => a.status === 'hired').length,
    };

    const handleUpdateChange = async (status: string, notes: string) => {
        if (!selectedApp) return;
        try {
            const token = await getToken();
            await api.put(`/applications/${selectedApp._id}/status`, { status, notes }, {
                headers: { Authorization: `Bearer ${token}` },
            });

            // Update local state
            setApplications(apps => apps.map(a =>
                a._id === selectedApp._id ? { ...a, status: status as any, notes } : a
            ));
            setUpdateModalOpen(false);
            setSelectedApp(null);
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center bg-white dark:bg-black"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>;
    }

    return (
        <div className="animate-fade-in bg-white dark:bg-black min-h-screen pb-12">
            <Header title="Applicants Overview" />

            <div className="max-w-7xl mx-auto px-6 space-y-6">
                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="p-4 flex items-center gap-4 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                        <div className="h-12 w-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Briefcase size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.total}</p>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Total Applications</p>
                        </div>
                    </Card>
                    <Card className="p-4 flex items-center gap-4 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                        <div className="h-12 w-12 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <Clock size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.pending}</p>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Pending Review</p>
                        </div>
                    </Card>
                    <Card className="p-4 flex items-center gap-4 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                        <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.shortlisted}</p>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Shortlisted</p>
                        </div>
                    </Card>
                    <Card className="p-4 flex items-center gap-4 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                        <div className="h-12 w-12 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
                            <CheckCircle2 size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.hired}</p>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">Hired Candidates</p>
                        </div>
                    </Card>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                        <input
                            type="text"
                            placeholder="Search applicants, jobs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm"
                        />
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:flex-none">
                            <select
                                value={jobFilter}
                                onChange={(e) => setJobFilter(e.target.value)}
                                className="w-full md:w-48 appearance-none pl-3 pr-8 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm cursor-pointer"
                            >
                                <option value="all">All Jobs</option>
                                {uniqueJobs.map(([id, title]) => (
                                    <option key={id} value={id}>{title}</option>
                                ))}
                            </select>
                            <Briefcase className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                        </div>

                        <div className="relative flex-1 md:flex-none">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full md:w-40 appearance-none pl-3 pr-8 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm cursor-pointer"
                            >
                                <option value="all">All Statuses</option>
                                {Object.keys(statusConfig).map(status => (
                                    <option key={status} value={status}>{statusConfig[status].label}</option>
                                ))}
                            </select>
                            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Table View */}
                <Card className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900">
                                    <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Candidate</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Applied For</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-neutral-500 uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                                {filteredApplications.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-neutral-500 dark:text-neutral-400">
                                            No applications found matching your criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredApplications.map((app) => (
                                        <tr key={app._id} className="group hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                                        {getInitials(app.applicant?.name || 'Unknown')}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                                                            {app.applicant?.name}
                                                        </p>
                                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                                            {app.applicant?.email}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="text-sm font-medium text-neutral-900 dark:text-white">{app.job?.title}</p>
                                                    <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                                                        <MapPin size={10} />
                                                        {app.job?.location} • {app.job?.type}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                                                    <Calendar size={14} />
                                                    {formatDate(app.createdAt)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <Badge
                                                    variant={
                                                        app.status === 'shortlisted' ? 'success' :
                                                            app.status === 'rejected' ? 'danger' :
                                                                app.status === 'hired' ? 'success' :
                                                                    app.status === 'reviewed' ? 'info' : 'warning'
                                                    }
                                                    className="capitalize"
                                                >
                                                    {statusConfig[app.status]?.label || app.status}
                                                </Badge>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {(app.resume || app.applicant?.resumeUrl) && (
                                                        <a
                                                            href={app.resume || app.applicant?.resumeUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                                                            title="View Resume"
                                                        >
                                                            <ExternalLink size={16} />
                                                        </a>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => {
                                                            setSelectedApp(app);
                                                            setUpdateModalOpen(true);
                                                        }}
                                                        className="text-neutral-600 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10"
                                                    >
                                                        View Details
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            <UpdateModal
                isOpen={updateModalOpen}
                onClose={() => setUpdateModalOpen(false)}
                app={selectedApp}
                onUpdate={handleUpdateChange}
            />
        </div>
    );
}
