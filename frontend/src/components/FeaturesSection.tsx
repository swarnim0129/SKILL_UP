"use client";

import { useEffect, useState } from "react";
import { BentoCard, BentoGrid } from "@/components/ui/bento-grid";
import {
    Building2,
    Users,
    Briefcase,
    Mic,
    FileText,
} from "lucide-react";
import { useUser, useAuth } from "@clerk/nextjs";
import Image from "next/image";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5500/api";

type UserRole = "candidate" | "company" | null;

/** Background image with gradient overlay + subtle animation on hover */
function FeatureBg({ src, alt }: { src: string; alt: string }) {
    return (
        <div className="absolute inset-0 overflow-hidden">
            <Image
                src={src}
                alt={alt}
                fill
                className="object-cover opacity-45 dark:opacity-35 saturate-[0.6] dark:saturate-[0.5] scale-105 transition-all duration-700 group-hover:scale-110 group-hover:opacity-55 dark:group-hover:opacity-45 group-hover:saturate-[0.8] dark:group-hover:saturate-[0.7]"
                sizes="(max-width: 768px) 100vw, 33vw"
                priority={false}
            />
            {/* Bottom gradient for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/60 to-transparent dark:from-black dark:via-black/60 dark:to-transparent" />
            {/* Subtle top-left accent glow */}
            <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-gradient-to-br from-blue-500/10 to-violet-500/10 dark:from-blue-500/5 dark:to-violet-500/5 blur-3xl opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        </div>
    );
}

export default function FeaturesSection() {
    const { isSignedIn, user } = useUser();
    const { getToken } = useAuth();
    const [userRole, setUserRole] = useState<UserRole>(null);

    useEffect(() => {
        const checkRole = async () => {
            if (!isSignedIn || !user) return;
            try {
                const token = await getToken();
                const response = await fetch(`${API_BASE_URL}/onboarding/check`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await response.json();
                if (data.exists && data.role) {
                    setUserRole(data.role as UserRole);
                }
            } catch (error) {
                console.error("Error checking role:", error);
            }
        };
        checkRole();
    }, [isSignedIn, user, getToken]);

    const getHref = (candidateRoute: string, companyRoute: string) => {
        if (!isSignedIn) return "/signup";
        if (userRole === "company") return companyRoute;
        if (userRole === "candidate") return candidateRoute;
        return "/onboarding";
    };

    const features = [
        {
            Icon: Users,
            name: "For Job Seekers",
            description: "Browse thousands of jobs, one-click applications, track application status, and get matched with your dream job.",
            href: getHref("/candidate/jobs", "/company/dashboard"),
            cta: "Find Jobs",
            background: <FeatureBg src="/job_seeker.jpg" alt="Job Seekers" />,
            className: "lg:row-start-1 lg:row-end-4 lg:col-start-2 lg:col-end-3",
        },
        {
            Icon: Building2,
            name: "For Companies",
            description: "Post unlimited job listings, manage applications easily, track candidate pipeline, and build your company profile branding.",
            href: getHref("/signup", "/company/jobs"),
            cta: "Start Hiring",
            background: <FeatureBg src="/for_companies.jpg" alt="For Companies" />,
            className: "lg:col-start-1 lg:col-end-2 lg:row-start-1 lg:row-end-3",
        },
        {
            Icon: Mic,
            name: "AI Interviewer",
            description: "Practice interviews with our AI-powered interviewer. Get real-time feedback.",
            href: getHref("/candidate/ai-interview", "/company/dashboard"),
            cta: "Try Now",
            background: <FeatureBg src="/ai_interview.jpg" alt="AI Interviewer" />,
            className: "lg:col-start-1 lg:col-end-2 lg:row-start-3 lg:row-end-4",
        },
        {
            Icon: Briefcase,
            name: "Smart Matching",
            description: "AI-powered recommendations, skills-based matching, and salary insights.",
            href: getHref("/candidate/jobs", "/company/dashboard"),
            cta: "Explore",
            background: <FeatureBg src="/smart_matching.png" alt="Smart Matching" />,
            className: "lg:col-start-3 lg:col-end-3 lg:row-start-1 lg:row-end-2",
        },
        {
            Icon: FileText,
            name: "AI Resume Builder",
            description: "Build professional resumes with AI assistance. Get resume scoring and optimization suggestions.",
            href: getHref("/candidate/resume-builder", "/company/dashboard"),
            cta: "Build Resume",
            background: <FeatureBg src="/resume_builder.jpg" alt="AI Resume Builder" />,
            className: "lg:col-start-3 lg:col-end-3 lg:row-start-2 lg:row-end-4",
        },
    ];

    return (
        <section id="features" className="py-20 px-6 bg-white dark:bg-black">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-900 via-neutral-700 to-neutral-800 dark:from-white dark:via-neutral-200 dark:to-neutral-500 mb-4 tracking-tight">
                        Everything You Need
                    </h2>
                    <p className="text-neutral-600 dark:text-neutral-400 text-lg max-w-2xl mx-auto">
                        Powerful features for companies and job seekers alike
                    </p>
                </div>

                <BentoGrid className="lg:grid-rows-3">
                    {features.map((feature) => (
                        <BentoCard key={feature.name} {...feature} />
                    ))}
                </BentoGrid>
            </div>
        </section>
    );
}
