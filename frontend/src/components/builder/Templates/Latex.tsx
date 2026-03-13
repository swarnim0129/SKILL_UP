import { ResumeData } from "@/types/resume";
import React from 'react';
import { Mail, Phone, Github, Linkedin } from 'lucide-react';

const Placeholder = ({ children }: { children: React.ReactNode }) => (
    <span className="text-[#c0c4cc] italic">{children}</span>
);

export function LatexTemplate({ data }: { data: ResumeData }) {
    if (!data || !data.personalInfo) return <div className="p-10 text-red-500 font-bold">Error: Data missing</div>;
    const { personalInfo, education = [], experience = [], skills = [], projects = [], achievements = [], positionsOfResponsibility = [] } = data;

    return (
        <div className="p-8 md:p-12 w-full md:w-[210mm] flex flex-col bg-white overflow-hidden print:!w-[210mm] print:!min-h-[297mm] print:!p-12 print:overflow-visible print:h-auto" style={{ fontFamily: "'Times New Roman', Times, serif", boxSizing: 'border-box', color: '#000000' }}>
            <div className="border-b-2 border-black pb-2 mb-4">
                <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold uppercase tracking-tight text-[#000000]">{personalInfo.fullName || <Placeholder>Your Full Name</Placeholder>}</h1>
                        <div className="mt-1 text-sm space-y-0.5 text-[#000000]">
                            {personalInfo.roll ? <div>Roll No.: {personalInfo.roll}</div> : <div><Placeholder>Roll No.: XXXXXXX</Placeholder></div>}
                            {personalInfo.course ? <div>{personalInfo.course}</div> : <div><Placeholder>B.Tech in Computer Science</Placeholder></div>}
                            {personalInfo.college ? <div className="font-semibold">{personalInfo.college}</div> : <div><Placeholder>Your College / University</Placeholder></div>}
                        </div>
                    </div>
                    <div className="text-right text-[11px] space-y-1 text-[#000000]">
                        <div className="flex items-center justify-end gap-1"><Phone size={10} /> {personalInfo.phone || <Placeholder>+91-XXXXXXXXXX</Placeholder>}</div>
                        <div className="flex items-center justify-end gap-1"><Mail size={10} /> <span>{personalInfo.email || <Placeholder>email@example.com</Placeholder>}</span></div>
                        {personalInfo.github && <div className="flex items-center justify-end gap-1"><Github size={10} /> <span className="hover:underline">{personalInfo.github.replace('https://', '')}</span></div>}
                        {personalInfo.linkedin && <div className="flex items-center justify-end gap-1"><Linkedin size={10} /> <span className="hover:underline">{personalInfo.linkedin.replace(/https:\/\/(www\.)?linkedin\.com\/in\//, '')}</span></div>}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <section>
                    <h3 className="text-sm font-bold uppercase bg-[#f3f4f6] px-2 py-0.5 mb-2 text-[#000000]">Education</h3>
                    {education.length > 0 ? education.map((edu) => (
                        <div key={edu.id} className="mb-2 text-[12px] text-[#000000]">
                            <div className="flex justify-between font-bold">
                                <span>{edu.institution}</span>
                                <span className="italic font-normal">{edu.description}</span>
                            </div>
                            <div className="flex justify-between italic">
                                <span>{edu.degree}</span>
                                <span className="not-italic">{edu.startDate} - {edu.endDate}</span>
                            </div>
                        </div>
                    )) : (
                        <div className="mb-2 text-[12px]">
                            <div className="flex justify-between"><Placeholder>University Name</Placeholder> <Placeholder>CGPA: X.X/10</Placeholder></div>
                            <div className="flex justify-between"><Placeholder>B.Tech in Computer Science</Placeholder> <Placeholder>2021 - 2025</Placeholder></div>
                        </div>
                    )}
                </section>

                <section>
                    <h3 className="text-sm font-bold uppercase bg-[#f3f4f6] px-2 py-0.5 mb-2 text-[#000000]">Experience</h3>
                    {experience.length > 0 ? experience.map((exp) => (
                        <div key={exp.id} className="mb-3 text-[12px]">
                            <div className="flex justify-between font-bold">
                                <span>{exp.company}</span>
                                <span className="italic font-normal">{exp.location}</span>
                            </div>
                            <div className="flex justify-between italic mb-1">
                                <span>{exp.position}</span>
                                <span className="not-italic">{exp.startDate} - {exp.endDate}</span>
                            </div>
                            <p className="text-[11.5px] leading-snug">{exp.description}</p>
                        </div>
                    )) : (
                        <div className="mb-3 text-[12px]">
                            <div className="flex justify-between"><Placeholder>Company Name</Placeholder> <Placeholder>Location</Placeholder></div>
                            <div className="flex justify-between"><Placeholder>Software Engineer Intern</Placeholder> <Placeholder>May 2023 - Jul 2023</Placeholder></div>
                            <p className="text-[11.5px] mt-1"><Placeholder>Describe your key responsibilities and achievements...</Placeholder></p>
                        </div>
                    )}
                </section>

                <section>
                    <h3 className="text-sm font-bold uppercase bg-[#f3f4f6] px-2 py-0.5 mb-2 text-[#000000]">Projects</h3>
                    {projects.length > 0 ? projects.map((proj) => (
                        <div key={proj.id} className="mb-3 text-[12px]">
                            <div className="flex justify-between font-bold">
                                <span>{proj.name}</span>
                                <span className="font-normal">{proj.startDate} - {proj.endDate}</span>
                            </div>
                            <div className="italic text-[11.5px] my-0.5">{proj.description}</div>
                            {proj.technologies && (
                                <div className="text-[11px]">
                                    <span className="font-bold">Tools & technologies used:</span> {proj.technologies}
                                </div>
                            )}
                        </div>
                    )) : (
                        <div className="mb-3 text-[12px]">
                            <div className="flex justify-between"><Placeholder>Project Name</Placeholder> <Placeholder>Jan 2024 - Present</Placeholder></div>
                            <p className="text-[11.5px] mt-0.5"><Placeholder>Brief description of your project and key outcomes...</Placeholder></p>
                            <p className="text-[11px]"><Placeholder>Tools & technologies used: React, Node.js, MongoDB</Placeholder></p>
                        </div>
                    )}
                </section>

                <section>
                    <h3 className="text-sm font-bold uppercase bg-[#f3f4f6] px-2 py-0.5 mb-2 text-[#000000]">Technical Skills</h3>
                    {skills.length > 0 ? (
                        <div className="text-[12px]">
                            <span className="font-bold">Skills:</span> {skills.map(s => s.name).join(', ')}
                        </div>
                    ) : (
                        <div className="text-[12px]"><Placeholder>Skills: JavaScript, React, Node.js, Python, SQL, Git...</Placeholder></div>
                    )}
                </section>

                <section>
                    <h3 className="text-sm font-bold uppercase bg-[#f3f4f6] px-2 py-0.5 mb-2 text-[#000000]">Positions of Responsibility</h3>
                    {positionsOfResponsibility.length > 0 ? positionsOfResponsibility.map((por) => (
                        <div key={por.id} className="flex justify-between text-[12px] mb-1">
                            <div><span className="font-bold">{por.role},</span> {por.organization}</div>
                            <div className="italic">{por.tenure}</div>
                        </div>
                    )) : (
                        <div className="flex justify-between text-[12px] mb-1">
                            <Placeholder>Role, Organization Name</Placeholder> <Placeholder>2022 - 2023</Placeholder>
                        </div>
                    )}
                </section>

                <section>
                    <h3 className="text-sm font-bold uppercase bg-[#f3f4f6] px-2 py-0.5 mb-2 text-[#000000]">Achievements</h3>
                    {achievements.length > 0 ? achievements.map((ach) => (
                        <div key={ach.id} className="flex justify-between text-[12px] mb-1">
                            <div><span className="font-bold">{ach.title}</span> - {ach.description}</div>
                            <div className="italic">{ach.date}</div>
                        </div>
                    )) : (
                        <div className="flex justify-between text-[12px] mb-1">
                            <Placeholder>Achievement Title — Brief description</Placeholder> <Placeholder>2023</Placeholder>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
