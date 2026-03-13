'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Loader2, Check, CircleCheck, Building2, Sparkles, X } from 'lucide-react';
import Header from '@/components/Header';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/RadioGroup';
import { Textarea } from '@/components/ui/Textarea';
import { Separator } from '@/components/ui/Separator';
import { TagsSelector } from '@/components/ui/TagsSelector';
import { FileUpload } from '@/components/ui/FileUpload';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

const jobTypes = [
    { value: 'full-time', label: 'Full Time', description: 'Standard 40-hour work week' },
    { value: 'part-time', label: 'Part Time', description: 'Less than 30 hours per week' },
    { value: 'freelance', label: 'Freelance', description: 'Independent contractor / project based' },
    { value: 'remote', label: 'Remote', description: 'Work from anywhere' },
    { value: 'hybrid', label: 'Hybrid', description: 'Mix of office and remote work' },
    { value: 'internship', label: 'Internship', description: 'Training position' },
];

const experienceLevels = [
    { value: 'entry', label: 'Entry Level' },
    { value: 'mid', label: 'Mid Level' },
    { value: 'senior', label: 'Senior Level' },
    { value: 'lead', label: 'Lead / Manager' },
    { value: 'executive', label: 'Executive' },
];

interface AiPromptState {
    role: string;
    skills: string;
    file?: File;
}

export default function AdminNewJobPage() {
    const router = useRouter();
    const params = useParams();
    const companyId = params.id as string;

    const [loading, setLoading] = useState(false);
    const [companyName, setCompanyName] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [showAiModal, setShowAiModal] = useState(false);
    const [aiPrompt, setAiPrompt] = useState<AiPromptState>({ role: '', skills: '' });
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        location: '',
        type: 'full-time',
        experience: 'entry',
        salaryMin: '',
        salaryMax: '',
        currency: 'INR',
        requirements: [] as string[],
        skills: [] as string[],
    });

    // Fetch company name for display
    useEffect(() => {
        const fetchCompany = async () => {
            try {
                const res = await api.get(`/admin/companies/${companyId}/jobs`);
                setCompanyName(res.data.company?.companyName || 'Company');
            } catch (err) {
                console.error(err);
            }
        };
        fetchCompany();
    }, [companyId]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData({ ...formData, [name]: value });
    };

    const handleGenerateAI = async () => {
        if (!aiPrompt.role && !aiPrompt.file) return;
        setAiLoading(true);

        try {
            let response;

            if (aiPrompt.file) {
                const fd = new FormData();
                fd.append('file', aiPrompt.file);
                response = await api.post('/admin/jobs/generate-ai-file', fd, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                response = await api.post('/admin/jobs/generate-ai', {
                    role: aiPrompt.role,
                    skills: aiPrompt.skills,
                });
            }

            const { title, description, requirements, recommended_skills, location, type, experience } = response.data;

            setFormData(prev => ({
                ...prev,
                title: title || aiPrompt.role || prev.title,
                description: description || prev.description,
                requirements: requirements && requirements.length ? requirements : prev.requirements,
                skills: recommended_skills && recommended_skills.length ? recommended_skills : prev.skills,
                location: location || prev.location,
                type: type || prev.type,
                experience: experience || prev.experience,
            }));

            setShowAiModal(false);
            setAiPrompt({ role: '', skills: '', file: undefined });
        } catch (err) {
            console.error(err);
            alert('Failed to generate content. Please try again.');
        } finally {
            setAiLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post(`/admin/companies/${companyId}/jobs`, {
                title: formData.title,
                description: formData.description,
                location: formData.location,
                type: formData.type,
                experience: formData.experience,
                salary: {
                    min: parseInt(formData.salaryMin) || 0,
                    max: parseInt(formData.salaryMax) || 0,
                    currency: formData.currency,
                },
                requirements: formData.requirements.filter(r => r.trim()),
                skills: formData.skills.filter(s => s.trim()),
            });
            router.push(`/admin/companies/${companyId}`);
        } catch (err: any) {
            console.error(err);
            alert('Failed to create job. ' + (err.response?.data?.message || ''));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in bg-white dark:bg-black min-h-screen pb-24">
            <Header title="Post Job for Company" />

            <div className="max-w-6xl mx-auto px-6">
                {/* Back & Company info */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <button
                            onClick={() => router.push(`/admin/companies/${companyId}`)}
                            className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors mb-3"
                        >
                            <ArrowLeft size={16} /> Back to {companyName}
                        </button>
                        <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                            Create Job Posting
                        </h2>
                        <div className="flex items-center gap-2 mt-1 text-neutral-500 dark:text-neutral-400">
                            <Building2 size={16} />
                            <span className="text-sm">Posting on behalf of <strong className="text-neutral-900 dark:text-white">{companyName}</strong></span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Link href={`/admin/companies/${companyId}`}>
                            <Button variant="ghost">Cancel</Button>
                        </Link>
                        <Button
                            onClick={() => setShowAiModal(true)}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            <Sparkles className="mr-2 h-4 w-4" />
                            AI Assist
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
                                        placeholder="e.g. Remote, Mumbai"
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

                        {/* Job Type */}
                        <div>
                            <Label className="text-base mb-4 block">Job Type <span className="text-red-500">*</span></Label>
                            <RadioGroup
                                value={formData.type}
                                onValueChange={(val) => handleSelectChange('type', val)}
                                className="grid grid-cols-1 gap-3"
                            >
                                {jobTypes.map((type) => (
                                    <label
                                        key={type.value}
                                        htmlFor={`admin-${type.value}`}
                                        className={cn(
                                            "relative flex cursor-pointer rounded-xl border bg-white dark:bg-neutral-950 p-4 transition-all hover:border-blue-500/50",
                                            formData.type === type.value
                                                ? "border-[#4a6cf7] ring-1 ring-[#4a6cf7] shadow-sm"
                                                : "border-neutral-200 dark:border-neutral-800"
                                        )}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1">
                                                <RadioGroupItem value={type.value} id={`admin-${type.value}`} />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-neutral-900 dark:text-white">{type.label}</p>
                                                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">{type.description}</p>
                                            </div>
                                        </div>
                                        {formData.type === type.value && (
                                            <div className="absolute top-4 right-4 text-[#4a6cf7]">
                                                <Check className="h-5 w-5" />
                                            </div>
                                        )}
                                    </label>
                                ))}
                            </RadioGroup>
                        </div>

                        <Separator className="bg-neutral-200 dark:bg-neutral-800" />

                        {/* Experience & Salary */}
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

                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="salaryMin">Min Salary (₹)</Label>
                                <Input id="salaryMin" name="salaryMin" type="number" placeholder="0" value={formData.salaryMin} onChange={handleChange} className="bg-white dark:bg-neutral-950" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="salaryMax">Max Salary (₹)</Label>
                                <Input id="salaryMax" name="salaryMax" type="number" placeholder="0" value={formData.salaryMax} onChange={handleChange} className="bg-white dark:bg-neutral-950" />
                            </div>
                        </div>

                        <Separator className="bg-neutral-200 dark:bg-neutral-800" />

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={loading} className="bg-[#4a6cf7] hover:bg-blue-700 text-white min-w-[200px] h-12 text-base font-semibold shadow-xl shadow-blue-600/20">
                                {loading ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />}
                                Publish Job Post
                            </Button>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-5 space-y-6">
                        <Card className="bg-neutral-50 dark:bg-neutral-900 border-none shadow-none">
                            <CardContent className="pt-6">
                                <h4 className="text-base font-semibold text-neutral-900 dark:text-white mb-2">Posting Tips</h4>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                                    Great job posts attract great talent. Here is what we recommend:
                                </p>
                                <ul className="space-y-3">
                                    {[
                                        "Be specific about the role and responsibilities",
                                        "Highlight the company culture and values",
                                        "Clearly state required vs preferred qualifications",
                                        "Include salary range for transparency"
                                    ].map((tip, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                                            <CircleCheck className="h-5 w-5 text-green-500 shrink-0" />
                                            <span>{tip}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>

                        <Card className="bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800">
                            <CardContent className="pt-6">
                                <div className="mb-4">
                                    <h4 className="font-semibold text-neutral-900 dark:text-white">Requirements</h4>
                                    <p className="text-xs text-neutral-500">Type and press Enter to add requirements</p>
                                </div>
                                <TagsSelector
                                    value={formData.requirements}
                                    onChange={(tags) => setFormData({ ...formData, requirements: tags })}
                                    placeholder="Add requirement (e.g. '5+ years experience')..."
                                    tags={[
                                        { id: "Communication Skills", label: "Communication Skills" },
                                        { id: "Team Player", label: "Team Player" },
                                        { id: "Problem Solving", label: "Problem Solving" },
                                        { id: "Bachelor's Degree", label: "Bachelor's Degree" }
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
                                    placeholder="Add skill (e.g. 'React')..."
                                    tags={[
                                        { id: "React", label: "React" },
                                        { id: "TypeScript", label: "TypeScript" },
                                        { id: "Node.js", label: "Node.js" },
                                        { id: "Python", label: "Python" },
                                        { id: "AWS", label: "AWS" },
                                        { id: "Design", label: "Design" }
                                    ]}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </form>

                {/* AI Generator Modal */}
                {showAiModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <Card className="w-full max-w-lg bg-neutral-900 border-neutral-800 animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-6">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                            <Sparkles className="text-purple-500" size={24} />
                                            Generate with AI
                                        </h3>
                                        <p className="text-neutral-400 text-sm mt-1">
                                            Upload a JD (PDF) or enter details manually.
                                        </p>
                                    </div>
                                    <button onClick={() => setShowAiModal(false)} className="text-neutral-500 hover:text-white transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {/* File Upload Section */}
                                    <div className="space-y-2">
                                        <Label className="text-neutral-300">Upload Job Description (PDF)</Label>
                                        <FileUpload onFileSelect={(file) => setAiPrompt(prev => ({ ...prev, file }))} />
                                    </div>

                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t border-neutral-800" />
                                        </div>
                                        <div className="relative flex justify-center text-xs uppercase">
                                            <span className="bg-neutral-900 px-2 text-neutral-500">Or enter manually</span>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <Input
                                            value={aiPrompt.role}
                                            onChange={(e) => setAiPrompt({ ...aiPrompt, role: e.target.value })}
                                            placeholder="Job Role / Title (e.g. Frontend Developer)"
                                            className="bg-black border-neutral-800 text-white placeholder:text-neutral-600 focus:border-purple-500"
                                        />
                                        <Input
                                            value={aiPrompt.skills}
                                            onChange={(e) => setAiPrompt({ ...aiPrompt, skills: e.target.value })}
                                            placeholder="Key Skills (e.g. React, TypeScript)"
                                            className="bg-black border-neutral-800 text-white placeholder:text-neutral-600 focus:border-purple-500"
                                        />
                                    </div>

                                    <div className="flex justify-end gap-3 mt-6">
                                        <Button variant="ghost" onClick={() => setShowAiModal(false)} className="text-neutral-400 hover:text-white hover:bg-neutral-800">Cancel</Button>
                                        <Button
                                            onClick={handleGenerateAI}
                                            disabled={(!aiPrompt.role && !aiPrompt.file) || aiLoading}
                                            className="bg-purple-600 hover:bg-purple-700 text-white border-none"
                                        >
                                            {aiLoading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="mr-2 h-4 w-4" />
                                                    Generate
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
