"use client";

import { useState, useEffect } from "react";
import { Facebook, Instagram } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useUser, useAuth } from "@clerk/nextjs";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5500/api";

type UserRole = "candidate" | "company" | null;

export default function GlobeSection() {
    const { isSignedIn, user, isLoaded } = useUser();
    const { getToken } = useAuth();
    const [userRole, setUserRole] = useState<UserRole>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const checkRole = async () => {
            if (!isLoaded || !isSignedIn || !user) return;
            setLoading(true);
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
            } finally {
                setLoading(false);
            }
        };
        checkRole();
    }, [isLoaded, isSignedIn, user, getToken]);

    const getLink = () => {
        if (!isLoaded) return "#";
        if (!isSignedIn) return "/signup";
        if (userRole === "candidate") return "/candidate/learning-roadmap";
        if (userRole === "company") return "/company/jobs";
        return "/onboarding";
    };

    const getLabel = () => {
        if (!isLoaded || loading) return "Loading...";
        if (!isSignedIn) return "Start Your Search";
        if (userRole === "candidate") return "Search Jobs";
        if (userRole === "company") return "Post a Job";
        return "Complete Profile"; // Better fallback than Get Started
    };

    return (
        <section id="contact" className="relative w-full h-[85vh] md:min-h-screen bg-black overflow-x-hidden flex flex-col font-sans">

            {/* Gradient Overlay for depth */}
            <div className="absolute inset-0 z-0">
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/40" />
            </div>

            {/* Bottom Image - Mobile */}
            <div className="absolute bottom-0 left-0 w-full h-full z-10 pointer-events-none block md:hidden">
                <Image
                    src="/imgnotext.png"
                    alt="Bottom Image"
                    fill
                    className="w-full h-full object-cover object-[center_30%] dark:grayscale transition-all duration-700 ease-in-out"
                    priority
                />
            </div>
            {/* Bottom Image - Desktop */}
            <div className="absolute bottom-0 left-0 w-full h-full z-10 pointer-events-none hidden md:block">
                <Image
                    src="/imgwithtext.webp"
                    alt="Bottom Image"
                    fill
                    className="w-full h-full object-cover md:object-bottom dark:grayscale transition-all duration-700 ease-in-out"
                    priority
                />
            </div>

            {/* Gradient Overlay for Text Visibility */}
            <div className="absolute inset-0 z-[15] bg-gradient-to-t from-black/95 via-black/50 to-transparent pointer-events-none transition-opacity duration-500" />

            {/* Main Content */}
            <div className="relative z-20 w-full h-full flex flex-col justify-end">

                {/* Start Button */}
                <div className="absolute hidden md:flex bottom-[180px] left-1/2 -translate-x-1/2 z-30">
                    <Link href={getLink()}>
                        <button className="group relative rounded-full bg-[#4a6cf7] border border-[#4a6cf7] text-white px-8 py-4 text-lg font-medium hover:scale-105 transition-all flex items-center gap-3 shadow-[0_0_50px_-10px_#4a6cf7] hover:shadow-[0_0_60px_-5px_#4a6cf7]">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                            </span>
                            {getLabel()}
                        </button>
                    </Link>
                </div>

                {/* Bottom Content Area */}
                <div className="relative z-20 w-full px-6 pb-16 md:px-12 md:pb-16">

                    {/* Bottom Area */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end w-full gap-8 md:gap-0 mb-8">

                        {/* Left Corner Text */}
                        <div className="text-left">
                            <h2 className="text-2xl md:text-3xl font-medium text-white leading-tight">
                                Find jobs
                            </h2>
                            <h2 className="text-2xl md:text-3xl font-medium text-neutral-500 leading-tight">
                                based on your skills
                            </h2>
                            <h2 className="text-2xl md:text-3xl font-medium text-neutral-600 leading-tight">
                                not degrees.
                            </h2>
                        </div>

                        {/* Right Corner Contact */}
                        <div className="text-left md:text-right flex flex-col items-start md:items-end">
                            <a href="mailto:skillupofficial@gmail.com" className="text-base md:text-lg text-white font-medium hover:text-neutral-300 transition-colors mb-1">
                                skillupofficial@gmail.com
                            </a>
                            <p className="text-neutral-500 text-sm mb-3">Get in touch</p>

                            <div className="border-t border-neutral-800 w-12 mb-3 md:ml-auto"></div>

                            <p className="text-neutral-600 text-[10px] tracking-[0.2em] font-bold uppercase">
                                FOR INQUIRIES
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Bar */}
                <div className="relative z-40 w-full border-t border-neutral-900/50 bg-black/30 backdrop-blur-sm py-3 px-6 md:py-4 md:px-12 flex justify-between items-center">
                    <div className="text-neutral-600 text-[10px] tracking-widest uppercase font-bold flex gap-4">
                        <span>©2026 SkillUp</span>
                        <a href="#" className="hover:text-neutral-400">Privacy</a>
                    </div>

                    <div className="flex gap-4">
                        <a href="https://www.facebook.com/people/Seekernetwork/61576030097576" target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-white transition-all">
                            <Facebook className="w-4 h-4" />
                        </a>
                        <a href="https://www.instagram.com/seeker.worksofficial" target="_blank" rel="noopener noreferrer" className="text-neutral-500 hover:text-white transition-all">
                            <Instagram className="w-4 h-4" />
                        </a>
                    </div>
                </div>

            </div>
        </section>
    );
}
