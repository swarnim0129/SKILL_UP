import React from 'react';
import { ResumeData } from "@/types/resume";

const Placeholder = ({ children }: { children: React.ReactNode }) => (
    <span className="text-[#c0c4cc] italic">{children}</span>
);

export function ClassicTemplate({ data }: { data: ResumeData }) {
    if (!data || !data.personalInfo) return <div className="p-10 text-red-500 font-bold">Error: Data missing</div>;
    const { personalInfo, education = [], experience = [], skills = [], projects = [], achievements = [], positionsOfResponsibility = [] } = data;

    return (
        <div className="p-12 w-full md:w-[210mm] flex flex-col bg-white overflow-hidden print:!w-[210mm] print:!min-h-[297mm] print:!p-12 print:overflow-visible print:h-auto" style={{ boxSizing: 'border-box', fontFamily: 'serif', color: '#000000' }}>
            <header className="text-center mb-6">
                <h1 className="text-3xl font-bold uppercase tracking-wide border-b-2 border-black inline-block px-4 pb-1 text-[#000000]">{personalInfo.fullName || <Placeholder>Your Full Name</Placeholder>}</h1>
                <div className="mt-3 text-sm flex justify-center flex-wrap gap-x-4 gap-y-1 text-[#000000]">
                    <span>{personalInfo.email || <Placeholder>email@example.com</Placeholder>}</span>
                    <span>{personalInfo.phone || <Placeholder>+91-XXXXXXXXXX</Placeholder>}</span>
                    {personalInfo.location && <span>{personalInfo.location}</span>}
                </div>
                <div className="mt-1 text-xs text-[#6b7280] uppercase tracking-widest">
                    {personalInfo.title || <Placeholder>Professional Title</Placeholder>}
                </div>
            </header>

            <div className="space-y-6">
                <section>
                    <h3 className="text-xs font-bold uppercase tracking-widest border-b border-[#d1d5db] pb-0.5 mb-2 text-[#000000]">Professional Summary</h3>
                    {personalInfo.summary
                        ? <p className="text-[13px] leading-relaxed text-justify text-[#374151]">{personalInfo.summary}</p>
                        : <p className="text-[13px] leading-relaxed"><Placeholder>Write a compelling 2-3 sentence summary of your professional background and career goals...</Placeholder></p>
                    }
                </section>

                <section>
                    <h3 className="text-xs font-bold uppercase tracking-widest border-b border-[#d1d5db] pb-0.5 mb-2 text-[#000000]">Experience</h3>
                    {experience.length > 0 ? (
                        <div className="space-y-4">
                            {experience.map((exp) => (
                                <div key={exp.id}>
                                    <div className="flex justify-between font-bold text-[13px] text-[#000000]">
                                        <span>{exp.company}</span>
                                        <span className="font-normal text-xs text-[#6b7280]">{exp.startDate} - {exp.current ? 'Present' : exp.endDate}</span>
                                    </div>
                                    <div className="flex justify-between items-baseline text-xs italic mb-1 text-[#000000]">
                                        <span className="font-bold">{exp.position}</span>
                                        <span>{exp.location}</span>
                                    </div>
                                    <p className="text-[13px] leading-snug whitespace-pre-line text-[#374151]">{exp.description}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div>
                            <div className="flex justify-between text-[13px]"><Placeholder>Company Name</Placeholder> <Placeholder>Jan 2023 - Present</Placeholder></div>
                            <div className="text-xs italic mb-1"><Placeholder>Software Engineer — Remote</Placeholder></div>
                            <p className="text-[13px]"><Placeholder>Key responsibilities and achievements...</Placeholder></p>
                        </div>
                    )}
                </section>

                <section>
                    <h3 className="text-xs font-bold uppercase tracking-widest border-b border-[#d1d5db] pb-0.5 mb-2 text-[#000000]">Education</h3>
                    {education.length > 0 ? (
                        <div className="space-y-3">
                            {education.map((edu) => (
                                <div key={edu.id}>
                                    <div className="flex justify-between font-bold text-[13px]">
                                        <span>{edu.institution}</span>
                                        <span className="font-normal text-xs">{edu.startDate} - {edu.endDate}</span>
                                    </div>
                                    <div className="flex justify-between text-xs italic">
                                        <span>{edu.degree}</span>
                                        <span className="not-italic font-bold">{edu.description}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div>
                            <div className="flex justify-between text-[13px]"><Placeholder>University Name</Placeholder> <Placeholder>2021 - 2025</Placeholder></div>
                            <div className="text-xs italic"><Placeholder>B.Tech in Computer Science — CGPA: X.X</Placeholder></div>
                        </div>
                    )}
                </section>

                <section>
                    <h3 className="text-xs font-bold uppercase tracking-widest border-b border-[#d1d5db] pb-0.5 mb-2 text-[#000000]">Key Projects</h3>
                    {projects.length > 0 ? (
                        <div className="space-y-3">
                            {projects.map((proj) => (
                                <div key={proj.id}>
                                    <div className="flex justify-between font-bold text-[13px]">
                                        <span>{proj.name}</span>
                                        <span className="font-normal text-xs">{proj.startDate} - {proj.endDate}</span>
                                    </div>
                                    {proj.technologies && <p className="text-[11px] font-bold text-gray-600 mb-0.5 uppercase tracking-tighter">{proj.technologies}</p>}
                                    <p className="text-[12px] leading-snug italic text-gray-700">{proj.description}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div>
                            <div className="flex justify-between text-[13px]"><Placeholder>Project Name</Placeholder> <Placeholder>Jan 2024 - Present</Placeholder></div>
                            <p className="text-[12px]"><Placeholder>Description of project and outcomes...</Placeholder></p>
                        </div>
                    )}
                </section>

                <div className="grid grid-cols-2 gap-8">
                    <section>
                        <h3 className="text-xs font-bold uppercase tracking-widest border-b border-[#d1d5db] pb-0.5 mb-2 text-[#000000]">Technical Core</h3>
                        {skills.length > 0 ? (
                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                                {skills.map(s => (
                                    <span key={s.id} className="text-[12px]">• {s.name}</span>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                                <Placeholder>• JavaScript • React • Python</Placeholder>
                            </div>
                        )}
                    </section>

                    <section>
                        <h3 className="text-xs font-bold uppercase tracking-widest border-b border-[#d1d5db] pb-0.5 mb-2 text-[#000000]">Accomplishments</h3>
                        {achievements.length > 0 ? (
                            <ul className="space-y-1 text-[12px]">
                                {achievements.map((ach) => (
                                    <li key={ach.id} className="flex justify-between">
                                        <span className="font-medium text-[11px] uppercase tracking-tighter">{ach.title}</span>
                                        <span className="text-[10px] text-gray-500">{ach.date}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-[12px]"><Placeholder>Award or recognition — 2023</Placeholder></div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
};
