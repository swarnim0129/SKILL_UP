<div align="center">

# 🚀 SkillUp

**An AI-Powered Career Acceleration & Learning Platform**

Built with a multi-service architecture spanning **Next.js**, **Node.js**, and **Python FastAPI** — designed to bridge the gap between learning, skill-building, and job placement.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb)](https://www.mongodb.com/)
[![Gemini](https://img.shields.io/badge/Gemini_AI-3.5_Flash-4285F4?logo=google)](https://ai.google.dev/)
[![Clerk](https://img.shields.io/badge/Clerk-Auth-6C47FF?logo=clerk)](https://clerk.com/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://docker.com/)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [API Key Management](#-api-key-management)
- [Database Schema](#-database-schema)
- [Contributing](#-contributing)

---

## 🧠 Overview

SkillUp is a comprehensive platform that unifies **AI-driven learning**, **career tools**, and **job matching** into a single ecosystem. It serves four distinct user roles — **Candidates**, **Companies**, **Course Creators**, and **Admins** — each with dedicated dashboards and workflows.

### What makes it different?

- **Multi-Service Architecture**: Three independently deployed backends (Node.js Express, Python FastAPI, Next.js API routes) serving a unified React frontend
- **Round-Robin API Key Rotation**: Custom-built rate-limit management system that distributes Gemini API calls across multiple keys, extending effective throughput by 10x
- **AI-First Design**: Every feature is augmented by Gemini 3.5 Flash — from adaptive quiz generation to real-time video transcript analysis
- **Role-Based Multi-Tenant System**: Complete data isolation and access control across 4 user roles with Clerk authentication

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
│                     Next.js 16 + React 19                       │
│              Tailwind CSS + Framer Motion + GSAP                │
└──────────────┬──────────────┬──────────────┬────────────────────┘
               │              │              │
               ▼              ▼              ▼
┌──────────────────┐ ┌────────────────┐ ┌────────────────────────┐
│  Next.js API     │ │  Node.js       │ │  Python FastAPI        │
│  Routes          │ │  Express       │ │  Backend               │
│  (Port 3000)     │ │  (Port 5500)   │ │  (Port 8000)           │
│                  │ │                │ │                        │
│ • AI Tutoring    │ │ • Auth/RBAC    │ │ • Learning Roadmaps    │
│ • Quiz Gen      │ │ • Job CRUD     │ │ • Career Recommender   │
│ • Video Chat    │ │ • Resume       │ │ • YT Transcription     │
│ • Roadmap Chat  │ │   Analysis     │ │ • AI Resume Builder    │
│                  │ │ • Interviews   │ │ • Portfolio Generator  │
│                  │ │ • Gamification │ │ • Cold Email Finder    │
│                  │ │ • Courses      │ │ • Presentation Gen     │
│                  │ │ • Applications │ │ • Job Tracker          │
│                  │ │ • Admin Panel  │ │ • Interview Agent      │
│                  │ │ • Reviews      │ │ • Flashcards           │
└────────┬─────────┘ └───────┬────────┘ └───────────┬────────────┘
         │                   │                      │
         ▼                   ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     MongoDB Atlas (Shared)                       │
│                        21 Collections                            │
│   Users · Candidates · Companies · Jobs · Applications           │
│   Interviews · Courses · Enrollments · Reviews · Roadmaps        │
│   Gamification Events · Resume Analyses · Videos · ...           │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                             │
│  Gemini 3.5 Flash · Clerk Auth · Cloudinary · Vapi Voice AI     │
│  Anam Avatar AI · Tavily Search · AssemblyAI · YouTube API       │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✨ Features

### 👤 Candidate Portal

| Feature | Description |
|---------|-------------|
| **AI Tutor** | Interactive avatar-based teaching sessions powered by Anam AI with real-time voice interaction |
| **Video Tutor** | YouTube video analysis with chapter extraction, AI-powered Q&A, and seek-to-chapter navigation |
| **Adaptive Quiz Engine** | Gemini-generated MCQs tailored to the specific chapter content a student just completed |
| **Learning Roadmaps** | AI-generated personalized learning paths with adaptive difficulty adjustment |
| **AI Mock Interviews** | Voice-based interview practice with Vapi AI, covering technical, behavioral, and HR rounds |
| **Resume Analyzer** | ATS scoring with section-wise breakdown (impact, formatting, keywords, experience) |
| **Resume Builder** | Drag-and-drop editor with 4 professional templates (Classic, Modern, Executive, LaTeX) |
| **Flashcard Revision** | Spaced-repetition study cards generated from learning content |
| **Career Recommender** | AI-powered career path suggestions based on skills and resume analysis |
| **Job Board** | Real-time job listings aggregated from LinkedIn, Indeed, and Tavily with smart matching |
| **Leaderboard & Gamification** | XP system, credit-based economy, and competitive leaderboards |
| **Progress Tracking** | Visual analytics dashboard for learning streaks, quiz scores, and interview performance |

### 🏢 Company Portal

| Feature | Description |
|---------|-------------|
| **Job Management** | Create, edit, and manage job postings with AI-assisted description generation |
| **Applicant Tracking** | Review applications, shortlist candidates, and manage the hiring pipeline |
| **Company Dashboard** | Overview of active listings, applicant statistics, and engagement metrics |
| **Company Profile** | Branded company page with Cloudinary-hosted media assets |

### 🎓 Creator Portal

| Feature | Description |
|---------|-------------|
| **Course Creation** | Build and publish structured courses with chapters, descriptions, and media |
| **Creator Profiles** | Public-facing creator pages with follower counts and course catalogs |
| **Course Analytics** | Track likes, bookmarks, comments, and enrollment metrics |

### 🛡 Admin Panel

| Feature | Description |
|---------|-------------|
| **Platform Analytics** | System-wide usage metrics, user growth, and engagement dashboards |
| **User Management** | View, suspend, and manage candidate accounts with credit adjustments |
| **Company Moderation** | Approve/reject company registrations and moderate job postings |
| **Review Management** | Monitor and moderate platform reviews |

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| **Next.js 16** | React framework with App Router, Server Components, and API routes |
| **React 19** | UI library with concurrent features |
| **Tailwind CSS 4** | Utility-first styling |
| **Framer Motion** | Page transitions and micro-animations |
| **GSAP** | Complex scroll-driven animations |
| **Radix UI** | Accessible headless component primitives |
| **Recharts** | Data visualization for dashboards |
| **React Flow** | Interactive node-based roadmap visualization |
| **Clerk** | Authentication, session management, and RBAC |

### Backend (Node.js — Port 5500)
| Technology | Purpose |
|-----------|---------|
| **Express.js** | REST API framework |
| **Mongoose** | MongoDB ODM with 21 data models |
| **Multer** | File upload handling (resumes, media) |
| **Cloudinary** | Cloud-based image and file storage |
| **pdf-parse** | Server-side PDF text extraction |
| **Gemini AI SDK** | AI-powered resume analysis and interview feedback |

### Backend (Python — Port 8000)
| Technology | Purpose |
|-----------|---------|
| **FastAPI** | Async Python API framework |
| **Motor** | Async MongoDB driver |
| **httpx** | Async HTTP client for Gemini API calls |
| **python-pptx** | AI-generated PowerPoint presentations |
| **APScheduler** | Background job scheduling for automated scraping |
| **Docker** | Containerized deployment |

### AI & External Services
| Service | Purpose |
|---------|---------|
| **Google Gemini 3.5 Flash** | Core AI engine — quiz generation, resume analysis, career recommendations, chat |
| **Vapi** | Voice-based AI interview sessions |
| **Anam AI** | Avatar-based interactive tutoring |
| **Tavily** | Web search API for job aggregation and career research |
| **AssemblyAI** | Audio transcription services |
| **Clerk** | OAuth, SSO, and session-based authentication |

---

## 📁 Project Structure

```
SkillUp/
├── frontend/                    # Next.js 16 application
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/             # Server-side API routes (Gemini, tutoring, video)
│   │   │   ├── candidate/       # Candidate dashboard, tutor, interviews, resume tools
│   │   │   ├── company/         # Company dashboard, job management, applicants
│   │   │   ├── creator/         # Course creation and management
│   │   │   ├── admin/           # Admin panel — analytics, users, moderation
│   │   │   └── onboarding/      # Role-based onboarding flow
│   │   ├── components/
│   │   │   ├── ui/              # Reusable UI primitives (Radix-based)
│   │   │   ├── builder/         # Resume builder editor + templates
│   │   │   ├── magicui/         # Animation components (shiny text, magic cards)
│   │   │   └── landing/         # Landing page sections
│   │   ├── lib/
│   │   │   ├── gemini.ts        # Round-robin Gemini API key manager
│   │   │   ├── api.ts           # Backend API client utilities
│   │   │   └── utils.ts         # Shared helper functions
│   │   └── context/             # React contexts (Auth, Resume state)
│   └── public/                  # Static assets and images
│
├── backend/                     # Node.js Express API (Port 5500)
│   ├── controllers/             # Route handlers (17 controllers)
│   ├── models/                  # Mongoose schemas (21 models)
│   ├── routes/                  # Express route definitions
│   ├── middleware/               # Auth middleware (Clerk JWT verification)
│   ├── services/                # Gamification engine, topic clustering
│   ├── utils/
│   │   ├── geminiKeyManager.js  # Round-robin API key rotation
│   │   └── latexTemplates.js    # LaTeX resume template engine
│   └── server.js               # Application entry point
│
├── backend2/                    # Python FastAPI API (Port 8000)
│   ├── learning/                # AI roadmap generation and management
│   ├── career_recommender/      # Career counseling with Tavily research
│   ├── interview_agent/         # AI interview orchestration with Vapi
│   ├── ai_resume_builder/       # AI-powered resume generation
│   ├── portfolio/               # Portfolio website generator
│   ├── presentation/            # AI PowerPoint generation
│   ├── cold_mail/               # Company finder + cold email drafting
│   ├── job_tracker/             # Automated job scraping (LinkedIn, Tavily)
│   ├── YT_transcript/           # YouTube video transcription & analysis
│   ├── explainer/               # Concept explainer agent
│   ├── flashcards/              # Spaced-repetition card generation
│   ├── resume_analyzer/         # Deep resume analysis
│   ├── gemini_service.py        # Round-robin Gemini client with model fallback
│   ├── main.py                  # FastAPI application entry point
│   └── Dockerfile               # Container configuration
│
└── courses/                     # Course content and API definitions
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **Python** ≥ 3.9
- **MongoDB Atlas** account (or local MongoDB)
- **Gemini API keys** from [Google AI Studio](https://aistudio.google.com/app/apikey)

### 1. Clone the Repository

```bash
git clone https://github.com/swarnim0129/SKILL_UP.git
cd SKILL_UP
```

### 2. Backend (Node.js — Port 5500)

```bash
cd backend
npm install
cp .env.example .env   # Configure your environment variables
npm run dev             # Starts on http://localhost:5500
```

### 3. Backend (Python — Port 8000)

```bash
cd backend2
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # Configure your environment variables
uvicorn main:app --reload --port 8000
```

### 4. Frontend (Next.js — Port 3000)

```bash
cd frontend
npm install
cp .env.example .env   # Configure your environment variables
npm run dev             # Starts on http://localhost:3000
```

---

## 🔑 API Key Management

SkillUp implements a **custom round-robin API key rotation system** to maximize throughput within free-tier rate limits.

### How It Works

```
Request 1  →  Key 1
Request 2  →  Key 2
Request 3  →  Key 3
   ...         ...
Request 10 →  Key 10
Request 11 →  Key 1   ← Wraps around
```

### Configuration

Add numbered keys to your `.env` files:

```env
GEMINI_API_KEY_1=your_first_key
GEMINI_API_KEY_2=your_second_key
GEMINI_API_KEY_3=your_third_key
# ... up to GEMINI_API_KEY_N
```

The system automatically discovers all `GEMINI_API_KEY_*` environment variables and rotates through them. Falls back to a single `GEMINI_API_KEY` if numbered keys aren't found.

### Implementation

| Service | File | Strategy |
|---------|------|----------|
| **Node.js Backend** | `backend/utils/geminiKeyManager.js` | In-memory counter with modulo rotation |
| **Python Backend** | `backend2/gemini_service.py` | Counter + model fallback chain (3.5-flash → 1.5-flash → 2.5-pro → 2.0-flash) |
| **Next.js Frontend** | `frontend/src/lib/gemini.ts` | Per-request key selection with module-level state |

---

## 🗃 Database Schema

The platform uses **21 MongoDB collections** organized around 4 core domains:

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│    Users     │────▶│  Candidates  │────▶│  Interviews  │
│              │     │  • credits   │     │  • feedback  │
│              │     │  • skills    │     │  • scores    │
└──────┬───────┘     │  • gamify    │     └──────────────┘
       │             └──────┬───────┘
       │                    │
       │             ┌──────▼───────┐     ┌──────────────┐
       │             │  Resume      │     │  Saved       │
       │             │  Analyses    │     │  Roadmaps    │
       │             └──────────────┘     └──────────────┘
       │
┌──────▼───────┐     ┌──────────────┐     ┌──────────────┐
│  Companies   │────▶│    Jobs      │────▶│ Applications │
│  • verified  │     │  • AI-gen    │     │  • status    │
│  • profile   │     │  • matching  │     │  • tracking  │
└──────────────┘     └──────────────┘     └──────────────┘

┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Courses    │────▶│ Enrollments  │     │  Comments    │
│  • chapters  │     │  • progress  │     │  • likes     │
│  • media     │     └──────────────┘     │  • bookmarks │
└──────────────┘                          └──────────────┘

┌──────────────┐     ┌──────────────┐
│   Creator    │     │ Gamification │
│   Profiles   │     │   Events     │
│  • followers │     │  • XP/credits│
└──────────────┘     └──────────────┘
```

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

<div align="center">

**Built with ❤️ by [Swarnim Bane](https://github.com/swarnim0129)**

</div>