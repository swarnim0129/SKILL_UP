'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, Eye, Loader2, Search, Filter } from 'lucide-react';
import Header from '@/components/Header';
import Card from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Badge, { getStatusVariant } from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import api from '@/lib/api';
import { useAuth } from '@clerk/nextjs';
import { Job } from '@/types';

export default function CompanyJobsPage() {
    const { getToken } = useAuth();
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteModal, setDeleteModal] = useState<{ open: boolean; jobId: string | null }>({
        open: false,
        jobId: null,
    });

    const fetchJobs = async () => {
        try {
            const token = await getToken();
            const response = await api.get('/jobs', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setJobs(response.data.jobs);
        } catch (error) {
            console.error('Failed to fetch jobs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJobs();
    }, [getToken]);

    const handleDelete = async () => {
        if (!deleteModal.jobId) return;

        try {
            const token = await getToken();
            await api.delete(`/jobs/${deleteModal.jobId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setJobs(jobs.filter(job => job._id !== deleteModal.jobId));
            setDeleteModal({ open: false, jobId: null });
        } catch (error) {
            console.error('Failed to delete job:', error);
        }
    };

    const filteredJobs = jobs.filter(job =>
        job.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="animate-fade-in space-y-8">
            <Header
                title="Job Postings"
                searchValue={searchQuery}
                onSearch={setSearchQuery}
            />

            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-1">
                            Manage Jobs
                        </h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {filteredJobs.length} total job{filteredJobs.length !== 1 ? 's' : ''} posted
                        </p>
                    </div>
                    <Link href="/company/jobs/new">
                        <Button className="bg-[#4a6cf7] hover:bg-blue-700 border-none text-white shadow-lg shadow-blue-500/20 px-6 h-10 rounded-xl font-medium transition-all hover:scale-105 active:scale-95">
                            <Plus size={18} className="mr-2" />
                            Post New Job
                        </Button>
                    </Link>
                </div>

                {/* Jobs List */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-[#4a6cf7]" />
                    </div>
                ) : filteredJobs.length === 0 ? (
                    <Card className="text-center py-24 bg-white dark:bg-black border-neutral-100 dark:border-neutral-800 shadow-sm rounded-2xl">
                        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-neutral-50 dark:bg-neutral-900 text-neutral-400 dark:text-neutral-500">
                            {searchQuery ? <Search size={40} strokeWidth={1.5} /> : <Plus size={40} strokeWidth={1.5} />}
                        </div>
                        <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                            {searchQuery ? 'No matching jobs found' : 'No jobs posted yet'}
                        </h3>
                        <p className="text-neutral-500 dark:text-neutral-400 mb-8 max-w-sm mx-auto">
                            {searchQuery ? `We couldn't find any jobs matching "${searchQuery}"` : 'Start building your team by creating your first job posting today.'}
                        </p>
                        {!searchQuery && (
                            <Link href="/company/jobs/new">
                                <Button className="bg-[#4a6cf7] hover:bg-blue-700 border-none text-white shadow-lg shadow-blue-500/20 px-8 py-6 h-auto text-base rounded-xl font-semibold">
                                    Post Your First Job
                                </Button>
                            </Link>
                        )}
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {filteredJobs.map((job) => (
                            <Card key={job._id} className="overflow-hidden bg-white dark:bg-black border-neutral-100 dark:border-neutral-800 shadow-sm hover:shadow-md transition-all group rounded-xl">
                                <div className="flex flex-col md:flex-row md:items-center justify-between p-6 gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-bold text-neutral-900 dark:text-white group-hover:text-[#4a6cf7] transition-colors">
                                                {job.title}
                                            </h3>
                                            <Badge variant={getStatusVariant(job.status)} className="capitalize">
                                                {job.status}
                                            </Badge>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                                            <span className="flex items-center gap-1.5">
                                                {job.location}
                                            </span>
                                            <span className="hidden md:inline text-neutral-300 dark:text-neutral-700">•</span>
                                            <span className="capitalize">{job.type}</span>
                                            <span className="hidden md:inline text-neutral-300 dark:text-neutral-700">•</span>
                                            <span className="text-neutral-700 dark:text-neutral-300">{job.applicationsCount || 0} applicant{job.applicationsCount !== 1 ? 's' : ''}</span>
                                            <span className="hidden md:inline text-neutral-300 dark:text-neutral-700">•</span>
                                            <span>Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        {job.salary.max > 0 && (
                                            <p className="mt-3 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                                                {job.salary.currency} {job.salary.min.toLocaleString()} - {job.salary.max.toLocaleString()}
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 pt-4 md:pt-0 border-t md:border-t-0 border-neutral-100 dark:border-neutral-800">
                                        <Link href={`/company/jobs/${job._id}/applicants`}>
                                            <Button variant="ghost" size="sm" className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                                <Eye size={16} className="mr-2" />
                                                View Applicants
                                            </Button>
                                        </Link>
                                        <Link href={`/company/jobs/${job._id}/edit`}>
                                            <Button variant="outline" size="sm" className="border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800">
                                                <Edit size={16} className="mr-2" />
                                                Edit
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setDeleteModal({ open: true, jobId: job._id })}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/10"
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
                <div className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white">
                    <p className="text-neutral-500 dark:text-neutral-400 mb-6">
                        Are you sure you want to delete this job? This action cannot be undone and will also delete all associated applications.
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setDeleteModal({ open: false, jobId: null })}
                            className="border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                        >
                            Cancel
                        </Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700 text-white border-none shadow-lg shadow-red-500/20"
                            onClick={handleDelete}
                        >
                            Delete Job
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
