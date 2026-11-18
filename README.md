# AI Mentor (Rashnotech Learning Platform)

AI Mentor is a full-stack learning management and AI mentorship platform built for project-based technical education. It combines structured learning paths, interactive lessons, module assessments, portfolio project submissions, live mentor sessions, internship tracks, and Socratic AI guidance inside a unified workspace for students, mentors, and administrators.

---

## Table of Contents

1. [Core Capabilities](#core-capabilities)
2. [System Architecture](#system-architecture)
3. [Personalization Engine Specification](#personalization-engine-specification)
4. [Tech Stack](#tech-stack)
5. [Repository Structure](#repository-structure)
6. [Getting Started](#getting-started)
7. [Environment Variables](#environment-variables)
8. [Testing, Gate Checks & Evals](#testing-gate-checks--evals)
9. [Documentation Index](#documentation-index)

---

## Core Capabilities

### Student Workspace (`/dashboard`)
- **In-Dashboard Learning Environment (`/dashboard/courses/[id]/learn`):** Two-column learning interface featuring embedded video/markdown lessons on the main stage, an active module lesson rail on the right, a collapsible module switcher for accessibility, and cross-course progress tracking.
- **Hands-On Projects & Reviews:** Submit GitHub/live project URLs, receive AI-generated starter guidance, track mentor approval states (`approved`, `in_review`, `rejected`), and earn completion points and certificates.
- **Interactive Module Quizzes:** Markdown-enabled technical assessments with instant answer verification, explanations, and score tracking.
- **Rubber Duck Socratic AI Chat:** Floating streaming AI assistant (`/api/v1/ai/rubber-duck/chat`) that guides students through debugging and problem-solving without handing out raw answers.
- **Personalized AI Mentor Feed:** Contextual encouragement, quiz remediation notes, project guidance, and inactivity check-ins surfaced directly on the student dashboard.
- **Live Sessions & Community:** Attend scheduled mentor sessions (`/dashboard/sessions`) and collaborate with peers (`/dashboard/community`).

### Mentor Portal (`/mentor`)
- **Course & Curriculum Authoring (`/mentor/my-courses`):** Manage courses, multiple learning paths per course, modules, lessons, quizzes, and projects, or bulk-import curricula via JSON.
- **Student Submission Review (`/mentor/my-students`):** Inspect student project links, assign scores, approve submissions, or request revisions with detailed feedback.
- **Session Management (`/mentor/sessions`):** Schedule live cohorts and track attendance.

### Administration Console (`/admin`)
- **Catalog & Bootcamp Management:** Full CRUD and JSON import for courses (`/admin/courses`), bootcamps (`/admin/bootcamps`), and internship tracks (`/admin/internships`).
- **User & Mentor Lifecycle:** Manage roles, enrollments, and issue verified completion certificates (`/admin/users`, `/admin/mentors`).
- **Payments & Transactions:** Track Nomba payment checkouts, webhook verifications, and revenue metrics (`/admin/transactions`).
- **Learning Surveys:** Configure automated milestone and job-readiness surveys (`/admin/surveys`).

---

## System Architecture

```
+-------------------------------------------------------------------+
|                        Next.js 16 Frontend                        |
|  Public Catalog  |  Student Dashboard  |  Mentor  |  Admin Panel  |
+---------------------------------+---------------------------------+
                                  |
                         REST / SSE (/api/v1)
                                  |
+---------------------------------v---------------------------------+
|                      FastAPI Backend (Python)                     |
|  users | courses | progress | ai | payments | surveys | sessions  |
+--------+------------------------+------------------------+--------+
         |                        |                        |
         v                        v                        v
+-----------------+      +-----------------+      +-----------------+
|   PostgreSQL    |      |   Groq / LLM    |      | Nomba & Brevo   |
| (Async SQLAlch) |      |  Mentor Engine  |      | Payments & Mail |
+-----------------+      +-----------------+      +-----------------+
```

---

## Personalization Engine Specification

The AI Mentor Personalization Engine moves beyond static curricula by combining onboarding signals, goal-based path selection, and behavioral telemetry to adapt the learning experience.

### 1. Data Flow Pipeline
1. **Telemetry Collector (Frontend):** Captures interaction cadence, lesson progression, quiz attempts, and project start events.
2. **Signal Aggregator (FastAPI):** Aggregates completion velocity, quiz accuracy, and help-seeking intervals.
3. **Heuristic Classifier:** Maps student signals to a learning archetype.
4. **Curriculum Orchestrator & AI Mentor:** Adapts path recommendations, project scaffolding, and AI feedback tone (`quiz_encouragement`, `quiz_correction`, `project_guidance`, `inactivity_checkin`).

### 2. Behavioral Signals
| Signal | Definition | Insight Derived |
| :--- | :--- | :--- |
| **Keystroke / Interaction Latency** | Cadence during coding and assessment tasks | Distinguishes fluency from syntax lookup |
| **Run-to-Edit Ratio** | Frequency of execution vs. code modification | Identifies trial-and-error vs. upfront planning |
| **Error Delta** | Progression of error states across attempts | Detects whether a learner is progressing or blocked |
| **Focus & Resource Usage** | Documentation and external resource navigation | Measures independent research habits |
| **Hint Latency** | Time elapsed before requesting AI Duck assistance | Measures problem-solving resilience |

### 3. Learner Archetypes
- **Project-First Learner:** Jumps directly into implementation and learns through iteration. Paired with concise, pair-programmer style AI guidance.
- **Instruction-First Learner:** Reads theory and specifications thoroughly before writing code. Paired with structured conceptual breakdowns.
- **Fast / High-Iteration Learner:** Moves rapidly through material but benefits from automated verification gates and code-review style feedback.

---

## Tech Stack

### Frontend
- **Framework:** Next.js 16 (App Router), React 19, TypeScript 5
- **Styling:** Tailwind CSS 4, Radix UI Primitives, Lucide Icons
- **State & Data Fetching:** TanStack React Query v5, Zustand v5, React Hook Form + Zod
- **Content Rendering:** `react-markdown` + `remark-gfm`

### Backend
- **Framework:** FastAPI, Uvicorn / Gunicorn, Python 3.11+
- **Database & ORM:** PostgreSQL, SQLAlchemy 2.0 (Async with `asyncpg`), Alembic migrations
- **Authentication:** JWT (`PyJWT`), Argon2 password hashing (`argon2-cffi`), Google & GitHub OAuth 2.0 (`Authlib`)
- **Integrations:** Nomba (Payments), Brevo (Transactional Email), Groq (AI Mentor & Rubber Duck streaming), APScheduler (Background jobs)

---

## Repository Structure

```text
ai-mentor/
├── app/                        # Next.js App Router pages & layouts
│   ├── admin/                  # Admin console routes (courses, users, surveys, transactions)
│   ├── auth/                   # OAuth callback handlers
│   ├── contact/                # Public contact page
│   ├── courses/                # Public course catalog & details
│   ├── dashboard/              # Student dashboard shell, courses, embedded learn view, projects
│   ├── internship/             # Internship application & onboarding flow
│   ├── login/ & signup/        # Authentication screens
│   ├── mentor/                 # Mentor portal (course builder, student project reviews)
│   ├── onboarding/             # Student goal & learning mode selection
│   └── payment/                # Nomba payment verification callback
├── api/                        # FastAPI backend application
│   ├── alembic/                # Database migrations
│   ├── auth/                   # OAuth & token utilities
│   ├── core/                   # Settings, security, exceptions
│   ├── db/                     # Async SQLAlchemy session & base models
│   ├── domains/                # Domain-driven backend modules
│   │   ├── ai/                 # Rubber Duck Socratic chat & AI mentor services
│   │   ├── bootcamps/          # Bootcamp management
│   │   ├── community/          # Peer community discussions
│   │   ├── contact/            # Contact form handlers
│   │   ├── courses/            # Courses, paths, modules, lessons, quizzes, JSON import
│   │   ├── internships/        # Internship tracks & applications
│   │   ├── mailings/           # Brevo email templates & delivery
│   │   ├── payments/           # Nomba checkout & webhook verification
│   │   ├── progress/           # Student progress & path adjustments
│   │   ├── sessions/           # Live mentor sessions
│   │   ├── surveys/            # Learning & job-readiness surveys
│   │   └── users/              # Auth, profiles, onboarding, admin user management
│   └── app.py                  # FastAPI entrypoint
├── components/                 # Shared UI & domain components
├── docs/                       # Feature specifications & operational guides
├── evals/                      # Acceptance & regression evaluation suites
├── lib/                        # API client, auth context, Zustand stores, SEO helpers
└── tests/                      # Deterministic contract & gate tests
```

---

## Getting Started

### Prerequisites
- **Node.js** 20+ and `npm` (or `pnpm`)
- **Python** 3.11+
- **PostgreSQL** 15+

### 1. Frontend Setup

```bash
# Install dependencies
npm install

# Run the Next.js development server (http://localhost:3000)
npm run dev
```

### 2. Backend Setup

```bash
cd api

# Create and activate a virtual environment
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# macOS / Linux:
source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Run Alembic database migrations
alembic upgrade head

# Start the FastAPI server (http://localhost:8000)
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Interactive API documentation is available at `http://localhost:8000/docs` when `ENV=development`.

---

## Environment Variables

### Frontend (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Backend (`api/.env`)

```env
ENV=development
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/ai-mentor
DB_NAME=ai-mentor

SECRET_KEY=replace-with-strong-secret-key
ALGORITHM=HS256
FRONTEND_URL=http://localhost:3000

# Transactional Email (Brevo)
BREVO_API_KEY=your-brevo-api-key
MAIL_FROM=support@domain.com
CONTACT_TO_EMAIL=someone@email.com

# Payments (Nomba)
NOMBA_BASE_URL=https://sandbox.nomba.com
NOMBA_CLIENT_ID=your-nomba-client-id
NOMBA_CLIENT_SECRET=your-nomba-client-secret
NOMBA_ACCOUNT_ID=your-nomba-account-id
NOMBA_WEBHOOK_SECRET=your-nomba-webhook-secret
NOMBA_DEFAULT_CURRENCY=NGN

# OAuth 2.0
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_REDIRECT_URI=http://localhost:3000/auth/github/callback

# AI Mentor / Rubber Duck
GROQ_API_KEY=your-groq-api-key
```

---

## Testing, Gate Checks & Evals

Every feature and bug fix is verified through three automated lanes:

```bash
# 1. TypeScript Gate Check
npm run typecheck:gate

# 2. Deterministic Gate Contract Tests (<2s, zero network dependency)
npm run test:gate

# 3. Acceptance & Regression Evals (100% pass threshold)
npm run eval
```

---

## Documentation Index

Detailed engineering notes for specific subsystems live in [`docs/`](docs/):

- [Enrollment, Payment & SEO Architecture](docs/ENROLLMENT_PAYMENT_SEO.md)
- [Course JSON Upload & Schema Guide](docs/JSON_UPLOAD_DOCUMENTATION.md)
- [Mentor Course Management Redesign](docs/MENTOR_COURSE_REDESIGN.md)
- [Learning Surveys & Milestone Triggers](docs/LEARNING_SURVEYS.md)
- [OAuth 2.0 Setup Guide](docs/OAUTH_SETUP.md)
- [Onboarding UI & Completion Flow](docs/ONBOARDING_UI_POLISH.md)
- [Project Submission & Review Restrictions](docs/PROJECT_LINK_UPDATE_RESTRICTION.md)
