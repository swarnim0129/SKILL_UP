"use client";
import { TestimonialsColumn, Testimonial } from "@/components/ui/testimonials-columns-1";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState, useCallback } from "react";
import { useAuth, useUser, SignedIn } from "@clerk/nextjs";
import api from "@/lib/api";

const hardcodedTestimonials: Testimonial[] = [
    {
        text: "This platform helped me get placed in a startup within 2 months. The process was very smooth.",
        image: "https://images.unsplash.com/photo-1603415526960-f7e0328c63b1?auto=format&fit=crop&w=100&h=100&q=80",
        name: "Rohit Sharma",
        role: "Frontend Developer",
    },
    {
        text: "As a fresher from Mumbai, I found genuine opportunities here without fake listings.",
        image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80",
        name: "Amit Kulkarni",
        role: "Software Engineer",
    },
    {
        text: "The skill assessment feature helped me showcase my real abilities to recruiters.",
        image: "https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?auto=format&fit=crop&w=100&h=100&q=80",
        name: "Neha Verma",
        role: "UI/UX Designer",
    },
    {
        text: "We hired multiple interns and developers through this platform. Highly reliable.",
        image: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=100&h=100&q=80",
        name: "Pooja Mehta",
        role: "HR Manager",
    },
    {
        text: "Very useful for working professionals in Mumbai looking for better opportunities.",
        image: "https://images.unsplash.com/photo-1614289371518-722f2615943d?auto=format&fit=crop&w=100&h=100&q=80",
        name: "Kunal Deshpande",
        role: "Backend Developer",
    },
    {
        text: "The dashboard is simple and easy to use. Even freshers can navigate easily.",
        image: "https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=100&h=100&q=80",
        name: "Andrew Flintoff",
        role: "Data Analyst",
    },

    {
        text: "I switched from a service company to a product company using this platform.",
        image: "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&w=100&h=100&q=80",
        name: "Vikram Joshi",
        role: "Full Stack Developer",
    },
    {
        text: "Great platform for Mumbai startups and candidates. Saves a lot of time.",
        image: "https://images.unsplash.com/photo-1590086782792-42dd2350140d?auto=format&fit=crop&w=100&h=100&q=80",
        name: "Shivam Malhotra",
        role: "Startup Recruiter",
    },
];

export default function TestimonialsSection() {
    const [userReviews, setUserReviews] = useState<Testimonial[]>([]);

    const fetchReviews = useCallback(async () => {
        try {
            const res = await api.get("/reviews");
            if (res.data.success) {
                setUserReviews(
                    res.data.reviews.map((r: any) => ({
                        text: r.text,
                        image: r.image || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=100&h=100&q=80",
                        name: r.name,
                        role: r.role,
                    }))
                );
            }
        } catch {
            // Silent fail for public endpoint
        }
    }, []);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    const allTestimonials = [...userReviews, ...hardcodedTestimonials];
    const firstColumn = allTestimonials.slice(0, Math.ceil(allTestimonials.length / 3));
    const secondColumn = allTestimonials.slice(Math.ceil(allTestimonials.length / 3), Math.ceil((allTestimonials.length / 3) * 2));
    const thirdColumn = allTestimonials.slice(Math.ceil((allTestimonials.length / 3) * 2));

    return (
        <>
            <section id="reviews" className="bg-white dark:bg-black py-20 relative overflow-hidden">
                <div className="container z-10 mx-auto px-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                        viewport={{ once: true }}
                        className="flex flex-col items-center justify-center max-w-[640px] mx-auto mb-16"
                    >
                        <div className="flex justify-center mb-6">
                            <div className="border border-neutral-200 dark:border-neutral-800 py-1 px-4 rounded-full text-sm font-medium text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900">
                                Community
                            </div>
                        </div>

                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-center text-neutral-900 dark:text-white mb-6">
                            What our users say
                        </h2>
                        <p className="text-center text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl">
                            See what thousands of job seekers and companies have to say about their experience with SkillUp.
                        </p>
                    </motion.div>

                    <div className="flex justify-center gap-6 [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)] max-h-[740px] overflow-hidden">
                        <TestimonialsColumn testimonials={firstColumn} duration={35} />
                        <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={45} />
                        <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={40} />
                    </div>
                </div>
            </section>

            <SignedIn>
                <ReviewForm onReviewPosted={fetchReviews} />
            </SignedIn>
        </>
    );
}

function ReviewForm({ onReviewPosted }: { onReviewPosted: () => void }) {
    const { getToken } = useAuth();
    const { user } = useUser();
    const [text, setText] = useState("");
    const [role, setRole] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState("");

    const roleOptions = [
        "Software Developer",
        "Product Designer",
        "Data Analyst",
        "Product Manager",
        "Marketing Manager",
        "HR Professional",
        "Business Analyst",
        "Engineering Manager",
        "Operations Manager",
        "Recruitment Lead",
        "Startup Founder",
        "Student",
        "Freelancer",
        "Other",
    ];

    const maxLen = 500;

    const handleSubmit = async () => {
        if (!text.trim()) return;
        setSubmitting(true);
        setError("");

        try {
            const token = await getToken();
            const reviewName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Anonymous";
            await api.post(
                "/reviews",
                {
                    text: text.trim(),
                    name: reviewName,
                    image: user?.imageUrl || "",
                    role: role || "SkillUp User",
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSubmitted(true);
            setText("");
            onReviewPosted();
        } catch (err: any) {
            if (err?.response?.status === 409) {
                setError("You've already submitted a review.");
                setSubmitted(true);
            } else {
                setError(err?.response?.data?.message || "Failed to post review. Please try again.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    const userName = user ? [user.firstName, user.lastName].filter(Boolean).join(" ") : "You";
    const userImage = user?.imageUrl;

    return (
        <section className="bg-white dark:bg-black py-20 relative overflow-hidden">
            <div className="container mx-auto px-4">
                {/* Section header — matching "What our users say" style */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    viewport={{ once: true }}
                    className="flex flex-col items-center justify-center max-w-[640px] mx-auto mb-12"
                >
                    <div className="flex justify-center mb-6">
                        <div className="border border-neutral-200 dark:border-neutral-800 py-1 px-4 rounded-full text-sm font-medium text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-900">
                            Your Voice
                        </div>
                    </div>

                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-center text-neutral-900 dark:text-white mb-6">
                        Leave a Review
                    </h2>
                    <p className="text-center text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl">
                        Share your experience and help others discover what SkillUp can do for their career.
                    </p>
                </motion.div>

                {/* Form card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    viewport={{ once: true }}
                    className="max-w-xl mx-auto"
                >
                    <AnimatePresence mode="wait">
                        {submitted ? (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-10 rounded-3xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg shadow-black/5 dark:shadow-white/5 text-center"
                            >
                                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
                                    <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">✓</span>
                                </div>
                                <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                                    Thank you for your review!
                                </h3>
                                <p className="text-neutral-500 dark:text-neutral-400">
                                    Your review is now live in the community section above.
                                </p>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="form"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="p-8 rounded-3xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-lg shadow-black/5 dark:shadow-white/5"
                            >
                                {/* User identity */}
                                <div className="flex items-center gap-3 mb-6">
                                    {userImage ? (
                                        <img
                                            src={userImage}
                                            alt={userName}
                                            className="w-11 h-11 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-11 h-11 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300 font-bold text-sm">
                                            {userName.charAt(0)}
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-semibold text-neutral-900 dark:text-white leading-tight">{userName}</p>
                                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Posting publicly</p>
                                    </div>
                                </div>

                                {/* Role selector */}
                                <select
                                    value={role}
                                    onChange={(e) => setRole(e.target.value)}
                                    className="w-full p-3 mb-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/50 rounded-2xl text-neutral-900 dark:text-white text-sm outline-none transition-all focus:ring-2 focus:ring-neutral-900/10 dark:focus:ring-white/10 focus:border-neutral-300 dark:focus:border-neutral-600 appearance-none cursor-pointer"
                                >
                                    <option value="" disabled>Select your role</option>
                                    {roleOptions.map((r) => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>

                                {/* Textarea */}
                                <textarea
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                    maxLength={maxLen}
                                    rows={5}
                                    placeholder="What has your experience with SkillUp been like?"
                                    className="w-full p-4 bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/50 rounded-2xl text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:ring-2 focus:ring-neutral-900/10 dark:focus:ring-white/10 focus:border-neutral-300 dark:focus:border-neutral-600 outline-none resize-none transition-all"
                                />

                                <div className="flex items-center justify-between mt-4">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs text-neutral-400 dark:text-neutral-500 tabular-nums">
                                            {text.length} / {maxLen}
                                        </span>
                                        {error && (
                                            <span className="text-xs text-red-500 dark:text-red-400">{error}</span>
                                        )}
                                    </div>

                                    <button
                                        onClick={handleSubmit}
                                        disabled={submitting || !text.trim()}
                                        className={`px-7 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${submitting || !text.trim()
                                            ? "bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-600 cursor-not-allowed"
                                            : "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-100 shadow-sm"
                                            }`}
                                    >
                                        {submitting ? "Posting..." : "Post Review"}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>
        </section>
    );
}
