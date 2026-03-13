// @ts-nocheck
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Plus, X } from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/Header';
import Card from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import api from '@/lib/api';
import { Job } from '@/types';

const jobTypes = [
    { value: 'full-time', label: 'Full Time' },
    { value: 'part-time', label: 'Part Time' },
    { value: 'contract', label: 'Contract' },
    { value: 'remote', label: 'Remote' },
    { value: 'internship', label: 'Internship' },
];

const experienceLevels = [
    { value: 'entry', label: 'Entry Level' },
    { value: 'mid', label: 'Mid Level' },
    { value: 'senior', label: 'Senior Level' },
    { value: 'lead', label: 'Lead' },
    { value: 'executive', label: 'Executive' },
];

const currencies = [
    { value: 'USD', label: 'USD ($)' },
    { value: 'EUR', label: 'EUR (€)' },
    { value: 'GBP', label: 'GBP (£)' },
    { value: 'INR', label: 'INR (₹)' },
];

const statusOptions = [
    { value: 'active', label: 'Active' },
    { value: 'closed', label: 'Closed' },
    { value: 'draft', label: 'Draft' },
];

export default function EditJobPage() {
    const params = useParams();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        location: '',
        type: 'full-time',
        experience: 'entry',
        status: 'active',
        salaryMin: '',
        salaryMax: '',
        currency: 'USD',
        requirements: [''],
        skills: [''],
    });

    useEffect(() => {
        const fetchJob = async () => {
            try {
                const response = await api.get(`/jobs/${params.id}`);
                const job: Job = response.data;
                setFormData({
                    title: job.title,
                    description: job.description,
                    location: job.location,
                    type: job.type,
                    experience: job.experience,
                    status: job.status,
                    salaryMin: job.salary.min.toString(),
                    salaryMax: job.salary.max.toString(),
                    currency: job.salary.currency,
                    requirements: job.requirements.length ? job.requirements : [''],
                    skills: job.skills.length ? job.skills : [''],
                });
            } catch (err: any) {
                setError('Failed to load job');
            } finally {
                setLoading(false);
            }
        };

        fetchJob();
    }, [params.id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleArrayChange = (index: number, value: string, field: 'requirements' | 'skills') => {
        const newArray = [...formData[field]];
        newArray[index] = value;
        setFormData({ ...formData, [field]: newArray });
    };

    const addArrayItem = (field: 'requirements' | 'skills') => {
        setFormData({ ...formData, [field]: [...formData[field], ''] });
    };

    const removeArrayItem = (index: number, field: 'requirements' | 'skills') => {
        const newArray = formData[field].filter((_, i) => i !== index);
        setFormData({ ...formData, [field]: newArray.length ? newArray : [''] });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        try {
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
            });

            router.push('/company/jobs');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update job');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <Header title="Edit Job" />

            <div className="p-6 max-w-4xl">
                <Link href="/company/jobs" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6">
                    <ArrowLeft size={16} />
                    Back to Jobs
                </Link>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <Card className="mb-6">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">
                            Job Details
                        </h2>

                        <div className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Job Title"
                                    name="title"
                                    value={formData.title}
                                    onChange={handleChange}
                                    placeholder="e.g. Senior Software Engineer"
                                    required
                                />

                                <Select
                                    label="Status"
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    options={statusOptions}
                                />
                            </div>

                            <Textarea
                                label="Job Description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Describe the role, responsibilities, and what you're looking for..."
                                rows={6}
                                required
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                    label="Location"
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    placeholder="e.g. New York, NY or Remote"
                                    required
                                />

                                <Select
                                    label="Job Type"
                                    name="type"
                                    value={formData.type}
                                    onChange={handleChange}
                                    options={jobTypes}
                                />
                            </div>

                            <Select
                                label="Experience Level"
                                name="experience"
                                value={formData.experience}
                                onChange={handleChange}
                                options={experienceLevels}
                            />
                        </div>
                    </Card>

                    <Card className="mb-6">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">
                            Salary Range
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Input
                                label="Minimum Salary"
                                name="salaryMin"
                                type="number"
                                value={formData.salaryMin}
                                onChange={handleChange}
                                placeholder="e.g. 50000"
                            />

                            <Input
                                label="Maximum Salary"
                                name="salaryMax"
                                type="number"
                                value={formData.salaryMax}
                                onChange={handleChange}
                                placeholder="e.g. 80000"
                            />

                            <Select
                                label="Currency"
                                name="currency"
                                value={formData.currency}
                                onChange={handleChange}
                                options={currencies}
                            />
                        </div>
                    </Card>

                    <Card className="mb-6">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">
                            Requirements
                        </h2>

                        <div className="space-y-3">
                            {formData.requirements.map((req, index) => (
                                <div key={index} className="flex gap-2">
                                    <Input
                                        value={req}
                                        onChange={(e) => handleArrayChange(index, e.target.value, 'requirements')}
                                        placeholder="e.g. 5+ years of experience with React"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => removeArrayItem(index, 'requirements')}
                                        className="text-slate-400 hover:text-red-500"
                                    >
                                        <X size={18} />
                                    </Button>
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => addArrayItem('requirements')}
                                size="sm"
                            >
                                <Plus size={16} />
                                Add Requirement
                            </Button>
                        </div>
                    </Card>

                    <Card className="mb-6">
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-white mb-6">
                            Skills
                        </h2>

                        <div className="space-y-3">
                            {formData.skills.map((skill, index) => (
                                <div key={index} className="flex gap-2">
                                    <Input
                                        value={skill}
                                        onChange={(e) => handleArrayChange(index, e.target.value, 'skills')}
                                        placeholder="e.g. JavaScript"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={() => removeArrayItem(index, 'skills')}
                                        className="text-slate-400 hover:text-red-500"
                                    >
                                        <X size={18} />
                                    </Button>
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => addArrayItem('skills')}
                                size="sm"
                            >
                                <Plus size={16} />
                                Add Skill
                            </Button>
                        </div>
                    </Card>

                    <div className="flex justify-end gap-3">
                        <Link href="/company/jobs">
                            <Button variant="outline">Cancel</Button>
                        </Link>
                        <Button type="submit" loading={saving}>
                            Save Changes
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
