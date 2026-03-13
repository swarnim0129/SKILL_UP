'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Building2, ArrowLeft, Plus, MapPin, Globe, Briefcase, Users,
    Loader2, ChevronDown, ChevronUp, Calendar, ExternalLink, FileText,
    Clock, Eye, Sparkles, UserCheck, XCircle, CheckCircle2, X
} from 'lucide-react';
import Header from '@/components/Header';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface Company {
    _id: string;
    companyName: string;
    email: string;
    status: 'pending' | 'active' | 'suspended';
    industry: string;
    location: string;
    website: string;
    size?: string;
    description?: string;
    createdAt: string;
    logo?: string;
    contactPerson?: { name: string; designation: string; phone: string };
    document?: { type: string; number: string; url: string };
}

interface Job {
    _id: string;
    title: string;
    description: string;
    location: string;
    type: string;
    experience: string;
    status: string;
    applicationsCount: number;
    salary: { min: number; max: number; currency: string };
    skills: string[];
    requirements: string[];
    createdAt: string;
}

interface Applicant {
    _id: string;
    status: 'pending' | 'reviewed' | 'shortlisted' | 'interviewed' | 'rejected' | 'hired';
    createdAt: string;
    notes?: string;
    resume?: string;
    applicant: {
        _id: string;
        name: string;
        email: string;
        phone?: string;
        skills?: string[];
        resumeUrl?: string;
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

/* ── Update Status Modal ── */
function UpdateModal({ isOpen, onClose, app, onUpdate }: {
    isOpen: boolean; onClose: () => void; app: Applicant | null;
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

/* ── Job Card with expandable applicants ── */
function JobCard({ job, companyId }: { job: Job; companyId: string }) {
    const [expanded, setExpanded] = useState(false);
    const [applicants, setApplicants] = useState<Applicant[]>([]);
    const [loadingApplicants, setLoadingApplicants] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [updateModalOpen, setUpdateModalOpen] = useState(false);
    const [selectedApp, setSelectedApp] = useState<Applicant | null>(null);

    const toggleExpand = async () => {
        if (!expanded && !loaded) {
            setLoadingApplicants(true);
            try {
                const res = await api.get(`/admin/companies/${companyId}/jobs/${job._id}/applicants`);
                setApplicants(res.data.applications);
                setLoaded(true);
            } catch (err) {
                console.error('Failed to fetch applicants:', err);
            } finally {
                setLoadingApplicants(false);
            }
        }
        setExpanded(!expanded);
    };

    const handleUpdateStatus = async (applicationId: string, status: string, notes: string) => {
        try {
            await api.put(`/admin/applications/${applicationId}/status`, { status, notes });
            setApplicants(apps => apps.map(a =>
                a._id === applicationId ? { ...a, status: status as any, notes } : a
            ));
            setUpdateModalOpen(false);
            setSelectedApp(null);
        } catch (err) {
            console.error('Failed to update status:', err);
        }
    };

    const getInitials = (name: string) =>
        name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);

    return (
        <>
            <Card className="overflow-hidden bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all rounded-xl">
                <div className="p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                                    {job.title}
                                </h3>
                                <Badge variant={
                                    job.status === 'active' ? 'success' :
                                        job.status === 'flagged' ? 'danger' :
                                            job.status === 'closed' ? 'secondary' : 'warning'
                                } className="capitalize">
                                    {job.status}
                                </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500 dark:text-neutral-400">
                                <span className="flex items-center gap-1"><MapPin size={14} />{job.location}</span>
                                <span className="capitalize">{job.type}</span>
                                <span className="capitalize">{job.experience}</span>
                                {job.salary?.max > 0 && (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                        {job.salary.currency} {job.salary.min.toLocaleString()} - {job.salary.max.toLocaleString()}
                                    </span>
                                )}
                                <span className="flex items-center gap-1"><Calendar size={14} />{new Date(job.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>

                        <button
                            onClick={toggleExpand}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                        >
                            <Users size={16} />
                            {job.applicationsCount || 0} Applicant{job.applicationsCount !== 1 ? 's' : ''}
                            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                    </div>
                </div>

                {/* Expandable Applicants Section */}
                {expanded && (
                    <div className="border-t border-neutral-200 dark:border-neutral-800">
                        {loadingApplicants ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                            </div>
                        ) : applicants.length === 0 ? (
                            <div className="py-8 text-center text-neutral-500 dark:text-neutral-400">
                                <Users size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No applicants yet for this job.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                                        <tr>
                                            <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Candidate</th>
                                            <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Applied</th>
                                            <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">Status</th>
                                            <th className="px-5 py-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                        {applicants.map((app) => (
                                            <tr key={app._id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                                                            {getInitials(app.applicant?.name || 'UN')}
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-neutral-900 dark:text-white">{app.applicant?.name}</p>
                                                            <p className="text-xs text-neutral-500">{app.applicant?.email}</p>
                                                        </div>
                                                    </div>
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
                                                    <div className="flex items-center justify-end gap-2">
                                                        {(app.resume || app.applicant?.resumeUrl) && (
                                                            <a
                                                                href={app.resume || app.applicant?.resumeUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="p-1.5 text-neutral-400 hover:text-blue-600 transition-colors"
                                                                title="View Resume"
                                                            >
                                                                <ExternalLink size={15} />
                                                            </a>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => { setSelectedApp(app); setUpdateModalOpen(true); }}
                                                            className="text-neutral-600 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 text-xs"
                                                        >
                                                            Update Status
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </Card>

            <UpdateModal
                isOpen={updateModalOpen}
                onClose={() => setUpdateModalOpen(false)}
                app={selectedApp}
                onUpdate={handleUpdateStatus}
            />
        </>
    );
}

/* ── Main Page ── */
export default function AdminCompanyDetailPage() {
    const params = useParams();
    const router = useRouter();
    const companyId = params.id as string;

    const [company, setCompany] = useState<Company | null>(null);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get(`/admin/companies/${companyId}/jobs`);
                setCompany(res.data.company);
                setJobs(res.data.jobs);
            } catch (err) {
                console.error('Failed to fetch company data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [companyId]);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    if (!company) {
        return (
            <div className="flex h-screen items-center justify-center flex-col gap-4">
                <p className="text-neutral-500">Company not found.</p>
                <Button variant="outline" onClick={() => router.push('/admin/companies')}>
                    <ArrowLeft size={16} className="mr-2" /> Back to Companies
                </Button>
            </div>
        );
    }

    return (
        <div className="animate-fade-in pb-12">
            <Header title="Company Details" />

            <div className="max-w-6xl mx-auto px-6 space-y-8">
                {/* Back button */}
                <button
                    onClick={() => router.push('/admin/companies')}
                    className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                    <ArrowLeft size={16} /> Back to Companies
                </button>

                {/* Company Header Card */}
                <Card className="overflow-hidden bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-sm rounded-2xl">
                    <div className="p-6 md:p-8">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                            <div className="flex items-start gap-5">
                                <div className="h-16 w-16 rounded-2xl bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-500 shrink-0">
                                    <Building2 size={32} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
                                            {company.companyName}
                                        </h1>
                                        <Badge variant={
                                            company.status === 'active' ? 'success' :
                                                company.status === 'suspended' ? 'danger' : 'warning'
                                        }>
                                            {company.status}
                                        </Badge>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500 dark:text-neutral-400">
                                        {company.industry && <span className="capitalize">{company.industry}</span>}
                                        {company.location && (
                                            <span className="flex items-center gap-1"><MapPin size={14} />{company.location}</span>
                                        )}
                                        {company.website && (
                                            <a href={company.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-blue-500 transition-colors">
                                                <Globe size={14} />{company.website}
                                            </a>
                                        )}
                                        {company.size && <span>{company.size} employees</span>}
                                        <span className="flex items-center gap-1"><Calendar size={14} />Joined {new Date(company.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    {company.contactPerson && (
                                        <div className="mt-3 text-sm text-neutral-500 dark:text-neutral-400">
                                            Contact: <span className="text-neutral-900 dark:text-white font-medium">{company.contactPerson.name}</span>
                                            {company.contactPerson.phone && <span> • {company.contactPerson.phone}</span>}
                                            {company.email && <span> • {company.email}</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Verification Document */}
                {company.document && (
                    <Card className="overflow-hidden bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-sm rounded-2xl">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                                <FileText size={20} className="text-blue-500" />
                                Verification Document
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Document Type</p>
                                    <p className="text-sm font-semibold text-neutral-900 dark:text-white uppercase">{company.document.type}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Document Number</p>
                                    <p className="text-sm font-semibold text-neutral-900 dark:text-white">{company.document.number}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">Document File</p>
                                    {company.document.url ? (
                                        <a
                                            href={company.document.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                                        >
                                            <ExternalLink size={14} /> View Document
                                        </a>
                                    ) : (
                                        <p className="text-sm text-neutral-500">Not uploaded</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {/* Jobs Section Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                            Job Postings
                        </h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {jobs.length} job{jobs.length !== 1 ? 's' : ''} posted by this company
                        </p>
                    </div>
                    <Link href={`/admin/companies/${companyId}/jobs/new`}>
                        <Button className="bg-[#4a6cf7] hover:bg-blue-700 border-none text-white shadow-lg shadow-blue-500/20 px-6 h-10 rounded-xl font-medium transition-all hover:scale-105 active:scale-95">
                            <Plus size={18} className="mr-2" />
                            Post New Job
                        </Button>
                    </Link>
                </div>

                {/* Jobs List */}
                {jobs.length === 0 ? (
                    <Card className="text-center py-16 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 shadow-sm rounded-2xl">
                        <Briefcase size={48} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-4" />
                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
                            No jobs posted yet
                        </h3>
                        <p className="text-neutral-500 dark:text-neutral-400 mb-6 max-w-sm mx-auto">
                            Create the first job posting for this company.
                        </p>
                        <Link href={`/admin/companies/${companyId}/jobs/new`}>
                            <Button className="bg-[#4a6cf7] hover:bg-blue-700 border-none text-white shadow-lg shadow-blue-500/20 px-8 h-12 rounded-xl font-semibold">
                                Post First Job
                            </Button>
                        </Link>
                    </Card>
                ) : (
                    <div className="space-y-4">
                        {jobs.map((job) => (
                            <JobCard key={job._id} job={job} companyId={companyId} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
