'use client';

import React, { useEffect, useState } from 'react';
import Header from '@/components/Header';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useAuth, useUser } from '@clerk/nextjs';
import api from '@/lib/api';
import Badge from '@/components/ui/Badge';
import { Loader2, Save, Building, Globe, MapPin, Users, Mail, User, Clock, FileText, Upload } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";

export default function CompanyProfilePage() {
    const { getToken } = useAuth();
    const { user } = useUser();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [formData, setFormData] = useState({
        companyName: '',
        website: '',
        location: '',
        industry: '',
        size: '',
        description: '',
        contactPerson: {
            name: '',
            designation: '',
            phone: ''
        },
        document: {
            type: '',
            number: '',
            url: ''
        }
    });

    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = await getToken();
                const response = await api.get('/company/profile', {
                    headers: { Authorization: `Bearer ${token}` }
                });

                const data = response.data;
                // Pre-fill user data if empty
                if (!data.contactPerson?.name && user) {
                    data.contactPerson = {
                        ...data.contactPerson,
                        name: user.fullName || ''
                    };
                }

                setFormData({
                    companyName: data.companyName || '',
                    website: data.website || '',
                    location: data.location || '',
                    industry: data.industry || '',
                    size: data.size || '',
                    description: data.description || '',
                    contactPerson: {
                        name: data.contactPerson?.name || '',
                        designation: data.contactPerson?.designation || '',
                        phone: data.contactPerson?.phone || ''
                    },
                    document: {
                        type: data.document?.type || '',
                        number: data.document?.number || '',
                        url: data.document?.url || ''
                    }
                });
            } catch (error) {
                console.error('Failed to fetch profile:', error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchProfile();
        }
    }, [getToken, user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            contactPerson: {
                ...formData.contactPerson,
                [e.target.name]: e.target.value
            }
        });
    };

    const handleDocumentChange = (field: string, value: string) => {
        setFormData({
            ...formData,
            document: {
                ...formData.document,
                [field]: value
            }
        });
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            const token = await getToken();

            const data = new FormData();
            data.append('companyName', formData.companyName);
            data.append('website', formData.website);
            data.append('location', formData.location);
            data.append('industry', formData.industry);
            data.append('size', formData.size);
            data.append('description', formData.description);
            data.append('contactPerson[name]', formData.contactPerson.name);
            data.append('contactPerson[designation]', formData.contactPerson.designation);
            data.append('contactPerson[phone]', formData.contactPerson.phone);

            data.append('documentType', formData.document.type);
            data.append('documentNumber', formData.document.number);

            if (file) {
                data.append('document', file);
            }

            await api.put('/company/profile', data, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setMessage({ type: 'success', text: 'Profile updated successfully!' });

            setTimeout(() => {
                setMessage({ type: '', text: '' });
                setIsEditing(false);
            }, 1000);
        } catch (error) {
            console.error('Failed to update profile:', error);
            setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-neutral-950">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            <Header title="Company Profile" />

            <div className="max-w-6xl mx-auto space-y-6">

                {/* 1. User Profile Section (Read-only from Clerk) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-1">
                        <Card className="h-full bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-sm flex flex-col items-center text-center p-8">
                            <div className="h-24 w-24 rounded-full p-1 bg-gradient-to-r from-orange-500 to-red-600 mb-4 shadow-lg shadow-orange-500/20">
                                <img
                                    src={user?.imageUrl}
                                    alt="Profile"
                                    className="h-full w-full rounded-full object-cover border-4 border-white dark:border-neutral-900 bg-white"
                                />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                                {user?.fullName}
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-neutral-400 mb-6 break-all">
                                {user?.primaryEmailAddress?.emailAddress}
                            </p>

                            <div className="w-full space-y-3 text-left">
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-neutral-800">
                                    <User size={18} className="text-slate-400 dark:text-neutral-400" />
                                    <span className="text-sm text-slate-700 dark:text-neutral-200">
                                        Account Manager
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-neutral-800">
                                    <Clock size={18} className="text-slate-400 dark:text-neutral-400" />
                                    <span className="text-sm text-slate-700 dark:text-neutral-200">
                                        Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </Card>
                    </div>

                    {/* 2. Company Info Section */}
                    <div className="md:col-span-2">
                        {!isEditing ? (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* View Mode */}
                                <Card className="bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                                    <div className="p-6 border-b border-slate-100 dark:border-neutral-800 flex justify-between items-center">
                                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                            <Building size={20} className="text-orange-500" />
                                            Company Details
                                        </h2>
                                        <Button onClick={() => setIsEditing(true)} variant="outline" size="sm" className="gap-2">
                                            Edit Profile
                                        </Button>
                                    </div>
                                    <div className="p-6 grid gap-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="text-xs uppercase text-slate-500 font-semibold tracking-wider">Company Name</label>
                                                <p className="text-slate-900 dark:text-white font-medium mt-1 text-lg">{formData.companyName || 'Not Set'}</p>
                                            </div>
                                            <div>
                                                <label className="text-xs uppercase text-slate-500 font-semibold tracking-wider">Website</label>
                                                {formData.website ? (
                                                    <a href={formData.website} target="_blank" rel="noopener noreferrer" className="block text-blue-600 dark:text-blue-400 font-medium mt-1 hover:underline truncate">
                                                        {formData.website}
                                                    </a>
                                                ) : <p className="text-slate-400 mt-1">Not Set</p>}
                                            </div>
                                            <div>
                                                <label className="text-xs uppercase text-slate-500 font-semibold tracking-wider">Industry</label>
                                                <div className="mt-1 flex items-center gap-2">
                                                    <Badge variant="secondary" className="bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-slate-300">
                                                        {formData.industry || 'Not Set'}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs uppercase text-slate-500 font-semibold tracking-wider">Size</label>
                                                <div className="mt-1 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                                    <Users size={16} className="text-slate-400" />
                                                    {formData.size || 'Not Set'}
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs uppercase text-slate-500 font-semibold tracking-wider">Location</label>
                                                <div className="mt-1 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                                    <MapPin size={16} className="text-slate-400" />
                                                    {formData.location || 'Not Set'}
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs uppercase text-slate-500 font-semibold tracking-wider">Description</label>
                                            <p className="mt-2 text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                                {formData.description || 'No description provided.'}
                                            </p>
                                        </div>
                                    </div>
                                </Card>

                                <Card className="bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                                    <div className="p-6 border-b border-slate-100 dark:border-neutral-800">
                                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                            <Users size={20} className="text-blue-500" />
                                            Contact Person
                                        </h2>
                                    </div>
                                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-xs uppercase text-slate-500 font-semibold tracking-wider">Full Name</label>
                                            <p className="text-slate-900 dark:text-white font-medium mt-1">{formData.contactPerson.name}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs uppercase text-slate-500 font-semibold tracking-wider">Designation</label>
                                            <p className="text-slate-900 dark:text-white font-medium mt-1">{formData.contactPerson.designation || 'Not Set'}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs uppercase text-slate-500 font-semibold tracking-wider">Phone</label>
                                            <p className="text-slate-900 dark:text-white font-medium mt-1">{formData.contactPerson.phone || 'Not Set'}</p>
                                        </div>
                                    </div>
                                </Card>

                                <Card className="bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                                    <div className="p-6 border-b border-slate-100 dark:border-neutral-800">
                                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                            <FileText size={20} className="text-green-500" />
                                            Verification Document
                                        </h2>
                                    </div>
                                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="text-xs uppercase text-slate-500 font-semibold tracking-wider">Document Type</label>
                                            <p className="text-slate-900 dark:text-white font-medium mt-1 uppercase">{formData.document?.type || 'Not Set'}</p>
                                        </div>
                                        <div>
                                            <label className="text-xs uppercase text-slate-500 font-semibold tracking-wider">Document Number</label>
                                            <p className="text-slate-900 dark:text-white font-medium mt-1">{formData.document?.number || 'Not Set'}</p>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-xs uppercase text-slate-500 font-semibold tracking-wider">Uploaded Document</label>
                                            {formData.document?.url ? (
                                                <div className="mt-2">
                                                    <a href={formData.document.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline">
                                                        <FileText size={16} />
                                                        View Document
                                                    </a>
                                                </div>
                                            ) : (
                                                <p className="tex-slate-400 mt-1">No document uploaded</p>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {message.text && (
                                    <div className={`p-4 rounded-lg text-sm border ${message.type === 'success'
                                        ? 'bg-green-100 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                                        : 'bg-red-100 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
                                        }`}>
                                        {message.text}
                                    </div>
                                )}

                                <Card className="bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-sm">
                                    <div className="p-2">
                                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 dark:border-neutral-800">
                                            <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                                <Building size={20} className="text-orange-500" />
                                                Edit Company Details
                                            </h2>
                                            <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                                                Cancel
                                            </Button>
                                        </div>

                                        <div className="space-y-5">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Company Name</label>
                                                <Input
                                                    name="companyName"
                                                    value={formData.companyName}
                                                    onChange={handleChange}
                                                    required
                                                    className="bg-slate-50 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">Website</label>
                                                    <Input
                                                        name="website"
                                                        value={formData.website}
                                                        onChange={handleChange}
                                                        placeholder="https://example.com"
                                                        className="bg-slate-50 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">Location</label>
                                                    <Input
                                                        name="location"
                                                        value={formData.location}
                                                        onChange={handleChange}
                                                        placeholder="Headquarters location"
                                                        className="bg-slate-50 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">Industry</label>
                                                    <Input
                                                        name="industry"
                                                        value={formData.industry}
                                                        onChange={handleChange}
                                                        placeholder="e.g. Technology"
                                                        className="bg-slate-50 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">Company Size</label>
                                                    <Input
                                                        name="size"
                                                        value={formData.size}
                                                        onChange={handleChange}
                                                        placeholder="e.g. 50-100 employees"
                                                        className="bg-slate-50 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Description</label>
                                                <Textarea
                                                    name="description"
                                                    value={formData.description}
                                                    onChange={handleChange}
                                                    rows={4}
                                                    placeholder="Tell us about your company..."
                                                    className="bg-slate-50 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                <Card className="bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-sm">
                                    <div className="p-2">
                                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-neutral-800">
                                            <Users size={20} className="text-blue-500" />
                                            Contact Person
                                        </h2>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Full Name</label>
                                                <Input
                                                    name="name"
                                                    value={formData.contactPerson.name}
                                                    onChange={handleContactChange}
                                                    required
                                                    className="bg-slate-50 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Designation</label>
                                                <Input
                                                    name="designation"
                                                    value={formData.contactPerson.designation}
                                                    onChange={handleContactChange}
                                                    placeholder="e.g. HR Manager"
                                                    className="bg-slate-50 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700"
                                                />
                                            </div>

                                            <div className="space-y-2 md:col-span-2">
                                                <label className="text-sm font-medium">Phone Number</label>
                                                <Input
                                                    name="phone"
                                                    value={formData.contactPerson.phone}
                                                    onChange={handleContactChange}
                                                    className="bg-slate-50 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                <Card className="bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 shadow-sm">
                                    <div className="p-2">
                                        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-neutral-800">
                                            <FileText size={20} className="text-green-500" />
                                            Verification Document
                                        </h2>

                                        <div className="space-y-5">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">Document Type</label>
                                                    <Select
                                                        value={formData?.document?.type}
                                                        onValueChange={(value) => handleDocumentChange('type', value)}
                                                    >
                                                        <SelectTrigger className="bg-slate-50 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700">
                                                            <SelectValue placeholder="Select Document Type" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="gst">GST Number</SelectItem>
                                                            <SelectItem value="pan">PAN Card</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-medium">Document Number</label>
                                                    <Input
                                                        name="documentNumber"
                                                        value={formData?.document?.number}
                                                        onChange={(e) => handleDocumentChange('number', e.target.value)}
                                                        placeholder="Enter Document Number"
                                                        className="bg-slate-50 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Upload Document Image</label>
                                                <div className="flex items-center gap-4">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="relative"
                                                    >
                                                        <input
                                                            type="file"
                                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                            onChange={handleFileChange}
                                                            accept="image/*,application/pdf"
                                                        />
                                                        <Upload size={16} className="mr-2" />
                                                        {file ? 'Change File' : 'Select File'}
                                                    </Button>
                                                    {file && <span className="text-sm text-slate-600 dark:text-slate-300">{file.name}</span>}
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">Accepst Images and PDFs. Max 5MB.</p>
                                            </div>
                                        </div>
                                    </div>
                                </Card>

                                <div className="flex justify-end pt-2 gap-4">
                                    <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={saving}
                                        className="bg-orange-500 hover:bg-orange-600 text-white border-none px-8 shadow-lg shadow-orange-500/20"
                                    >
                                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save size={18} className="mr-2" />}
                                        Save Changes
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div >
        </div >
    );
}


