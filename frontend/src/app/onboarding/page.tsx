"use client";

import { useState, useEffect } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

import { Building2, Briefcase, ArrowRight, Loader2, X, Plus, XCircle, Upload, Link2, FileUp, CheckCircle2 } from "lucide-react";
import { Alert, AlertTitle, AlertDescription, AlertIcon } from "@/components/ui/alert";

type UserType = "candidate" | "company" | null;

interface CandidateFormData {
    firstName: string;
    lastName: string;
    phone: string;
    location: string;
    skills: string[];
    experience: string;

    resumeUrl: string;
    linkedIn: string;
    portfolio: string;
    desiredRole: string;
    expectedSalary: string;
    jobType: string;
}

interface CompanyFormData {
    companyName: string;
    industry: string;
    size: string;
    website: string;
    description: string;
    location: string;
    contactName: string;
    contactDesignation: string;
    contactPhone: string;
    documentType: string;
    documentNumber: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5500";

export default function OnboardingPage() {
    const { user, isLoaded } = useUser();
    const { getToken } = useAuth();
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [userType, setUserType] = useState<UserType>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isChecking, setIsChecking] = useState(true);
    const [skillInput, setSkillInput] = useState("");
    const [otherIndustry, setOtherIndustry] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [resumeUploadMode, setResumeUploadMode] = useState<'link' | 'file'>('link');
    const [isUploadingResume, setIsUploadingResume] = useState(false);

    const [error, setError] = useState<string | null>(null);
    const [candidateData, setCandidateData] = useState<CandidateFormData>({
        firstName: "",
        lastName: "",
        phone: "",
        location: "",
        skills: [],
        experience: "fresher",

        resumeUrl: "",
        linkedIn: "",
        portfolio: "",
        desiredRole: "",
        expectedSalary: "",
        jobType: "full-time",
    });

    const [companyData, setCompanyData] = useState<CompanyFormData>({
        companyName: "",
        industry: "",
        size: "",
        website: "",
        description: "",
        location: "",
        contactName: "",
        contactDesignation: "",
        contactPhone: "",
        documentType: "",
        documentNumber: ""
    });


    // Check if user already exists on mount
    useEffect(() => {
        const checkExistingUser = async () => {
            if (!isLoaded || !user) return;

            try {
                const token = await getToken();
                const response = await fetch(`${API_BASE_URL}/onboarding/check`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                const data = await response.json();

                if (data.exists && data.redirectUrl) {
                    router.push(data.redirectUrl);
                    return;
                }

                // Pre-fill name from Clerk
                if (user.firstName) {
                    setCandidateData(prev => ({ ...prev, firstName: user.firstName || "" }));
                }
                if (user.lastName) {
                    setCandidateData(prev => ({ ...prev, lastName: user.lastName || "" }));
                }
            } catch (error) {
                console.error("Error checking user:", error);
            } finally {
                setIsChecking(false);
            }
        };

        checkExistingUser();
    }, [isLoaded, user, getToken, router]);

    const handleTypeSelect = (type: UserType) => {
        setUserType(type);
        setStep(2);
    };

    const handleCandidateChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setCandidateData((prev) => ({ ...prev, [name]: value }));
    };

    const handleCompanyChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;
        setCompanyData((prev) => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const addSkill = () => {
        if (skillInput.trim() && !candidateData.skills.includes(skillInput.trim())) {
            setCandidateData(prev => ({
                ...prev,
                skills: [...prev.skills, skillInput.trim()]
            }));
            setSkillInput("");
        }
    };

    const removeSkill = (skillToRemove: string) => {
        setCandidateData(prev => ({
            ...prev,
            skills: prev.skills.filter(skill => skill !== skillToRemove)
        }));
    };

    const handleCandidateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const token = await getToken();

            // Read referral code from localStorage (captured on signup page)
            const storedRefCode = typeof window !== "undefined"
                ? localStorage.getItem("skillup_referral_code")
                : null;

            const response = await fetch(`${API_BASE_URL}/onboarding/candidate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...candidateData,
                    email: user?.primaryEmailAddress?.emailAddress,
                    jobPreferences: {
                        desiredRole: candidateData.desiredRole,
                        expectedSalary: candidateData.expectedSalary,
                        jobType: candidateData.jobType,
                    },
                    // Include referral code if present
                    ...(storedRefCode && { referralCode: storedRefCode }),
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // Clear referral code after successful onboarding
                if (typeof window !== "undefined") {
                    localStorage.removeItem("skillup_referral_code");
                }
                router.push(data.redirectUrl || "/candidate/learning-roadmap");
            } else {
                console.error("Error:", data.message);
                alert(data.message || "Failed to create profile");
            }
        } catch (error) {
            console.error("Submit error:", error);
            alert("Failed to create profile. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };



    const DOCUMENT_PATTERNS: Record<string, RegExp> = {
        pan: /^[A-Z]{3}[PCHFATBLJG]{1}[A-Z]{1}[0-9]{4}[A-Z]{1}$/,
        gst: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    };

    const validateDocumentNumber = (type: string, number: string): boolean => {
        const pattern = DOCUMENT_PATTERNS[type];
        if (!pattern) return true;
        return pattern.test(number.toUpperCase());
    };

    const getDocumentHint = (type: string): string => {
        if (type === 'pan') return 'Format: ABCPD1234E (10 characters)';
        if (type === 'gst') return 'Format: 22AAAAA0000A1Z5 (15 characters)';
        return '';
    };

    const handleCompanySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        // Validate document number
        if (companyData.documentType && companyData.documentNumber) {
            if (!validateDocumentNumber(companyData.documentType, companyData.documentNumber)) {
                const docLabel = companyData.documentType === 'pan' ? 'PAN' : 'GST';
                setError(`Invalid ${docLabel} number format. Please check and try again.`);
                setIsSubmitting(false);
                return;
            }
        }

        try {
            const token = await getToken();

            const formData = new FormData();
            formData.append('companyName', companyData.companyName);
            formData.append('industry', companyData.industry === 'other' ? otherIndustry : companyData.industry);
            formData.append('size', companyData.size);
            formData.append('website', companyData.website);
            formData.append('description', companyData.description);
            formData.append('location', companyData.location);
            formData.append('email', user?.primaryEmailAddress?.emailAddress || '');

            formData.append('contactPerson[name]', companyData.contactName);
            formData.append('contactPerson[designation]', companyData.contactDesignation);
            formData.append('contactPerson[phone]', companyData.contactPhone);

            formData.append('documentType', companyData.documentType);
            formData.append('documentNumber', companyData.documentNumber);

            if (file) {
                formData.append('document', file);
            }

            const response = await fetch(`${API_BASE_URL}/onboarding/company`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            const data = await response.json();

            if (response.ok) {
                router.push(data.redirectUrl || "/company/dashboard");
            } else {
                console.error("Error:", data.message);
                setError(data.message || "Failed to create company profile");
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (error) {
            console.error("Submit error:", error);
            setError("Failed to create profile. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isLoaded || isChecking) {
        return (
            <div className="min-h-screen bg-white dark:bg-neutral-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    const inputStyles = "w-full px-4 py-3 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-lg text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent";
    const labelStyles = "block text-sm font-medium text-neutral-900 dark:text-white mb-2";

    return (
        <div className="min-h-screen bg-white dark:bg-neutral-950">
            <div className="pt-12 pb-12 px-4">
                <div className="max-w-2xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-3">
                            {step === 1
                                ? "Welcome to SkillUp!"
                                : userType === "company"
                                    ? "Tell us about your company"
                                    : "Complete your profile"}
                        </h1>
                        <p className="text-neutral-500 dark:text-neutral-400">
                            {step === 1
                                ? "Let's get you set up. What brings you here today?"
                                : userType === "company"
                                    ? "Help candidates learn more about your organization."
                                    : "Help us match you with the perfect opportunities."}
                        </p>
                    </div>

                    {/* Step 1: User Type Selection */}
                    {step === 1 && (
                        <div className="grid md:grid-cols-2 gap-6 max-w-lg mx-auto">
                            {/* Job Seeker Card */}
                            <button
                                onClick={() => handleTypeSelect("candidate")}
                                className="group p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 hover:border-orange-500/50 transition-all duration-300 text-left"
                            >
                                <div className="w-14 h-14 rounded-xl bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center mb-6 group-hover:bg-orange-200 dark:group-hover:bg-orange-500/20 transition-colors">
                                    <Briefcase className="w-7 h-7 text-orange-500" />
                                </div>
                                <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                                    I'm looking for a job
                                </h3>
                                <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                                    Search for opportunities and connect with top companies.
                                </p>
                            </button>

                            {/* Company Card */}
                            <button
                                onClick={() => handleTypeSelect("company")}
                                className="group p-6 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 hover:border-orange-500/50 transition-all duration-300 text-left"
                            >
                                <div className="w-14 h-14 rounded-xl bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center mb-6 group-hover:bg-orange-200 dark:group-hover:bg-orange-500/20 transition-colors">
                                    <Building2 className="w-7 h-7 text-orange-500" />
                                </div>
                                <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">
                                    I'm hiring for my company
                                </h3>
                                <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                                    Post jobs and find the best talent for your team.
                                </p>
                            </button>
                        </div>
                    )}


                    {/* Step 2: Candidate Form */}
                    {step === 2 && userType === "candidate" && (
                        <form
                            onSubmit={handleCandidateSubmit}
                            className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 space-y-6"
                        >
                            {/* Name Fields */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="firstName" className={labelStyles}>
                                        First Name *
                                    </label>
                                    <input
                                        type="text"
                                        id="firstName"
                                        name="firstName"
                                        required
                                        value={candidateData.firstName}
                                        onChange={handleCandidateChange}
                                        className={inputStyles}
                                        placeholder="John"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="lastName" className={labelStyles}>
                                        Last Name *
                                    </label>
                                    <input
                                        type="text"
                                        id="lastName"
                                        name="lastName"
                                        required
                                        value={candidateData.lastName}
                                        onChange={handleCandidateChange}
                                        className={inputStyles}
                                        placeholder="Doe"
                                    />
                                </div>
                            </div>

                            {/* Contact Fields */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="phone" className={labelStyles}>
                                        Phone Number *
                                    </label>
                                    <input
                                        type="tel"
                                        id="phone"
                                        name="phone"
                                        required
                                        value={candidateData.phone}
                                        onChange={handleCandidateChange}
                                        className={inputStyles}
                                        placeholder="+91 98765 43210"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="location" className={labelStyles}>
                                        Location *
                                    </label>
                                    <input
                                        type="text"
                                        id="location"
                                        name="location"
                                        required
                                        value={candidateData.location}
                                        onChange={handleCandidateChange}
                                        className={inputStyles}
                                        placeholder="Mumbai, India"
                                    />
                                </div>
                            </div>

                            {/* Experience */}
                            <div>
                                <label htmlFor="experience" className={labelStyles}>
                                    Experience Level *
                                </label>
                                <select
                                    id="experience"
                                    name="experience"
                                    required
                                    value={candidateData.experience}
                                    onChange={handleCandidateChange}
                                    className={inputStyles}
                                >
                                    <option value="fresher">Fresher</option>
                                    <option value="0-1">0-1 years</option>
                                    <option value="1-3">1-3 years</option>
                                    <option value="3-5">3-5 years</option>
                                    <option value="5-10">5-10 years</option>
                                    <option value="10+">10+ years</option>
                                </select>
                            </div>                            {/* Skills */}
                            <div>
                                <label className={labelStyles}>Skills *</label>
                                <div className="flex gap-2 mb-2">
                                    <input
                                        type="text"
                                        value={skillInput}
                                        onChange={(e) => setSkillInput(e.target.value)}
                                        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                                        className={inputStyles}
                                        placeholder="Type a skill and press Enter"
                                    />
                                    <button
                                        type="button"
                                        onClick={addSkill}
                                        className="px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors flex items-center gap-1.5 font-medium text-sm whitespace-nowrap"
                                    >
                                        Add <Plus className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-2">Press Enter or click Add + to add a skill</p>
                                <div className="flex flex-wrap gap-2">
                                    {candidateData.skills.map((skill) => (
                                        <span
                                            key={skill}
                                            className="px-3 py-1 bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-full text-sm flex items-center gap-2"
                                        >
                                            {skill}
                                            <button
                                                type="button"
                                                onClick={() => removeSkill(skill)}
                                                className="text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Resume Upload */}
                            <div>
                                <label className={labelStyles}>Resume</label>
                                {/* Tab Switcher */}
                                <div className="flex gap-1 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-lg mb-3 w-fit">
                                    <button
                                        type="button"
                                        onClick={() => setResumeUploadMode('link')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${resumeUploadMode === 'link'
                                            ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm'
                                            : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                                            }`}
                                    >
                                        <Link2 className="w-3.5 h-3.5" />
                                        Paste Link
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setResumeUploadMode('file')}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${resumeUploadMode === 'file'
                                            ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-sm'
                                            : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300'
                                            }`}
                                    >
                                        <FileUp className="w-3.5 h-3.5" />
                                        Upload File
                                    </button>
                                </div>

                                {resumeUploadMode === 'link' ? (
                                    <div>
                                        <input
                                            type="url"
                                            id="resumeUrl"
                                            name="resumeUrl"
                                            value={candidateData.resumeUrl}
                                            onChange={handleCandidateChange}
                                            className={inputStyles}
                                            placeholder="https://drive.google.com/your-resume"
                                        />
                                        <p className="text-neutral-400 dark:text-neutral-500 text-xs mt-1">
                                            Link to your resume on Google Drive, Dropbox, etc.
                                        </p>
                                    </div>
                                ) : (
                                    <div>
                                        {candidateData.resumeUrl && resumeUploadMode === 'file' ? (
                                            <div className="flex flex-col items-center gap-3 p-6 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-lg">
                                                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center animate-[scale-in_0.3s_ease-out]">
                                                    <CheckCircle2 className="w-7 h-7 text-green-500" />
                                                </div>
                                                <p className="text-sm font-medium text-green-700 dark:text-green-400">Resume uploaded successfully!</p>
                                                <button
                                                    type="button"
                                                    onClick={() => setCandidateData(prev => ({ ...prev, resumeUrl: '' }))}
                                                    className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 underline"
                                                >
                                                    Remove & re-upload
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="relative">
                                                <input
                                                    type="file"
                                                    id="resume-file-upload"
                                                    className="hidden"
                                                    accept=".pdf"
                                                    disabled={isUploadingResume}
                                                    onChange={async (e) => {
                                                        const selectedFile = e.target.files?.[0];
                                                        if (!selectedFile) return;
                                                        setIsUploadingResume(true);
                                                        try {
                                                            const token = await getToken();
                                                            const formData = new FormData();
                                                            formData.append('resume', selectedFile);
                                                            const response = await fetch(`${API_BASE_URL}/onboarding/upload/resume`, {
                                                                method: 'POST',
                                                                headers: { Authorization: `Bearer ${token}` },
                                                                body: formData,
                                                            });
                                                            const data = await response.json();
                                                            if (data.success && data.url) {
                                                                setCandidateData(prev => ({ ...prev, resumeUrl: data.url }));
                                                            } else {
                                                                alert(data.message || 'Upload failed');
                                                            }
                                                        } catch (err) {
                                                            console.error('Resume upload error:', err);
                                                            alert('Failed to upload resume. Please try again.');
                                                        } finally {
                                                            setIsUploadingResume(false);
                                                        }
                                                    }}
                                                />
                                                <button
                                                    type="button"
                                                    disabled={isUploadingResume}
                                                    onClick={() => document.getElementById('resume-file-upload')?.click()}
                                                    className="w-full flex flex-col items-center gap-2 p-6 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg hover:border-orange-500 dark:hover:border-orange-500 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {isUploadingResume ? (
                                                        <>
                                                            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                                                            <span className="text-sm text-neutral-500 dark:text-neutral-400">Uploading...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Upload className="w-6 h-6 text-neutral-400 dark:text-neutral-500" />
                                                            <span className="text-sm text-neutral-600 dark:text-neutral-400">Click to upload your resume</span>
                                                            <span className="text-xs text-neutral-400 dark:text-neutral-500">PDF format — Max 5MB</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Social Links */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="linkedIn" className={labelStyles}>
                                        LinkedIn Profile
                                    </label>
                                    <input
                                        type="url"
                                        id="linkedIn"
                                        name="linkedIn"
                                        value={candidateData.linkedIn}
                                        onChange={handleCandidateChange}
                                        className={inputStyles}
                                        placeholder="https://linkedin.com/in/yourprofile"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="portfolio" className={labelStyles}>
                                        Portfolio/GitHub
                                    </label>
                                    <input
                                        type="url"
                                        id="portfolio"
                                        name="portfolio"
                                        value={candidateData.portfolio}
                                        onChange={handleCandidateChange}
                                        className={inputStyles}
                                        placeholder="https://github.com/yourusername"
                                    />
                                </div>
                            </div>

                            {/* Job Preferences */}
                            <div className="border-t border-neutral-200 dark:border-neutral-800 pt-6">
                                <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-4">Job Preferences</h3>
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div>
                                        <label htmlFor="desiredRole" className={labelStyles}>
                                            Desired Role
                                        </label>
                                        <input
                                            type="text"
                                            id="desiredRole"
                                            name="desiredRole"
                                            value={candidateData.desiredRole}
                                            onChange={handleCandidateChange}
                                            className={inputStyles}
                                            placeholder="Software Engineer"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="expectedSalary" className={labelStyles}>
                                            Expected Salary
                                        </label>
                                        <input
                                            type="text"
                                            id="expectedSalary"
                                            name="expectedSalary"
                                            value={candidateData.expectedSalary}
                                            onChange={handleCandidateChange}
                                            className={inputStyles}
                                            placeholder="10-15 LPA"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="jobType" className={labelStyles}>
                                            Job Type
                                        </label>
                                        <select
                                            id="jobType"
                                            name="jobType"
                                            value={candidateData.jobType}
                                            onChange={handleCandidateChange}
                                            className={inputStyles}
                                        >
                                            <option value="full-time">Full-time</option>
                                            <option value="part-time">Part-time</option>
                                            <option value="contract">Contract</option>
                                            <option value="internship">Internship</option>
                                            <option value="remote">Remote</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isSubmitting || candidateData.skills.length === 0}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-white font-medium rounded-lg transition-colors cursor-pointer"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Creating Profile...
                                    </>
                                ) : (
                                    <>
                                        Complete Profile
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>

                            {/* Back Button */}
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="w-full text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white text-sm transition-colors"
                            >
                                ← Go back
                            </button>
                        </form>
                    )}

                    {/* Step 2: Company Form */}
                    {step === 2 && userType === "company" && (
                        <form
                            onSubmit={handleCompanySubmit}
                            className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 space-y-6"
                        >
                            {error && (
                                <Alert variant="destructive">
                                    <AlertIcon>
                                        <XCircle className="h-5 w-5" />
                                    </AlertIcon>
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}
                            {/* Company Name */}
                            {/* Company Name */}
                            <div>
                                <label htmlFor="companyName" className={labelStyles}>
                                    Company Name *
                                </label>
                                <input
                                    type="text"
                                    id="companyName"
                                    name="companyName"
                                    required
                                    value={companyData.companyName}
                                    onChange={handleCompanyChange}
                                    className={inputStyles}
                                    placeholder="e.g. Acme Inc."
                                />
                            </div>

                            {/* Industry & Size */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="industry" className={labelStyles}>
                                        Industry *
                                    </label>
                                    <select
                                        id="industry"
                                        name="industry"
                                        required
                                        value={companyData.industry}
                                        onChange={handleCompanyChange}
                                        className={inputStyles}
                                    >
                                        <option value="">Select an industry</option>
                                        <option value="technology">Technology</option>
                                        <option value="healthcare">Healthcare</option>
                                        <option value="finance">Finance & Banking</option>
                                        <option value="education">Education</option>
                                        <option value="retail">Retail & E-commerce</option>
                                        <option value="manufacturing">Manufacturing</option>
                                        <option value="consulting">Consulting</option>
                                        <option value="media">Media & Entertainment</option>
                                        <option value="other">Other</option>
                                    </select>
                                    {companyData.industry === 'other' && (
                                        <input
                                            type="text"
                                            value={otherIndustry}
                                            onChange={(e) => setOtherIndustry(e.target.value)}
                                            placeholder="Enter your industry"
                                            className={`mt-2 ${inputStyles}`}
                                            required
                                        />
                                    )}
                                </div>
                                <div>
                                    <label htmlFor="size" className={labelStyles}>
                                        Company Size *
                                    </label>
                                    <select
                                        id="size"
                                        name="size"
                                        required
                                        value={companyData.size}
                                        onChange={handleCompanyChange}
                                        className={inputStyles}
                                    >
                                        <option value="">Select company size</option>
                                        <option value="1-10">1-10 employees</option>
                                        <option value="11-50">11-50 employees</option>
                                        <option value="51-200">51-200 employees</option>
                                        <option value="201-500">201-500 employees</option>
                                        <option value="501-1000">501-1000 employees</option>
                                        <option value="1000+">1000+ employees</option>
                                    </select>
                                </div>
                            </div>

                            {/* Website & Location */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="website" className={labelStyles}>
                                        Website
                                    </label>
                                    <input
                                        type="url"
                                        id="website"
                                        name="website"
                                        value={companyData.website}
                                        onChange={handleCompanyChange}
                                        className={inputStyles}
                                        placeholder="https://www.example.com"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="location" className={labelStyles}>
                                        Headquarters Location *
                                    </label>
                                    <input
                                        type="text"
                                        id="location"
                                        name="location"
                                        required
                                        value={companyData.location}
                                        onChange={handleCompanyChange}
                                        className={inputStyles}
                                        placeholder="Mumbai, India"
                                    />
                                </div>
                            </div>

                            {/* Contact Person */}
                            <div className="border-t border-neutral-200 dark:border-neutral-800 pt-6">
                                <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-4">Contact Person</h3>
                                <div className="grid md:grid-cols-3 gap-4">
                                    <div className="md:col-span-1">
                                        <label htmlFor="contactName" className={labelStyles}>
                                            Full Name *
                                        </label>
                                        <input
                                            type="text"
                                            id="contactName"
                                            name="contactName"
                                            required
                                            value={companyData.contactName}
                                            onChange={handleCompanyChange}
                                            className={inputStyles}
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label htmlFor="contactDesignation" className={labelStyles}>
                                            Designation *
                                        </label>
                                        <input
                                            type="text"
                                            id="contactDesignation"
                                            name="contactDesignation"
                                            required
                                            value={companyData.contactDesignation}
                                            onChange={handleCompanyChange}
                                            className={inputStyles}
                                            placeholder="HR Manager"
                                        />
                                    </div>
                                    <div className="md:col-span-1">
                                        <label htmlFor="contactPhone" className={labelStyles}>
                                            Phone Number *
                                        </label>
                                        <input
                                            type="tel"
                                            id="contactPhone"
                                            name="contactPhone"
                                            required
                                            value={companyData.contactPhone}
                                            onChange={handleCompanyChange}
                                            className={inputStyles}
                                            placeholder="+91 98765 43210"
                                        />
                                    </div>
                                </div>
                            </div>


                            {/* Verification Document */}
                            <div className="border-t border-neutral-200 dark:border-neutral-800 pt-6">
                                <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-4">Verification Document</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div className="md:col-span-1">
                                        <label htmlFor="documentType" className={labelStyles}>
                                            Document Type *
                                        </label>
                                        <select
                                            id="documentType"
                                            name="documentType"
                                            required
                                            value={companyData.documentType}
                                            onChange={handleCompanyChange}
                                            className={inputStyles}
                                        >
                                            <option value="">Select Document Type</option>
                                            <option value="gst">GST Number</option>
                                            <option value="pan">PAN Card</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-1">
                                        <label htmlFor="documentNumber" className={labelStyles}>
                                            Document Number *
                                        </label>
                                        <input
                                            type="text"
                                            id="documentNumber"
                                            name="documentNumber"
                                            required
                                            value={companyData.documentNumber}
                                            onChange={(e) => {
                                                const uppercased = e.target.value.toUpperCase();
                                                handleCompanyChange({
                                                    ...e,
                                                    target: { ...e.target, name: 'documentNumber', value: uppercased }
                                                } as React.ChangeEvent<HTMLInputElement>);
                                            }}
                                            className={`${inputStyles} ${companyData.documentType && companyData.documentNumber && !validateDocumentNumber(companyData.documentType, companyData.documentNumber) ? 'border-red-500 dark:border-red-500 focus:border-red-500' : companyData.documentType && companyData.documentNumber && validateDocumentNumber(companyData.documentType, companyData.documentNumber) ? 'border-green-500 dark:border-green-500 focus:border-green-500' : ''}`}
                                            placeholder={companyData.documentType === 'pan' ? 'ABCPD1234E' : companyData.documentType === 'gst' ? '22AAAAA0000A1Z5' : 'Select document type first'}
                                            maxLength={companyData.documentType === 'pan' ? 10 : companyData.documentType === 'gst' ? 15 : 20}
                                        />
                                        {companyData.documentType && (
                                            <div className="mt-1.5 flex items-center gap-1.5">
                                                {companyData.documentNumber ? (
                                                    validateDocumentNumber(companyData.documentType, companyData.documentNumber) ? (
                                                        <span className="text-xs text-green-500 font-medium">✓ Valid {companyData.documentType.toUpperCase()} format</span>
                                                    ) : (
                                                        <span className="text-xs text-red-500 font-medium">✗ Invalid format — {getDocumentHint(companyData.documentType)}</span>
                                                    )
                                                ) : (
                                                    <span className="text-xs text-neutral-400 dark:text-neutral-500">{getDocumentHint(companyData.documentType)}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className={labelStyles}>Upload Document Image</label>
                                        <div className="flex items-center gap-4">
                                            <button
                                                type="button"
                                                onClick={() => document.getElementById('file-upload')?.click()}
                                                className="flex items-center gap-2 px-4 py-3 bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 rounded-lg text-neutral-900 dark:text-white hover:border-orange-500 transition-colors"
                                            >
                                                <Upload className="w-5 h-5 text-orange-500" />
                                                {file ? 'Change File' : 'Select File'}
                                            </button>
                                            {file && <span className="text-sm text-neutral-500 dark:text-neutral-400">{file.name}</span>}
                                            <input
                                                id="file-upload"
                                                type="file"
                                                className="hidden"
                                                onChange={handleFileChange}
                                                accept="image/*,application/pdf"
                                            />
                                        </div>
                                        <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2">Accepts Images and PDFs. Max 5MB.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={isSubmitting || !companyData.companyName || !companyData.industry || !companyData.size || !companyData.location || !companyData.contactName || !companyData.contactDesignation || !companyData.contactPhone || !companyData.documentType || !companyData.documentNumber || !file}
                                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-500/50 text-white font-medium rounded-lg transition-colors cursor-pointer"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Creating Profile...
                                    </>
                                ) : (
                                    <>
                                        Complete Profile
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>

                            {/* Back Button */}
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="w-full text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white text-sm transition-colors"
                            >
                                ← Go back
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
