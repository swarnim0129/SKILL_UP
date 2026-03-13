'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, X, Loader2, Check, CircleCheck, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { Textarea } from '@/components/ui/Textarea';
import { Separator } from '@/components/ui/Separator';
import { TagsSelector } from '@/components/ui/TagsSelector';
import { cn } from '@/lib/utils';
import { useAuth } from '@clerk/nextjs';
import api from '@/lib/api';

const jobTypes = [
    { value: 'full-time', label: 'Full Time', description: 'Standard 40-hour work week' },
    { value: 'part-time', label: 'Part Time', description: 'Less than 30 hours per week' },
    { value: 'contract', label: 'Contract', description: 'Fixed term or project based' },
    { value: 'freelance', label: 'Freelance', description: 'Independent contractor' },
    { value: 'internship', label: 'Internship', description: 'Training position' },
];

const experienceLevels = [
    { value: 'entry', label: 'Entry Level' },
    { value: 'mid', label: 'Mid Level' },
    { value: 'senior', label: 'Senior Level' },
    { value: 'lead', label: 'Lead / Manager' },
    { value: 'executive', label: 'Executive' },
];

const currencies = [
    { value: 'USD', label: 'USD ($)' },
    { value: 'EUR', label: 'EUR (€)' },
    { value: 'GBP', label: 'GBP (£)' },
    { value: 'INR', label: 'INR (₹)' },
];

export default function EditJobPage() {
    const router = useRouter();
    const params = useParams();
    const { getToken } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Initial State is same as new job, but will be populated
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        location: '',
        type: 'full-time',
        experience: 'entry',
        salaryMin: '',
        salaryMax: '',
        currency: 'USD',
        requirements: [''],
        skills: [''],
        status: 'active'
    });

    useEffect(() => {
        const fetchJob = async () => {
            try {
                const token = await getToken();
                const res = await api.get(`/jobs/${params.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                // Response structure is { success: true, data: job }
                const job = res.data.data;

                if (!job) throw new Error('Job data missing');

                setFormData({
                    title: job.title || '',
                    description: job.description || '',
                    location: job.location || '',
                    type: job.type || 'full-time',
                    experience: job.experience || 'entry',
                    salaryMin: job.salary?.min ? job.salary.min.toString() : '',
                    salaryMax: job.salary?.max ? job.salary.max.toString() : '',
                    currency: job.salary?.currency || 'USD',
                    requirements: job.requirements?.length ? job.requirements : [''],
                    skills: job.skills?.length ? job.skills : [''],
                    status: job.status || 'active'
                });
            } catch (error) {
                console.error('Failed to fetch job details:', error);
                alert('Failed to load job details. Redirecting...');
                router.push('/company/jobs');
            } finally {
                setLoading(false);
            }
        };

        if (params.id) {
            fetchJob();
        }
    }, [params.id, getToken, router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const token = await getToken();
            await api.put(`/jobs/${params.id}`, {
                title: formData.title,
                description: formData.description,
                location: formData.location,
                type: formData.type,
                experience: formData.experience,
                status: formData.status,
                salary: {
                    min: parseInt(formData.salaryMin) || 0,
                    max: parseInt(formData.salaryMax) || 0,
                    currency: formData.currency,
                },
                requirements: formData.requirements.filter(r => r.trim()),
                skills: formData.skills.filter(s => s.trim()),
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            router.push('/company/jobs');
        } catch (err: any) {
            console.error(err);
            alert('Failed to update job');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this job posting? This action cannot be undone.')) return;

        try {
            const token = await getToken();
            await api.delete(`/jobs/${params.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            router.push('/company/jobs');
        } catch (error) {
            console.error('Failed to delete job:', error);
            alert('Failed to delete job');
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-white dark:bg-black">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in bg-white dark:bg-black min-h-screen pb-24">
            <div className="flex items-center justify-between mb-8 px-1">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Link href="/company/jobs" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">Edit Job Posting</h2>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="ghost"
                        onClick={handleDelete}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Job
                    </Button>
                    <Link href="/company/jobs">
                        <Button variant="ghost">Cancel</Button>
                    </Link>
                    <Button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="bg-[#4a6cf7] hover:bg-blue-700 text-white min-w-[140px]"
                    >
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
                <div className="lg:col-span-7 space-y-8">
                    {/* Basic Info */}
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-base">Job Title <span className="text-red-500">*</span></Label>
                                <Input
                                    id="title"
                                    name="title"
                                    placeholder="e.g. Senior Product Designer"
                                    value={formData.title}
                                    onChange={handleChange}
                                    required
                                    className="bg-white dark:bg-neutral-950"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="location" className="text-base">Location <span className="text-red-500">*</span></Label>
                                <Input
                                    id="location"
                                    name="location"
                                    placeholder="e.g. Remote, San Francisco"
                                    value={formData.location}
                                    onChange={handleChange}
                                    required
                                    className="bg-white dark:bg-neutral-950"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description" className="text-base">Job Description <span className="text-red-500">*</span></Label>
                            <Textarea
                                id="description"
                                name="description"
                                placeholder="Describe the role, responsibilities, and team culture..."
                                className="min-h-[200px] resize-y bg-white dark:bg-neutral-950"
                                value={formData.description}
                                onChange={handleChange}
                                required
                            />
                        </div>
                    </div>

                    <Separator className="bg-neutral-200 dark:bg-neutral-800" />

                    {/* Status & Type */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <Label className="text-base mb-4 block">Job Status</Label>
                            <Select value={formData.status} onValueChange={(val) => handleSelectChange('status', val)}>
                                <SelectTrigger className="bg-white dark:bg-neutral-950">
                                    <SelectValue placeholder="Select status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                    <SelectItem value="draft">Draft</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="text-base mb-4 block">Job Type <span className="text-red-500">*</span></Label>
                            <RadioGroup
                                value={formData.type}
                                onValueChange={(val) => handleSelectChange('type', val)}
                                className="grid grid-cols-1 gap-2"
                            >
                                {jobTypes.slice(0, 3).map((type) => (
                                    <div key={type.value} className="flex items-center space-x-2">
                                        <RadioGroupItem value={type.value} id={`type-${type.value}`} />
                                        <Label htmlFor={`type-${type.value}`}>{type.label}</Label>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>
                    </div>

                    <Separator className="bg-neutral-200 dark:bg-neutral-800" />

                    {/* Salary & Experience */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-base">Experience Level</Label>
                            <Select value={formData.experience} onValueChange={(val) => handleSelectChange('experience', val)}>
                                <SelectTrigger className="bg-white dark:bg-neutral-950">
                                    <SelectValue placeholder="Select level" />
                                </SelectTrigger>
                                <SelectContent>
                                    {experienceLevels.map((level) => (
                                        <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-base">Currency</Label>
                            <Select value={formData.currency} onValueChange={(val) => handleSelectChange('currency', val)}>
                                <SelectTrigger className="bg-white dark:bg-neutral-950">
                                    <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent>
                                    {currencies.map((curr) => (
                                        <SelectItem key={curr.value} value={curr.value}>{curr.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="salaryMin">Min Salary</Label>
                            <Input
                                id="salaryMin"
                                name="salaryMin"
                                type="number"
                                placeholder="0"
                                value={formData.salaryMin}
                                onChange={handleChange}
                                className="bg-white dark:bg-neutral-950"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="salaryMax">Max Salary</Label>
                            <Input
                                id="salaryMax"
                                name="salaryMax"
                                type="number"
                                placeholder="0"
                                value={formData.salaryMax}
                                onChange={handleChange}
                                className="bg-white dark:bg-neutral-950"
                            />
                        </div>
                    </div>
                </div>

                {/* Sidebar / Helpers */}
                <div className="lg:col-span-5 space-y-6">
                    <Card className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800">
                        <CardContent className="pt-6">
                            <div className="mb-4">
                                <h4 className="font-semibold text-neutral-900 dark:text-white">Requirements</h4>
                                <p className="text-xs text-neutral-500">Type and press Enter to add requirements</p>
                            </div>
                            <TagsSelector
                                value={formData.requirements}
                                onChange={(tags) => setFormData({ ...formData, requirements: tags })}
                                placeholder="Add requirement..."
                                tags={[
                                    { id: "Communication Skills", label: "Communication Skills" },
                                    { id: "Team Player", label: "Team Player" },
                                    { id: "Problem Solving", label: "Problem Solving" }
                                ]}
                            />
                        </CardContent>
                    </Card>

                    <Card className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800">
                        <CardContent className="pt-6">
                            <div className="mb-4">
                                <h4 className="font-semibold text-neutral-900 dark:text-white">Skills</h4>
                                <p className="text-xs text-neutral-500">Type and press Enter to add skills</p>
                            </div>
                            <TagsSelector
                                value={formData.skills}
                                onChange={(tags) => setFormData({ ...formData, skills: tags })}
                                placeholder="Add skill..."
                                tags={[
                                    { id: "React", label: "React" },
                                    { id: "TypeScript", label: "TypeScript" },
                                    { id: "Node.js", label: "Node.js" },
                                    { id: "Python", label: "Python" }
                                ]}
                            />
                        </CardContent>
                    </Card>
                </div>
            </form>
        </div>
    );
}
