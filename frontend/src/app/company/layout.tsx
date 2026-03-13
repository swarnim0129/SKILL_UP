'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import LandingNavbar from '@/components/LandingNavbar';
import { useAuth, UserButton, useUser } from '@clerk/nextjs';
import { Loader2, LayoutDashboard, Briefcase, Users, Building2, LogOut, BookOpen } from 'lucide-react';
import { Sidebar, SidebarBody, SidebarLink } from '@/components/ui/Sidebar';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function CompanyLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { isLoaded, isSignedIn, getToken } = useAuth();
    const { user } = useUser();
    const router = useRouter();
    const pathname = usePathname();
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [checkingRole, setCheckingRole] = useState(true);
    const [open, setOpen] = useState(false);

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

                if (data.exists && data.role === 'company') {
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

    const links = [
        {
            label: 'Dashboard',
            href: '/company/dashboard',
            icon: <LayoutDashboard className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        },
        {
            label: 'Jobs',
            href: '/company/jobs',
            icon: <Briefcase className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        },
        {
            label: 'Applicants',
            href: '/company/applicants',
            icon: <Users className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
        },
        {
            label: 'Creator',
            href: '/creator/courses',
            icon: <BookOpen className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />,
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

            <div className="flex flex-col md:flex-row flex-1 mt-16 h-[calc(100vh-4rem)] overflow-hidden">
                <Sidebar open={open} setOpen={setOpen}>
                    <SidebarBody className="justify-between gap-10 bg-white dark:bg-black border-r border-neutral-200 dark:border-neutral-800">
                        {/* Profile at top, centered on desktop, left on mobile */}
                        <div className={`flex flex-col items-start md:items-center border-b border-neutral-200 dark:border-neutral-800 pb-4 mb-2 mt-2 ${open ? 'px-3' : 'px-1'}`}>
                            <SidebarLink
                                link={{
                                    label: user?.fullName || 'User',
                                    href: '/company/profile',
                                    icon: (
                                        <div className="flex items-center justify-center flex-shrink-0 h-9 w-9 rounded-full bg-neutral-200 dark:bg-neutral-700">
                                            <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: { width: "36px", height: "36px" } } }} />
                                        </div>
                                    ),
                                }}
                                className="[&>span]:!text-base [&>span]:!font-medium py-1"
                            />
                        </div>

                        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
                            <div className="flex flex-col gap-2">
                                {links.map((link, idx) => (
                                    <SidebarLink key={idx} link={link} />
                                ))}
                            </div>
                        </div>
                    </SidebarBody>
                </Sidebar>

                <main className="flex-1 min-h-0 overflow-y-auto p-6 company-content bg-white dark:bg-black">
                    <div className="max-w-7xl mx-auto h-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
