'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, Plus, Loader2, CircleCheck, Upload, FileText, X } from 'lucide-react';
import Header from '@/components/Header';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Separator } from '@/components/ui/Separator';
import api from '@/lib/api';

const industries = [
    'Technology', 'Healthcare', 'Finance', 'Education', 'E-commerce',
    'Manufacturing', 'Real Estate', 'Consulting', 'Media', 'Hospitality',
    'Logistics', 'Retail', 'Agriculture', 'Energy', 'Automotive', 'Other'
];

const companySizes = [
    '1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+'
];

export default function AdminAddCompanyPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [documentFile, setDocumentFile] = useState<File | null>(null);
    const [customIndustry, setCustomIndustry] = useState('');

    const [formData, setFormData] = useState({
        companyName: '',
        email: '',
        industry: '',
        size: '',
        website: '',
        description: '',
        location: '',
        contactName: '',
        contactDesignation: '',
        contactPhone: '',
        documentType: '',
        documentNumber: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData({ ...formData, [name]: value });
        if (name === 'industry' && value !== 'other') {
            setCustomIndustry('');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setDocumentFile(file);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const fd = new FormData();
            fd.append('companyName', formData.companyName);
            fd.append('email', formData.email);
            if (formData.industry) fd.append('industry', formData.industry === 'other' ? customIndustry : formData.industry);
            if (formData.size) fd.append('size', formData.size);
            if (formData.website) fd.append('website', formData.website);
            if (formData.description) fd.append('description', formData.description);
            if (formData.location) fd.append('location', formData.location);

            if (formData.contactName) {
                fd.append('contactPerson[name]', formData.contactName);
                fd.append('contactPerson[designation]', formData.contactDesignation);
                fd.append('contactPerson[phone]', formData.contactPhone);
            }

            if (formData.documentType) {
                fd.append('document[type]', formData.documentType);
                fd.append('document[number]', formData.documentNumber);
            }

            if (documentFile) {
                fd.append('document', documentFile);
            }

            const res = await api.post('/admin/companies', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            router.push(`/admin/companies/${res.data.data._id}`);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create company');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="animate-fade-in bg-white dark:bg-black min-h-screen pb-24">
            <Header title="Add Company" />

            <div className="max-w-5xl mx-auto px-6">
                <div className="mb-8">
                    <button
                        onClick={() => router.push('/admin/companies')}
                        className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors mb-3"
                    >
                        <ArrowLeft size={16} /> Back to Companies
                    </button>
                    <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">
                        Add New Company
                    </h2>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                        Create a company profile. When the company registers with the same email, they&apos;ll be linked to this profile.
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-7 space-y-8">
                        {/* Basic Info */}
                        <div className="space-y-6">
                            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Company Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="companyName">Company Name <span className="text-red-500">*</span></Label>
                                    <Input id="companyName" name="companyName" placeholder="e.g. Acme Corp" value={formData.companyName} onChange={handleChange} required className="bg-white dark:bg-neutral-950" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Company Email <span className="text-red-500">*</span></Label>
                                    <Input id="email" name="email" type="email" placeholder="hr@company.com" value={formData.email} onChange={handleChange} required className="bg-white dark:bg-neutral-950" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Industry</Label>
                                    <Select value={formData.industry} onValueChange={(val) => handleSelectChange('industry', val)}>
                                        <SelectTrigger className="bg-white dark:bg-neutral-950"><SelectValue placeholder="Select industry" /></SelectTrigger>
                                        <SelectContent>
                                            {industries.map(ind => <SelectItem key={ind} value={ind.toLowerCase()}>{ind}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    {formData.industry === 'other' && (
                                        <Input
                                            placeholder="Enter your industry name"
                                            value={customIndustry}
                                            onChange={(e) => setCustomIndustry(e.target.value)}
                                            className="mt-2 bg-white dark:bg-neutral-950"
                                            required
                                        />
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label>Company Size</Label>
                                    <Select value={formData.size} onValueChange={(val) => handleSelectChange('size', val)}>
                                        <SelectTrigger className="bg-white dark:bg-neutral-950"><SelectValue placeholder="Select size" /></SelectTrigger>
                                        <SelectContent>
                                            {companySizes.map(s => <SelectItem key={s} value={s}>{s} employees</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="location">Location</Label>
                                    <Input id="location" name="location" placeholder="e.g. Mumbai, India" value={formData.location} onChange={handleChange} className="bg-white dark:bg-neutral-950" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="website">Website</Label>
                                    <Input id="website" name="website" placeholder="https://company.com" value={formData.website} onChange={handleChange} className="bg-white dark:bg-neutral-950" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea id="description" name="description" placeholder="About the company..." className="min-h-[120px] resize-y bg-white dark:bg-neutral-950" value={formData.description} onChange={handleChange} />
                            </div>
                        </div>

                        <Separator className="bg-neutral-200 dark:bg-neutral-800" />

                        {/* Contact Person */}
                        <div className="space-y-6">
                            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Contact Person</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="contactName">Name</Label>
                                    <Input id="contactName" name="contactName" placeholder="Contact name" value={formData.contactName} onChange={handleChange} className="bg-white dark:bg-neutral-950" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contactDesignation">Designation</Label>
                                    <Input id="contactDesignation" name="contactDesignation" placeholder="e.g. HR Manager" value={formData.contactDesignation} onChange={handleChange} className="bg-white dark:bg-neutral-950" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="contactPhone">Phone</Label>
                                    <Input id="contactPhone" name="contactPhone" placeholder="+91 9876543210" value={formData.contactPhone} onChange={handleChange} className="bg-white dark:bg-neutral-950" />
                                </div>
                            </div>
                        </div>

                        <Separator className="bg-neutral-200 dark:bg-neutral-800" />

                        {/* Verification Document */}
                        <div className="space-y-6">
                            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">Verification Document</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label>Document Type</Label>
                                    <Select value={formData.documentType} onValueChange={(val) => handleSelectChange('documentType', val)}>
                                        <SelectTrigger className="bg-white dark:bg-neutral-950"><SelectValue placeholder="Select type" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="gst">GST</SelectItem>
                                            <SelectItem value="pan">PAN</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="documentNumber">Document Number</Label>
                                    <Input id="documentNumber" name="documentNumber" placeholder="e.g. 22AAAAA0000A1Z5" value={formData.documentNumber} onChange={handleChange} className="bg-white dark:bg-neutral-950" />
                                </div>
                            </div>

                            {/* File Upload */}
                            <div className="space-y-2">
                                <Label>Upload Document</Label>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/*,application/pdf"
                                    className="hidden"
                                />
                                {!documentFile ? (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex h-36 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                    >
                                        <div className="rounded-full bg-white dark:bg-black p-3 shadow-sm border border-neutral-200 dark:border-neutral-800">
                                            <Upload className="h-5 w-5 text-neutral-500" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-sm font-medium text-neutral-900 dark:text-white">Click to upload document</p>
                                            <p className="text-xs text-neutral-500">PDF or Image (max 5MB)</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="relative overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                                                <FileText className="h-6 w-6 text-blue-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                                                    {documentFile.name}
                                                </p>
                                                <p className="text-xs text-neutral-500">
                                                    {(documentFile.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => { setDocumentFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                                                className="shrink-0 p-2 text-neutral-400 hover:text-red-500 transition-colors"
                                            >
                                                <X className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={loading} className="bg-[#4a6cf7] hover:bg-blue-700 text-white min-w-[200px] h-12 text-base font-semibold shadow-xl shadow-blue-600/20">
                                {loading ? <Loader2 className="animate-spin mr-2" /> : <Plus className="mr-2" />}
                                Create Company
                            </Button>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-5">
                        <Card className="bg-neutral-50 dark:bg-neutral-900 border-none shadow-none sticky top-6">
                            <CardContent className="pt-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="h-10 w-10 rounded-xl bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-500">
                                        <Building2 size={22} />
                                    </div>
                                    <h4 className="text-base font-semibold text-neutral-900 dark:text-white">How it works</h4>
                                </div>
                                <ul className="space-y-3">
                                    {[
                                        "Company is created with 'active' status immediately",
                                        "A placeholder account is generated for the company",
                                        "Admin can post jobs on behalf of this company",
                                        "When the company signs up with the same email, they'll see all existing data",
                                    ].map((tip, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                                            <CircleCheck className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                                            <span>{tip}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </div>
                </form>
            </div>
        </div>
    );
}
