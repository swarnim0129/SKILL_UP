'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileUp,
    Loader2,
    ShieldAlert,
    CheckCircle2,
    AlertCircle,
    FileText,
    Target,
    Briefcase,
    Zap,
    RefreshCw,
    Clock,
    Trash2,
    ChevronRight,
    BarChart3,
    ScanSearch,
    Sparkles,
} from 'lucide-react';
import api from '@/lib/api';

/* ────────── types ────────── */
interface AnalysisResult {
    overallScore: number;
    sections: { impact: number; formatting: number; keywords: number; experience: number };
    feedback: { critical: string[]; suggestions: string[]; strengths: string[] };
    keywords: string[];
    missingKeywords: string[];
    atsCompatibility: 'Low' | 'Medium' | 'High';
    atsCompatibilityReason?: string;
    summary: string;
    careerPath?: { role: string; reason: string };
}

interface SavedAnalysis {
    _id: string;
    fileName: string;
    analysis: AnalysisResult;
    createdAt: string;
}

type ViewState = 'idle' | 'uploading' | 'analyzing' | 'result' | 'error';

/* ────────── helpers ────────── */
function ago(d: string) {
    const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
}

function atsColor(level: string) {
    if (level === 'High') return 'text-emerald-500';
    if (level === 'Medium') return 'text-amber-500';
    return 'text-red-500';
}

function atsBg(level: string) {
    if (level === 'High') return 'border-emerald-200 dark:border-emerald-500/30';
    if (level === 'Medium') return 'border-amber-200 dark:border-amber-500/30';
    return 'border-red-200 dark:border-red-500/30';
}

const kwStyles = [
    'bg-[#4a6cf7]/5 text-[#4a6cf7] border-[#4a6cf7]/10',
    'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-100 dark:border-purple-500/20',
    'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20',
    'bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-100 dark:border-cyan-500/20',
];

/* ────────── sub-components ────────── */
function ScoreGauge({ score }: { score: number }) {
    const r = 54;
    const c = 2 * Math.PI * r;
    const offset = c - (score / 100) * c;
    return (
        <div className="relative w-40 h-40">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={r} className="stroke-slate-100 dark:stroke-slate-800 fill-none" strokeWidth="10" />
                <motion.circle
                    initial={{ strokeDashoffset: c }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                    cx="60" cy="60" r={r}
                    className="stroke-[#4a6cf7] fill-none"
                    strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={c}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tighter">{score}</span>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-1">out of 100</span>
            </div>
        </div>
    );
}

function ScoreBar({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className="flex items-center gap-4">
            <span className="w-28 text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</span>
            <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${value}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`h-full rounded-full ${color}`}
                />
            </div>
            <span className="w-12 text-right text-sm font-bold text-slate-900 dark:text-white">{value}%</span>
        </div>
    );
}

/* ────────── page ────────── */
export default function ResumeAnalyzerPage() {
    const { getToken } = useAuth();
    const [state, setState] = useState<ViewState>('idle');
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState('');
    const [fileName, setFileName] = useState('');
    const [savedList, setSavedList] = useState<SavedAnalysis[]>([]);
    const [loadingSaved, setLoadingSaved] = useState(true);
    const [currentId, setCurrentId] = useState<string | null>(null);
    const [creditInfo, setCreditInfo] = useState<{ credits: number; freeAnalysisUsed: boolean } | null>(null);

    // Fetch saved analyses and credit info on mount
    useEffect(() => {
        (async () => {
            try {
                const token = await getToken();
                const [analysesRes, creditsRes] = await Promise.all([
                    api.get('/resume/analyses', { headers: { Authorization: `Bearer ${token}` } }),
                    api.get('/candidate/credits', { headers: { Authorization: `Bearer ${token}` } }),
                ]);
                setSavedList(analysesRes.data.analyses || []);
                if (creditsRes.data.success) setCreditInfo({ credits: creditsRes.data.credits, freeAnalysisUsed: creditsRes.data.freeAnalysisUsed });
            } catch { /* ignore */ }
            finally { setLoadingSaved(false); }
        })();
    }, [getToken]);

    // Upload handler
    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;
        setFileName(file.name);
        setState('uploading');
        setError('');

        try {
            const token = await getToken();
            const formData = new FormData();
            formData.append('file', file);

            setState('analyzing');

            const res = await api.post('/resume/analyze', formData, {
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
                timeout: 60000,
            });

            setAnalysis(res.data.analysis);
            setCurrentId(res.data._id);
            setState('result');

            // Refresh saved list and credits
            const [listRes, creditsRes] = await Promise.all([
                api.get('/resume/analyses', { headers: { Authorization: `Bearer ${token}` } }),
                api.get('/candidate/credits', { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            setSavedList(listRes.data.analyses || []);
            if (creditsRes.data.success) setCreditInfo({ credits: creditsRes.data.credits, freeAnalysisUsed: creditsRes.data.freeAnalysisUsed });
        } catch (err: any) {
            // Handle 402 (insufficient credits)
            if (err?.response?.status === 402) {
                const d = err.response.data;
                setError(`Insufficient credits! You need ${d.creditsRequired} credits but have ${d.creditsAvailable}. Refer friends to earn credits.`);
            } else {
                setError(err?.response?.data?.message || err?.message || 'Failed to analyze resume');
            }
            setState('error');
        }
    }, [getToken]);

    // Load a saved analysis
    const loadSaved = async (id: string) => {
        try {
            const token = await getToken();
            const res = await api.get(`/resume/analyses/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            const data = res.data.analysis;
            setAnalysis(data.analysis);
            setFileName(data.fileName);
            setCurrentId(id);
            setState('result');
        } catch { setError('Failed to load analysis'); setState('error'); }
    };

    // Delete a saved analysis
    const deleteSaved = async (id: string) => {
        try {
            const token = await getToken();
            await api.delete(`/resume/analyses/${id}`, { headers: { Authorization: `Bearer ${token}` } });
            setSavedList(prev => prev.filter(a => a._id !== id));
            if (currentId === id) { resetAnalyzer(); }
        } catch { /* ignore */ }
    };

    const resetAnalyzer = () => { setState('idle'); setAnalysis(null); setError(''); setFileName(''); setCurrentId(null); };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'] },
        maxFiles: 1,
        multiple: false,
    });

    return (
        <div className="animate-fade-in space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
                        Resume Analyzer
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        AI-powered resume analysis for ATS optimization
                    </p>
                </div>
                {state === 'result' && (
                    <button onClick={resetAnalyzer}
                        className="bg-[#4a6cf7] hover:bg-[#4a6cf7]/90 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm">
                        <RefreshCw size={16} /> Analyze Another
                    </button>
                )}
            </div>

            <AnimatePresence mode="wait">
                {/* ─── Upload / Analyzing / Error states ─── */}
                {(state !== 'result' || !analysis) && (
                    <motion.div key="uploader" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Upload Card */}
                            <div className="lg:col-span-2">
                                <div className="bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                    <div className="p-10 text-center">
                                        {state === 'uploading' || state === 'analyzing' ? (
                                            <div className="space-y-6 py-8">
                                                <div className="relative w-20 h-20 mx-auto">
                                                    <div className="absolute inset-0 border-4 border-slate-100 dark:border-slate-800 rounded-full" />
                                                    <div className="absolute inset-0 border-4 border-[#4a6cf7] rounded-full border-t-transparent animate-spin" />
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <ScanSearch className="w-7 h-7 text-[#4a6cf7]" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Analyzing Resume...</h3>
                                                    <p className="text-slate-500 dark:text-slate-400 text-sm">Scanning for ATS keywords, formatting, and impact metrics</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div {...getRootProps()} className="cursor-pointer group py-8">
                                                <input {...getInputProps()} />
                                                <div className={`w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6 transition-all ${isDragActive
                                                    ? 'bg-[#4a6cf7] text-white scale-110'
                                                    : 'bg-[#4a6cf7]/5 text-[#4a6cf7] group-hover:bg-[#4a6cf7] group-hover:text-white group-hover:scale-110'
                                                    }`}>
                                                    <FileUp className="w-8 h-8" />
                                                </div>
                                                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                                                    {isDragActive ? 'Drop your resume here' : 'Upload your resume'}
                                                </h3>
                                                <p className="text-slate-500 dark:text-slate-400 mb-4 text-sm">
                                                    Drag and drop your PDF here, or click to browse
                                                </p>
                                                {/* Credit cost notice */}
                                                {creditInfo && (
                                                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold mb-4 ${!creditInfo.freeAnalysisUsed
                                                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                                                        : creditInfo.credits >= 10
                                                            ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20'
                                                            : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/20'
                                                        }`}>
                                                        {!creditInfo.freeAnalysisUsed
                                                            ? '✨ Your first analysis is free!'
                                                            : creditInfo.credits >= 10
                                                                ? `This will cost 10 credits (${creditInfo.credits} available)`
                                                                : `Need 10 credits — you have ${creditInfo.credits}. Refer friends to earn more!`
                                                        }
                                                    </div>
                                                )}
                                                <button className="bg-[#4a6cf7] hover:bg-[#4a6cf7]/90 text-white px-8 py-3 rounded-lg text-sm font-semibold shadow-sm transition-all">
                                                    Select PDF File
                                                </button>
                                            </div>
                                        )}

                                        {error && state === 'error' && (
                                            <div className="mt-8 p-4 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-400 flex items-center gap-2 justify-center text-sm font-medium">
                                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                                {error}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Saved Analyses List */}
                            <div className="bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
                                <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                                    <BarChart3 size={18} className="text-[#4a6cf7]" />
                                    Past Analyses
                                </h3>
                                {loadingSaved ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-[#4a6cf7]" />
                                    </div>
                                ) : savedList.length === 0 ? (
                                    <p className="text-sm text-slate-400 text-center py-8">No analyses yet. Upload your first resume!</p>
                                ) : (
                                    <div className="space-y-2">
                                        {savedList.map(s => (
                                            <div key={s._id}
                                                className="group flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                                                onClick={() => loadSaved(s._id)}>
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-9 h-9 rounded-lg bg-[#4a6cf7]/5 text-[#4a6cf7] flex items-center justify-center flex-shrink-0 group-hover:bg-[#4a6cf7] group-hover:text-white transition-colors">
                                                        <FileText size={16} />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{s.fileName}</p>
                                                        <p className="text-xs text-slate-400">{ago(s.createdAt)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-[#4a6cf7]">{s.analysis?.overallScore || '–'}</span>
                                                    <button onClick={(e) => { e.stopPropagation(); deleteSaved(s._id); }}
                                                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-all">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ─── Results Dashboard ─── */}
                {state === 'result' && analysis && (
                    <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                        {/* Top Row: Score + ATS */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Score Card */}
                            <div className="md:col-span-2 bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                                <div className="flex flex-col md:flex-row h-full">
                                    <div className="flex-1 flex flex-col items-center justify-center p-8 border-r border-slate-100 dark:border-slate-800">
                                        <ScoreGauge score={analysis.overallScore} />
                                        <div className="text-center mt-6">
                                            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                                                {analysis.overallScore >= 80 ? 'Excellent!' : analysis.overallScore >= 60 ? 'Good Start' : 'Needs Work'}
                                            </h3>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-[280px] mx-auto leading-relaxed">
                                                {analysis.overallScore >= 80
                                                    ? 'Your resume is well-optimized for ATS systems.'
                                                    : 'Focus on the critical items below to improve your score.'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="hidden md:block w-1/3 bg-gradient-to-br from-[#4a6cf7]/5 to-transparent relative overflow-hidden">
                                        <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#4a6cf7]/10 rounded-full blur-3xl" />
                                        <div className="absolute bottom-8 left-8">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">File</p>
                                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[140px]">{fileName || 'resume.pdf'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ATS Compatibility */}
                            <div className={`bg-white dark:bg-black rounded-xl border shadow-sm flex flex-col items-center justify-center text-center p-8 ${atsBg(analysis.atsCompatibility)}`}>
                                <div className="mb-5 relative">
                                    <div className="w-16 h-16 rounded-full border-4 border-current opacity-10 flex items-center justify-center">
                                        <div className="w-10 h-10 rounded-full border-4 border-current opacity-30 flex items-center justify-center">
                                            <div className={`w-4 h-4 rounded-full ${analysis.atsCompatibility === 'High' ? 'bg-emerald-500' : analysis.atsCompatibility === 'Medium' ? 'bg-amber-500' : 'bg-red-500'}`} />
                                        </div>
                                    </div>
                                </div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">ATS Compatibility</h4>
                                <h2 className={`text-3xl font-bold mb-3 ${atsColor(analysis.atsCompatibility)}`}>
                                    {analysis.atsCompatibility}
                                </h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                                    {analysis.atsCompatibilityReason || 'Review the feedback below for details.'}
                                </p>
                            </div>
                        </div>

                        {/* Summary */}
                        <div className="bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 md:p-8">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-[#4a6cf7]/5 text-[#4a6cf7] rounded-xl flex-shrink-0">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Professional Summary</h3>
                                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed italic border-l-4 border-[#4a6cf7]/30 pl-4 py-1">
                                        &ldquo;{analysis.summary}&rdquo;
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Critical Fixes & Strengths */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Critical */}
                            <div className="bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl flex items-center justify-center">
                                        <ShieldAlert className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Critical Fixes</h3>
                                </div>
                                <ul className="space-y-4">
                                    {analysis.feedback.critical.map((item, i) => (
                                        <li key={i} className="flex gap-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed group">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-2 shrink-0 group-hover:scale-150 transition-transform" />
                                            <span>
                                                <strong className="text-red-600 dark:text-red-400 block mb-0.5 text-xs uppercase tracking-wider">Issue</strong>
                                                {item}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Strengths */}
                            <div className="bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
                                        <CheckCircle2 className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Strengths</h3>
                                </div>
                                <ul className="space-y-4">
                                    {analysis.feedback.strengths.map((item, i) => (
                                        <li key={i} className="flex gap-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed group">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0 group-hover:scale-150 transition-transform" />
                                            <span>
                                                <strong className="text-emerald-600 dark:text-emerald-400 block mb-0.5 text-xs uppercase tracking-wider">Well done</strong>
                                                {item}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Score Breakdown & Keywords */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Score Breakdown */}
                            <div className="bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-8">Score Breakdown</h3>
                                <div className="space-y-8">
                                    <ScoreBar label="Impact" value={analysis.sections.impact} color="bg-[#4a6cf7]" />
                                    <ScoreBar label="Formatting" value={analysis.sections.formatting} color="bg-purple-500" />
                                    <ScoreBar label="Keywords" value={analysis.sections.keywords} color="bg-emerald-500" />
                                    <ScoreBar label="Experience" value={analysis.sections.experience} color="bg-amber-500" />
                                </div>
                            </div>

                            {/* Keywords */}
                            <div className="bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 flex flex-col">
                                <div className="flex items-center gap-2 mb-6">
                                    <Target className="w-5 h-5 text-slate-400" />
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Keyword Cloud</h3>
                                </div>
                                <div className="flex flex-wrap gap-2 mb-auto content-start">
                                    {analysis.keywords?.length ? analysis.keywords.map((kw, i) => (
                                        <span key={i}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${kwStyles[i % kwStyles.length]}`}>
                                            {kw}
                                        </span>
                                    )) : (
                                        <p className="text-slate-400 text-sm italic">No keywords found</p>
                                    )}
                                </div>
                                {analysis.missingKeywords?.length > 0 && (
                                    <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-3 font-semibold flex items-center gap-1.5">
                                            <AlertCircle size={14} className="text-red-400" />
                                            Missing Keywords
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {analysis.missingKeywords.map((kw, i) => (
                                                <span key={i}
                                                    className="text-red-500 dark:text-red-400 font-medium text-xs underline decoration-red-200 dark:decoration-red-500/30 underline-offset-4 hover:decoration-red-500 transition-all cursor-help"
                                                    title="Recommended to add this skill">
                                                    {kw}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Suggestions */}
                        {analysis.feedback.suggestions?.length > 0 && (
                            <div className="bg-white dark:bg-black rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-8">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-10 h-10 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center">
                                        <Sparkles className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Suggestions</h3>
                                </div>
                                <ul className="space-y-4">
                                    {analysis.feedback.suggestions.map((item, i) => (
                                        <li key={i} className="flex gap-3 text-sm text-slate-600 dark:text-slate-300 leading-relaxed group">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0 group-hover:scale-150 transition-transform" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Career Insights Banner */}
                        <div className="bg-[#4a6cf7] rounded-xl text-white shadow-lg relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                <Briefcase size={120} />
                            </div>
                            <div className="relative z-10 p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
                                <div className="w-14 h-14 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center shrink-0 border border-white/10">
                                    <Zap className="w-7 h-7" />
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <h3 className="text-lg font-bold mb-1">AI Career Insights</h3>
                                    <p className="text-blue-100 text-sm leading-relaxed max-w-2xl">
                                        Based on your profile, you are a strong candidate for{' '}
                                        <span className="text-white font-bold">{analysis.careerPath?.role || 'Software Engineer'}</span> roles.
                                        {analysis.careerPath?.reason && ` ${analysis.careerPath.reason}`}
                                    </p>
                                </div>
                            </div>
                        </div>

                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
