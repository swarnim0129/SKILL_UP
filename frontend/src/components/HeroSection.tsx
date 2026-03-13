"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { BackgroundPaths } from "@/components/ui/background-paths";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";
import { cn } from "@/lib/utils";
import { SignedIn, SignedOut, useUser, useAuth } from "@clerk/nextjs";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5500/api";

type UserRole = "candidate" | "company" | null;

export default function HeroSection() {
    const title = "Find Your Dream Job";
    const words = title.split(" ");

    const { isSignedIn, user, isLoaded } = useUser();
    const { getToken } = useAuth();
    const [userRole, setUserRole] = useState<UserRole>(null);

    useEffect(() => {
        const checkRole = async () => {
            if (!isLoaded || !isSignedIn || !user) return;
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
    }, [isLoaded, isSignedIn, user, getToken]);

    const getSignedInLink = () => {
        if (userRole === "candidate") return "/candidate/learning-roadmap";
        if (userRole === "company") return "/company/jobs";
        return "/onboarding";
    };

    const getDashboardLink = () => {
        if (userRole === "candidate") return "/candidate/learning-roadmap";
        if (userRole === "company") return "/company/dashboard";
        return "/onboarding";
    };

    const getSignedInLabel = () => {
        if (userRole === "candidate") return "Search Jobs";
        if (userRole === "company") return "Post a Job";
        return "Complete Profile"; // Fallback
    };

    return (
        <BackgroundPaths>
            <div className="relative z-10 container mx-auto px-4 md:px-6 text-center pt-20">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 2 }}
                    className="max-w-4xl mx-auto"
                >
                    {/* Animated Title */}
                    <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold mb-8 tracking-tighter">
                        {words.map((word, wordIndex) => (
                            <span
                                key={wordIndex}
                                className="inline-block mr-4 last:mr-0"
                            >
                                {word.split("").map((letter, letterIndex) => (
                                    <motion.span
                                        key={`${wordIndex}-${letterIndex}`}
                                        initial={{ y: 100, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{
                                            delay:
                                                wordIndex * 0.1 +
                                                letterIndex * 0.03,
                                            type: "spring",
                                            stiffness: 150,
                                            damping: 25,
                                        }}
                                        className="inline-block text-transparent bg-clip-text 
                                        bg-gradient-to-b from-neutral-900 via-neutral-700 to-neutral-800 
                                        dark:from-white dark:via-neutral-200 dark:to-neutral-500"
                                    >
                                        {letter}
                                    </motion.span>
                                ))}
                            </span>
                        ))}
                    </h1>

                    {/* Subtitle */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8, duration: 0.6 }}
                        className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 mb-10 max-w-2xl mx-auto"
                    >
                        Connect with top companies, discover exciting opportunities, and take the
                        next step in your career journey with SkillUp.
                    </motion.p>

                    {/* CTA Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1, duration: 0.6 }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <SignedOut>
                            {/* Search Jobs Button */}
                            <Link href="/signup">
                                <InteractiveHoverButton className="text-base">
                                    Start Your Search
                                </InteractiveHoverButton>
                            </Link>

                            {/* Post a Job Button */}
                            <Link
                                href="/signup"
                                className={cn(
                                    "px-8 py-4 text-base font-semibold rounded-2xl",
                                    "text-neutral-600 dark:text-neutral-400",
                                    "hover:text-neutral-900 dark:hover:text-white",
                                    "transition-all duration-300",
                                    "flex items-center gap-2"
                                )}
                            >
                                <span>Post a Job</span>
                                <span className="group-hover:translate-x-1 transition-transform duration-300">
                                    →
                                </span>
                            </Link>
                        </SignedOut>

                        <SignedIn>
                            <Link href={getSignedInLink()}>
                                <InteractiveHoverButton className="text-base">
                                    {getSignedInLabel()}
                                </InteractiveHoverButton>
                            </Link>

                            <Link
                                href={getDashboardLink()}
                                className={cn(
                                    "px-8 py-4 text-base font-semibold rounded-2xl",
                                    "text-neutral-600 dark:text-neutral-400",
                                    "hover:text-neutral-900 dark:hover:text-white",
                                    "transition-all duration-300",
                                    "flex items-center gap-2"
                                )}
                            >
                                <span>Dashboard</span>
                                <span className="group-hover:translate-x-1 transition-transform duration-300">
                                    →
                                </span>
                            </Link>
                        </SignedIn>
                    </motion.div>
                </motion.div>
            </div>
        </BackgroundPaths>
    );
}
