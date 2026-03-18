# JSON Course Import — Developer Documentation

## Overview

The **JSON Course Import** endpoint allows admins and mentors to create or
update a course (together with its full content hierarchy) by uploading a
single JSON file.

**Endpoint:** `POST /api/v1/courses/json-import`  
**Auth:** Bearer token — admin or mentor role required  
**Content-Type:** `multipart/form-data` (file upload)

---

## Data Hierarchy

```
Course
└── Track  (one track per import)
    └── Modules[]
        ├── Lessons[]
        ├── Projects[]
        └── Quizzes[]
```

> The term **Track** maps to a `LearningPath` in the database.

---

## JSON Schema

### Top Level — Course

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `course_name` | string (3–255 chars) | **Yes** | Course title. Used as the unique identifier to decide create vs update. |
| `slug` | string (3–100 chars) | **Yes** | URL-friendly identifier. Must be unique across all courses. |
| `description` | string (10+ chars) | **Yes** | Full course description. |
| `estimated_hours` | integer ≥ 1 | **Yes** | Estimated completion time in hours. |
| `difficulty_level` | string | **Yes** | One of `BEGINNER`, `INTERMEDIATE`, `ADVANCED`. |
| `cover_image_url` | string \| null | No | URL to the course cover image. |
| `prerequisites` | string[] \| null | No | List of prerequisite topics/courses. |
| `what_youll_learn` | string[] \| null | No | List of learning outcomes. |
| `certificate_on_completion` | boolean | No (default `false`) | Whether a certificate is awarded. |
| `track` | [TrackInput](#track) | **Yes** | The single track for this import. |

---

### Track

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `track_name` | string (3–255 chars) | **Yes** | Track title. Unique within the course. |
| `description` | string (10+ chars) | **Yes** | Track description. |
| `price` | float ≥ 0 | No (default `0.00`) | Price for this track (0 = free). |
| `is_default` | boolean | No (default `false`) | Mark as the default track for the course. |
| `min_skill_level` | string \| null | No | One of `Beginner`, `Lower-Intermediate`, `Intermediate`, `Advanced`. |
| `max_skill_level` | string \| null | No | Same options as `min_skill_level`. |
| `tags` | string[] \| null | No | Descriptive tags. |
| `modules` | [ModuleInput](#module)[] | No (default `[]`) | Modules in this track. |

---

### Module

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `module_name` | string (3–255 chars) | **Yes** | Module name. Unique within the track. |
| `description` | string (10+ chars) | **Yes** | Module description. |
| `order` | integer ≥ 1 | **Yes** | Display order within the track. |
| `estimated_hours` | integer ≥ 1 \| null | No | Estimated completion time. |
| `unlock_after_days` | integer ≥ 0 | No (default `0`) | Days from registration before this module unlocks. |
| `is_available_by_default` | boolean | No (default `true`) | `true` = immediately available. |
| `first_deadline_days` | integer ≥ 1 \| null | No | Days to first deadline (100% points). |
| `second_deadline_days` | integer ≥ 1 \| null | No | Days to second deadline (50% points). |
| `third_deadline_days` | integer ≥ 1 \| null | No | Days to third deadline (25% points). |
| `lessons` | [LessonInput](#lesson)[] | No (default `[]`) | Lessons in this module. |
| `projects` | [ProjectInput](#project)[] | No (default `[]`) | Projects in this module. |
| `quizzes` | [QuizInput](#quiz)[] | No (default `[]`) | Quiz questions in this module. |

---

### Lesson

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string (3–255 chars) | **Yes** | Lesson title. Unique within the module. |
| `description` | string (10+ chars) | **Yes** | Lesson description. |
| `content` | string \| null | No | Main lesson content/material. |
| `order` | integer ≥ 1 | **Yes** | Display order within the module. |
| `content_type` | string \| null | No | One of `theory`, `coding`, `debugging`, `quiz`. |
| `estimated_minutes` | integer ≥ 1 \| null | No | Estimated completion time in minutes. |
| `youtube_video_url` | string \| null | No | YouTube video URL. |
| `external_resources` | string[] \| null | No | List of external resource URLs. |
| `expected_outcomes` | string[] \| null | No | Expected learning outcomes. |
| `starter_file_url` | string \| null | No | URL to starter files. |
| `solution_file_url` | string \| null | No | URL to solution files. |

---

### Project

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string (3–255 chars) | **Yes** | Project title. Unique within the module. |
| `description` | string (10+ chars) | **Yes** | Project description. |
| `order` | integer ≥ 1 | **Yes** | Display order within the module. |
| `estimated_hours` | integer ≥ 1 \| null | No | Estimated completion time. |
| `starter_repo_url` | string \| null | No | URL to the starter repository. |
| `solution_repo_url` | string \| null | No | URL to the solution repository. |
| `required_skills` | string[] \| null | No | Required skills list. |
| `first_deadline_days` | integer ≥ 1 \| null | No | Days to first deadline (100% points). |
| `second_deadline_days` | integer ≥ 1 \| null | No | Days to second deadline (50% points). |
| `third_deadline_days` | integer ≥ 1 \| null | No | Days to third deadline (25% points). |

---

### Quiz

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question_text` | string (5+ chars) | **Yes** | Question text/prompt. Unique within the module. |
| `question_type` | string | **Yes** | One of `multiple_choice`, `debugging`, `coding`, `short_answer`. |
| `difficulty_level` | string | No (default `INTERMEDIATE`) | One of `BEGINNER`, `INTERMEDIATE`, `ADVANCED`. |
| `order` | integer ≥ 1 | **Yes** | Display order within the module. |
| `options` | string[] \| null | No | Answer options (required for `multiple_choice`). |
| `correct_answer` | string | **Yes** | The correct answer or the correct option text. |
| `explanation` | string \| null | No | Explanation for the correct answer. |
| `points` | integer 1–100 | No (default `10`) | Points awarded for a correct answer. |

---

## Create vs Update Behaviour

| Entity | Unique Identifier | If Not Found | If Found |
|--------|-------------------|--------------|----------|
| Course | `course_name` (title) | Create new course | Update existing course |
| Track | `track_name` within the course | Create new track | Update existing track |
| Module | `module_name` within the track | Create new module | Update existing module |
| Lesson | `title` within the module | Create new lesson | Update existing lesson |
| Project | `title` within the module | Create new project | Update existing project |
| Quiz | `question_text` within the module | Create new question | Update existing question |

> Repeated uploads with the same data are **idempotent** — no duplicate records
> are created.

---

## Response Schema

```json
{
  "action": "created",
  "course_id": 42,
  "course_name": "Python Fundamentals",
  "track_action": "created",
  "track_id": 7,
  "track_name": "Core Python",
  "modules": { "created": 2, "updated": 0 },
  "lessons": { "created": 5, "updated": 0 },
  "projects": { "created": 2, "updated": 0 },
  "quizzes": { "created": 8, "updated": 0 }
}
```

---

## Error Responses

| HTTP Status | `detail` | Cause |
|-------------|----------|-------|
| `400` | `Invalid JSON format: …` | The uploaded file is not valid JSON. |
| `400` | `Invalid JSON structure: …` | The JSON does not match the required schema. |
| `400` | `Slug '…' is already in use by another course` | A different course already owns that slug. |
| `403` | `Only admins and mentors can import courses` | Caller does not have admin or mentor role. |
| `500` | `Error processing course JSON import` | Unexpected server-side error. |

---

## Example Valid JSON Payload

```json
{
  "course_name": "Python Fundamentals",
  "slug": "python-fundamentals",
  "description": "A comprehensive introduction to Python programming for absolute beginners.",
  "estimated_hours": 40,
  "difficulty_level": "BEGINNER",
  "cover_image_url": "https://example.com/images/python-fundamentals.png",
  "prerequisites": [],
  "what_youll_learn": [
    "Python syntax and data types",
    "Control flow and functions",
    "File I/O and error handling"
  ],
  "certificate_on_completion": true,
  "track": {
    "track_name": "Core Python",
    "description": "The main learning track covering all essential Python concepts.",
    "price": 0.00,
    "is_default": true,
    "min_skill_level": "Beginner",
    "max_skill_level": "Intermediate",
    "tags": ["python", "beginner", "programming"],
    "modules": [
      {
        "module_name": "Getting Started",
        "description": "Introduction to Python and setting up your development environment.",
        "order": 1,
        "estimated_hours": 4,
        "unlock_after_days": 0,
        "is_available_by_default": true,
        "first_deadline_days": 7,
        "second_deadline_days": 14,
        "third_deadline_days": 21,
        "lessons": [
          {
            "title": "What is Python?",
            "description": "A brief history and overview of the Python programming language.",
            "content": "Python is a high-level, interpreted programming language...",
            "order": 1,
            "content_type": "theory",
            "estimated_minutes": 20,
            "youtube_video_url": "https://www.youtube.com/watch?v=example",
            "external_resources": ["https://docs.python.org/3/"],
            "expected_outcomes": ["Understand what Python is", "Know why Python is popular"]
          },
          {
            "title": "Installing Python",
            "description": "How to install Python on Windows, macOS, and Linux.",
            "order": 2,
            "content_type": "coding",
            "estimated_minutes": 30
          }
        ],
        "projects": [
          {
            "title": "Hello World",
            "description": "Write your very first Python program that prints Hello, World!",
            "order": 1,
            "estimated_hours": 1,
            "required_skills": ["Python basics"],
            "first_deadline_days": 5
          }
        ],
        "quizzes": [
          {
            "question_text": "Which of the following is a valid Python data type?",
            "question_type": "multiple_choice",
            "difficulty_level": "BEGINNER",
            "order": 1,
            "options": ["int", "integer", "Integer", "INT"],
            "correct_answer": "int",
            "explanation": "In Python, the built-in integer type is called 'int' (lowercase).",
            "points": 10
          }
        ]
      }
    ]
  }
}
```

---

## How to Call the Endpoint

### cURL

```bash
curl -X POST https://your-api.example.com/api/v1/courses/json-import \
  -H "Authorization: Bearer <your_token>" \
  -F "file=@/path/to/course.json;type=application/json"
```

### Python (httpx)

```python
import httpx

with open("course.json", "rb") as f:
    response = httpx.post(
        "https://your-api.example.com/api/v1/courses/json-import",
        headers={"Authorization": "Bearer <your_token>"},
        files={"file": ("course.json", f, "application/json")},
    )
print(response.json())
```
