# JSON Course Upload Documentation

## Overview

The JSON import endpoint allows administrators and mentors to create or update a full course hierarchy in a single operation by uploading a JSON file.

**Endpoint:** `POST /courses/json-import`  
**Auth:** Required (Admin or Mentor role)  
**Content-Type:** `multipart/form-data`  
**File field:** `file` (must be `application/json` or `text/plain`)

The operation is **idempotent**: running the same file multiple times safely updates existing records rather than creating duplicates. Each entity is matched by its name/title within its parent context:

| Entity        | Matched by                                |
|---------------|-------------------------------------------|
| Course        | `course_name`                             |
| LearningPath  | `learning_path_name` within the course    |
| Module        | `module_name` within the learning path    |
| Lesson        | `title` within the module                 |
| Project       | `title` within the module                 |
| Quiz question | `question_text` within the module         |

---

## Hierarchy

```
Course
└── LearningPath
    └── Module[]
        ├── Lesson[]
        ├── Project[]
        └── Quiz[]
```

---

## Schema Reference

### Top-level: Course

| Field                     | Type              | Required | Description                                                           |
|---------------------------|-------------------|----------|-----------------------------------------------------------------------|
| `course_name`             | string (3–255)    | ✅        | Course title. Used as the unique identifier for upsert.               |
| `slug`                    | string (3–100)    | ✅        | URL-friendly identifier. Must be unique across all courses.           |
| `description`             | string (≥10)      | ✅        | Course description.                                                   |
| `estimated_hours`         | integer (≥1)      | ✅        | Estimated hours to complete the course.                               |
| `difficulty_level`        | string            | ✅        | `BEGINNER`, `INTERMEDIATE`, or `ADVANCED`.                            |
| `cover_image_url`         | string            | ❌        | URL of the course cover image.                                        |
| `prerequisites`           | array of strings  | ❌        | List of prerequisite topics or course names.                          |
| `what_youll_learn`        | array of strings  | ❌        | List of learning outcomes.                                            |
| `certificate_on_completion` | boolean         | ❌        | Whether a certificate is awarded on completion. Defaults to `false`.  |
| `learning_path`           | LearningPath      | ✅        | The single learning path nested in this course.                       |

---

### LearningPath

| Field                 | Type              | Required | Description                                                                       |
|-----------------------|-------------------|----------|-----------------------------------------------------------------------------------|
| `learning_path_name`  | string (3–255)    | ✅        | Learning path name. Used as the unique identifier within the course.              |
| `description`         | string (≥10)      | ✅        | Learning path description.                                                        |
| `price`               | float (≥0)        | ❌        | Price in the configured currency. `0` means free. Defaults to `0.00`.            |
| `is_default`          | boolean           | ❌        | Whether this is the default learning path for the course.                         |
| `min_skill_level`     | string            | ❌        | Minimum skill level: `Beginner`, `Lower-Intermediate`, `Intermediate`, `Advanced`.|
| `max_skill_level`     | string            | ❌        | Maximum skill level (same values as `min_skill_level`).                           |
| `tags`                | array of strings  | ❌        | Descriptive tags for the learning path.                                           |
| `modules`             | array of Module   | ❌        | Ordered list of modules.                                                          |

---

### Module

| Field                    | Type              | Required | Description                                                        |
|--------------------------|-------------------|----------|--------------------------------------------------------------------|
| `module_name`            | string (3–255)    | ✅        | Module name. Used as the unique identifier within the learning path.|
| `description`            | string (≥10)      | ✅        | Module description.                                                |
| `order`                  | integer (≥1)      | ✅        | Display order within the learning path.                            |
| `estimated_hours`        | integer (≥1)      | ❌        | Estimated hours to complete the module.                            |
| `unlock_after_days`      | integer (≥0)      | ❌        | Days after enrolment before the module becomes available.          |
| `is_available_by_default`| boolean           | ❌        | If `true`, the module is immediately available. Defaults to `true`.|
| `first_deadline_days`    | integer (≥1)      | ❌        | Days from unlock to first deadline (100% points).                  |
| `second_deadline_days`   | integer (≥1)      | ❌        | Days from unlock to second deadline (50% points).                  |
| `third_deadline_days`    | integer (≥1)      | ❌        | Days from unlock to third deadline (25% points).                   |
| `lessons`                | array of Lesson   | ❌        | Lessons in this module.                                            |
| `projects`               | array of Project  | ❌        | Projects in this module.                                           |
| `quizzes`                | array of Quiz     | ❌        | Quiz questions in this module.                                     |

---

### Lesson

| Field                  | Type              | Required | Description                                                   |
|------------------------|-------------------|----------|---------------------------------------------------------------|
| `title`                | string (3–255)    | ✅        | Lesson title. Used as the unique identifier within the module.|
| `description`          | string (≥10)      | ✅        | Lesson description.                                           |
| `order`                | integer (≥1)      | ✅        | Display order within the module.                              |
| `content`              | string            | ❌        | Main lesson content or material.                              |
| `content_type`         | string            | ❌        | `theory`, `coding`, `debugging`, or `quiz`.                   |
| `estimated_minutes`    | integer (≥1)      | ❌        | Estimated minutes to complete the lesson.                     |
| `youtube_video_url`    | string            | ❌        | YouTube video URL.                                            |
| `external_resources`   | array of strings  | ❌        | External resource URLs.                                       |
| `expected_outcomes`    | array of strings  | ❌        | What students will achieve by the end of this lesson.         |
| `starter_file_url`     | string            | ❌        | URL to a starter file.                                        |
| `solution_file_url`    | string            | ❌        | URL to the solution file.                                     |

---

### Project

| Field                  | Type              | Required | Description                                                     |
|------------------------|-------------------|----------|-----------------------------------------------------------------|
| `title`                | string (3–255)    | ✅        | Project title. Used as the unique identifier within the module. |
| `description`          | string (≥10)      | ✅        | Project description.                                            |
| `order`                | integer (≥1)      | ✅        | Display order within the module.                                |
| `estimated_hours`      | integer (≥1)      | ❌        | Estimated hours to complete the project.                        |
| `starter_repo_url`     | string            | ❌        | URL to the starter repository.                                  |
| `solution_repo_url`    | string            | ❌        | URL to the solution repository.                                 |
| `required_skills`      | array of strings  | ❌        | Skills required to attempt the project.                         |
| `first_deadline_days`  | integer (≥1)      | ❌        | Days to first deadline (100% points).                           |
| `second_deadline_days` | integer (≥1)      | ❌        | Days to second deadline (50% points).                           |
| `third_deadline_days`  | integer (≥1)      | ❌        | Days to third deadline (25% points).                            |

---

### Quiz Question

| Field              | Type              | Required | Description                                                              |
|--------------------|-------------------|----------|--------------------------------------------------------------------------|
| `question_text`    | string (≥5)       | ✅        | Question prompt. Used as the unique identifier within the module.        |
| `question_type`    | string            | ✅        | `multiple_choice`, `debugging`, `coding`, or `short_answer`.             |
| `order`            | integer (≥1)      | ✅        | Display order within the module.                                         |
| `correct_answer`   | string            | ✅        | Correct answer text.                                                     |
| `difficulty_level` | string            | ❌        | `BEGINNER`, `INTERMEDIATE`, or `ADVANCED`. Defaults to `INTERMEDIATE`.   |
| `options`          | array of strings  | ❌        | Answer options for `multiple_choice` questions.                          |
| `explanation`      | string            | ❌        | Explanation shown after the question is answered.                        |
| `points`           | integer (1–100)   | ❌        | Points awarded for a correct answer. Defaults to `10`.                   |

---

## Response

On success the endpoint returns HTTP `200` with a summary of what was created or updated:

```json
{
  "action": "created",
  "course_id": 42,
  "course_name": "Introduction to Python",
  "learning_path_action": "created",
  "learning_path_id": 7,
  "learning_path_name": "Beginner Path",
  "modules": { "created": 2, "updated": 0 },
  "lessons": { "created": 5, "updated": 0 },
  "projects": { "created": 1, "updated": 0 },
  "quizzes": { "created": 4, "updated": 0 }
}
```

---

## Sample JSON File

The following is a complete example showing all optional fields:

```json
{
  "course_name": "Introduction to Python",
  "slug": "intro-to-python",
  "description": "A comprehensive introduction to Python programming for beginners.",
  "estimated_hours": 20,
  "difficulty_level": "BEGINNER",
  "cover_image_url": "https://cdn.example.com/python-cover.png",
  "prerequisites": ["Basic computer literacy"],
  "what_youll_learn": [
    "Python syntax and data types",
    "Control flow and functions",
    "Working with files and modules"
  ],
  "certificate_on_completion": true,
  "learning_path": {
    "learning_path_name": "Beginner Path",
    "description": "The standard learning path for students new to Python.",
    "price": 0.00,
    "is_default": true,
    "min_skill_level": "Beginner",
    "max_skill_level": "Intermediate",
    "tags": ["python", "beginner", "programming"],
    "modules": [
      {
        "module_name": "Getting Started",
        "description": "Install Python and write your first program.",
        "order": 1,
        "estimated_hours": 3,
        "unlock_after_days": 0,
        "is_available_by_default": true,
        "first_deadline_days": 7,
        "second_deadline_days": 14,
        "third_deadline_days": 21,
        "lessons": [
          {
            "title": "Installing Python",
            "description": "How to download and install Python on your machine.",
            "order": 1,
            "content": "Visit https://python.org and download the latest installer...",
            "content_type": "theory",
            "estimated_minutes": 20,
            "youtube_video_url": "https://www.youtube.com/watch?v=example",
            "external_resources": ["https://docs.python.org/3/"],
            "expected_outcomes": [
              "Python installed and verified",
              "Able to run a Hello World script"
            ],
            "starter_file_url": null,
            "solution_file_url": null
          }
        ],
        "projects": [
          {
            "title": "Hello World CLI",
            "description": "Create a command-line script that greets the user by name.",
            "order": 1,
            "estimated_hours": 1,
            "starter_repo_url": "https://github.com/example/hello-world-starter",
            "solution_repo_url": "https://github.com/example/hello-world-solution",
            "required_skills": ["basic Python syntax"],
            "first_deadline_days": 5,
            "second_deadline_days": 10,
            "third_deadline_days": 15
          }
        ],
        "quizzes": [
          {
            "question_text": "Which command runs a Python script from the terminal?",
            "question_type": "multiple_choice",
            "order": 1,
            "correct_answer": "python script.py",
            "difficulty_level": "BEGINNER",
            "options": [
              "python script.py",
              "run script.py",
              "execute script.py",
              "start script.py"
            ],
            "explanation": "The `python` command followed by the filename runs the script.",
            "points": 10
          }
        ]
      }
    ]
  }
}
```

---

## Error Responses

| HTTP Status | Reason                                                              |
|-------------|---------------------------------------------------------------------|
| `400`       | Non-JSON file uploaded, malformed JSON, or schema validation error. |
| `400`       | The provided `slug` is already used by a different course.          |
| `403`       | Caller does not have Admin or Mentor role.                          |
| `500`       | Unexpected server-side error.                                       |
