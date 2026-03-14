"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Clock, Calendar } from "lucide-react";
import { getVideoById } from "@/lib/actions/video.actions";

export default function VideoPlayerPage() {
    const params = useParams();
    const router = useRouter();
    const [video, setVideo] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const courseId = params.courseId as string;

    useEffect(() => {
        const fetchVideo = async () => {
            if (!courseId) return;
            try {
                const data = await getVideoById(courseId);
                setVideo(data);
            } catch (error) {
                console.error("Error loading video:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchVideo();
    }, [courseId]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!video) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
                <h2 className="text-xl font-semibold text-slate-800">Video not found</h2>
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                    <ChevronLeft className="h-4 w-4" /> Go Back
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-8">
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition-colors"
            >
                <ChevronLeft className="h-5 w-5" />
                <span className="font-medium">Back to Courses</span>
            </button>

            <div className="max-w-5xl mx-auto">
                {/* Video Player Container */}
                <div className="bg-black rounded-2xl overflow-hidden shadow-xl aspect-video mb-6">
                    <video
                        src={video.cloudinary_url}
                        controls
                        autoPlay
                        className="w-full h-full object-contain"
                    >
                        Your browser does not support the video tag.
                    </video>
                </div>

                {/* Video Details */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4">{video.title}</h1>

                    <div className="flex flex-wrap items-center gap-6 text-slate-500 text-sm border-t border-b border-slate-100 py-4 mb-4">
                        <span className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {Math.floor(video.duration_seconds / 60)} mins {Math.floor(video.duration_seconds % 60)} secs
                        </span>
                        <span className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {new Date(video.created_at).toLocaleDateString()}
                        </span>
                    </div>

                    <div className="prose prose-slate max-w-none">
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">Description</h3>
                        <p className="text-slate-600">
                            Watch this lesson to learn about "{video.title}".
                            {/* Make description dynamic if added to schema later */}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
