'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    Briefcase,
    Users,
    Building2,
    BarChart3,
    Settings,
    LogOut,
    User
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface NavItem {
    label: string;
    href: string;
    icon: React.ReactNode;
}

const companyNavItems: NavItem[] = [
    { label: 'Dashboard', href: '/company/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'Jobs', href: '/company/jobs', icon: <Briefcase size={20} /> },
    { label: 'Applicants', href: '/company/applicants', icon: <Users size={20} /> },
    { label: 'Profile', href: '/company/profile', icon: <Building2 size={20} /> },
];

const adminNavItems: NavItem[] = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
    { label: 'Companies', href: '/admin/companies', icon: <Building2 size={20} /> },
    { label: 'Users', href: '/admin/users', icon: <Users size={20} /> },
    { label: 'Jobs', href: '/admin/jobs', icon: <Briefcase size={20} /> },
    { label: 'Analytics', href: '/admin/analytics', icon: <BarChart3 size={20} /> },
];

interface SidebarProps {
    type: 'company' | 'admin';
}

export default function Sidebar({ type }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { user: contextUser, logout: contextLogout } = useAuth();
    const [adminUser, setAdminUser] = useState<{ name: string; role: string } | null>(null);

    const navItems = type === 'company' ? companyNavItems : adminNavItems;

    // Use context user for company, local state for admin
    useEffect(() => {
        if (type === 'admin') {
            const stored = localStorage.getItem('adminUser');
            if (stored) {
                setAdminUser(JSON.parse(stored));
            }
        }
    }, [type]);

    const displayUser = type === 'admin' ? adminUser : contextUser;

    // Fallback if context user is null (might be loading or persisted issue)
    const displayName = displayUser?.name || (type === 'company' ? (contextUser?.companyName || 'Company User') : 'Admin User');
    const displayRole = displayUser?.role || type;

    const handleLogout = () => {
        if (type === 'admin') {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminUser');
            router.push('/admin/login');
        } else {
            contextLogout();
        }
    };

    return (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white shadow-xl">
            {/* Logo */}
            <div className="flex h-16 items-center border-b border-slate-700 px-6">
                <Link href="/" className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-purple-500">
                        <Briefcase size={18} />
                    </div>
                    <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        JobPortal
                    </span>
                </Link>
            </div>

            {/* User Info */}
            <div className="border-b border-slate-700 p-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-500">
                        <User size={20} />
                    </div>
                    <div>
                        <p className="text-sm font-medium">{displayName}</p>
                        <p className="text-xs text-slate-400 capitalize">{displayRole}</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 p-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-200 ${isActive
                                ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white border-l-2 border-blue-500'
                                : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                                }`}
                        >
                            {item.icon}
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Logout */}
            <div className="border-t border-slate-700 p-4">
                <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-slate-300 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400"
                >
                    <LogOut size={20} />
                    Logout
                </button>
            </div>
        </aside>
    );
}
