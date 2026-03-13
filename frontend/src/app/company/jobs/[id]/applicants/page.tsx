'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, Phone, ExternalLink, Download, User as UserIcon, Calendar, Briefcase, MapPin, Loader2, Filter, Search, X } from 'lucide-react';
import Header from '@/components/Header';
import Card from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useAuth } from '@clerk/nextjs';
import api from '@/lib/api';
import { cn } from '@/lib/utils'; // Assuming cn exists

interface Applicant {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    location: string;
    experience: string;
    skills: string[];
    resumeUrl?: string;
    linkedIn?: string;
    portfolio?: string;
}

interface Application {
    _id: string;
    status: 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'hired';
    createdAt: string;
    applicant: Applicant;
}

export default function JobApplicantsPage() {
    const params = useParams();
    const { getToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [job, setJob] = useState<any>(null);
    const [applications, setApplications] = useState<Application[]>([]);
    const [selectedApplicant, setSelectedApplicant] = useState<Application | null>(null);
    const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = await getToken();

                // Fetch Job Details
                const jobRes = await api.get(`/jobs/${params.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setJob(jobRes.data);

                // Fetch Applications
                const appsRes = await api.get(`/applications?jobId=${params.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setApplications(appsRes.data.applications || []);

            } catch (error) {
                console.error('Failed to fetch data:', error);
            } finally {
                setLoading(false);
            }
        };

        if (params.id) {
            fetchData();
        }
    }, [params.id, getToken]);

    // Extract all unique skills from applicants
    const allSkills = useMemo(() => {
        const skills = new Set<string>();
        applications.forEach(app => {
            app.applicant?.skills?.forEach(skill => skills.add(skill));
        });
        return Array.from(skills).sort();
    }, [applications]);

    // Filter applications
    const filteredApplications = useMemo(() => {
        return applications.filter(app => {
            const matchesSearch =
                `${app.applicant?.firstName} ${app.applicant?.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                app.applicant?.email?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesSkills = selectedSkills.length === 0 ||
                selectedSkills.every(skill => app.applicant?.skills?.includes(skill));

            return matchesSearch && matchesSkills;
        });
    }, [applications, searchQuery, selectedSkills]);

    const toggleSkill = (skill: string) => {
        setSelectedSkills(prev =>
            prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
        );
    };

    const handleStatusChange = async (applicationId: string, newStatus: string) => {
        try {
            const token = await getToken();
            await api.put(`/applications/${applicationId}/status`,
                { status: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setApplications(apps =>
                apps.map(app =>
                    app._id === applicationId ? { ...app, status: newStatus as any } : app
                )
            );

            if (selectedApplicant?._id === applicationId) {
                setSelectedApplicant(prev => prev ? { ...prev, status: newStatus as any } : null);
            }
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-white dark:bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in bg-white dark:bg-black min-h-screen pb-12">
            <Header title="Job Applicants" />

            <div className="p-6 max-w-7xl mx-auto space-y-6">
                {/* Header Section */}
                <div>
                    <Link href="/company/jobs" className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white mb-4 transition-colors">
                        <ArrowLeft size={16} />
                        Back to Jobs
                    </Link>
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">{job?.title}</h1>
                            <div className="flex items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400">
                                <span className="flex items-center gap-1"><MapPin size={14} /> {job?.location}</span>
                                <span>•</span>
                                <span className="capitalize flex items-center gap-1"><Briefcase size={14} /> {job?.type}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1"><Calendar size={14} /> Posted {formatDate(job?.createdAt)}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 px-4 py-2 rounded-lg">
                            <span className="text-2xl font-bold text-neutral-900 dark:text-white">{applications.length}</span>
                            <span className="text-sm text-neutral-500 dark:text-neutral-400">Total Applicants</span>
                        </div>
                    </div>
                </div>

                {/* Filters & Search */}
                <Card className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 p-4">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                            <input
                                type="text"
                                placeholder="Search applicants..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-neutral-50 dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            />
                        </div>

                        <div className="h-6 w-px bg-neutral-200 dark:bg-neutral-800 hidden md:block" />

                        <div className="flex-1 flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                            <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400 shrink-0 flex items-center gap-1">
                                <Filter size={14} /> Filter by Skills:
                            </span>
                            {allSkills.length > 0 ? allSkills.map(skill => (
                                <button
                                    key={skill}
                                    onClick={() => toggleSkill(skill)}
                                    className={cn(
                                        "px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 border",
                                        selectedSkills.includes(skill)
                                            ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
                                            : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700 dark:hover:bg-neutral-700"
                                    )}
                                >
                                    {skill}
                                </button>
                            )) : (
                                <span className="text-sm text-neutral-400 italic">No skills found</span>
                            )}
                            {selectedSkills.length > 0 && (
                                <button
                                    onClick={() => setSelectedSkills([])}
                                    className="ml-2 px-2 py-1 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors flex items-center gap-1"
                                >
                                    <X size={12} /> Clear
                                </button>
                            )}
                        </div>
                    </div>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-320px)]">
                    {/* Applicants List */}
                    <div className="lg:col-span-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                        {filteredApplications.length === 0 ? (
                            <div className="text-center py-12 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800">
                                <p className="text-neutral-500 dark:text-neutral-400">No applicants match your filters.</p>
                            </div>
                        ) : (
                            filteredApplications.map((app) => (
                                <div
                                    key={app._id}
                                    onClick={() => setSelectedApplicant(app)}
                                    className={cn(
                                        "p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md",
                                        selectedApplicant?._id === app._id
                                            ? "bg-white dark:bg-neutral-900 border-blue-500 ring-1 ring-blue-500 shadow-sm"
                                            : "bg-white dark:bg-black border-neutral-200 dark:border-neutral-800 hover:border-blue-300 dark:hover:border-neutral-700"
                                    )}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-sm font-bold text-white shrink-0">
                                            {app.applicant?.firstName?.charAt(0) || 'U'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-semibold text-neutral-900 dark:text-white truncate">
                                                    {app.applicant?.firstName} {app.applicant?.lastName}
                                                </h3>
                                                <span className="text-xs text-neutral-400 shrink-0">
                                                    {formatDate(app.createdAt)}
                                                </span>
                                            </div>
                                            <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                                                {app.applicant?.experience} Experience
                                            </p>
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {app.applicant?.skills?.slice(0, 3).map((skill, i) => (
                                                    <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
                                                        {skill}
                                                    </span>
                                                ))}
                                                {(app.applicant?.skills?.length || 0) > 3 && (
                                                    <span className="text-[10px] text-neutral-400 px-1 py-0.5">+{app.applicant.skills.length - 3}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between">
                                        <Badge variant={
                                            app.status === 'shortlisted' ? 'success' :
                                                app.status === 'rejected' ? 'danger' :
                                                    app.status === 'reviewed' ? 'info' : 'default'
                                        } className="capitalize text-xs px-2 py-0.5 h-6">
                                            {app.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Applicant Details */}
                    <div className="lg:col-span-2 h-full overflow-y-auto custom-scrollbar">
                        {selectedApplicant ? (
                            <Card className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 h-full flex flex-col">
                                <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex justify-between items-start bg-neutral-50/50 dark:bg-black/20">
                                    <div className="flex gap-5">
                                        <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-500 shadow-lg flex items-center justify-center text-3xl font-bold text-white">
                                            {selectedApplicant.applicant?.firstName?.charAt(0)}
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
                                                {selectedApplicant.applicant?.firstName} {selectedApplicant.applicant?.lastName}
                                            </h2>
                                            <div className="flex items-center gap-4 text-neutral-500 dark:text-neutral-400 mt-2">
                                                <span className="flex items-center gap-1.5 text-sm">
                                                    <MapPin size={14} />
                                                    {selectedApplicant.applicant?.location || 'Location N/A'}
                                                </span>
                                                <span className="flex items-center gap-1.5 text-sm">
                                                    <Briefcase size={14} />
                                                    {selectedApplicant.applicant?.experience || 'Experience N/A'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <select
                                            value={selectedApplicant.status}
                                            onChange={(e) => handleStatusChange(selectedApplicant._id, e.target.value)}
                                            className={cn(
                                                "rounded-lg text-sm px-4 py-2 outline-none font-medium transition-colors border",
                                                "bg-white dark:bg-black border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white focus:border-blue-500"
                                            )}
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="reviewed">Reviewed</option>
                                            <option value="shortlisted">Shortlisted</option>
                                            <option value="hired">Hired</option>
                                            <option value="rejected">Rejected</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="p-8 space-y-8 flex-1">
                                    {/* Contact Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-black border border-neutral-100 dark:border-neutral-800">
                                            <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                                <Mail size={18} />
                                            </div>
                                            <div>
                                                <p className="text-xs text-neutral-500 uppercase font-semibold">Email</p>
                                                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-200">{selectedApplicant.applicant?.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-black border border-neutral-100 dark:border-neutral-800">
                                            <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                                                <Phone size={18} />
                                            </div>
                                            <div>
                                                <p className="text-xs text-neutral-500 uppercase font-semibold">Phone</p>
                                                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-200">{selectedApplicant.applicant?.phone || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Skills */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2 mb-4">
                                            <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                                            Skills & Expertise
                                        </h3>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedApplicant.applicant?.skills?.map((skill, i) => (
                                                <span key={i} className="px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-sm font-medium border border-neutral-200 dark:border-neutral-700">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Links */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-neutral-900 dark:text-white flex items-center gap-2 mb-4">
                                            <div className="w-1 h-4 bg-orange-500 rounded-full"></div>
                                            Portfolio & Resume
                                        </h3>
                                        <div className="flex flex-wrap gap-4">
                                            {selectedApplicant.applicant?.resumeUrl && (
                                                <a
                                                    href={selectedApplicant.applicant.resumeUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex items-center gap-3 px-5 py-3 rounded-xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition-all group"
                                                >
                                                    <div className="h-8 w-8 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        <Download size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-neutral-900 dark:text-white">Download Resume</p>
                                                        <p className="text-xs text-neutral-500">PDF Document</p>
                                                    </div>
                                                </a>
                                            )}
                                            {selectedApplicant.applicant?.linkedIn && (
                                                <a
                                                    href={selectedApplicant.applicant.linkedIn}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex items-center gap-3 px-5 py-3 rounded-xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 hover:border-[#0077b5] hover:shadow-md transition-all group"
                                                >
                                                    <div className="h-8 w-8 rounded-full bg-[#0077b5]/10 text-[#0077b5] flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        <ExternalLink size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-neutral-900 dark:text-white">LinkedIn Profile</p>
                                                        <p className="text-xs text-neutral-500">Professional Network</p>
                                                    </div>
                                                </a>
                                            )}
                                            {selectedApplicant.applicant?.portfolio && (
                                                <a
                                                    href={selectedApplicant.applicant.portfolio}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex items-center gap-3 px-5 py-3 rounded-xl bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 hover:border-purple-500 hover:shadow-md transition-all group"
                                                >
                                                    <div className="h-8 w-8 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        <ExternalLink size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-neutral-900 dark:text-white">Portfolio</p>
                                                        <p className="text-xs text-neutral-500">Personal Website</p>
                                                    </div>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-neutral-50 dark:bg-neutral-900/50 rounded-xl border border-neutral-200 dark:border-neutral-800 border-dashed">
                                <div className="h-16 w-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center text-neutral-400 mb-4">
                                    <UserIcon size={32} />
                                </div>
                                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">Select an Applicant</h3>
                                <p className="text-neutral-500 dark:text-neutral-400 max-w-xs">
                                    Click on an applicant from the list to view their full profile, resume, and manage their status.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
