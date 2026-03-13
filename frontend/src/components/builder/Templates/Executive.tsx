import React from 'react';
import { ResumeData } from "@/types/resume";

const Placeholder = ({ children }: { children: React.ReactNode }) => (
    <span className="text-[#c0c4cc] italic">{children}</span>
);

export function ExecutiveTemplate({ data }: { data: ResumeData }) {
    if (!data || !data.personalInfo) return <div className="p-10 text-red-500 font-bold">Error: Data missing</div>;
    const { personalInfo, education = [], experience = [], skills = [], projects = [], achievements = [], positionsOfResponsibility = [] } = data;

    return (
        <div className="p-12 w-full md:w-[210mm] flex flex-col bg-white overflow-hidden print:!w-[210mm] print:!min-h-[297mm] print:!p-12 print:overflow-visible print:h-auto" style={{ boxSizing: 'border-box', fontFamily: 'serif', color: '#111827' }}>
            <header className="text-center mb-8 border-b-2 border-[#111827] pb-4">
                <h1 className="text-4xl font-bold uppercase tracking-widest text-[#111827]">{personalInfo.fullName || <Placeholder>Your Full Name</Placeholder>}</h1>
                <p className="text-lg italic mt-1 text-[#374151]">{personalInfo.title || <Placeholder>Executive Title</Placeholder>}</p>
                <div className="flex justify-center flex-wrap gap-x-4 mt-2 text-xs uppercase tracking-wider text-[#4b5563]">
                    <span>{personalInfo.email || <Placeholder>email@company.com</Placeholder>}</span>
                    <span>{personalInfo.phone || <Placeholder>+91-XXXXXXXXXX</Placeholder>}</span>
                    {personalInfo.location && <span>{personalInfo.location}</span>}
                </div>
            </header>

            <div className="space-y-8">
                <section>
                    <h3 className="text-md font-bold uppercase border-b border-[#111827] mb-2 tracking-widest text-[#111827]">Executive Summary</h3>
                    {personalInfo.summary
                        ? <p className="text-sm leading-relaxed italic text-[#374151]">{personalInfo.summary}</p>
                        : <p className="text-sm leading-relaxed"><Placeholder>Seasoned professional with X+ years of experience in... Write a compelling executive summary that highlights your leadership and strategic impact.</Placeholder></p>
                    }
                </section>

                <section>
                    <h3 className="text-md font-bold uppercase border-b border-[#111827] mb-3 tracking-widest text-[#111827]">Professional Experience</h3>
                    {experience.length > 0 ? (
                        <div className="space-y-6">
                            {experience.map((exp) => (
                                <div key={exp.id}>
                                    <div className="flex justify-between items-baseline font-bold uppercase text-[13px] text-[#111827]">
                                        <span>{exp.company}</span>
                                        <span className="font-normal italic not-uppercase text-xs text-[#6b7280]">{exp.startDate} — {exp.current ? 'Present' : exp.endDate}</span>
                                    </div>
                                    <div className="flex justify-between text-xs italic mb-2 text-[#4b5563]">
                                        <span>{exp.position}</span>
                                        <span>{exp.location}</span>
                                    </div>
                                    <p className="text-sm leading-snug whitespace-pre-line text-[#374151]">{exp.description}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div>
                            <div className="flex justify-between text-[13px]"><Placeholder>COMPANY NAME</Placeholder> <Placeholder>Jan 2020 — Present</Placeholder></div>
                            <div className="text-xs italic mb-2"><Placeholder>Chief Technology Officer — Location</Placeholder></div>
                            <p className="text-sm"><Placeholder>Led strategic initiatives... Describe your impact and leadership...</Placeholder></p>
                        </div>
                    )}
                </section>

                <section>
                    <h3 className="text-md font-bold uppercase border-b border-[#111827] mb-3 tracking-widest text-[#111827]">Education</h3>
                    {education.length > 0 ? (
                        <div className="space-y-4">
                            {education.map((edu) => (
                                <div key={edu.id}>
                                    <div className="flex justify-between font-bold text-sm">
                                        <span>{edu.institution}</span>
                                        <span className="font-normal text-xs">{edu.startDate} — {edu.endDate}</span>
                                    </div>
                                    <div className="flex justify-between text-sm italic">
                                        <span>{edu.degree}</span>
                                        <span className="not-italic text-xs font-bold uppercase">{edu.description}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div>
                            <div className="flex justify-between text-sm"><Placeholder>University Name</Placeholder> <Placeholder>2016 — 2020</Placeholder></div>
                            <div className="text-sm italic"><Placeholder>MBA / Master's Degree — First Class</Placeholder></div>
                        </div>
                    )}
                </section>

                <div className="grid grid-cols-2 gap-8">
                    <section>
                        <h3 className="text-md font-bold uppercase border-b border-[#111827] mb-2 tracking-widest text-[#111827]">Expertise</h3>
                        {skills.length > 0 ? (
                            <p className="text-sm leading-relaxed">{skills.map(s => s.name).join(' • ')}</p>
                        ) : (
                            <p className="text-sm"><Placeholder>Leadership • Strategy • Operations • Finance...</Placeholder></p>
                        )}
                    </section>

                    <section>
                        <h3 className="text-md font-bold uppercase border-b border-[#111827] mb-2 tracking-widest text-[#111827]">Awards & Recognition</h3>
                        {achievements.length > 0 ? (
                            <ul className="list-disc ml-4 space-y-1 text-sm">
                                {achievements.map((ach) => (
                                    <li key={ach.id}><span className="font-bold">{ach.title}</span> ({ach.date})</li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-sm"><Placeholder>Industry Award — 2023</Placeholder></div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
};
