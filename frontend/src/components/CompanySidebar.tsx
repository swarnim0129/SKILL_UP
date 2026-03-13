'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Briefcase,
    Users,
    Building2,
    Settings,
} from 'lucide-react';
import { gsap } from 'gsap';

const navItems = [
    { label: 'Dashboard', href: '/company/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'Jobs', href: '/company/jobs', icon: <Briefcase size={20} /> },
    { label: 'Applicants', href: '/company/applicants', icon: <Users size={20} /> },
    { label: 'Profile', href: '/company/profile', icon: <Building2 size={20} /> },
];

export default function CompanySidebar() {
    const pathname = usePathname();
    const sidebarRef = useRef(null);
    const linksRef = useRef<(HTMLAnchorElement | null)[]>([]);

    // GSAP animations removed to prevent visibility issues
    useEffect(() => {
        // No-op
    }, []);

    return (
        <aside
            ref={sidebarRef}
            className="fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 bg-white dark:bg-black border-r border-neutral-200 dark:border-neutral-900 text-black dark:text-white transition-colors duration-300"
        >
            <div className="flex flex-col h-full py-6">
                <div className="px-6 mb-8">
                    <p className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">
                        Management
                    </p>
                </div>

                <nav className="flex-1 space-y-2 px-3">
                    {navItems.map((item, index) => {
                        const isActive = pathname === item.href;
                        // Use pure CSS classes for the blue theme
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                data-active={isActive}
                                className={`group flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-300 border-l-2 ${isActive
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border-[#4a6cf7] text-[#4a6cf7] dark:text-blue-400'
                                    : 'border-transparent text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-50 dark:hover:bg-neutral-900'
                                    }`}
                            >
                                <span className={`icon transition-colors duration-300 ${isActive ? 'text-[#4a6cf7] dark:text-blue-400' : ''}`}>
                                    {item.icon}
                                </span>
                                <span className={`label transition-colors duration-300 ${isActive ? 'text-[#4a6cf7] dark:text-blue-400' : ''}`}>
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="px-6 mt-auto">
                    <div className="rounded-xl p-4 border border-neutral-200 dark:border-neutral-800 bg-transparent">
                        <h4 className="font-semibold text-sm mb-1 text-black dark:text-white">Need Help?</h4>
                        <p className="text-xs text-neutral-500 mb-3">Contact our support team.</p>
                        <button className="w-full py-2 bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900 rounded-lg text-xs font-medium transition-colors shadow-sm text-black dark:text-white">
                            Contact Support
                        </button>
                    </div>
                </div>
            </div>
        </aside>
    );
}
