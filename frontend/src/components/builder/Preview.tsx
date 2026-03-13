"use client";
import React, { useRef, useEffect, useState } from "react";
import { useResume } from "@/context/ResumeContext";
import { ModernTemplate } from "./Templates/Modern";
import { ClassicTemplate } from "./Templates/Classic";
import { ExecutiveTemplate } from "./Templates/Executive";
import { LatexTemplate } from "./Templates/Latex";
import { cn } from "@/lib/utils";
import { ChevronDown, ZoomIn, ZoomOut, RefreshCcw } from "lucide-react";

export function Preview() {
    const { resumeData, setTemplateId } = useResume();
    const containerRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);

            setTimeout(() => {
                if (mobile) {
                    // Mobile: perfectly fit the screen width, minus padding
                    const a4WidthStr = 794;
                    const availableWidth = window.innerWidth - 32;
                    let targetScale = availableWidth / a4WidthStr;
                    // Cap it to look reasonable
                    setScale(Math.max(Math.min(targetScale, 1), 0.3));
                } else if (containerRef.current) {
                    // Desktop
                    const containerWidth = containerRef.current.offsetWidth;
                    const a4Width = 794;
                    const newScale = (containerWidth - 64) / a4Width;
                    setScale(Math.max(Math.min(newScale, 1.1), 0.5));
                }
            }, 100);
        };

        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    const templates: Record<string, any> = {
        modern: ModernTemplate,
        classic: ClassicTemplate,
        executive: ExecutiveTemplate,
        latex: LatexTemplate
    };
    const SelectedTemplate = templates[resumeData.templateId] || ModernTemplate;

    return (
        <div className={cn(
            "relative w-full bg-neutral-100 dark:bg-neutral-950 print:!block print:!bg-white print:!overflow-visible print:!h-auto print:!static",
            isMobile ? "h-auto overflow-hidden bg-white dark:bg-black" : "h-full overflow-hidden"
        )}>
            {/* Toolbar */}
            <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between no-print pointer-events-none">
                <div className="flex items-center gap-2 pointer-events-auto">
                    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-full px-3 py-1.5 shadow-xl flex items-center gap-3">
                        <select
                            value={resumeData.templateId}
                            onChange={(e) => setTemplateId(e.target.value)}
                            className="bg-transparent text-xs font-bold outline-none border-none cursor-pointer text-neutral-800 dark:text-neutral-200 uppercase tracking-wider"
                        >
                            <option value="modern">Modern</option>
                            <option value="classic">Classic</option>
                            <option value="executive">Executive</option>
                            <option value="latex">LaTeX</option>
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-1.5 rounded-full shadow-xl pointer-events-auto">
                    <button onClick={() => setScale(s => Math.max(s - 0.1, 0.3))} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full text-neutral-500" title="Zoom Out"><ZoomOut size={16} /></button>
                    <span className="text-[10px] font-bold w-[4ch] text-center text-neutral-700 dark:text-neutral-300">{Math.round(scale * 100)}%</span>
                    <button onClick={() => setScale(s => Math.min(s + 0.1, 2))} className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full text-neutral-500" title="Zoom In"><ZoomIn size={16} /></button>
                </div>
            </div>

            <div
                ref={containerRef}
                className={cn(
                    "flex transition-all duration-300 print:block print:overflow-visible print:p-0 print:m-0 print:static print:h-auto",
                    isMobile ? "w-full justify-center p-4 pt-14 overflow-hidden" : "w-full h-full items-start justify-center overflow-auto p-8 pt-16 custom-scrollbar"
                )}
            >
                {/* Outer wrapper reserves the exact scaled space */}
                <div
                    className="relative transition-all duration-75 print:!w-full print:!h-auto"
                    style={{
                        width: isMobile ? `calc(210mm * ${scale})` : undefined,
                        height: isMobile ? `calc(297mm * ${scale})` : undefined,
                    }}
                >
                    {/* Inner scaled container */}
                    <div
                        id="resume-preview-content"
                        className={cn(
                            "bg-white transition-all duration-75 select-none print:!transform-none print:!shadow-none print:!m-0 print:!p-0 print:!w-[210mm] print:!h-[297mm] print:!overflow-visible border border-neutral-200 shadow-2xl",
                            isMobile ? "origin-top-left" : "origin-top mb-12"
                        )}
                        style={isMobile ? {
                            width: "210mm",
                            minHeight: "297mm",
                            transform: `scale(${scale})`,
                        } : {
                            width: "210mm",
                            minHeight: "297mm",
                            zoom: scale,
                        }}
                    >
                        <div className="resume-isolation min-h-full w-full">
                            <SelectedTemplate data={resumeData} />
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
