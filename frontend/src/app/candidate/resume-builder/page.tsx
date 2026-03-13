"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Editor } from "@/components/builder/Editor";
import { Preview } from "@/components/builder/Preview";
import { Button } from "@/components/ui/Button";
import {
    Download,
    Save,
    Loader2,
    Layout,
    RefreshCw,
    ChevronDown,
    Edit,
    Eye
} from "lucide-react";
import { ResumeData } from "@/types/resume";
import api from "@/lib/api";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/DropdownMenu";
import { cn } from "@/lib/utils";
import { ResumeProvider, useResume } from "@/context/ResumeContext";

const STORAGE_KEY = "skillup_resume_draft";

function BuilderContent() {
    const { getToken, isLoaded, isSignedIn } = useAuth();
    const { resumeData, setResumeData, setTemplateId } = useResume();
    const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
    const [resumeTitle, setResumeTitle] = useState("My Resume");
    const [currentResumeId, setCurrentResumeId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [creditInfo, setCreditInfo] = useState<{ credits: number; freeResumeBuilderUsed: boolean } | null>(null);

    // Fetch credit info on mount
    useEffect(() => {
        (async () => {
            if (!isLoaded || !isSignedIn) return;
            try {
                const token = await getToken();
                const res = await api.get('/candidate/credits', { headers: { Authorization: `Bearer ${token}` } });
                if (res.data.success) setCreditInfo({ credits: res.data.credits, freeResumeBuilderUsed: res.data.freeResumeBuilderUsed });
            } catch { /* ignore */ }
        })();
    }, [isLoaded, isSignedIn, getToken]);

    // Data migration helper
    const migrateData = (data: any): ResumeData => {
        // If it's already in the new format, return as is (with minimal checks)
        if (data.personalInfo) return data as ResumeData;

        // Otherwise, migrate from old format
        return {
            templateId: data.templateId || 'modern',
            personalInfo: {
                fullName: data.personal?.fullName || '',
                email: data.personal?.email || '',
                phone: data.personal?.phone || '',
                location: data.personal?.location || '',
                website: data.personal?.website || '',
                github: data.personal?.github || '',
                linkedin: data.personal?.linkedin || '',
                title: '',
                summary: '',
            },
            education: (data.education || []).map((edu: any) => ({
                id: edu.id || crypto.randomUUID(),
                institution: edu.school || '',
                degree: edu.degree || '',
                startDate: edu.date?.split('-')[0]?.trim() || '',
                endDate: edu.date?.split('-')[1]?.trim() || '',
                location: edu.location || '',
                description: edu.gpa || '',
            })),
            experience: (data.experience || []).map((exp: any) => ({
                id: exp.id || crypto.randomUUID(),
                company: exp.company || '',
                position: exp.role || '',
                startDate: exp.date?.split('-')[0]?.trim() || '',
                endDate: exp.date?.split('-')[1]?.trim() || '',
                current: exp.date?.toLowerCase().includes('present') || false,
                location: exp.location || '',
                description: Array.isArray(exp.description) ? exp.description.join('\n') : (exp.description || ''),
            })),
            projects: (data.projects || []).map((proj: any) => ({
                id: proj.id || crypto.randomUUID(),
                name: proj.title || '',
                description: Array.isArray(proj.description) ? proj.description.join('\n') : (proj.description || ''),
                startDate: '',
                endDate: '',
                technologies: proj.techStack || '',
            })),
            skills: (data.skills || []).map((s: any) => ({
                id: s.id || crypto.randomUUID(),
                name: s.category ? `${s.category}: ${s.items}` : (s.name || ''),
                level: 'Expert',
            })),
            achievements: data.achievements || [],
            positionsOfResponsibility: data.positionsOfResponsibility || [],
        };
    };

    // Load draft from localStorage on mount
    useEffect(() => {
        const draft = localStorage.getItem(STORAGE_KEY);
        if (draft) {
            try {
                const parsed = JSON.parse(draft);
                if (parsed.data) {
                    const migrated = migrateData(parsed.data);
                    // Ensure templateId is set from parsed.template if missing in migrated data
                    if (parsed.template && !parsed.data.templateId) {
                        migrated.templateId = parsed.template;
                    }
                    setResumeData(migrated);
                }
                setResumeTitle(parsed.title || "My Resume");
                setCurrentResumeId(parsed.resumeId || null);
            } catch (e) {
                console.error("Migration/Load failed:", e);
                localStorage.removeItem(STORAGE_KEY); // Clear corrupt draft
            }
        }
    }, [setResumeData]);

    // Auto-save draft to localStorage
    useEffect(() => {
        const timeout = setTimeout(() => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                data: resumeData,
                template: resumeData.templateId,
                title: resumeTitle,
                resumeId: currentResumeId
            }));
        }, 1000);
        return () => clearTimeout(timeout);
    }, [resumeData, resumeTitle, currentResumeId]);

    const handleSave = async () => {
        if (!isLoaded || !isSignedIn) return;
        if (resumeData.templateId === 'executive') {
            if (!confirm('Saving with the Executive template will deduct 10 credits. Proceed?')) return;
        }
        setIsSaving(true);
        setSaveError(null);
        try {
            const token = await getToken();
            const payload = {
                resumeId: currentResumeId,
                title: resumeTitle,
                template: resumeData.templateId,
                data: resumeData,
            };

            const response = await api.post('/resumes', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (response.data.success) {
                setCurrentResumeId(response.data.resume._id);
                setLastSaved(new Date());
            }

            // Refresh credits
            const creditsRes = await api.get('/candidate/credits', { headers: { Authorization: `Bearer ${token}` } });
            if (creditsRes.data.success) setCreditInfo({ credits: creditsRes.data.credits, freeResumeBuilderUsed: creditsRes.data.freeResumeBuilderUsed });
        } catch (error: any) {
            if (error?.response?.status === 402) {
                const d = error.response.data;
                setSaveError(`Insufficient credits! Need ${d.creditsRequired}, have ${d.creditsAvailable}. Refer friends to earn more.`);
            } else {
                console.error('Save failed', error);
                setSaveError('Failed to save resume.');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async () => {
        if (resumeData.templateId === 'executive') {
            if (!confirm('Exporting the Executive template will deduct 10 credits. Proceed?')) return;
        }
        setIsExporting(true);
        setSaveError(null);
        try {
            const token = await getToken();
            const response = await api.post('/resumes/export-pdf',
                { templateId: resumeData.templateId, data: resumeData },
                {
                    headers: { Authorization: `Bearer ${token}` },
                    responseType: 'blob',
                }
            );

            // Create download link
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const filename = `${resumeData.personalInfo.fullName ? resumeData.personalInfo.fullName.replace(/\s+/g, '_') : 'Resume'}_SkillUp.pdf`;

            // Mobile Optimization: Use Web Share API to allow "Save to Files" on iOS/Android
            if (typeof window !== 'undefined' && window.navigator && 'canShare' in navigator && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
                try {
                    const file = new File([blob], filename, { type: 'application/pdf' });
                    if (navigator.canShare({ files: [file] })) {
                        await navigator.share({
                            files: [file],
                            title: filename,
                        });
                        return; // Successfully shared/saved, skip fallback
                    }
                } catch (shareError) {
                    console.log('Share API failed or user cancelled, falling back to download:', shareError);
                }
            }

            // Desktop / Fallback download
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            }, 500);
        } catch (error: any) {
            console.error('Export failed:', error);
            setSaveError('Failed to export PDF. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    const resetDraft = () => {
        if (!confirm("Are you sure you want to reset your draft? This cannot be undone.")) return;
        localStorage.removeItem(STORAGE_KEY);
        window.location.reload();
    };

    const templates = [
        { id: 'modern', name: 'Modern', premium: false },
        { id: 'latex', name: 'LaTeX', premium: false },
        { id: 'classic', name: 'Classic', premium: false },
        { id: 'executive', name: 'Executive', premium: true },
    ];

    return (
        <div className="flex flex-col w-full h-[calc(100vh-4rem)] bg-white dark:bg-black overflow-hidden relative">
            {/* Toolbar */}
            <div className="h-auto md:h-16 border-b border-neutral-100 dark:border-neutral-900 px-4 md:px-6 py-3 md:py-0 flex flex-col md:flex-row items-center justify-between z-10 shrink-0 no-print gap-3">
                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
                    <div className="flex flex-col w-full md:w-auto">
                        <input
                            value={resumeTitle}
                            onChange={(e) => setResumeTitle(e.target.value)}
                            className="bg-transparent font-bold text-neutral-900 dark:text-white outline-none placeholder:text-neutral-400 focus:ring-0 text-sm w-full"
                            placeholder="Resume Title..."
                        />
                        {lastSaved && (
                            <span className="text-[10px] text-neutral-400 font-medium whitespace-nowrap">
                                Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
                    <div className="flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-9 px-3 text-xs font-bold text-[#4a6cf7] bg-[#4a6cf7]/5 rounded-full border border-primary/10">
                                    <Layout size={14} className="mr-2" />
                                    <span className="capitalize">{resumeData.templateId}</span>
                                    <ChevronDown size={14} className="ml-2 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[180px] p-1 bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800 shadow-xl overflow-hidden rounded-xl">
                                {templates.map(t => (
                                    <DropdownMenuItem
                                        key={t.id}
                                        onClick={() => setTemplateId(t.id)}
                                        className={cn(
                                            "flex items-center gap-2 px-3 py-2 cursor-pointer rounded-lg text-xs font-medium",
                                            resumeData.templateId === t.id
                                                ? "bg-primary/10 text-primary font-bold"
                                                : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                                        )}
                                    >
                                        <span className="flex-1">{t.name}</span>
                                        {t.premium && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700">PREMIUM</span>}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Button variant="ghost" size="icon" onClick={resetDraft} title="Reset Draft" className="h-9 w-9 text-neutral-400 hover:text-red-500 rounded-full">
                            <RefreshCw size={16} />
                        </Button>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSave}
                            disabled={isSaving}
                            className="h-9 px-4 text-xs font-bold rounded-full hidden sm:flex border-neutral-200 dark:border-neutral-800"
                        >
                            {isSaving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2 text-primary" />}
                            <span>Save</span>
                        </Button>

                        <Button size="sm" className="h-9 px-4 text-xs font-bold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 rounded-full" onClick={handleExport} disabled={isExporting}>
                            {isExporting ? <Loader2 className="animate-spin w-4 h-4 sm:mr-2" /> : <Download className="w-4 h-4 sm:mr-2" />}
                            <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export PDF'}</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Mobile Tab Toggle */}
            <div className="flex lg:hidden no-print border-b border-neutral-100 dark:border-neutral-900 bg-white dark:bg-black shrink-0">
                <button
                    onClick={() => setActiveTab('editor')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-all border-b-2",
                        activeTab === 'editor' ? "border-primary text-primary" : "border-transparent text-neutral-400"
                    )}
                >
                    <Edit size={16} /> Editor
                </button>
                <button
                    onClick={() => setActiveTab('preview')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-all border-b-2",
                        activeTab === 'preview' ? "border-primary text-primary" : "border-transparent text-neutral-400"
                    )}
                >
                    <Eye size={16} /> Preview
                </button>
            </div>

            {saveError && (
                <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-medium flex items-center justify-between no-print animate-in fade-in slide-in-from-top-2">
                    <span>{saveError}</span>
                    <button onClick={() => setSaveError(null)} className="ml-3 text-red-400 hover:text-red-600 text-lg">&times;</button>
                </div>
            )}

            {/* Workspace */}
            <div className="flex flex-1 overflow-hidden relative">
                <div className={cn(
                    "w-full lg:w-[450px] border-r border-neutral-100 dark:border-neutral-900 bg-white dark:bg-black no-print shrink-0 overflow-y-auto",
                    activeTab === 'preview' ? 'hidden lg:block' : 'block'
                )}>
                    <Editor />
                </div>

                <div className={cn(
                    "flex-1 bg-neutral-50 dark:bg-neutral-950 overflow-hidden relative print:!block print:!bg-white print:!overflow-visible",
                    activeTab === 'editor' ? 'hidden lg:block' : 'block'
                )}>
                    <Preview />
                </div>
            </div>
        </div>
    );
}

export default function ResumeBuilderPage() {
    return (
        <ResumeProvider>
            <BuilderContent />
        </ResumeProvider>
    );
}

