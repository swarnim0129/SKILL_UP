'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    ArrowLeft, MapPin, Briefcase, Users, Loader2,
    Calendar, ExternalLink, Eye, Coins, FileText, CheckCircle2, UserCheck, Sparkles, Clock, XCircle, X
} from 'lucide-react';
import Header from '@/components/Header';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface Candidate {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    status: 'active' | 'suspended';
    location: string;
    credits: number;
    experience?: string;
    education?: string;
    skills?: string[];
    bio?: string;
    resumeUrl?: string;
    jobPreferences?: {
        desiredRole: string;
        expectedSalary: string;
        willRelocate: boolean;
    };
    createdAt: string;
}

interface Application {
    _id: string;
    status: 'pending' | 'reviewed' | 'shortlisted' | 'interviewed' | 'rejected' | 'hired';
    createdAt: string;
    notes?: string;
    job: {
        _id: string;
        title: string;
        type: string;
        location: string;
        status: string;
        salary?: { min: number; max: number; currency: string };
        company?: { _id: string; companyName: string; logo?: string };
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

function UpdateModal({ isOpen, onClose, app, onUpdate }: {
    isOpen: boolean; onClose: () => void; app: Application | null;
    onUpdate: (id: string, status: string, notes: string) => Promise<void>;
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
        await onUpdate(app._id, newStatus, notes);
        setUpdating(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 animate-in fade-in zoom-in-95">
                <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Update Application Status</h3>
                    <button onClick={onClose} className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-6">
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Status</label>
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
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Notes</label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Add internal notes..."
                            className="w-full min-h-[100px] p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                        />
                    </div>
                </div>
                <div className="p-6 border-t border-neutral-200 dark:border-neutral-800 flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose} disabled={updating}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={updating} className="bg-blue-600 hover:bg-blue-700 text-white">
                        {updating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                        Save Changes
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function AdminCandidateDetailPage() {
    const params = useParams();
    const router = useRouter();
    const candidateId = params.id as string;

    const [candidate, setCandidate] = useState<Candidate | null>(null);
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [updateModalOpen, setUpdateModalOpen] = useState(false);
    const [selectedApp, setSelectedApp] = useState<Application | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get(`/admin/candidates/${candidateId}`);
                setCandidate(res.data.candidate);
                setApplications(res.data.applications || []);
            } catch (err) {
                console.error('Failed to fetch candidate data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [candidateId]);

    const handleUpdateStatus = async (applicationId: string, status: string, notes: string) => {
        try {
            await api.put(`/admin/applications/${applicationId}/status`, { status, notes });
            setApplications(apps => apps.map(a =>
                a._id === applicationId ? { ...a, status: status as any, notes } : a
            ));
            setUpdateModalOpen(false);
            setSelectedApp(null);
        } catch (err) {
            console.error('Failed to update status:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!candidate) {
        return (
            <div className="flex h-screen items-center justify-center flex-col gap-4">
                <p className="text-neutral-500">User not found.</p>
                <Button variant="outline" onClick={() => router.push('/admin/users')}>
                    <ArrowLeft size={16} className="mr-2" /> Back to Users
                </Button>
            </div>
        );
    }

    const initials = `${candidate.firstName?.[0] || ''}${candidate.lastName?.[0] || ''}`.toUpperCase() || 'UN';

    return (
        <div className="animate-fade-in pb-12">
            <Header title="User Details" />

            <div className="max-w-6xl mx-auto px-6 space-y-8">
                {/* Back button */}
                <button
                    onClick={() => router.push('/admin/users')}
                    className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors mt-6"
                >
                    <ArrowLeft size={16} /> Back to Users
                </button>

                {/* Candidate Header Card */}
                <Card className="overflow-hidden bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-sm rounded-2xl">
                    <div className="p-6 md:p-8">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                            <div className="flex items-start gap-5">
                                <div className="h-16 w-16 rounded-2xl bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-500 shrink-0 font-bold text-2xl">
                                    {initials}
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                                            {candidate.firstName} {candidate.lastName}
                                        </h1>
                                        <Badge variant={
                                            candidate.status === 'active' ? 'success' : 'danger'
                                        }>
                                            {candidate.status || 'active'}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500 dark:text-neutral-400">
                                        {candidate.email && (
                                            <span className="flex items-center gap-1">{candidate.email}</span>
                                        )}
                                        {candidate.phone && (
                                            <span className="flex items-center gap-1">{candidate.phone}</span>
                                        )}
                                        {candidate.location && (
                                            <span className="flex items-center gap-1"><MapPin size={14} />{candidate.location}</span>
                                        )}
                                        <span className="flex items-center gap-1"><Calendar size={14} />Joined {new Date(candidate.createdAt).toLocaleDateString()}</span>
                                        <span className="flex items-center gap-1 text-amber-600 dark:text-amber-500 font-medium bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded"><Coins size={14} />{candidate.credits} credits</span>
                                    </div>
                                    
                                    {candidate.jobPreferences?.desiredRole && (
                                        <div className="mt-3 text-sm text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                                            <Briefcase size={14}/> Desired Role: 
                                            <span className="text-neutral-900 dark:text-white font-medium ml-1">
                                                {candidate.jobPreferences.desiredRole}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Additional Info / Bio */}
                {(candidate.bio || (candidate.skills && candidate.skills.length > 0) || candidate.resumeUrl) && (
                    <Card className="overflow-hidden bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-sm rounded-2xl">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                                <FileText size={20} className="text-blue-500" />
                                Professional Profile
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">Resume</p>
                                    {candidate.resumeUrl ? (
                                        <a
                                            href={candidate.resumeUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                        >
                                            <ExternalLink size={14} /> View Resume
                                        </a>
                                    ) : (
                                        <p className="text-sm text-neutral-500">Not uploaded</p>
                                    )}
                                </div>
                                {candidate.skills && candidate.skills.length > 0 && (
                                    <div>
                                        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">Skills</p>
                                        <div className="flex flex-wrap gap-2">
                                            {candidate.skills.map(skill => (
                                                <Badge key={skill} variant="secondary" className="font-normal">{skill}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {candidate.bio && (
                                    <div className="col-span-1 md:col-span-2 mt-2">
                                        <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">Bio</p>
                                        <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed max-w-3xl whitespace-pre-wrap">{candidate.bio}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                )}

                {/* Applications Section Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                            Job Applications
                        </h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {applications.length} application{applications.length !== 1 ? 's' : ''} submitted by this user
                        </p>
                    </div>
                </div>

                {/* Applications List */}
                {applications.length === 0 ? (
                     <Card className="text-center py-16 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-sm rounded-2xl">
                         <Briefcase size={48} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-4" />
                         <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                             No applications found
                         </h3>
                         <p className="text-neutral-500 dark:text-neutral-400 mb-6 max-w-sm mx-auto">
                             This user hasn't applied to any jobs yet.
                         </p>
                     </Card>
                ) : (
                    <Card className="overflow-hidden bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-sm rounded-2xl">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                                    <tr>
                                        <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Job Applied</th>
                                        <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Company</th>
                                        <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Applied On</th>
                                        <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                                        <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                    {applications.map((app) => (
                                        <tr key={app._id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                                            <td className="px-5 py-3">
                                                <div className="font-semibold text-neutral-900 dark:text-white mb-0.5">
                                                    {app.job?.title || 'Unknown Job'}
                                                </div>
                                                <div className="text-xs text-neutral-500 flex items-center gap-1">
                                                    <MapPin size={12}/>{app.job?.location || 'Unknown'} • <span className="capitalize">{app.job?.type}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                {app.job?.company ? (
                                                    <Link href={`/admin/companies/${app.job.company._id}`} className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                                                        {app.job.company.companyName}
                                                    </Link>
                                                ) : (
                                                    <span className="text-neutral-500">N/A</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-3 text-neutral-500">
                                                {new Date(app.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-5 py-3">
                                                <Badge variant={
                                                    app.status === 'shortlisted' || app.status === 'hired' ? 'success' :
                                                        app.status === 'rejected' ? 'danger' :
                                                            app.status === 'reviewed' ? 'info' : 'warning'
                                                } className="capitalize">
                                                    {statusConfig[app.status]?.label || app.status}
                                                </Badge>
                                            </td>
                                            <td className="px-5 py-3 text-right">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => { setSelectedApp(app); setUpdateModalOpen(true); }}
                                                    className="text-neutral-600 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 text-xs"
                                                >
                                                    Update Status
                                                </Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                )}
            </div>

            <UpdateModal
                isOpen={updateModalOpen}
                onClose={() => setUpdateModalOpen(false)}
                app={selectedApp}
                onUpdate={handleUpdateStatus}
            />
        </div>
    );
}

