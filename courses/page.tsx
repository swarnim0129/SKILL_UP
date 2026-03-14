"use client";

import { BookOpen, Search, Play, RotateCcw, X, Loader2, ListMusic, Video, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { initializeSession } from "@/lib/actions/session.actions";
import { getVideoProgressBulk, resetVideoProgress } from "@/lib/actions/video-progress.actions";

// Helper functions
const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatDurationLong = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} min`;
};

// Resume Modal
function ResumeModal({ isOpen, onClose, videoData, progressData, onResume, onStartOver, isLoading }: any) {
    if (!isOpen || !videoData || !progressData) return null;
    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold">Continue Watching?</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
                </div>
                <p className="text-slate-600 mb-4">{videoData.title}</p>
                <div className="h-2 bg-slate-100 rounded-full mb-4">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${progressData.completion_percent}%` }} />
                </div>
                <div className="flex gap-3">
                    <button onClick={onResume} disabled={isLoading} className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium">
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : `Resume at ${formatDuration(progressData.last_watched_seconds)}`}
                    </button>
                    <button onClick={onStartOver} disabled={isLoading} className="py-3 px-4 border border-slate-200 rounded-xl"><RotateCcw className="w-4 h-4" /></button>
                </div>
            </motion.div>
        </motion.div>
    );
}

interface VideoItem { _id: string; title: string; duration_seconds: number; order_index: number; thumbnail_url?: string; cloudinary_url?: string; }
interface Course { _id: string; title: string; description: string; category: string; price_per_minute: number; videos: VideoItem[]; totalDuration: number; }

export default function CoursesPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [progressMap, setProgressMap] = useState<{ [key: string]: any }>({});
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

    const [showResumeModal, setShowResumeModal] = useState(false);
    const [selectedVideo, setSelectedVideo] = useState<any>(null);
    const [isStartingSession, setIsStartingSession] = useState(false);

    const router = useRouter();
    const searchParams = useSearchParams();
    const searchQuery = searchParams.get("search") || "";
    const [searchTerm, setSearchTerm] = useState(searchQuery);

    useEffect(() => {
        const fetchCourses = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/courses?search=${encodeURIComponent(searchTerm)}`);
                if (!res.ok) throw new Error('Failed to fetch');
                const data = await res.json();
                const coursesWithDuration = data.map((course: any) => ({
                    ...course,
                    totalDuration: course.videos?.reduce((acc: number, v: any) => acc + (v.duration_seconds || 0), 0) || 0
                }));
                setCourses(coursesWithDuration);

                const allVideoIds = data.flatMap((c: any) => c.videos?.map((v: any) => v._id) || []);
                if (allVideoIds.length > 0) {
                    const progress = await getVideoProgressBulk(allVideoIds);
                    setProgressMap(progress);
                }
            } catch (error) {
                console.error("Failed to load courses", error);
            } finally {
                setLoading(false);
            }
        };

        // Debounce the search - wait 300ms after user stops typing
        const debounceTimer = setTimeout(() => {
            fetchCourses();
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [searchTerm]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // Search is already live, form submit just prevents page reload
    };

    const openCourseModal = (course: Course) => {
        setSelectedCourse(course);
        setSelectedVideoId(course.videos?.[0]?._id || null);
    };

    const closeCourseModal = () => {
        setSelectedCourse(null);
        setSelectedVideoId(null);
    };

    const handleVideoClick = (video: VideoItem) => {
        const progress = progressMap[video._id];
        if (progress && progress.last_watched_seconds > 30) {
            setSelectedVideo(video);
            setShowResumeModal(true);
        } else {
            startSession(video._id);
        }
    };

    const startSession = async (videoId: string, resumeFrom?: number) => {
        setIsStartingSession(true);
        try {
            const session = await initializeSession(videoId);
            if (session?._id) {
                router.push(resumeFrom ? `/dashboard/sessions/${session._id}?resume=${resumeFrom}` : `/dashboard/sessions/${session._id}`);
            }
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setIsStartingSession(false);
            setShowResumeModal(false);
        }
    };

    const handleResume = () => {
        if (selectedVideo) {
            const progress = progressMap[selectedVideo._id];
            startSession(selectedVideo._id, progress?.last_watched_seconds || 0);
        }
    };

    const handleStartOver = async () => {
        if (selectedVideo) {
            setIsStartingSession(true);
            await resetVideoProgress(selectedVideo._id);
            startSession(selectedVideo._id, 0);
        }
    };

    const getCourseProgress = (videos: VideoItem[]) => {
        if (!videos || videos.length === 0) return 0;
        const progressValues = videos.map(v => progressMap[v._id]?.completion_percent || 0);
        return Math.round(progressValues.reduce((a, b) => a + b, 0) / videos.length);
    };

    const currentVideo = selectedCourse?.videos?.find(v => v._id === selectedVideoId) || selectedCourse?.videos?.[0];

    return (
        <div className="p-6 md:p-8 min-h-screen bg-slate-50">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900">My Courses</h1>
                    <p className="text-slate-500 mt-1">Browse and watch video courses</p>
                </div>

                <form onSubmit={handleSearch} className="mb-8">
                    <div className="relative max-w-xl">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
                        <input type="text" placeholder="Search courses..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 rounded-full border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white" />
                    </div>
                </form>

                {loading ? (
                    <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-red-500" /></div>
                ) : courses.length === 0 ? (
                    <div className="text-center py-20">
                        <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                        <p className="text-slate-500">No courses found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {courses.map((course, idx) => {
                            const firstVideo = course.videos?.[0];
                            const courseProgress = getCourseProgress(course.videos);
                            const videoCount = course.videos?.length || 0;

                            return (
                                <motion.div
                                    key={course._id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 cursor-pointer hover:shadow-lg transition-shadow"
                                    onClick={() => openCourseModal(course)}
                                >
                                    {/* Thumbnail */}
                                    <div className="relative aspect-video bg-gradient-to-br from-slate-800 to-slate-900 group overflow-hidden">
                                        {firstVideo?.thumbnail_url && (
                                            <img
                                                src={firstVideo.thumbnail_url}
                                                alt={course.title}
                                                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                            />
                                        )}
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                            <div className="w-14 h-14 rounded-full bg-red-600/90 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                                                <Play className="w-7 h-7 text-white ml-1" />
                                            </div>
                                        </div>
                                        {/* Category badge */}
                                        <div className="absolute top-3 left-3 px-2 py-1 bg-red-600 text-white text-xs font-medium rounded">
                                            {course.category || "Course"}
                                        </div>
                                        {/* Video count */}
                                        <div className="absolute top-3 right-3 px-2 py-1 bg-black/70 text-white text-xs font-medium rounded flex items-center gap-1">
                                            <ListMusic className="w-3 h-3" />
                                            {videoCount}
                                        </div>
                                        {/* Duration */}
                                        <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/80 text-white text-xs font-medium rounded">
                                            {formatDurationLong(course.totalDuration)}
                                        </div>
                                        {/* Progress bar */}
                                        {courseProgress > 0 && (
                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                                                <div className="h-full bg-red-500" style={{ width: `${courseProgress}%` }} />
                                            </div>
                                        )}
                                    </div>
                                    {/* Info */}
                                    <div className="p-4">
                                        <h3 className="font-bold text-slate-900 line-clamp-2 mb-2">{course.title}</h3>
                                        <div className="flex items-center justify-between">
                                            <span className="text-emerald-600 font-bold text-sm">${course.price_per_minute?.toFixed(2)}/min</span>
                                            {courseProgress > 0 && <span className="text-xs text-slate-400">{courseProgress}% complete</span>}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}

                {/* Course Player Modal */}
                <AnimatePresence>
                    {selectedCourse && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                            onClick={(e) => e.target === e.currentTarget && closeCourseModal()}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col"
                            >
                                {/* Header */}
                                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-shrink-0">
                                    <div>
                                        <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded-full">
                                            {selectedCourse.category || "Course"}
                                        </span>
                                        <h2 className="text-lg font-bold text-slate-900 mt-1">{selectedCourse.title}</h2>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="text-emerald-600 font-bold">${selectedCourse.price_per_minute?.toFixed(2)}/min</div>
                                            <div className="text-xs text-slate-400">{selectedCourse.videos?.length || 0} videos</div>
                                        </div>
                                        <button onClick={closeCourseModal} className="p-2 hover:bg-slate-200 rounded-lg transition-colors">
                                            <X className="w-5 h-5 text-slate-500" />
                                        </button>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                                    {/* Main Thumbnail */}
                                    <div className="lg:w-2/3 relative flex-shrink-0">
                                        <div
                                            className="relative aspect-video bg-gradient-to-br from-slate-900 to-slate-800 cursor-pointer group overflow-hidden"
                                            onClick={() => currentVideo && handleVideoClick(currentVideo)}
                                        >
                                            {currentVideo?.thumbnail_url && (
                                                <img
                                                    src={currentVideo.thumbnail_url}
                                                    alt={currentVideo.title}
                                                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            )}
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                <div className="text-center">
                                                    <div className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg shadow-red-500/30">
                                                        <Play className="w-10 h-10 text-white ml-1" />
                                                    </div>
                                                    <h3 className="text-white text-xl font-bold px-8 line-clamp-2">{currentVideo?.title || "Select a video"}</h3>
                                                    <p className="text-white/60 text-sm mt-2">Click to start watching</p>
                                                </div>
                                            </div>
                                            {currentVideo && (
                                                <div className="absolute bottom-4 right-4 bg-black/80 text-white text-sm px-2 py-1 rounded font-medium">
                                                    {formatDuration(currentVideo.duration_seconds)}
                                                </div>
                                            )}
                                            {currentVideo && progressMap[currentVideo._id] && (
                                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                                                    <div className="h-full bg-red-500" style={{ width: `${progressMap[currentVideo._id].completion_percent}%` }} />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Playlist Sidebar */}
                                    <div className="lg:w-1/3 border-l border-slate-100 flex flex-col overflow-hidden">
                                        <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between flex-shrink-0">
                                            <div className="flex items-center gap-2">
                                                <ListMusic className="w-4 h-4 text-slate-500" />
                                                <span className="font-semibold text-slate-700 text-sm">Playlist</span>
                                            </div>
                                            {getCourseProgress(selectedCourse.videos) > 0 && (
                                                <span className="text-xs text-slate-500">{getCourseProgress(selectedCourse.videos)}%</span>
                                            )}
                                        </div>
                                        <div className="overflow-y-auto flex-1">
                                            {selectedCourse.videos?.map((video, vIdx) => {
                                                const isSelected = video._id === selectedVideoId;
                                                const progress = progressMap[video._id];
                                                const hasProgress = progress && progress.last_watched_seconds > 30;
                                                const isCompleted = progress?.completion_percent >= 90;

                                                return (
                                                    <div
                                                        key={video._id}
                                                        className={`flex items-center gap-3 p-3 cursor-pointer transition-all border-b border-slate-50 ${isSelected ? 'bg-red-50' : 'hover:bg-slate-50'}`}
                                                        onClick={() => setSelectedVideoId(video._id)}
                                                        onDoubleClick={() => handleVideoClick(video)}
                                                    >
                                                        <div className={`w-6 h-6 flex items-center justify-center text-xs font-bold rounded ${isCompleted ? 'bg-emerald-100 text-emerald-600' : isSelected ? 'bg-red-100 text-red-600' : 'text-slate-400'}`}>
                                                            {isCompleted ? '✓' : vIdx + 1}
                                                        </div>
                                                        <div className="relative w-24 h-14 bg-slate-200 rounded overflow-hidden flex-shrink-0">
                                                            {video.thumbnail_url ? (
                                                                <img
                                                                    src={video.thumbnail_url}
                                                                    alt={video.title}
                                                                    className="absolute inset-0 w-full h-full object-cover"
                                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                                />
                                                            ) : (
                                                                <div className="absolute inset-0 flex items-center justify-center bg-slate-800/10">
                                                                    <Play className="w-5 h-5 text-slate-400" />
                                                                </div>
                                                            )}
                                                            <div className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] px-1 rounded">
                                                                {formatDuration(video.duration_seconds)}
                                                            </div>
                                                            {hasProgress && (
                                                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/30">
                                                                    <div className={`h-full ${isCompleted ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${progress.completion_percent}%` }} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className={`text-sm font-medium line-clamp-2 ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>{video.title}</h4>
                                                            {hasProgress && !isCompleted && <p className="text-xs text-red-500 mt-0.5">{progress.completion_percent}%</p>}
                                                        </div>
                                                        {isSelected && <ChevronRight className="w-4 h-4 text-red-500 flex-shrink-0" />}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Footer progress */}
                                {getCourseProgress(selectedCourse.videos) > 0 && (
                                    <div className="px-4 pb-3 flex-shrink-0">
                                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-red-500 rounded-full" style={{ width: `${getCourseProgress(selectedCourse.videos)}%` }} />
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Resume Modal */}
                <AnimatePresence>
                    <ResumeModal
                        isOpen={showResumeModal}
                        onClose={() => setShowResumeModal(false)}
                        videoData={selectedVideo}
                        progressData={selectedVideo ? progressMap[selectedVideo._id] : null}
                        onResume={handleResume}
                        onStartOver={handleStartOver}
                        isLoading={isStartingSession}
                    />
                </AnimatePresence>
            </div>
        </div>
    );
}
