"use client";
import React, { useState } from 'react';
import { useResume } from '@/context/ResumeContext';
import { User, Briefcase, GraduationCap, Code, Plus, Trash2, Award, Users, Folder } from 'lucide-react';
import { cn } from '@/lib/utils';

const FormSection = ({ title, children, onAdd, icon: Icon }: { title: string; children: React.ReactNode; onAdd?: () => void; icon: any }) => (
    <div className="space-y-4">
        <div className="flex justify-between items-center border-b border-neutral-100 dark:border-neutral-800 pb-2">
            <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <Icon size={18} />
                </div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
                    {title}
                </h3>
            </div>
            {onAdd && (
                <button
                    onClick={onAdd}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary/5 rounded-full transition-colors border border-primary/20"
                >
                    <Plus size={14} /> Add
                </button>
            )}
        </div>
        <div className="space-y-6">
            {children}
        </div>
    </div>
);

const InputGroup = ({ label, children, fullWidth }: { label: string; children: React.ReactNode; fullWidth?: boolean }) => (
    <div className={cn("space-y-1.5", fullWidth ? "col-span-2" : "col-span-1")}>
        <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">
            {label}
        </label>
        {children}
    </div>
);

const PersonalInfoForm = () => {
    const { resumeData, updatePersonalInfo } = useResume();
    const { personalInfo } = resumeData;

    if (!personalInfo) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        updatePersonalInfo({ [name]: value });
    };
    return (
        <FormSection title="Personal Details" icon={User}>
            <div className="grid grid-cols-2 gap-4">
                <InputGroup label="Full Name">
                    <input type="text" name="fullName" value={personalInfo.fullName} onChange={handleChange} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                </InputGroup>
                <InputGroup label="Job Title">
                    <input type="text" name="title" value={personalInfo.title} onChange={handleChange} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                </InputGroup>
                <InputGroup label="Email">
                    <input type="email" name="email" value={personalInfo.email} onChange={handleChange} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                </InputGroup>
                <InputGroup label="Phone">
                    <input type="text" name="phone" value={personalInfo.phone} onChange={handleChange} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                </InputGroup>
                <InputGroup label="Location">
                    <input type="text" name="location" value={personalInfo.location} onChange={handleChange} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                </InputGroup>
                <InputGroup label="Website">
                    <input type="text" name="website" value={personalInfo.website} onChange={handleChange} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                </InputGroup>
                <InputGroup label="GitHub">
                    <input type="text" name="github" value={personalInfo.github || ''} onChange={handleChange} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                </InputGroup>
                <InputGroup label="LinkedIn">
                    <input type="text" name="linkedin" value={personalInfo.linkedin || ''} onChange={handleChange} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                </InputGroup>
                <InputGroup label="Roll No." fullWidth>
                    <input type="text" name="roll" value={personalInfo.roll || ''} onChange={handleChange} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                </InputGroup>
                <InputGroup label="Professional Summary" fullWidth>
                    <textarea name="summary" rows={4} value={personalInfo.summary} onChange={handleChange} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none" />
                </InputGroup>
            </div>
        </FormSection>
    );
};

const ExperienceForm = () => {
    const { resumeData, addSectionItem, removeSectionItem, updateSectionItem } = useResume();
    const handleAdd = () => addSectionItem('experience', { company: '', position: '', startDate: '', endDate: '', current: false, location: '', description: '' });
    return (
        <FormSection title="Experience" icon={Briefcase} onAdd={handleAdd}>
            {resumeData.experience.map((item) => (
                <div key={item.id} className="relative p-4 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-black shadow-sm group">
                    <button onClick={() => removeSectionItem('experience', item.id)} className="absolute top-2 right-2 p-1.5 text-neutral-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all"><Trash2 size={16} /></button>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <InputGroup label="Company" fullWidth>
                            <input type="text" value={item.company} onChange={(e) => updateSectionItem('experience', item.id, { company: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm outline-none" />
                        </InputGroup>
                        <InputGroup label="Position" fullWidth>
                            <input type="text" value={item.position} onChange={(e) => updateSectionItem('experience', item.id, { position: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm outline-none" />
                        </InputGroup>
                        <InputGroup label="Start Date">
                            <input type="text" placeholder="Jan 2022" value={item.startDate} onChange={(e) => updateSectionItem('experience', item.id, { startDate: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm outline-none" />
                        </InputGroup>
                        <InputGroup label="End Date">
                            <input type="text" placeholder="Present" value={item.endDate} disabled={item.current} onChange={(e) => updateSectionItem('experience', item.id, { endDate: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm outline-none disabled:opacity-50" />
                        </InputGroup>
                        <div className="col-span-2 flex items-center gap-2">
                            <input type="checkbox" checked={item.current} id={`cur-${item.id}`} onChange={(e) => updateSectionItem('experience', item.id, { current: e.target.checked, endDate: e.target.checked ? 'Present' : '' })} className="w-4 h-4 rounded border-neutral-300 text-primary focus:ring-primary" />
                            <label htmlFor={`cur-${item.id}`} className="text-xs font-medium text-neutral-600 dark:text-neutral-400 cursor-pointer">Currently working here</label>
                        </div>
                        <InputGroup label="Description" fullWidth>
                            <textarea rows={3} value={item.description} onChange={(e) => updateSectionItem('experience', item.id, { description: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm outline-none resize-none" />
                        </InputGroup>
                    </div>
                </div>
            ))}
        </FormSection>
    );
};

const EducationForm = () => {
    const { resumeData, addSectionItem, removeSectionItem, updateSectionItem } = useResume();
    const handleAdd = () => addSectionItem('education', { institution: '', degree: '', startDate: '', endDate: '', location: '', description: '' });
    return (
        <FormSection title="Education" icon={GraduationCap} onAdd={handleAdd}>
            {resumeData.education.map((item) => (
                <div key={item.id} className="relative p-4 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-black shadow-sm group">
                    <button onClick={() => removeSectionItem('education', item.id)} className="absolute top-2 right-2 p-1.5 text-neutral-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all"><Trash2 size={16} /></button>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <InputGroup label="Institution" fullWidth>
                            <input type="text" value={item.institution} onChange={(e) => updateSectionItem('education', item.id, { institution: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm outline-none" />
                        </InputGroup>
                        <InputGroup label="Degree" fullWidth>
                            <input type="text" value={item.degree} onChange={(e) => updateSectionItem('education', item.id, { degree: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm outline-none" />
                        </InputGroup>
                        <InputGroup label="Start Date">
                            <input type="text" value={item.startDate} onChange={(e) => updateSectionItem('education', item.id, { startDate: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm outline-none" />
                        </InputGroup>
                        <InputGroup label="End Date">
                            <input type="text" value={item.endDate} onChange={(e) => updateSectionItem('education', item.id, { endDate: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm outline-none" />
                        </InputGroup>
                        <InputGroup label="Grade / CGPA" fullWidth>
                            <input type="text" value={item.description} onChange={(e) => updateSectionItem('education', item.id, { description: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm outline-none" />
                        </InputGroup>
                    </div>
                </div>
            ))}
        </FormSection>
    );
};

const ProjectsForm = () => {
    const { resumeData, addSectionItem, removeSectionItem, updateSectionItem } = useResume();
    const handleAdd = () => addSectionItem('projects', { name: '', description: '', startDate: '', endDate: '', technologies: '' });
    return (
        <FormSection title="Projects" icon={Folder} onAdd={handleAdd}>
            {resumeData.projects.map((item) => (
                <div key={item.id} className="relative p-4 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-black shadow-sm group">
                    <button onClick={() => removeSectionItem('projects', item.id)} className="absolute top-2 right-2 p-1.5 text-neutral-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all"><Trash2 size={16} /></button>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <InputGroup label="Project Name" fullWidth>
                            <input type="text" value={item.name} onChange={(e) => updateSectionItem('projects', item.id, { name: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm outline-none" />
                        </InputGroup>
                        <InputGroup label="Technologies" fullWidth>
                            <input type="text" value={item.technologies} onChange={(e) => updateSectionItem('projects', item.id, { technologies: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm outline-none" />
                        </InputGroup>
                        <InputGroup label="Start Date">
                            <input type="text" value={item.startDate} onChange={(e) => updateSectionItem('projects', item.id, { startDate: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm outline-none" />
                        </InputGroup>
                        <InputGroup label="End Date">
                            <input type="text" value={item.endDate} onChange={(e) => updateSectionItem('projects', item.id, { endDate: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm outline-none" />
                        </InputGroup>
                        <InputGroup label="Description" fullWidth>
                            <textarea rows={2} value={item.description} onChange={(e) => updateSectionItem('projects', item.id, { description: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm outline-none resize-none" />
                        </InputGroup>
                    </div>
                </div>
            ))}
        </FormSection>
    );
};

const SkillsForm = () => {
    const { resumeData, addSectionItem, removeSectionItem, updateSectionItem } = useResume();
    const handleAdd = () => addSectionItem('skills', { name: '', level: 'Expert' });
    return (
        <FormSection title="Skills" icon={Code} onAdd={handleAdd}>
            <div className="grid grid-cols-2 gap-3">
                {resumeData.skills.map((item) => (
                    <div key={item.id} className="relative flex items-center gap-2 p-2 rounded-lg border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 group">
                        <input type="text" value={item.name} onChange={(e) => updateSectionItem('skills', item.id, { name: e.target.value })} className="flex-1 bg-transparent border-none p-0 text-sm font-medium outline-none" placeholder="Skill name" />
                        <button onClick={() => removeSectionItem('skills', item.id)} className="p-1 text-neutral-300 hover:text-red-500 rounded transition-colors"><Trash2 size={14} /></button>
                    </div>
                ))}
            </div>
        </FormSection>
    );
};

const AchievementsForm = () => {
    const { resumeData, addSectionItem, removeSectionItem, updateSectionItem } = useResume();
    const handleAdd = () => addSectionItem('achievements', { title: '', description: '', date: '' });
    return (
        <FormSection title="Achievements" icon={Award} onAdd={handleAdd}>
            {resumeData.achievements.map((item) => (
                <div key={item.id} className="relative p-4 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-black shadow-sm">
                    <button onClick={() => removeSectionItem('achievements', item.id)} className="absolute top-2 right-2 p-1.5 text-neutral-300 hover:text-red-500 rounded-lg"><Trash2 size={16} /></button>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                        <InputGroup label="Achievement Title" fullWidth>
                            <input type="text" value={item.title} onChange={(e) => updateSectionItem('achievements', item.id, { title: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm outline-none" />
                        </InputGroup>
                        <InputGroup label="Description" fullWidth>
                            <input type="text" value={item.description} onChange={(e) => updateSectionItem('achievements', item.id, { description: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm outline-none" />
                        </InputGroup>
                        <InputGroup label="Date" fullWidth>
                            <input type="text" value={item.date} onChange={(e) => updateSectionItem('achievements', item.id, { date: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm outline-none" />
                        </InputGroup>
                    </div>
                </div>
            ))}
        </FormSection>
    );
};

const PORForm = () => {
    const { resumeData, addSectionItem, removeSectionItem, updateSectionItem } = useResume();
    const handleAdd = () => addSectionItem('positionsOfResponsibility', { role: '', organization: '', tenure: '' });
    return (
        <FormSection title="Responsibility" icon={Users} onAdd={handleAdd}>
            {resumeData.positionsOfResponsibility.map((item) => (
                <div key={item.id} className="relative p-4 rounded-xl border border-neutral-100 dark:border-neutral-800 bg-white dark:bg-black shadow-sm">
                    <button onClick={() => removeSectionItem('positionsOfResponsibility', item.id)} className="absolute top-2 right-2 p-1.5 text-neutral-300 hover:text-red-500 rounded-lg"><Trash2 size={16} /></button>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                        <InputGroup label="Role">
                            <input type="text" value={item.role} onChange={(e) => updateSectionItem('positionsOfResponsibility', item.id, { role: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm outline-none" />
                        </InputGroup>
                        <InputGroup label="Organization">
                            <input type="text" value={item.organization} onChange={(e) => updateSectionItem('positionsOfResponsibility', item.id, { organization: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm outline-none" />
                        </InputGroup>
                        <InputGroup label="Tenure" fullWidth>
                            <input type="text" value={item.tenure} onChange={(e) => updateSectionItem('positionsOfResponsibility', item.id, { tenure: e.target.value })} className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md px-3 py-2 text-sm outline-none" />
                        </InputGroup>
                    </div>
                </div>
            ))}
        </FormSection>
    );
};

export function Editor() {
    const [activeSection, setActiveSection] = useState('personal');
    const sections = [
        { id: 'personal', label: 'Personal', icon: User },
        { id: 'education', label: 'Education', icon: GraduationCap },
        { id: 'experience', label: 'Experience', icon: Briefcase },
        { id: 'projects', label: 'Projects', icon: Folder },
        { id: 'skills', label: 'Skills', icon: Code },
        { id: 'achievements', label: 'Awards', icon: Award },
        { id: 'pors', label: 'Roles', icon: Users },
    ];

    const renderSection = () => {
        switch (activeSection) {
            case 'personal': return <PersonalInfoForm />;
            case 'education': return <EducationForm />;
            case 'experience': return <ExperienceForm />;
            case 'projects': return <ProjectsForm />;
            case 'skills': return <SkillsForm />;
            case 'achievements': return <AchievementsForm />;
            case 'pors': return <PORForm />;
            default: return null;
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-black">
            <nav className="flex items-center gap-1 p-3 border-b border-neutral-100 dark:border-neutral-800 overflow-x-auto no-scrollbar shrink-0">
                {sections.map((s) => (
                    <button
                        key={s.id}
                        onClick={() => setActiveSection(s.id)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                            activeSection === s.id
                                ? "bg-primary text-white shadow-lg shadow-primary/20"
                                : "text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                        )}
                    >
                        <s.icon size={14} />
                        <span className="hidden sm:inline">{s.label}</span>
                    </button>
                ))}
            </nav>
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                <div className="max-w-xl mx-auto">
                    {renderSection()}
                </div>
            </div>
        </div>
    );
}
