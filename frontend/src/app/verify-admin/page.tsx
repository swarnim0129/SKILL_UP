"use client";

import { useState } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import LandingNavbar from "@/components/LandingNavbar";
import { TrendingUp, ArrowRight, Loader2 } from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5500";

export default function VerifyAdminPage() {
    const { user, isLoaded } = useUser();
    const { getToken } = useAuth();
    const router = useRouter();
    const [adminCode, setAdminCode] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleAdminSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const token = await getToken();
            const response = await fetch(`${API_BASE_URL}/onboarding/admin`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    adminCode,
                    email: user?.primaryEmailAddress?.emailAddress,
                    firstName: user?.firstName,
                    lastName: user?.lastName
                }),
            });

            const data = await response.json();

            if (response.ok) {
                router.push(data.redirectUrl || "/admin/dashboard");
            } else {
                console.error("Error:", data.message);
                alert(data.message || "Failed to create admin profile");
            }
        } catch (error) {
            console.error("Submit error:", error);
            alert("Failed to create profile. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isLoaded) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        );
    }

    const inputStyles = "w-full px-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent";
    const labelStyles = "block text-sm font-medium text-white mb-2";

    return (
        <div className="min-h-screen bg-neutral-950">
            <LandingNavbar />
            <div className="pt-24 pb-12 px-4 flex items-center justify-center min-h-[80vh]">
                <div className="w-full max-w-md">
                    <form
                        onSubmit={handleAdminSubmit}
                        className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 space-y-6"
                    >
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <TrendingUp className="w-8 h-8 text-red-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Admin Verification</h2>
                            <p className="text-neutral-400 mt-2">Enter the secret code to proceed</p>
                        </div>

                        <div>
                            <label htmlFor="adminCode" className={labelStyles}>
                                Admin Code
                            </label>
                            <input
                                type="password"
                                id="adminCode"
                                name="adminCode"
                                required
                                value={adminCode}
                                onChange={(e) => setAdminCode(e.target.value)}
                                className={`${inputStyles} text-center tracking-widest text-xl`}
                                placeholder="•••••"
                            />
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={isSubmitting || !adminCode}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white font-medium rounded-lg transition-colors cursor-pointer"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    Verify & Continue
                                    <ArrowRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
