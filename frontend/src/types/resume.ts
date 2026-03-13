export type ResumeData = {
    templateId: string;
    personalInfo: {
        fullName: string;
        title: string;
        email: string;
        phone: string;
        location: string;
        website: string;
        roll?: string;
        course?: string;
        college?: string;
        github?: string;
        linkedin?: string;
        summary?: string;
    };
    education: Array<{
        id: string;
        institution: string;
        degree: string;
        startDate: string;
        endDate: string;
        location: string;
        description: string; // Used for GPA/Grade
    }>;
    experience: Array<{
        id: string;
        company: string;
        position: string;
        startDate: string;
        endDate: string;
        current: boolean;
        location: string;
        description: string;
    }>;
    projects: Array<{
        id: string;
        name: string;
        description: string;
        startDate: string;
        endDate: string;
        technologies: string;
    }>;
    skills: Array<{
        id: string;
        name: string;
        level: string;
    }>;
    achievements: Array<{
        id: string;
        title: string;
        description: string;
        date: string;
    }>;
    positionsOfResponsibility: Array<{
        id: string;
        role: string;
        organization: string;
        tenure: string;
    }>;
};

