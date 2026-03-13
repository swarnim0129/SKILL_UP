"use client";
import { createContext, useContext, useState, useEffect } from 'react';
import { ResumeData } from '@/types/resume';

const ResumeContext = createContext<{
    resumeData: ResumeData;
    updatePersonalInfo: (data: Partial<ResumeData['personalInfo']>) => void;
    setTemplateId: (id: string) => void;
    updateSectionItem: (section: keyof Omit<ResumeData, 'personalInfo' | 'templateId'>, id: string, data: any) => void;
    addSectionItem: (section: keyof Omit<ResumeData, 'personalInfo' | 'templateId'>, item: any) => void;
    removeSectionItem: (section: keyof Omit<ResumeData, 'personalInfo' | 'templateId'>, id: string) => void;
    setResumeData: (data: ResumeData) => void;
} | undefined>(undefined);

export const useResume = () => {
    const context = useContext(ResumeContext);
    if (!context) {
        throw new Error('useResume must be used within a ResumeProvider');
    }
    return context;
};

const initialData: ResumeData = {
    templateId: 'modern',
    personalInfo: {
        fullName: 'John Doe',
        title: 'Software Engineer',
        email: 'john.doe@example.com',
        phone: '+91-1234567890',
        location: 'New York, USA',
        website: 'johndoe.dev',
        summary: 'Passionate software engineer with 5+ years of experience in building scalable web applications. Expert in React, Node.js, and Cloud Architecture.',
        roll: '2021BCS001',
        course: 'B.Tech in Computer Science',
        college: 'Indian Institute of Information Technology, Vadodara',
        github: 'https://github.com/johndoe',
        linkedin: 'https://linkedin.com/in/johndoe'
    },
    education: [
        {
            id: '1',
            institution: 'IIIT Vadodara',
            degree: 'B.Tech in Computer Science',
            startDate: '2021',
            endDate: '2025',
            location: 'Gandhinagar, India',
            description: 'CGPA: 9.2/10'
        }
    ],
    experience: [
        {
            id: '1',
            company: 'Tech Solutions Inc.',
            position: 'Software Engineering Intern',
            startDate: '2023-05',
            endDate: '2023-07',
            current: false,
            description: 'Developed and optimized user authentication flows using React and Node.js. Reduced API latency by 15%.',
            location: 'Remote'
        }
    ],
    projects: [
        {
            id: '1',
            name: 'Resumify',
            description: 'A modern resume builder with live preview and multiple templates.',
            startDate: '2024-01',
            endDate: 'Present',
            technologies: 'React, Context API, Vanilla CSS'
        }
    ],
    skills: [
        { id: '1', name: 'JavaScript', level: 'Expert' },
        { id: '2', name: 'React', level: 'Expert' },
        { id: '3', name: 'Node.js', level: 'Advanced' }
    ],
    achievements: [
        {
            id: '1',
            title: 'Global Hackathon Winner',
            description: 'Awarded 1st place among 500+ participants for building an AI-powered code assistant.',
            date: '2023'
        }
    ],
    positionsOfResponsibility: [
        {
            id: '1',
            role: 'Student Coordinator',
            organization: 'Coding Club, IIITV',
            tenure: '2022-2023'
        }
    ],
};

export const ResumeProvider = ({ children }: { children: React.ReactNode }) => {
    const [resumeData, setResumeData] = useState<ResumeData>(initialData);

    const updatePersonalInfo = (data: Partial<ResumeData['personalInfo']>) => {
        setResumeData((prev) => ({
            ...prev,
            personalInfo: { ...prev.personalInfo, ...data },
        }));
    };

    const setTemplateId = (id: string) => {
        setResumeData(prev => ({ ...prev, templateId: id }));
    };

    const updateSectionItem = (section: keyof Omit<ResumeData, 'personalInfo' | 'templateId'>, id: string, data: any) => {
        setResumeData((prev) => ({
            ...prev,
            [section]: (prev[section] as any[]).map((item) => (item.id === id ? { ...item, ...data } : item)),
        }));
    };

    const addSectionItem = (section: keyof Omit<ResumeData, 'personalInfo' | 'templateId'>, item: any) => {
        setResumeData((prev) => ({
            ...prev,
            [section]: [...(prev[section] as any[]), { ...item, id: crypto.randomUUID() }],
        }));
    };

    const removeSectionItem = (section: keyof Omit<ResumeData, 'personalInfo' | 'templateId'>, id: string) => {
        setResumeData((prev) => ({
            ...prev,
            [section]: (prev[section] as any[]).filter((item) => item.id !== id),
        }));
    };

    return (
        <ResumeContext.Provider value={{
            resumeData,
            updatePersonalInfo,
            setTemplateId,
            updateSectionItem,
            addSectionItem,
            removeSectionItem,
            setResumeData
        }}>
            {children}
        </ResumeContext.Provider>
    );
};
