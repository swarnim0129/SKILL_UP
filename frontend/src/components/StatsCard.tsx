import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

const colorClasses = {
    blue: {
        bg: 'bg-blue-500/10',
        icon: 'text-blue-500',
        gradient: 'from-blue-500 to-blue-600',
    },
    green: {
        bg: 'bg-green-500/10',
        icon: 'text-green-500',
        gradient: 'from-green-500 to-green-600',
    },
    purple: {
        bg: 'bg-purple-500/10',
        icon: 'text-purple-500',
        gradient: 'from-purple-500 to-purple-600',
    },
    orange: {
        bg: 'bg-orange-500/10',
        icon: 'text-orange-500',
        gradient: 'from-orange-500 to-orange-600',
    },
    red: {
        bg: 'bg-red-500/10',
        icon: 'text-red-500',
        gradient: 'from-red-500 to-red-600',
    },
};

export default function StatsCard({ title, value, icon: Icon, trend, color = 'blue' }: StatsCardProps) {
    const colors = colorClasses[color];

    return (
        <div className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600">
            {/* Background decoration */}
            <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full ${colors.bg} opacity-50 transition-transform duration-300 group-hover:scale-150`}></div>

            <div className="relative flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
                    <p className="mt-2 text-3xl font-bold text-slate-800 dark:text-white">{value}</p>

                    {trend && (
                        <div className="mt-2 flex items-center gap-1">
                            {trend.isPositive ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                            )}
                            <span className={`text-sm font-medium ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                {trend.value}%
                            </span>
                            <span className="text-sm text-slate-400">vs last month</span>
                        </div>
                    )}
                </div>

                <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r ${colors.gradient} text-white shadow-lg`}>
                    <Icon size={24} />
                </div>
            </div>
        </div>
    );
}
