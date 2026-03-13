import React from 'react';
import { Mail, Phone, MapPin, Globe, Github, Linkedin } from 'lucide-react';
import { ResumeData } from "@/types/resume";

const Placeholder = ({ children }: { children: React.ReactNode }) => (
    <span className="text-[#c0c4cc] italic">{children}</span>
);

export function ModernTemplate({ data }: { data: ResumeData }) {
    if (!data || !data.personalInfo) return <div className="p-10 text-red-500 font-bold">Error: Data missing</div>;
    const { personalInfo, education = [], experience = [], skills = [], projects = [], achievements = [], positionsOfResponsibility = [] } = data;

    return (
        <div className="p-8 md:p-12 w-full md:w-[210mm] flex flex-col bg-white overflow-hidden print:!w-[210mm] print:!min-h-[297mm] print:!p-12 print:overflow-visible print:h-auto" style={{ boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif', color: '#111827' }}>
            <header className="mb-6 border-b-2 border-[#4A6CF7] pb-4">
                <h1 className="text-4xl font-bold text-[#111827]">{personalInfo.fullName || <Placeholder>Your Full Name</Placeholder>}</h1>
                <p className="text-xl text-[#4A6CF7] font-medium mt-1">{personalInfo.title || <Placeholder>Job Title / Role</Placeholder>}</p>
                <div className="flex flex-wrap gap-4 mt-4 text-sm text-[#4b5563]">
                    <div className="flex items-center gap-1"><Mail size={14} /><span>{personalInfo.email || <Placeholder>email@example.com</Placeholder>}</span></div>
                    <div className="flex items-center gap-1"><Phone size={14} /><span>{personalInfo.phone || <Placeholder>+91-XXXXXXXXXX</Placeholder>}</span></div>
                    {personalInfo.location && <div className="flex items-center gap-1"><MapPin size={14} /><span>{personalInfo.location}</span></div>}
                    {personalInfo.website && <div className="flex items-center gap-1"><Globe size={14} /><span>{personalInfo.website}</span></div>}
                    {personalInfo.github && <div className="flex items-center gap-1"><Github size={14} /><span>{(personalInfo.github || '').replace('https://', '')}</span></div>}
                    {personalInfo.linkedin && <div className="flex items-center gap-1"><Linkedin size={14} /><span>{(personalInfo.linkedin || '').replace(/https:\/\/(www\.)?linkedin\.com\/in\//, '')}</span></div>}
                </div>
                {personalInfo.summary
                    ? <div className="mt-4 text-sm leading-relaxed text-[#374151] italic"><p>{personalInfo.summary}</p></div>
                    : <div className="mt-4 text-sm leading-relaxed italic"><Placeholder>Write a brief professional summary highlighting your key skills and experience...</Placeholder></div>
                }
            </header>

            <div className="grid grid-cols-3 gap-8">
                <div className="col-span-2 space-y-6">
                    <section>
                        <h3 className="text-lg font-bold uppercase tracking-wider text-[#111827] border-b border-gray-200 pb-1 mb-3">Experience</h3>
                        {experience.length > 0 ? (
                            <div className="space-y-4">
                                {experience.map((exp) => (
                                    <div key={exp.id}>
                                        <div className="flex justify-between items-baseline">
                                            <h4 className="font-bold text-[#111827]">{exp.position}</h4>
                                            <span className="text-xs text-[#6b7280] font-medium">{exp.startDate} - {exp.current ? 'Present' : exp.endDate}</span>
                                        </div>
                                        <div className="text-[#4A6CF7] text-sm font-medium">{exp.company} {exp.location && `• ${exp.location}`}</div>
                                        <p className="text-sm text-[#374151] mt-1 leading-snug whitespace-pre-line">{exp.description}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <Placeholder>Software Engineer at Company Name</Placeholder><br />
                                <Placeholder>Jan 2023 - Present • Description of your role and achievements...</Placeholder>
                            </div>
                        )}
                    </section>

                    <section>
                        <h3 className="text-lg font-bold uppercase tracking-wider text-[#111827] border-b border-gray-200 pb-1 mb-3">Projects</h3>
                        {projects.length > 0 ? (
                            <div className="space-y-4">
                                {projects.map((proj) => (
                                    <div key={proj.id}>
                                        <div className="flex justify-between items-baseline">
                                            <h4 className="font-bold text-[#111827]">{proj.name}</h4>
                                            <span className="text-xs text-[#6b7280] font-medium">{proj.startDate} - {proj.endDate}</span>
                                        </div>
                                        {proj.technologies && <p className="text-xs text-[#4A6CF7]/80 font-medium mb-1 truncate"><i>Tech: {proj.technologies}</i></p>}
                                        <p className="text-sm text-[#374151] leading-snug">{proj.description}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <Placeholder>Project Name — React, Node.js, MongoDB</Placeholder><br />
                                <Placeholder>Brief description of project and your contributions...</Placeholder>
                            </div>
                        )}
                    </section>
                </div>

                <div className="space-y-6">
                    <section>
                        <h3 className="text-lg font-bold uppercase tracking-wider text-[#111827] border-b border-gray-200 pb-1 mb-3">Education</h3>
                        {education.length > 0 ? (
                            <div className="space-y-4">
                                {education.map((edu) => (
                                    <div key={edu.id}>
                                        <h4 className="font-bold text-[#111827] text-sm leading-tight">{edu.institution}</h4>
                                        <p className="text-sm text-[#374151]">{edu.degree}</p>
                                        <div className="text-xs text-[#6b7280] font-medium mt-1">{edu.startDate} - {edu.endDate}</div>
                                        {edu.description && <p className="text-xs text-[#4A6CF7] font-medium mt-0.5">{edu.description}</p>}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div><Placeholder>University Name — B.Tech, 2021-2025</Placeholder></div>
                        )}
                    </section>

                    <section>
                        <h3 className="text-lg font-bold uppercase tracking-wider text-[#111827] border-b border-gray-200 pb-1 mb-3">Skills</h3>
                        {skills.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {skills.map((skill) => (
                                    <div key={skill.id} className="bg-gray-100 text-[#374151] px-2.5 py-1 rounded text-xs font-semibold border border-gray-200">{skill.name}</div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                <span className="bg-gray-50 text-[#c0c4cc] px-2.5 py-1 rounded text-xs font-semibold border border-gray-100 italic">JavaScript</span>
                                <span className="bg-gray-50 text-[#c0c4cc] px-2.5 py-1 rounded text-xs font-semibold border border-gray-100 italic">React</span>
                                <span className="bg-gray-50 text-[#c0c4cc] px-2.5 py-1 rounded text-xs font-semibold border border-gray-100 italic">Node.js</span>
                            </div>
                        )}
                    </section>

                    <section>
                        <h3 className="text-lg font-bold uppercase tracking-wider text-[#111827] border-b border-gray-200 pb-1 mb-3">Highlights</h3>
                        {achievements.length > 0 ? (
                            <div className="space-y-3">
                                {achievements.map((ach) => (
                                    <div key={ach.id}>
                                        <div className="font-bold text-[#111827] text-[13px] leading-tight">{ach.title}</div>
                                        <p className="text-xs text-[#6b7280] mt-0.5">{ach.description}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div><Placeholder>Award Name — Brief description of achievement...</Placeholder></div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
};
