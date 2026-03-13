'use client';

import React, { useEffect, useState } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    BarChart, Bar, AreaChart, Area
} from 'recharts';
import Header from '@/components/Header';
import Card, { CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Loader2 } from 'lucide-react';

export default function AdminAnalyticsPage() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('adminToken');
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500/api'}/admin/analytics`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const json = await res.json();
                setData(json);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-neutral-900">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    // Transform data for charts
    // We expect graphs: { companies: [{_id: 'YYYY-MM', count: N}], candidates: ... }
    // We need to merge them by date for a combined chart

    const mergeData = () => {
        const map = new Map();

        data?.graphs?.companies?.forEach((item: any) => {
            const date = item._id;
            if (!map.has(date)) map.set(date, { name: date, companies: 0, candidates: 0 });
            map.get(date).companies = item.count;
        });

        data?.graphs?.candidates?.forEach((item: any) => {
            const date = item._id;
            if (!map.has(date)) map.set(date, { name: date, companies: 0, candidates: 0 });
            map.get(date).candidates = item.count;
        });

        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    };

    const growthData = mergeData();
    const jobData = data?.graphs?.jobs?.map((j: any) => ({ name: j._id, jobs: j.count })) || [];

    return (
        <div className="animate-fade-in pb-12">
            <Header title="Platform Analytics" />

            <div className="p-6 space-y-6">
                {/* Growth Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>User Growth Over Time</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={growthData}>
                                <defs>
                                    <linearGradient id="colorCompanies" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorCandidates" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-neutral-800" />
                                <XAxis dataKey="name" className="text-xs" />
                                <YAxis />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                                />
                                <Legend />
                                <Area type="monotone" dataKey="companies" stroke="#8884d8" fillOpacity={1} fill="url(#colorCompanies)" name="New Companies" />
                                <Area type="monotone" dataKey="candidates" stroke="#82ca9d" fillOpacity={1} fill="url(#colorCandidates)" name="New Candidates" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Job Posts Chart */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Job Posting Trends</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={jobData}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-neutral-800" />
                                    <XAxis dataKey="name" className="text-xs" />
                                    <YAxis />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    />
                                    <Legend />
                                    <Bar dataKey="jobs" fill="#f97316" name="New Jobs" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Summary Pie or text */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Distribution Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-slate-600 dark:text-slate-400">Companies vs Candidates</span>
                                        <span className="font-semibold dark:text-white">
                                            {((data?.overview?.totalCompanies / (data?.overview?.totalCompanies + data?.overview?.totalCandidates || 1)) * 100).toFixed(1)}% / {((data?.overview?.totalCandidates / (data?.overview?.totalCompanies + data?.overview?.totalCandidates || 1)) * 100).toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="h-2 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden flex">
                                        <div
                                            className="h-full bg-purple-500"
                                            style={{ width: `${(data?.overview?.totalCompanies / (data?.overview?.totalCompanies + data?.overview?.totalCandidates || 1)) * 100}%` }}
                                        />
                                        <div
                                            className="h-full bg-green-500"
                                            style={{ width: `${(data?.overview?.totalCandidates / (data?.overview?.totalCompanies + data?.overview?.totalCandidates || 1)) * 100}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs mt-2 text-slate-500">
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Companies</span>
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Candidates</span>
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-slate-600 dark:text-slate-400">Company Status</span>
                                        <span className="font-semibold dark:text-white">{data?.overview?.activeCompanies} Active</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden flex">
                                        <div
                                            className="h-full bg-green-500"
                                            style={{ width: `${(data?.overview?.activeCompanies / (data?.overview?.totalCompanies || 1)) * 100}%` }}
                                        />
                                        <div
                                            className="h-full bg-yellow-500"
                                            style={{ width: `${(data?.overview?.pendingCompanies / (data?.overview?.totalCompanies || 1)) * 100}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs mt-2 text-slate-500">
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Active ({data?.overview?.activeCompanies})</span>
                                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-500"></div> Pending ({data?.overview?.pendingCompanies})</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
