'use client';

import React, { useEffect, useState } from 'react';
import { MessageSquare, Trash2, Loader2, Search, User, Calendar } from 'lucide-react';
import Header from '@/components/Header';
import Card from '@/components/ui/Card';

interface Review {
    _id: string;
    clerkId: string;
    name: string;
    image: string;
    text: string;
    role: string;
    createdAt: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5500/api';

export default function AdminReviewsPage() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    const filteredReviews = reviews.filter(r =>
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.role.toLowerCase().includes(searchQuery.toLowerCase())
    );

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API}/admin/reviews`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setReviews(data.reviews);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        setDeleteLoading(id);
        try {
            const token = localStorage.getItem('adminToken');
            const res = await fetch(`${API}/admin/reviews/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setReviews(prev => prev.filter(r => r._id !== id));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setDeleteLoading(null);
            setConfirmDelete(null);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-neutral-900">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        );
    }

    return (
        <div className="animate-fade-in pb-12">
            <Header title="Review Management" />

            <div className="p-6">
                {/* Stats bar */}
                <div className="flex items-center justify-between mb-6">
                    <p className="text-sm text-slate-500 dark:text-neutral-400">
                        {reviews.length} total review{reviews.length !== 1 ? 's' : ''}
                    </p>
                    <div className="relative max-w-md w-full">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search reviews..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-slate-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>
                </div>

                <Card className="overflow-hidden bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-neutral-800 text-slate-500 dark:text-neutral-400">
                                <tr>
                                    <th className="px-6 py-4 font-medium">User</th>
                                    <th className="px-6 py-4 font-medium">Review</th>
                                    <th className="px-6 py-4 font-medium">Role</th>
                                    <th className="px-6 py-4 font-medium">Date</th>
                                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 text-slate-700 dark:text-neutral-300">
                                {filteredReviews.map((review) => (
                                    <tr key={review._id} className="hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-500 flex-shrink-0 overflow-hidden">
                                                    {review.image ? (
                                                        <img src={review.image} alt={review.name} className="h-10 w-10 rounded-full object-cover" />
                                                    ) : (
                                                        <User size={20} />
                                                    )}
                                                </div>
                                                <div className="font-semibold text-slate-900 dark:text-white">
                                                    {review.name}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 max-w-md">
                                            <p className="text-sm text-slate-600 dark:text-neutral-300 line-clamp-2">
                                                {review.text}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400">
                                                {review.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-neutral-400 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar size={14} />
                                                {new Date(review.createdAt).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end">
                                                {confirmDelete === review._id ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-red-500 font-medium">Delete?</span>
                                                        <button
                                                            onClick={() => handleDelete(review._id)}
                                                            disabled={deleteLoading === review._id}
                                                            className="px-3 py-1 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                                                        >
                                                            {deleteLoading === review._id ? (
                                                                <Loader2 size={14} className="animate-spin" />
                                                            ) : (
                                                                'Yes'
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmDelete(null)}
                                                            className="px-3 py-1 rounded-lg text-xs font-semibold border border-slate-300 dark:border-neutral-600 text-slate-600 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-700 transition-colors"
                                                        >
                                                            No
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => setConfirmDelete(review._id)}
                                                        title="Delete Review"
                                                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredReviews.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                            <div className="flex flex-col items-center gap-3">
                                                <MessageSquare className="h-8 w-8 text-slate-300 dark:text-neutral-600" />
                                                <p>{reviews.length === 0 ? 'No reviews yet.' : 'No reviews match your search.'}</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
}
