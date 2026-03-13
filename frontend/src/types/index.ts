export interface User {
    _id: string;
    name: string;
    email: string;
    role: 'user' | 'company' | 'admin';
    status: 'pending' | 'active' | 'suspended';
    companyName?: string;
    logo?: string;
    website?: string;
    description?: string;
    industry?: string;
    size?: string;
    location?: string;
    createdAt: string;
}

export interface Job {
    _id: string;
    company: User | string;
    title: string;
    description: string;
    requirements: string[];
    salary: {
        min: number;
        max: number;
        currency: string;
    };
    location: string;
    type: 'full-time' | 'part-time' | 'contract' | 'remote' | 'internship';
    experience: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
    skills: string[];
    status: 'active' | 'closed' | 'flagged' | 'draft';
    applicationsCount: number;
    views: number;
    deadline?: string;
    createdAt: string;
}

export interface Application {
    _id: string;
    job: Job | string;
    applicant: User | string;
    resume: string;
    coverLetter: string;
    status: 'pending' | 'reviewed' | 'shortlisted' | 'interviewed' | 'rejected' | 'hired';
    notes: string;
    createdAt: string;
}

export interface AuthResponse {
    _id: string;
    name: string;
    email: string;
    role: 'user' | 'company' | 'admin';
    status: string;
    companyName?: string;
    logo?: string;
    token: string;
}

export interface Pagination {
    current: number;
    pages: number;
    total: number;
}

export interface StatsResponse {
    jobs: {
        total: number;
        active: number;
        closed?: number;
        flagged?: number;
    };
    applications: {
        total: number;
        pending?: number;
        shortlisted?: number;
    };
    users?: {
        total: number;
    };
    companies?: {
        total: number;
        active: number;
        pending: number;
    };
}
