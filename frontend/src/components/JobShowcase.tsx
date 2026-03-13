"use client";

import { useEffect, useState } from "react";
import {
    MapPin,
    Building2,
    Briefcase,
    ArrowRight,
    Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { CardStack, CardStackItem } from "@/components/ui/card-stack";

interface CompanyInfo {
    companyName?: string;
    location?: string;
    logo?: string;
    industry?: string;
}

interface Job {
    _id: string;
    title: string;
    description: string;
    requirements: string[];
    salary: { min: number; max: number; currency: string };
    location: string;
    type: string;
    experience: string;
    skills: string[];
    status: string;
    createdAt: string;
    companyInfo?: CompanyInfo;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5500/api";

const typeConfig: Record<string, { label: string; color: string; bg: string }> = {
    "full-time": { label: "Full-time", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/60 dark:border-emerald-500/20" },
    "part-time": { label: "Part-time", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10 border-blue-200/60 dark:border-blue-500/20" },
    "contract": { label: "Contract", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-200/60 dark:border-amber-500/20" },
    "remote": { label: "Remote", color: "text-violet-700 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-500/10 border-violet-200/60 dark:border-violet-500/20" },
    "internship": { label: "Internship", color: "text-pink-700 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-500/10 border-pink-200/60 dark:border-pink-500/20" },
};

interface JobCardStackItem extends CardStackItem {
    job: Job;
}

function JobCardRenderer(item: JobCardStackItem, { active }: { active: boolean }) {
    const { job } = item;
    const company = job.companyInfo;
    const tc = typeConfig[job.type] || typeConfig["full-time"];
    const loc = company?.location || job.location || "Remote";

    return (
        <div className={cn(
            "h-full w-full flex flex-col p-3 sm:p-5 bg-white dark:bg-neutral-900 overflow-hidden",
        )}>
            {/* Header: Company avatar + info + badge */}
            <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3 flex-shrink-0">
                {/* Company Avatar */}
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-500/15 dark:to-amber-500/15 flex items-center justify-center flex-shrink-0 text-xs sm:text-sm font-bold text-orange-600 dark:text-orange-400">
                    {company?.companyName?.charAt(0)?.toUpperCase() || (
                        <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs sm:text-sm text-neutral-900 dark:text-white truncate">
                        {company?.companyName || "Company"}
                    </p>
                    <div className="flex items-center gap-1 sm:gap-1.5 text-neutral-500 dark:text-neutral-400 text-[10px] sm:text-xs mt-0.5">
                        <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" />
                        <span className="truncate">{loc}</span>
                    </div>
                </div>
                {/* Job Type Badge */}
                <span
                    className={cn(
                        "px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[8px] sm:text-[10px] font-bold uppercase tracking-wider border flex-shrink-0",
                        tc.bg,
                        tc.color
                    )}
                >
                    {tc.label}
                </span>
            </div>

            {/* Job Title — fixed height, truncated */}
            <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-white leading-snug truncate flex-shrink-0 mb-1.5 sm:mb-2">
                {job.title}
            </h3>

            {/* Description — fixed 2 lines with ellipsis */}
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed line-clamp-2 flex-shrink-0 mb-2 sm:mb-3">
                {job.description || "No description available..."}
            </p>

            {/* Skills — fixed area, overflow hidden */}
            <div className="flex-1 min-h-0 overflow-hidden">
                {job.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1 sm:gap-1.5">
                        {job.skills.slice(0, 3).map((skill) => (
                            <span
                                key={skill}
                                className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 text-[10px] sm:text-xs font-medium truncate max-w-[100px] sm:max-w-[140px]"
                            >
                                {skill}
                            </span>
                        ))}
                        {job.skills.length > 3 && (
                            <span className="px-1.5 py-0.5 text-[10px] sm:text-xs text-neutral-400 dark:text-neutral-500 font-medium">
                                +{job.skills.length - 3} more...
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function JobShowcase() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [cardSize, setCardSize] = useState({ w: 460, h: 260, overlap: 0.5, spread: 40 });

    useEffect(() => {
        const updateSize = () => {
            const width = window.innerWidth;
            if (width < 480) {
                setCardSize({ w: Math.min(300, width - 60), h: 220, overlap: 0.6, spread: 25 });
            } else if (width < 768) {
                setCardSize({ w: 360, h: 240, overlap: 0.55, spread: 32 });
            } else {
                setCardSize({ w: 460, h: 260, overlap: 0.5, spread: 40 });
            }
        };
        updateSize();
        window.addEventListener("resize", updateSize);
        return () => window.removeEventListener("resize", updateSize);
    }, []);

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/jobs/public`);
                const data = await response.json();
                if (data.success) {
                    let fetchedJobs = data.jobs || [];
                    // Ensure odd number of jobs
                    if (fetchedJobs.length % 2 === 0) {
                        fetchedJobs = fetchedJobs.slice(0, -1);
                    }
                    setJobs(fetchedJobs);
                }
            } catch (error) {
                console.error("Error fetching public jobs:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchJobs();
    }, []);

    // Don't render the section if there are no jobs and not loading
    if (!loading && jobs.length === 0) return null;

    // Convert jobs to CardStack items
    const cardItems: JobCardStackItem[] = jobs.map((job) => ({
        id: job._id,
        title: job.title,
        description: job.description,
        job,
    }));

    return (
        <section className="py-20 px-4 sm:px-6 bg-neutral-50 dark:bg-neutral-950 overflow-hidden">
            <div className="max-w-7xl mx-auto">
                {/* Section Header */}
                <div className="text-center mb-10">
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-900 via-neutral-700 to-neutral-800 dark:from-white dark:via-neutral-200 dark:to-neutral-500 mb-4 tracking-tight">
                        Latest Opportunities
                    </h2>
                    <p className="text-neutral-600 dark:text-neutral-400 text-base sm:text-lg max-w-2xl mx-auto">
                        Explore jobs posted by top companies on SkillUp
                    </p>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-3" />
                        <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                            Loading opportunities...
                        </p>
                    </div>
                )}

                {/* CardStack */}
                {!loading && jobs.length > 0 && (
                    <>
                        <div className="mx-auto w-full max-w-5xl">
                            <CardStack
                                items={cardItems}
                                initialIndex={0}
                                autoAdvance
                                intervalMs={2000}
                                springStiffness={180}
                                springDamping={22}
                                pauseOnHover
                                showDots
                                cardWidth={cardSize.w}
                                cardHeight={cardSize.h}
                                overlap={cardSize.overlap}
                                spreadDeg={cardSize.spread}
                                renderCard={JobCardRenderer}
                            />
                        </div>

                        {/* View All CTA */}
                        <div className="text-center mt-8">
                            <SignedOut>
                                <Link
                                    href="/signup"
                                    className={cn(
                                        "inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-semibold",
                                        "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900",
                                        "hover:bg-neutral-800 dark:hover:bg-neutral-100",
                                        "transition-all duration-300",
                                        "shadow-lg shadow-neutral-900/10 dark:shadow-white/10"
                                    )}
                                >
                                    View All Jobs
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </SignedOut>
                            <SignedIn>
                                <Link
                                    href="/candidate/jobs"
                                    className={cn(
                                        "inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-sm font-semibold",
                                        "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900",
                                        "hover:bg-neutral-800 dark:hover:bg-neutral-100",
                                        "transition-all duration-300",
                                        "shadow-lg shadow-neutral-900/10 dark:shadow-white/10"
                                    )}
                                >
                                    View All Jobs
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </SignedIn>
                        </div>
                    </>
                )}
            </div>
        </section>
    );
}
