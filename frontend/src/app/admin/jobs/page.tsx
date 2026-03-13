'use client';

import React, { useEffect, useState } from 'react';
import { Flag, Trash2, Briefcase, Building2, MapPin, Search } from 'lucide-react';
import Header from '@/components/Header';
import Card from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Badge, { getStatusVariant } from '@/components/ui/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import api from '@/lib/api';
import { Job, User } from '@/types';

const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'flagged', label: 'Flagged' },
    { value: 'closed', label: 'Closed' },
];

interface JobWithCompany extends Omit<Job, 'company'> {
    company: { _id: string; companyName: string; email: string };
}

export default function AdminJobsPage() {
    const [jobs, setJobs] = useState<JobWithCompany[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [updating, setUpdating] = useState<string | null>(null);
    const [deleteModal, setDeleteModal] = useState<{ open: boolean; jobId: string | null }>({
        open: false,
        jobId: null,
    });
    const [searchQuery, setSearchQuery] = useState('');

    const filteredJobs = jobs.filter(job =>
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company?.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.location.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const fetchJobs = async () => {
        try {
            const params = new URLSearchParams();
            if (statusFilter) params.append('status', statusFilter);

            const response = await api.get(`/admin/jobs?${params.toString()}`);
            setJobs(response.data.jobs);
        } catch (error) {
            console.error('Failed to fetch jobs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, [statusFilter]);

    const toggleFlag = async (jobId: string) => {
        setUpdating(jobId);
        try {
            const response = await api.put(`/admin/jobs/${jobId}/flag`);
            setJobs(jobs.map(j =>
                j._id === jobId ? { ...j, status: response.data.status } : j
            ));
        } catch (error) {
            console.error('Failed to flag job:', error);
        } finally {
            setUpdating(null);
        }
    };

    const handleDelete = async () => {
        if (!deleteModal.jobId) return;

        try {
            await api.delete(`/admin/jobs/${deleteModal.jobId}`);
            setJobs(jobs.filter(j => j._id !== deleteModal.jobId));
            setDeleteModal({ open: false, jobId: null });
        } catch (error) {
            console.error('Failed to delete job:', error);
        }
    };

    return (
        <div className="animate-fade-in">
            <Header title="Job Moderation" />

            <div className="p-6">
                {/* Filters */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
                            All Job Listings
                        </h2>
                        <p className="text-sm text-slate-500">
                            {jobs.length} jobs across all companies
                        </p>
                    </div>
                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 min-w-[200px]">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search jobs..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                            />
                        </div>
                        <div className="w-full md:w-48">
                            <Select
                                value={statusFilter || 'all'}
                                onValueChange={(val) => setStatusFilter(val === 'all' ? '' : val)}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Filter by Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {statusOptions.map((option) => (
                                        <SelectItem key={option.value || 'all'} value={option.value || 'all'}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Jobs List */}
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                    </div>
                ) : filteredJobs.length === 0 ? (
                    <Card className="text-center py-16">
                        <Briefcase size={48} className="mx-auto text-slate-400 mb-4" />
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">
                            No jobs found
                        </h3>
                        <p className="text-slate-500">
                            No jobs match your current search
                        </p>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {filteredJobs.map((job) => (
                            <Card
                                key={job._id}
                                className={`overflow-hidden ${job.status === 'flagged' ? 'border-red-300 dark:border-red-800' : ''}`}
                            >
                                <div className="flex flex-col md:flex-row md:items-start justify-between p-6 gap-4">
                                    <div className="flex-1">
                                        <div className="flex flex-wrap items-center gap-3 mb-2">
                                            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                                                {job.title}
                                            </h3>
                                            <Badge variant={getStatusVariant(job.status)}>
                                                {job.status}
                                            </Badge>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 mb-2">
                                            <span className="flex items-center gap-1">
                                                <Building2 size={14} />
                                                {job.company?.companyName || 'Unknown Company'}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <MapPin size={14} />
                                                {job.location}
                                            </span>
                                            <span className="capitalize">{job.type}</span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                                            {job.description}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2 md:ml-4 self-end md:self-start">
                                        <Button
                                            variant={job.status === 'flagged' ? 'secondary' : 'outline'}
                                            size="sm"
                                            onClick={() => toggleFlag(job._id)}
                                            disabled={updating === job._id}
                                            className={job.status === 'flagged' ? '' : 'text-yellow-600 hover:text-yellow-700 hover:border-yellow-500'}
                                        >
                                            <Flag size={16} />
                                            {job.status === 'flagged' ? 'Unflag' : 'Flag'}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setDeleteModal({ open: true, jobId: job._id })}
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={deleteModal.open}
                onClose={() => setDeleteModal({ open: false, jobId: null })}
                title="Delete Job"
                size="sm"
            >
                <p className="text-slate-600 dark:text-slate-300 mb-6">
                    Are you sure you want to delete this job? This will also delete all associated applications.
                </p>
                <div className="flex justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setDeleteModal({ open: false, jobId: null })}
                    >
                        Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDelete}>
                        Delete Job
                    </Button>
                </div>
            </Modal>
        </div>
    );
}
