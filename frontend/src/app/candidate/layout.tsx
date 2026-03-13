'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import LandingNavbar from '@/components/LandingNavbar';
import { useAuth, UserButton, useUser } from '@clerk/nextjs';
import {
    Loader2,
    LayoutDashboard,
    FileText,
    Briefcase,
    Bot,
    GraduationCap,
    ScanSearch,
    FilePen,
    UserCircle,
    Coins,
    LogOut,
    Route,
    Compass,
    Palette,
    Trophy,
    BookOpenCheck,
    BarChart3,
} from 'lucide-react';
import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/Sidebar';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import api from '@/lib/api';

export default function CandidateLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isLoaded, isSignedIn, getToken, signOut } = useAuth();
    const { user } = useUser();
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [checkingRole, setCheckingRole] = useState(true);
    const [open, setOpen] = useState(false);
    const [credits, setCredits] = useState<number | null>(null);
    const [xp, setXp] = useState<number | null>(null);
    const [level, setLevel] = useState<number | null>(null);
    const [streak, setStreak] = useState<number | null>(null);

    useEffect(() => {
        const checkRole = async () => {
            if (!isLoaded) return;

            if (!isSignedIn) {
                router.push('/');
                return;
            }

            try {
                const token = await getToken();
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500/api'}/onboarding/check`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                const data = await response.json();

                if (data.exists && (data.role === 'candidate' || data.role === 'admin')) {
                    setIsAuthorized(true);
                } else {
                    router.push('/onboarding');
                }
            } catch (error) {
                console.error("Auth check failed", error);
            } finally {
                setCheckingRole(false);
            }
        };

        checkRole();
    }, [isLoaded, isSignedIn, getToken, router]);

    // Fetch credit balance for sidebar badge
    useEffect(() => {
        const fetchCredits = async () => {
            if (!isLoaded || !isSignedIn) return;
            try {
                const token = await getToken();
                const res = await api.get('/candidate/credits', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.data.success) {
                    setCredits(res.data.credits);
                    setXp(res.data.xpTotal ?? null);
                    setLevel(res.data.level ?? null);
                    setStreak(res.data.currentStreak ?? null);
                }
            } catch { /* ignore */ }
        };
        fetchCredits();
    }, [isLoaded, isSignedIn, getToken]);

    const links = [
        {
            label: 'Dashboard',
            href: '/candidate/dashboard',
            icon: <LayoutDashboard className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        },
        {
            label: 'Discover',
            href: '/candidate/videoTutor',
            icon: <Compass className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        },
        {
            label: 'Roadmap',
            href: '/candidate/learning-roadmap',
            icon: <Route className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        },
        {
            label: 'Progress',
            href: '/candidate/progress',
            icon: <BarChart3 className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        },
        {
            label: 'AI Interview',
            href: '/candidate/ai-interview',
            icon: <Bot className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        },
        {
            label: 'AI Tutor',
            href: '/candidate/tutor',
            icon: <GraduationCap className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        },
        {
            label: 'Resume Analyzer',
            href: '/candidate/resume-analyzer',
            icon: <ScanSearch className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        },
        {
            label: 'Resume Builder',
            href: '/candidate/resume-builder',
            icon: <FilePen className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        },
        {
            label: 'Become a Creator',
            href: '/creator/courses',
            icon: <Palette className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        },
        {
            label: 'Revision Hub',
            href: '/candidate/revision',
            icon: <BookOpenCheck className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        },
        {
            label: 'Leaderboard',
            href: '/candidate/leaderboard',
            icon: <Trophy className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        },
    ];

    if (!isLoaded || checkingRole) {
        return (
            <div className="flex h-screen items-center justify-center bg-white dark:bg-black">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!isAuthorized) {
        return null;
    }

    return (
        <div className="h-screen overflow-hidden bg-white dark:bg-black text-black dark:text-white flex flex-col">
            <LandingNavbar />

            <div className="flex flex-col md:flex-row flex-1 mt-16 h-[calc(100vh-4rem)]">
                <Sidebar open={open} setOpen={setOpen}>
                    <SidebarBody className="justify-between gap-10 bg-white dark:bg-black border-r border-neutral-200 dark:border-neutral-800">
                        {/* Profile & Credits at top, centered on desktop, left on mobile */}
                        <div className={`flex flex-col items-start md:items-center border-b border-neutral-200 dark:border-neutral-800 pb-4 mb-2 mt-2 ${open ? 'px-3' : 'px-1'}`}>
                            <SidebarLink
                                link={{
                                    label: user?.fullName || 'User',
                                    href: '/candidate/profile',
                                    icon: (
                                        <div className="flex items-center justify-center flex-shrink-0 h-9 w-9 rounded-full bg-neutral-200 dark:bg-neutral-700">
                                            <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: { width: "36px", height: "36px" } } }} />
                                        </div>
                                    ),
                                }}
                                className="[&>span]:!text-base [&>span]:!font-medium py-1"
                            />
                            {credits !== null && (
                                <>
                                    <div className={`flex items-center rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 transition-all mt-2 ${open ? 'gap-2 px-3 py-1.5 ml-1' : 'justify-center p-2'}`}>
                                        <Coins className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                        {open && (
                                            <>
                                                <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{credits}</span>
                                                <span className="text-xs text-blue-500 dark:text-blue-400">credits</span>
                                            </>
                                        )}
                                    </div>
                                    {open && (
                                        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 px-3 py-1.5 mt-2 ml-1">
                                            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">Lvl {level ?? 1}</span>
                                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400">{xp ?? 0} XP</span>
                                            <span className="text-[11px] text-emerald-600 dark:text-emerald-400">{streak ?? 0} day streak</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
                            <div className="flex flex-col gap-2">
                                {links.map((link, idx) => (
                                    <SidebarLink key={idx} link={link} />
                                ))}
                            </div>
                        </div>
                        <div className="mt-auto space-y-2">
                            {/* Logout */}
                            <button
                                onClick={() => signOut({ redirectUrl: '/' })}
                                className={`flex items-center rounded-lg text-red-500 hover:bg-red-500/10 transition-all cursor-pointer ${open ? 'gap-2 px-3 py-2' : 'justify-center p-2'}`}
                            >
                                <LogOut className="w-4 h-4 flex-shrink-0" />
                                {open && <span className="text-sm font-medium">Logout</span>}
                            </button>
                        </div>
                    </SidebarBody>
                </Sidebar>

                <main className="flex-1 min-h-0 overflow-y-auto p-6 bg-white dark:bg-black">
                    <div className="max-w-7xl mx-auto h-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}

