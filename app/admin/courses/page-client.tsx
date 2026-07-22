"use client"

import { useRef, useState, useMemo, type ChangeEvent } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  courseAdminApi,
  getApiErrorMessage,
  validateCourseForm,
  validateModuleForm,
  generateSlug,
  sanitizeString,
  userAdminApi,
  type CourseListResponse,
  type CourseCreatePayload,
  type CourseUpdatePayload,
  type DifficultyLevel,
  type LearningPathResponse,
  type LearningPathCreatePayload,
  type ModuleCreatePayload,
  type ModuleUpdatePayload,
  type ModuleResponse,
  type ProjectCreatePayload,
  type ProjectUpdatePayload,
  type ProjectResponse,
  type LessonCreatePayload,
  type LessonUpdatePayload,
  type LessonResponse,
  type AssessmentQuestionCreatePayload,
  type AssessmentQuestionUpdatePayload,
  type AssessmentQuestionResponse
} from "@/lib/api"
import {
  Users,
  BookOpen,
  Search,
  TrendingUp,
  UserCog,
  DollarSign,
  CheckCircle,
  Edit,
  Trash2,
  ChevronRight,
  Plus,
  FolderTree,
  FileQuestion,
  Folder,
  Link2,
  Save,
  X,
  FileText,
  Code,
  Loader2,
  ArrowLeft,
  Upload
} from "lucide-react"

// Mock data that will be replaced by API calls in future iterations
const ADMIN_STATS = [
  { label: "Total Students", value: "2,847", change: "+12.5%", trend: "up", icon: Users },
  { label: "Active Courses", value: "128", change: "+8", trend: "up", icon: BookOpen },
  { label: "Revenue (MTD)", value: "$84,290", change: "+23.1%", trend: "up", icon: DollarSign },
  { label: "Completion Rate", value: "73.2%", change: "+5.4%", trend: "up", icon: TrendingUp },
]

const PENDING_REVIEWS = [
  {
    id: 1,
    student: "Alex Turner",
    project: "E-commerce Dashboard",
    course: "React Advanced",
    submitted: "3 hours ago",
  },
  { id: 2, student: "Maria Garcia", project: "Weather App", course: "JavaScript Basics", submitted: "5 hours ago" },
  { id: 3, student: "John Smith", project: "Task Manager", course: "Node.js", submitted: "1 day ago" },
]

const SYSTEM_ALERTS = [
  { type: "warning", message: "Server load at 85% - Consider scaling", time: "10 min ago" },
  { type: "info", message: "Database backup completed successfully", time: "1 hour ago" },
  { type: "error", message: "Payment gateway timeout reported by 3 users", time: "2 hours ago" },
]

export function CoursesManagementView() {
  const queryClient = useQueryClient()
  const [selectedCourse, setSelectedCourse] = useState<number | null>(null)
  const [selectedModule, setSelectedModule] = useState<string | null>(null)
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [courseToDelete, setCourseToDelete] = useState<CourseListResponse | null>(null)
  const [showAssignMentorModal, setShowAssignMentorModal] = useState(false)
  const [courseToAssignMentor, setCourseToAssignMentor] = useState<CourseListResponse | null>(null)
  const [selectedMentorId, setSelectedMentorId] = useState("")
  const [jsonImportFile, setJsonImportFile] = useState<File | null>(null)
  const jsonImportInputRef = useRef<HTMLInputElement | null>(null)
  
  // Modal states
  const [showCreateCourseModal, setShowCreateCourseModal] = useState(false)
  const [showEditCourseModal, setShowEditCourseModal] = useState(false)
  const [showAddModuleModal, setShowAddModuleModal] = useState(false)
  const [showEditPathModal, setShowEditPathModal] = useState(false)
  const [showDeletePathConfirm, setShowDeletePathConfirm] = useState(false)
  const [pathToDelete, setPathToDelete] = useState<LearningPathResponse | null>(null)
  const [editingPath, setEditingPath] = useState<LearningPathResponse | null>(null)
  const [selectedPathForModule, setSelectedPathForModule] = useState<number | null>(null)
  const [showQuizModal, setShowQuizModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [editingQuiz, setEditingQuiz] = useState<any>(null)
  const [editingTask, setEditingTask] = useState<any>(null)
  const [editingCourse, setEditingCourse] = useState<CourseListResponse | null>(null)
  const [currentModuleId, setCurrentModuleId] = useState<string | null>(null)
  
  // Form validation errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Form states - updated to match backend schema
  const [courseForm, setCourseForm] = useState({
    title: "",
    slug: "",
    description: "",
    estimated_hours: 10,
    difficulty_level: "BEGINNER" as DifficultyLevel,
    is_active: false,
    cover_image_url: "",
    prerequisites: "",
    what_youll_learn: "",
    certificate_on_completion: false,
  })

  const [moduleForm, setModuleForm] = useState({
    title: "",
    slug: "",
    description: "",
    order: 1,
    unlock_after_days: 0,
    is_available_by_default: true,
    first_deadline_days: null as number | null,
    second_deadline_days: null as number | null,
    third_deadline_days: null as number | null,
  })

  const [quizForm, setQuizForm] = useState({
    name: "",
    slug: "",
    passingScore: 75,
    questionsList: [] as { id: string; question: string; options: string[]; correctAnswer: number }[],
  })

  const [taskForm, setTaskForm] = useState({
    name: "",
    slug: "",
    type: "exercise",
    instructions: "",
    starterCode: "",
    expectedOutput: "",
  })

  // ============================================================================
  // API QUERIES & MUTATIONS
  // ============================================================================

  // Fetch courses from backend
  const { 
    data: courses = [], 
    isLoading: isLoadingCourses, 
    isError: isCoursesError,
    error: coursesError,
    refetch: refetchCourses 
  } = useQuery({
    queryKey: ["admin", "courses", statusFilter, searchQuery],
    queryFn: () => courseAdminApi.listCourses({
      status: statusFilter === "all" ? undefined : statusFilter,
      search: searchQuery || undefined,
    }),
    staleTime: 30000, // 30 seconds
  })

  const {
    data: mentorsData,
    isLoading: isLoadingMentors,
  } = useQuery({
    queryKey: ["admin", "mentors", "course-assignment"],
    queryFn: () => userAdminApi.listMentors({ is_active: true, limit: 100, offset: 0 }),
    staleTime: 60000,
  })

  const mentors = mentorsData?.users || []
  const mentorNameById = useMemo(
    () => Object.fromEntries(mentors.map((mentor) => [mentor.id, mentor.full_name])),
    [mentors]
  )

  // Create course mutation
  const createCourseMutation = useMutation({
    mutationFn: (data: CourseCreatePayload) => courseAdminApi.createCourse(data),
    onSuccess: (newCourse) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] })
      toast.success("Course created successfully!", {
        description: `"${newCourse.title}" has been created.`,
      })
      setShowCreateCourseModal(false)
      resetCourseForm()
    },
    onError: (error) => {
      toast.error("Failed to create course", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Update course mutation
  const updateCourseMutation = useMutation({
    mutationFn: ({ courseId, data }: { courseId: number; data: CourseUpdatePayload }) => 
      courseAdminApi.updateCourse(courseId, data),
    onSuccess: (updatedCourse) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] })
      toast.success("Course updated successfully!", {
        description: `"${updatedCourse.title}" has been updated.`,
      })
      setShowEditCourseModal(false)
      setEditingCourse(null)
      resetCourseForm()
    },
    onError: (error) => {
      toast.error("Failed to update course", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Delete course mutation
  const deleteCourseMutation = useMutation({
    mutationFn: (courseId: number) => courseAdminApi.deleteCourse(courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] })
      toast.success("Course deleted successfully!")
      setShowDeleteConfirm(false)
      setCourseToDelete(null)
    },
    onError: (error) => {
      toast.error("Failed to delete course", {
        description: getApiErrorMessage(error),
      })
    },
  })

  const assignMentorMutation = useMutation({
    mutationFn: ({ courseId, mentorId }: { courseId: number; mentorId: string }) =>
      courseAdminApi.assignCourseMentor(courseId, mentorId),
    onSuccess: (updatedCourse) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] })
      toast.success("Mentor assigned successfully", {
        description: `"${updatedCourse.title}" is now assigned to a mentor.`,
      })
      setShowAssignMentorModal(false)
      setCourseToAssignMentor(null)
      setSelectedMentorId("")
    },
    onError: (error) => {
      toast.error("Failed to assign mentor", {
        description: getApiErrorMessage(error),
      })
    },
  })

  const importCourseJsonMutation = useMutation({
    mutationFn: (file: File) => courseAdminApi.importCourseFromJson(file),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] })
      queryClient.invalidateQueries({ queryKey: ["admin", "learningPaths"] })
      queryClient.invalidateQueries({ queryKey: ["admin", "modules"] })
      queryClient.invalidateQueries({ queryKey: ["admin", "lessons"] })
      queryClient.invalidateQueries({ queryKey: ["admin", "projects"] })
      queryClient.invalidateQueries({ queryKey: ["admin", "assessments"] })

      const summary = [
        `Course ${result.action}: ${result.course_name}`,
        `Path ${result.learning_path_action}: ${result.learning_path_name}`,
        `Modules C/U: ${result.modules.created}/${result.modules.updated}`,
        `Lessons C/U: ${result.lessons.created}/${result.lessons.updated}`,
        `Projects C/U: ${result.projects.created}/${result.projects.updated}`,
        `Quizzes C/U: ${result.quizzes.created}/${result.quizzes.updated}`,
      ].join(" | ")

      toast.success("Course JSON imported", {
        description: summary,
      })

      setSelectedCourse(result.course_id)
      setSelectedPathId(result.learning_path_id)
      setJsonImportFile(null)
      if (jsonImportInputRef.current) {
        jsonImportInputRef.current.value = ""
      }
    },
    onError: (error) => {
      toast.error("Failed to import JSON", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Fetch learning paths for selected course
  const {
    data: learningPaths = [],
    isLoading: isLoadingPaths,
  } = useQuery({
    queryKey: ["admin", "learningPaths", selectedCourse],
    queryFn: () => selectedCourse ? courseAdminApi.listLearningPaths(selectedCourse) : Promise.resolve([]),
    enabled: !!selectedCourse,
    staleTime: 30000,
  })

  // Create learning path mutation
  const createLearningPathMutation = useMutation({
    mutationFn: ({ courseId, data }: { courseId: number; data: LearningPathCreatePayload }) =>
      courseAdminApi.createLearningPath(courseId, data),
    onSuccess: (newPath) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "learningPaths", selectedCourse] })
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] })
      toast.success("Learning path created!", {
        description: `"${newPath.title}" has been created.`,
      })
    },
    onError: (error) => {
      toast.error("Failed to create learning path", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Update learning path mutation
  const updateLearningPathMutation = useMutation({
    mutationFn: ({ pathId, data }: { pathId: number; data: { title?: string; description?: string; is_default?: boolean; price: number } }) =>
      courseAdminApi.updateLearningPath(pathId, data),
    onSuccess: (updatedPath) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "learningPaths", selectedCourse] })
      toast.success("Learning path updated!", {
        description: `"${updatedPath.title}" has been updated.`,
      })
      setShowEditPathModal(false)
    },
    onError: (error) => {
      toast.error("Failed to update learning path", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Delete learning path mutation
  const deleteLearningPathMutation = useMutation({
    mutationFn: (pathId: number) => courseAdminApi.deleteLearningPath(pathId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "learningPaths", selectedCourse] })
      queryClient.invalidateQueries({ queryKey: ["admin", "modules"] })
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] })
      toast.success("Learning path deleted!", {
        description: "The learning path and all its content have been removed.",
      })
      if (selectedPathId === pathToDelete?.path_id) {
        setSelectedPathId(null)
        setSelectedModuleId(null)
      }
      setShowDeletePathConfirm(false)
      setPathToDelete(null)
    },
    onError: (error) => {
      toast.error("Failed to delete learning path", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Set default path mutation
  const setDefaultPathMutation = useMutation({
    mutationFn: ({ courseId, pathId }: { courseId: number; pathId: number }) =>
      courseAdminApi.setDefaultPath(courseId, pathId),
    onSuccess: (updatedPath) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "learningPaths", selectedCourse] })
      toast.success("Default path set!", {
        description: `"${updatedPath.title}" is now the default path.`,
      })
    },
    onError: (error) => {
      toast.error("Failed to set default path", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Unset default path mutation
  const unsetDefaultPathMutation = useMutation({
    mutationFn: ({ courseId, pathId }: { courseId: number; pathId: number }) =>
      courseAdminApi.unsetDefaultPath(courseId, pathId),
    onSuccess: (updatedPath) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "learningPaths", selectedCourse] })
      toast.success("Default path unset!", {
        description: `"${updatedPath.title}" is no longer the default path.`,
      })
    },
    onError: (error) => {
      toast.error("Failed to unset default path", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Create module mutation
  const createModuleMutation = useMutation({
    mutationFn: ({ pathId, data }: { pathId: number; data: ModuleCreatePayload }) =>
      courseAdminApi.createModule(pathId, data),
    onSuccess: (newModule) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "learningPaths", selectedCourse] })
      queryClient.invalidateQueries({ queryKey: ["admin", "modules"] })
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] })
      toast.success("Module created!", {
        description: `"${newModule.title}" has been added to the course.`,
      })
      setShowAddModuleModal(false)
      setModuleForm({
        title: "",
        slug: "",
        description: "",
        order: 1,
        unlock_after_days: 0,
        is_available_by_default: true,
        first_deadline_days: null,
        second_deadline_days: null,
        third_deadline_days: null,
      })
      setSelectedPathForModule(null)
    },
    onError: (error) => {
      toast.error("Failed to create module", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Update module mutation
  const updateModuleMutation = useMutation({
    mutationFn: ({ moduleId, data }: { moduleId: number; data: ModuleUpdatePayload }) =>
      courseAdminApi.updateModule(moduleId, data),
    onSuccess: (updatedModule) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "modules", selectedPathId] })
      toast.success("Module updated!", {
        description: `"${updatedModule.title}" has been updated.`,
      })
      setShowEditModuleModal(false)
      setEditingModule(null)
      setModuleForm({
        title: "",
        slug: "",
        description: "",
        order: 1,
        unlock_after_days: 0,
        is_available_by_default: true,
        first_deadline_days: null,
        second_deadline_days: null,
        third_deadline_days: null,
      })
    },
    onError: (error) => {
      toast.error("Failed to update module", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Delete module mutation
  const deleteModuleMutation = useMutation({
    mutationFn: (moduleId: number) => courseAdminApi.deleteModule(moduleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "modules", selectedPathId] })
      queryClient.invalidateQueries({ queryKey: ["admin", "courses"] })
      toast.success("Module deleted!")
      setShowDeleteModuleConfirm(false)
      setModuleToDelete(null)
      if (selectedModuleId === moduleToDelete?.module_id) {
        setSelectedModuleId(null)
      }
    },
    onError: (error) => {
      toast.error("Failed to delete module", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // State for edit/delete module modals
  const [showEditModuleModal, setShowEditModuleModal] = useState(false)
  const [showDeleteModuleConfirm, setShowDeleteModuleConfirm] = useState(false)
  const [editingModule, setEditingModule] = useState<ModuleResponse | null>(null)
  const [moduleToDelete, setModuleToDelete] = useState<ModuleResponse | null>(null)

  // State for selected path and module for content management
  const [selectedPathId, setSelectedPathId] = useState<number | null>(null)
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null)
  const [showAddPathModal, setShowAddPathModal] = useState(false)
  const [pathForm, setPathForm] = useState({
    title: "",
    description: "",
    price: 0,
    is_default: false,
  })

  // Lesson form state
  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    content: "",
    order: 1,
    content_type: "" as string,
    estimated_minutes: 15,
    youtube_video_url: "",
    external_resources: [] as string[],
    expected_outcomes: [] as string[],
  })
  const [showAddLessonModal, setShowAddLessonModal] = useState(false)
  const [showEditLessonModal, setShowEditLessonModal] = useState(false)
  const [showDeleteLessonConfirm, setShowDeleteLessonConfirm] = useState(false)
  const [editingLesson, setEditingLesson] = useState<LessonResponse | null>(null)
  const [lessonToDelete, setLessonToDelete] = useState<LessonResponse | null>(null)
  const [newResource, setNewResource] = useState("")
  const [newOutcome, setNewOutcome] = useState("")

  // Project/Exercise form state
  const [projectForm, setProjectForm] = useState({
    title: "",
    description: "",
    order: 1,
    estimated_hours: 2,
    starter_repo_url: "",
    solution_repo_url: "",
    required_skills: [] as string[],
  })
  const [showAddProjectModal, setShowAddProjectModal] = useState(false)
  const [showEditProjectModal, setShowEditProjectModal] = useState(false)
  const [showDeleteProjectConfirm, setShowDeleteProjectConfirm] = useState(false)
  const [editingProject, setEditingProject] = useState<ProjectResponse | null>(null)
  const [projectToDelete, setProjectToDelete] = useState<ProjectResponse | null>(null)

  // Assessment question form state
  const [assessmentForm, setAssessmentForm] = useState<{
    question_text: string
    question_type: "multiple_choice" | "debugging" | "coding" | "short_answer"
    difficulty_level: DifficultyLevel
    order: number
    options: string[]
    correct_answer: string
    explanation: string
    points: number
  }>({
    question_text: "",
    question_type: "multiple_choice",
    difficulty_level: "BEGINNER",
    order: 1,
    options: ["", "", "", ""],
    correct_answer: "0",
    explanation: "",
    points: 10,
  })
  const [showAddAssessmentModal, setShowAddAssessmentModal] = useState(false)

  // Fetch modules for selected path
  const {
    data: modules = [],
    isLoading: isLoadingModules,
  } = useQuery({
    queryKey: ["admin", "modules", selectedPathId],
    queryFn: () => selectedPathId ? courseAdminApi.listModules(selectedPathId) : Promise.resolve([]),
    enabled: !!selectedPathId,
    staleTime: 30000,
  })

  // Fetch projects for selected module
  const {
    data: projects = [],
    isLoading: isLoadingProjects,
  } = useQuery({
    queryKey: ["admin", "projects", selectedModuleId],
    queryFn: () => selectedModuleId ? courseAdminApi.listProjects(selectedModuleId) : Promise.resolve([]),
    enabled: !!selectedModuleId,
    staleTime: 30000,
  })

  // Fetch lessons for selected module
  const {
    data: lessons = [],
    isLoading: isLoadingLessons,
  } = useQuery({
    queryKey: ["admin", "lessons", selectedModuleId],
    queryFn: () => selectedModuleId ? courseAdminApi.listLessons(selectedModuleId) : Promise.resolve([]),
    enabled: !!selectedModuleId,
    staleTime: 30000,
  })

  // Fetch assessments for selected module
  const {
    data: assessments = [],
    isLoading: isLoadingAssessments,
  } = useQuery({
    queryKey: ["admin", "assessments", selectedModuleId],
    queryFn: () => selectedModuleId ? courseAdminApi.listAssessments(selectedModuleId) : Promise.resolve([]),
    enabled: !!selectedModuleId,
    staleTime: 30000,
  })

  // Create lesson mutation
  const createLessonMutation = useMutation({
    mutationFn: ({ moduleId, data }: { moduleId: number; data: LessonCreatePayload }) =>
      courseAdminApi.createLesson(moduleId, data),
    onSuccess: (newLesson) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "lessons", selectedModuleId] })
      toast.success("Lesson created!", {
        description: `"${newLesson.title}" has been added.`,
      })
      setShowAddLessonModal(false)
      setLessonForm({
        title: "",
        description: "",
        content: "",
        order: 1,
        content_type: "",
        estimated_minutes: 15,
        youtube_video_url: "",
        external_resources: [],
        expected_outcomes: [],
      })
    },
    onError: (error) => {
      toast.error("Failed to create lesson", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Update lesson mutation
  const updateLessonMutation = useMutation({
    mutationFn: ({ lessonId, data }: { lessonId: number; data: LessonUpdatePayload }) =>
      courseAdminApi.updateLesson(lessonId, data),
    onSuccess: (updatedLesson) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "lessons", selectedModuleId] })
      toast.success("Lesson updated!", {
        description: `"${updatedLesson.title}" has been updated.`,
      })
      setShowEditLessonModal(false)
      setEditingLesson(null)
    },
    onError: (error) => {
      toast.error("Failed to update lesson", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Delete lesson mutation
  const deleteLessonMutation = useMutation({
    mutationFn: (lessonId: number) => courseAdminApi.deleteLesson(lessonId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "lessons", selectedModuleId] })
      toast.success("Lesson deleted!")
      setShowDeleteLessonConfirm(false)
      setLessonToDelete(null)
    },
    onError: (error) => {
      toast.error("Failed to delete lesson", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Create project mutation
  const createProjectMutation = useMutation({
    mutationFn: ({ moduleId, data }: { moduleId: number; data: ProjectCreatePayload }) =>
      courseAdminApi.createProject(moduleId, data),
    onSuccess: (newProject) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "projects", selectedModuleId] })
      toast.success("Project/Exercise created!", {
        description: `"${newProject.title}" has been added.`,
      })
      setShowAddProjectModal(false)
      setProjectForm({
        title: "",
        description: "",
        order: 1,
        estimated_hours: 2,
        starter_repo_url: "",
        solution_repo_url: "",
        required_skills: [],
      })
    },
    onError: (error) => {
      toast.error("Failed to create project", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: ({ projectId, data }: { projectId: number; data: ProjectUpdatePayload }) =>
      courseAdminApi.updateProject(projectId, data),
    onSuccess: (updatedProject) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "projects", selectedModuleId] })
      toast.success("Project updated!", {
        description: `"${updatedProject.title}" has been updated.`,
      })
      setShowEditProjectModal(false)
      setEditingProject(null)
    },
    onError: (error) => {
      toast.error("Failed to update project", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: number) => courseAdminApi.deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "projects", selectedModuleId] })
      toast.success("Project deleted!", {
        description: "Project has been removed.",
      })
      setShowDeleteProjectConfirm(false)
      setProjectToDelete(null)
    },
    onError: (error) => {
      toast.error("Failed to delete project", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Create assessment mutation
  const createAssessmentMutation = useMutation({
    mutationFn: ({ moduleId, data }: { moduleId: number; data: AssessmentQuestionCreatePayload }) =>
      courseAdminApi.createAssessmentQuestion(moduleId, data),
    onSuccess: (newQuestion) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "assessments", selectedModuleId] })
      toast.success("Quiz question created!", {
        description: "Question has been added to the quiz.",
      })
      setShowAddAssessmentModal(false)
      setAssessmentForm({
        question_text: "",
        question_type: "multiple_choice",
        difficulty_level: "BEGINNER",
        order: 1,
        options: ["", "", "", ""],
        correct_answer: "0",
        explanation: "",
        points: 10,
      })
    },
    onError: (error) => {
      toast.error("Failed to create question", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Update assessment mutation
  const updateAssessmentMutation = useMutation({
    mutationFn: ({ questionId, data }: { questionId: number; data: AssessmentQuestionUpdatePayload }) =>
      courseAdminApi.updateAssessmentQuestion(questionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "assessments", selectedModuleId] })
      toast.success("Question updated!", {
        description: "Assessment question has been updated.",
      })
      setShowEditAssessmentModal(false)
      setEditingAssessment(null)
    },
    onError: (error) => {
      toast.error("Failed to update question", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // Delete assessment mutation
  const deleteAssessmentMutation = useMutation({
    mutationFn: (questionId: number) => courseAdminApi.deleteAssessmentQuestion(questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "assessments", selectedModuleId] })
      toast.success("Question deleted!", {
        description: "Assessment question has been removed.",
      })
      setShowDeleteAssessmentConfirm(false)
      setAssessmentToDelete(null)
    },
    onError: (error) => {
      toast.error("Failed to delete question", {
        description: getApiErrorMessage(error),
      })
    },
  })

  // State for edit/delete assessment modals
  const [showEditAssessmentModal, setShowEditAssessmentModal] = useState(false)
  const [showDeleteAssessmentConfirm, setShowDeleteAssessmentConfirm] = useState(false)
  const [editingAssessment, setEditingAssessment] = useState<AssessmentQuestionResponse | null>(null)
  const [assessmentToDelete, setAssessmentToDelete] = useState<AssessmentQuestionResponse | null>(null)

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const resetCourseForm = () => {
    setCourseForm({
      title: "",
      slug: "",
      description: "",
      estimated_hours: 10,
      difficulty_level: "BEGINNER",
      is_active: false,
      cover_image_url: "",
      prerequisites: "",
      what_youll_learn: "",
      certificate_on_completion: false,
    })
    setFormErrors({})
  }

  // Auto-generate slug from title - don't sanitize while typing to allow spaces
  const handleTitleChange = (title: string) => {
    setCourseForm(prev => ({
      ...prev,
      title: title,
      slug: generateSlug(title),
    }))
  }

  // Handle module title change with slug generation
  const handleModuleTitleChange = (title: string) => {
    setModuleForm(prev => ({
      ...prev,
      title: title,
      slug: generateSlug(title),
    }))
  }

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleCreateCourse = () => {
    // Validate form - only pass fields that are validated
    const errors = validateCourseForm({
      title: courseForm.title,
      slug: courseForm.slug,
      description: courseForm.description,
      estimated_hours: courseForm.estimated_hours,
      difficulty_level: courseForm.difficulty_level,
    })
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      toast.error("Please fix the errors in the form")
      return
    }

    // Parse comma-separated values into arrays
    const prerequisitesArray = courseForm.prerequisites
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0)
    const whatYoullLearnArray = courseForm.what_youll_learn
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0)

    // Clean and submit
    const payload: CourseCreatePayload = {
      title: sanitizeString(courseForm.title),
      description: sanitizeString(courseForm.description),
      slug: courseForm.slug.toLowerCase().trim(),
      estimated_hours: courseForm.estimated_hours,
      difficulty_level: courseForm.difficulty_level,
      cover_image_url: courseForm.cover_image_url || undefined,
      prerequisites: prerequisitesArray.length > 0 ? prerequisitesArray : undefined,
      what_youll_learn: whatYoullLearnArray.length > 0 ? whatYoullLearnArray : undefined,
      certificate_on_completion: courseForm.certificate_on_completion,
    }

    createCourseMutation.mutate(payload)
  }

  const handleEditCourse = (course: CourseListResponse) => {
    setEditingCourse(course)
    setCourseForm({
      title: course.title,
      slug: course.slug,
      description: course.description || "",
      estimated_hours: course.estimated_hours,
      difficulty_level: course.difficulty_level as DifficultyLevel,
      is_active: course.is_active,
      cover_image_url: "",
      prerequisites: course.prerequisites?.join(", ") || "",
      what_youll_learn: course.what_youll_learn?.join(", ") || "",
      certificate_on_completion: course.certificate_on_completion || false,
    })
    setFormErrors({})
    setShowEditCourseModal(true)
  }

  const handleUpdateCourse = () => {
    if (!editingCourse) return

    // Validate form
    // Validate form - only pass fields that are validated
    const errors = validateCourseForm({
      title: courseForm.title,
      slug: courseForm.slug,
      description: courseForm.description,
      estimated_hours: courseForm.estimated_hours,
      difficulty_level: courseForm.difficulty_level,
    })
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      toast.error("Please fix the errors in the form")
      return
    }

    // Parse comma-separated values into arrays
    const prerequisitesArray = courseForm.prerequisites
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0)
    const whatYoullLearnArray = courseForm.what_youll_learn
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0)

    // Clean and submit
    const payload: CourseUpdatePayload = {
      title: sanitizeString(courseForm.title),
      description: sanitizeString(courseForm.description),
      slug: courseForm.slug.toLowerCase().trim(),
      estimated_hours: courseForm.estimated_hours,
      difficulty_level: courseForm.difficulty_level,
      is_active: courseForm.is_active,
      prerequisites: prerequisitesArray.length > 0 ? prerequisitesArray : undefined,
      what_youll_learn: whatYoullLearnArray.length > 0 ? whatYoullLearnArray : undefined,
      certificate_on_completion: courseForm.certificate_on_completion,
    }

    updateCourseMutation.mutate({ courseId: editingCourse.course_id, data: payload })
  }

  const handleDeleteCourse = (course: CourseListResponse) => {
    setCourseToDelete(course)
    setShowDeleteConfirm(true)
  }

  const handleConfirmDeleteCourse = () => {
    if (courseToDelete) {
      deleteCourseMutation.mutate(courseToDelete.course_id)
    }
  }

  const handleAssignMentor = (course: CourseListResponse) => {
    setCourseToAssignMentor(course)
    setSelectedMentorId(course.created_by || "")
    setShowAssignMentorModal(true)
  }

  const handleConfirmAssignMentor = () => {
    if (!courseToAssignMentor) return
    if (!selectedMentorId) {
      toast.error("Please select a mentor")
      return
    }

    assignMentorMutation.mutate({
      courseId: courseToAssignMentor.course_id,
      mentorId: selectedMentorId,
    })
  }

  const handleJsonFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setJsonImportFile(null)
      return
    }

    const isJsonMime = ["application/json", "text/plain", "text/json"].includes(file.type)
    const isJsonExtension = file.name.toLowerCase().endsWith(".json")
    if (!isJsonMime && !isJsonExtension) {
      toast.error("Invalid file type", {
        description: "Please choose a valid JSON file.",
      })
      setJsonImportFile(null)
      event.target.value = ""
      return
    }

    setJsonImportFile(file)
  }

  const validateCourseJsonFile = async (file: File): Promise<string[]> => {
    const errors: string[] = []

    let parsed: unknown
    try {
      parsed = JSON.parse(await file.text())
    } catch {
      return ["Invalid JSON format. Please upload a valid JSON document."]
    }

    if (!parsed || typeof parsed !== "object") {
      return ["Invalid JSON structure. Root payload must be an object."]
    }

    const payload = parsed as Record<string, unknown>
    const courseDescription = typeof payload.description === "string" ? payload.description.trim() : ""
    if (!courseDescription) {
      errors.push("Course description is required.")
    } else if (courseDescription.length < 10) {
      errors.push("Course description must be at least 10 characters.")
    }

    const learningPath = payload.learning_path
    if (!learningPath || typeof learningPath !== "object") {
      errors.push("learning_path is required and must be an object.")
      return errors
    }

    const learningPathPayload = learningPath as Record<string, unknown>
    const learningPathDescription =
      typeof learningPathPayload.description === "string" ? learningPathPayload.description.trim() : ""
    if (!learningPathDescription) {
      errors.push("Learning path description is required.")
    } else if (learningPathDescription.length < 10) {
      errors.push("Learning path description must be at least 10 characters.")
    }

    return errors
  }

  const handleJsonImport = async () => {
    if (!jsonImportFile) {
      toast.error("No file selected", {
        description: "Choose a JSON file before uploading.",
      })
      return
    }

    const validationErrors = await validateCourseJsonFile(jsonImportFile)
    if (validationErrors.length > 0) {
      toast.error("Fix JSON validation errors", {
        description: validationErrors.join(" | "),
      })
      return
    }

    importCourseJsonMutation.mutate(jsonImportFile)
  }

  const handleAddModule = async () => {
    // Validate module form
    const moduleFormForValidation = {
      ...moduleForm,
      first_deadline_days: moduleForm.first_deadline_days ?? undefined,
      second_deadline_days: moduleForm.second_deadline_days ?? undefined,
      third_deadline_days: moduleForm.third_deadline_days ?? undefined,
    }
    const errors = validateModuleForm(moduleFormForValidation)
    if (Object.keys(errors).length > 0) {
      toast.error("Please fill in all required fields")
      return
    }

    if (!selectedCourse) {
      toast.error("Please select a course first")
      return
    }

    try {
      let pathId: number

      // Check if a specific path is selected
      if (selectedPathForModule) {
        pathId = selectedPathForModule
      } else if (learningPaths.length === 0) {
        // Auto-create a default learning path for this course
        toast.info("Creating default learning path...")
        const selectedCourseData = courses.find(c => c.course_id === selectedCourse)
        const defaultPath = await courseAdminApi.createLearningPath(selectedCourse, {
          course_id: selectedCourse,
          title: `${selectedCourseData?.title || 'Course'} - Main Path`,
          description: `Default learning path for ${selectedCourseData?.title || 'this course'}`,
          is_default: true,
        })
        pathId = defaultPath.path_id
        // Invalidate to refresh learning paths
        queryClient.invalidateQueries({ queryKey: ["admin", "learningPaths", selectedCourse] })
      } else {
        // Use the first (or default) learning path
        const defaultPath = learningPaths.find(p => p.is_default) || learningPaths[0]
        pathId = defaultPath.path_id
      }

      // Create the module
      const moduleData: ModuleCreatePayload = {
        path_id: pathId,
        title: sanitizeString(moduleForm.title),
        description: sanitizeString(moduleForm.description),
        order: moduleForm.order,
        unlock_after_days: moduleForm.unlock_after_days,
        is_available_by_default: moduleForm.is_available_by_default,
        first_deadline_days: moduleForm.first_deadline_days || undefined,
        second_deadline_days: moduleForm.second_deadline_days || undefined,
        third_deadline_days: moduleForm.third_deadline_days || undefined,
      }

      createModuleMutation.mutate({ pathId, data: moduleData })
    } catch (error) {
      toast.error("Failed to create module", {
        description: getApiErrorMessage(error),
      })
    }
  }

  const handleAddQuiz = (moduleId: string) => {
    setCurrentModuleId(moduleId)
    setEditingQuiz(null)
    setQuizForm({ name: "", slug: "", passingScore: 75, questionsList: [] })
    setShowQuizModal(true)
  }

  const handleEditQuiz = (quiz: any, moduleId: string) => {
    setCurrentModuleId(moduleId)
    setEditingQuiz(quiz)
    setQuizForm({
      name: quiz.name,
      slug: quiz.slug,
      passingScore: quiz.passingScore,
      questionsList: quiz.questionsList || [],
    })
    setShowQuizModal(true)
  }

  const handleSaveQuiz = () => {
    console.log(editingQuiz ? "Updating quiz:" : "Creating quiz:", quizForm, "in module:", currentModuleId)
    setShowQuizModal(false)
    setEditingQuiz(null)
    setCurrentModuleId(null)
  }

  const handleDeleteQuiz = (quizId: string) => {
    if (confirm("Are you sure you want to delete this quiz?")) {
      console.log("Deleting quiz:", quizId)
    }
  }

  // Quiz question management helpers
  const addQuestion = () => {
    const newQuestion = {
      id: `q-${Date.now()}`,
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
    }
    setQuizForm({
      ...quizForm,
      questionsList: [...quizForm.questionsList, newQuestion],
    })
  }

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...quizForm.questionsList]
    updated[index] = { ...updated[index], [field]: value }
    setQuizForm({ ...quizForm, questionsList: updated })
  }

  const updateQuestionOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...quizForm.questionsList]
    const options = [...updated[questionIndex].options]
    options[optionIndex] = value
    updated[questionIndex] = { ...updated[questionIndex], options }
    setQuizForm({ ...quizForm, questionsList: updated })
  }

  const removeQuestion = (index: number) => {
    const updated = quizForm.questionsList.filter((_, i) => i !== index)
    setQuizForm({ ...quizForm, questionsList: updated })
  }

  const handleAddTask = (moduleId: string) => {
    setCurrentModuleId(moduleId)
    setEditingTask(null)
    setTaskForm({ name: "", slug: "", type: "exercise", instructions: "", starterCode: "", expectedOutput: "" })
    setShowTaskModal(true)
  }

  const handleEditTask = (task: any, moduleId: string) => {
    setCurrentModuleId(moduleId)
    setEditingTask(task)
    setTaskForm({
      name: task.name,
      slug: task.slug,
      type: task.type,
      instructions: task.instructions || "",
      starterCode: task.starterCode || "",
      expectedOutput: task.expectedOutput || "",
    })
    setShowTaskModal(true)
  }

  const handleSaveTask = () => {
    console.log(editingTask ? "Updating task:" : "Creating task:", taskForm, "in module:", currentModuleId)
    setShowTaskModal(false)
    setEditingTask(null)
    setCurrentModuleId(null)
  }

  const handleDeleteTask = (taskId: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      console.log("Deleting task:", taskId)
    }
  }

  // Find selected course from API data
  const selectedCourseData = courses.find(c => c.course_id === selectedCourse)

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }))
  }

  const copyPath = (path: string) => {
    navigator.clipboard.writeText(path)
    toast.success("Path copied to clipboard!")
  }

  // Render modals helper - these need to be always available
  const renderModals = () => (
    <>
      {/* Create Course Modal */}
      {showCreateCourseModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowCreateCourseModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Create New Course</h2>
                <button
                  onClick={() => setShowCreateCourseModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Course Title *</label>
                  <input
                    type="text"
                    value={courseForm.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.title ? "border-red-500" : "border-gray-200"
                    }`}
                    placeholder="e.g., Advanced React & State Management"
                  />
                  {formErrors.title && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.title}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Course Slug</label>
                  <input
                    type="text"
                    value={courseForm.slug}
                    onChange={(e) => setCourseForm({ ...courseForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.slug ? "border-red-500" : "border-gray-200"
                    }`}
                    placeholder="e.g., react-advanced"
                  />
                  <p className="text-xs text-gray-500 mt-1">Used in URL: /courses/{courseForm.slug || "slug"}</p>
                  {formErrors.slug && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.slug}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                  <textarea
                    value={courseForm.description}
                    onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] ${
                      formErrors.description ? "border-red-500" : "border-gray-200"
                    }`}
                    placeholder="Course description..."
                  />
                  {formErrors.description && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Hours *</label>
                    <input
                      type="number"
                      value={courseForm.estimated_hours}
                      onChange={(e) => setCourseForm({ ...courseForm, estimated_hours: parseInt(e.target.value) || 0 })}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.estimated_hours ? "border-red-500" : "border-gray-200"
                      }`}
                      min="1"
                      placeholder="10"
                    />
                    {formErrors.estimated_hours && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.estimated_hours}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Level</label>
                    <select
                      value={courseForm.difficulty_level}
                      onChange={(e) => setCourseForm({ ...courseForm, difficulty_level: e.target.value as DifficultyLevel })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="BEGINNER">Beginner</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cover Image URL (optional)</label>
                  <input
                    type="url"
                    value={courseForm.cover_image_url}
                    onChange={(e) => setCourseForm({ ...courseForm, cover_image_url: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com/cover.jpg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prerequisites (optional)</label>
                  <textarea
                    value={courseForm.prerequisites}
                    onChange={(e) => setCourseForm({ ...courseForm, prerequisites: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    placeholder="e.g., Basic JavaScript, HTML/CSS fundamentals (comma-separated)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter comma-separated list of prerequisites</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">What You&apos;ll Learn (optional)</label>
                  <textarea
                    value={courseForm.what_youll_learn}
                    onChange={(e) => setCourseForm({ ...courseForm, what_youll_learn: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    placeholder="e.g., Build React apps, State management with Redux, Testing (comma-separated)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter comma-separated list of learning outcomes</p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="certificate_on_completion_create"
                    checked={courseForm.certificate_on_completion}
                    onChange={(e) => setCourseForm({ ...courseForm, certificate_on_completion: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="certificate_on_completion_create" className="text-sm font-medium text-gray-700">
                    Certificate on Completion
                  </label>
                </div>
              </div>
              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
                <Button variant="outline" onClick={() => setShowCreateCourseModal(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700" 
                  onClick={handleCreateCourse}
                  disabled={createCourseMutation.isPending}
                >
                  {createCourseMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Create Course
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Course Modal */}
      {showEditCourseModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowEditCourseModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Edit Course</h2>
                <button
                  onClick={() => setShowEditCourseModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Course Title *</label>
                  <input
                    type="text"
                    value={courseForm.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.title ? "border-red-500" : "border-gray-200"
                    }`}
                  />
                  {formErrors.title && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.title}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Course Slug</label>
                  <input
                    type="text"
                    value={courseForm.slug}
                    onChange={(e) => setCourseForm({ ...courseForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      formErrors.slug ? "border-red-500" : "border-gray-200"
                    }`}
                  />
                  <p className="text-xs text-gray-500 mt-1">Used in URL: /courses/{courseForm.slug || "slug"}</p>
                  {formErrors.slug && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.slug}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                  <textarea
                    value={courseForm.description}
                    onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] ${
                      formErrors.description ? "border-red-500" : "border-gray-200"
                    }`}
                  />
                  {formErrors.description && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.description}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Hours *</label>
                    <input
                      type="number"
                      value={courseForm.estimated_hours}
                      onChange={(e) => setCourseForm({ ...courseForm, estimated_hours: parseInt(e.target.value) || 0 })}
                      className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.estimated_hours ? "border-red-500" : "border-gray-200"
                      }`}
                      min="1"
                    />
                    {formErrors.estimated_hours && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.estimated_hours}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Level</label>
                    <select
                      value={courseForm.difficulty_level}
                      onChange={(e) => setCourseForm({ ...courseForm, difficulty_level: e.target.value as DifficultyLevel })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="BEGINNER">Beginner</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="isActiveEdit"
                    checked={courseForm.is_active}
                    onChange={(e) => setCourseForm({ ...courseForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isActiveEdit" className="text-sm text-gray-700">
                    <span className="font-medium">Course is Active</span>
                    <span className="block text-xs text-gray-500">Active courses are visible to students</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prerequisites (optional)</label>
                  <textarea
                    value={courseForm.prerequisites}
                    onChange={(e) => setCourseForm({ ...courseForm, prerequisites: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    placeholder="e.g., Basic JavaScript, HTML/CSS fundamentals (comma-separated)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter comma-separated list of prerequisites</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">What You&apos;ll Learn (optional)</label>
                  <textarea
                    value={courseForm.what_youll_learn}
                    onChange={(e) => setCourseForm({ ...courseForm, what_youll_learn: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    placeholder="e.g., Build React apps, State management with Redux, Testing (comma-separated)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter comma-separated list of learning outcomes</p>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="certificate_on_completion_edit"
                    checked={courseForm.certificate_on_completion}
                    onChange={(e) => setCourseForm({ ...courseForm, certificate_on_completion: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="certificate_on_completion_edit" className="text-sm font-medium text-gray-700">
                    Certificate on Completion
                  </label>
                </div>
              </div>
              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
                <Button variant="outline" onClick={() => setShowEditCourseModal(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700" 
                  onClick={handleUpdateCourse}
                  disabled={updateCourseMutation.isPending}
                >
                  {updateCourseMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Update Course
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Module Modal */}
      {showAddModuleModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowAddModuleModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold text-gray-900">Add New Module</h2>
                <button
                  onClick={() => setShowAddModuleModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {/* Learning Path Selector */}
                {learningPaths.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Learning Path *</label>
                    <select
                      value={selectedPathForModule || ""}
                      onChange={(e) => setSelectedPathForModule(e.target.value ? parseInt(e.target.value) : null)}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Select a learning path</option>
                      {learningPaths.map((path) => (
                        <option key={path.path_id} value={path.path_id}>
                          {path.title} {path.is_default ? "(Default)" : ""}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Select which learning path this module belongs to. Modules are path-specific.
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Module Title *</label>
                  <input
                    type="text"
                    value={moduleForm.title}
                    onChange={(e) => handleModuleTitleChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., React Fundamentals"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Module Slug</label>
                  <input
                    type="text"
                    value={moduleForm.slug}
                    onChange={(e) => setModuleForm({ ...moduleForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., react-fundamentals"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={moduleForm.description}
                    onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    placeholder="Brief description of the module..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                  <input
                    type="number"
                    value={moduleForm.order}
                    onChange={(e) => setModuleForm({ ...moduleForm, order: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>
                
                {/* Module Availability Settings */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Module Availability Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Unlock After Days</label>
                      <input
                        type="number"
                        value={moduleForm.unlock_after_days}
                        onChange={(e) => setModuleForm({ ...moduleForm, unlock_after_days: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        placeholder="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">Days after registration to unlock</p>
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={moduleForm.is_available_by_default}
                          onChange={(e) => setModuleForm({ ...moduleForm, is_available_by_default: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Available by Default</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Project Deadline Settings */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Project Deadline Settings (Days)</h4>
                  <p className="text-xs text-gray-500 mb-3">Set deadline tiers for project submissions. Points are reduced after each deadline.</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">1st Deadline (100%)</label>
                      <input
                        type="number"
                        value={moduleForm.first_deadline_days ?? ""}
                        onChange={(e) => setModuleForm({ ...moduleForm, first_deadline_days: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        placeholder="e.g., 7"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">2nd Deadline (50%)</label>
                      <input
                        type="number"
                        value={moduleForm.second_deadline_days ?? ""}
                        onChange={(e) => setModuleForm({ ...moduleForm, second_deadline_days: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        placeholder="e.g., 14"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">3rd Deadline (25%)</label>
                      <input
                        type="number"
                        value={moduleForm.third_deadline_days ?? ""}
                        onChange={(e) => setModuleForm({ ...moduleForm, third_deadline_days: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        placeholder="e.g., 21"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                <Button variant="outline" onClick={() => setShowAddModuleModal(false)} disabled={createModuleMutation.isPending}>
                  Cancel
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700" 
                  onClick={handleAddModule}
                  disabled={createModuleMutation.isPending || isLoadingPaths}
                >
                  {createModuleMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Add Module
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Module Modal */}
      {showEditModuleModal && editingModule && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowEditModuleModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold text-gray-900">Edit Module</h2>
                <button
                  onClick={() => setShowEditModuleModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Module Title *</label>
                  <input
                    type="text"
                    value={moduleForm.title}
                    onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., React Fundamentals"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={moduleForm.description}
                    onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    placeholder="Brief description of the module..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                    <input
                      type="number"
                      value={moduleForm.order}
                      onChange={(e) => setModuleForm({ ...moduleForm, order: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Hours</label>
                    <input
                      type="number"
                      value={editingModule.estimated_hours || 0}
                      onChange={(e) => setEditingModule({ ...editingModule, estimated_hours: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      step="0.5"
                    />
                  </div>
                </div>
                
                {/* Module Availability Settings */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Module Availability Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Unlock After Days</label>
                      <input
                        type="number"
                        value={moduleForm.unlock_after_days}
                        onChange={(e) => setModuleForm({ ...moduleForm, unlock_after_days: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="0"
                        placeholder="0"
                      />
                      <p className="text-xs text-gray-500 mt-1">Days after registration to unlock</p>
                    </div>
                    <div className="flex items-center">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={moduleForm.is_available_by_default}
                          onChange={(e) => setModuleForm({ ...moduleForm, is_available_by_default: e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Available by Default</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Project Deadline Settings */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Project Deadline Settings (Days)</h4>
                  <p className="text-xs text-gray-500 mb-3">Set deadline tiers for project submissions. Points are reduced after each deadline.</p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">1st Deadline (100%)</label>
                      <input
                        type="number"
                        value={moduleForm.first_deadline_days ?? ""}
                        onChange={(e) => setModuleForm({ ...moduleForm, first_deadline_days: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        placeholder="e.g., 7"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">2nd Deadline (50%)</label>
                      <input
                        type="number"
                        value={moduleForm.second_deadline_days ?? ""}
                        onChange={(e) => setModuleForm({ ...moduleForm, second_deadline_days: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        placeholder="e.g., 14"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">3rd Deadline (25%)</label>
                      <input
                        type="number"
                        value={moduleForm.third_deadline_days ?? ""}
                        onChange={(e) => setModuleForm({ ...moduleForm, third_deadline_days: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        min="1"
                        placeholder="e.g., 21"
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                <Button variant="outline" onClick={() => setShowEditModuleModal(false)} disabled={updateModuleMutation.isPending}>
                  Cancel
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700" 
                  onClick={() => {
                    updateModuleMutation.mutate({
                      moduleId: editingModule.module_id,
                      data: {
                        title: moduleForm.title,
                        description: moduleForm.description,
                        order: moduleForm.order,
                        estimated_hours: editingModule?.estimated_hours || 0,
                        unlock_after_days: moduleForm.unlock_after_days,
                        is_available_by_default: moduleForm.is_available_by_default,
                        first_deadline_days: moduleForm.first_deadline_days || undefined,
                        second_deadline_days: moduleForm.second_deadline_days || undefined,
                        third_deadline_days: moduleForm.third_deadline_days || undefined,
                      }
                    })
                  }}
                  disabled={updateModuleMutation.isPending}
                >
                  {updateModuleMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Module Confirmation Modal */}
      {showDeleteModuleConfirm && moduleToDelete && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowDeleteModuleConfirm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-red-600">Delete Module</h2>
                <button
                  onClick={() => setShowDeleteModuleConfirm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Are you sure you want to delete this module?</h3>
                    <p className="text-gray-600 text-sm mb-3">
                      <strong>"{moduleToDelete.title}"</strong>
                    </p>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-700 text-sm font-medium mb-1">⚠️ This action cannot be undone!</p>
                      <p className="text-red-600 text-xs">
                        All lessons, projects, and quiz questions associated with this module will be permanently deleted.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
                <Button variant="outline" onClick={() => setShowDeleteModuleConfirm(false)} disabled={deleteModuleMutation.isPending}>
                  Cancel
                </Button>
                <Button 
                  className="bg-red-600 hover:bg-red-700" 
                  onClick={() => {
                    deleteModuleMutation.mutate(moduleToDelete.module_id)
                  }}
                  disabled={deleteModuleMutation.isPending}
                >
                  {deleteModuleMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Module
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Path Modal */}
      {showEditPathModal && editingPath && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowEditPathModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Edit Learning Path</h2>
                <button
                  onClick={() => setShowEditPathModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <form onSubmit={(e) => {
                e.preventDefault()
                if (editingPath) {
                  updateLearningPathMutation.mutate({
                    pathId: editingPath.path_id,
                    data: { title: pathForm.title, description: pathForm.description, price: pathForm.price || 0 }
                  })
                }
              }}>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Path Title</label>
                    <input
                      type="text"
                      value={pathForm.title}
                      onChange={(e) => setPathForm({ ...pathForm, title: e.target.value })}
                      placeholder="Enter path title"
                      required
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={pathForm.description}
                      onChange={(e) => setPathForm({ ...pathForm, description: e.target.value })}
                      placeholder="Describe this learning path..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={pathForm.price}
                      onChange={(e) => setPathForm({ ...pathForm, price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">Set to 0 for free courses</p>
                  </div>
                </div>
                <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setShowEditPathModal(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-700"
                    disabled={updateLearningPathMutation.isPending}
                  >
                    {updateLearningPathMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* Delete Path Confirmation Modal */}
      {showDeletePathConfirm && pathToDelete && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowDeletePathConfirm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-red-600">Delete Learning Path</h2>
                <button
                  onClick={() => setShowDeletePathConfirm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Are you sure you want to delete this path?</h3>
                    <p className="text-gray-600 text-sm mb-3">
                      <strong>"{pathToDelete.title}"</strong>
                    </p>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-700 text-sm font-medium mb-1">⚠️ This action cannot be undone!</p>
                      <p className="text-red-600 text-xs">
                        All modules, lessons, projects, and quizzes in this learning path will be permanently deleted.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
                <Button variant="outline" onClick={() => setShowDeletePathConfirm(false)} disabled={deleteLearningPathMutation.isPending}>
                  Cancel
                </Button>
                <Button 
                  className="bg-red-600 hover:bg-red-700" 
                  onClick={() => {
                    if (pathToDelete) {
                      deleteLearningPathMutation.mutate(pathToDelete.path_id)
                    }
                  }}
                  disabled={deleteLearningPathMutation.isPending}
                >
                  {deleteLearningPathMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Path
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Quiz Modal (Add/Edit) */}
      {showQuizModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowQuizModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold text-gray-900">{editingQuiz ? "Edit Quiz" : "Add New Quiz"}</h2>
                <button
                  onClick={() => setShowQuizModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* Basic Quiz Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Name</label>
                    <input
                      type="text"
                      value={quizForm.name}
                      onChange={(e) => setQuizForm({ ...quizForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., React Basics Quiz"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quiz Slug</label>
                    <input
                      type="text"
                      value={quizForm.slug}
                      onChange={(e) => setQuizForm({ ...quizForm, slug: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., react-basics-quiz"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Passing Score (%)</label>
                    <input
                      type="number"
                      value={quizForm.passingScore}
                      onChange={(e) => setQuizForm({ ...quizForm, passingScore: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>

                {/* Questions Section */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Quiz Questions</h3>
                      <p className="text-sm text-gray-500">{quizForm.questionsList.length} question(s) added</p>
                    </div>
                    <Button onClick={addQuestion} className="bg-amber-600 hover:bg-amber-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Question
                    </Button>
                  </div>

                  {quizForm.questionsList.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                      <FileQuestion className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500 mb-2">No questions added yet</p>
                      <p className="text-sm text-gray-400">Click "Add Question" to create your first quiz question</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {quizForm.questionsList.map((q, qIndex) => (
                        <div key={q.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="flex items-start justify-between gap-4 mb-4">
                            <div className="flex-1">
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Question {qIndex + 1}
                              </label>
                              <input
                                type="text"
                                value={q.question}
                                onChange={(e) => updateQuestion(qIndex, "question", e.target.value)}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter your question..."
                              />
                            </div>
                            <button
                              onClick={() => removeQuestion(qIndex)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-7"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {q.options.map((option, oIndex) => (
                              <div key={oIndex} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`correct-${q.id}`}
                                  checked={q.correctAnswer === oIndex}
                                  onChange={() => updateQuestion(qIndex, "correctAnswer", oIndex)}
                                  className="w-4 h-4 text-green-600 focus:ring-green-500"
                                />
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) => updateQuestionOption(qIndex, oIndex, e.target.value)}
                                  className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                                    q.correctAnswer === oIndex
                                      ? "border-green-300 bg-green-50 focus:ring-green-500"
                                      : "border-gray-200 focus:ring-blue-500"
                                  }`}
                                  placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                                />
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            <span className="text-green-600">●</span> Select the radio button next to the correct answer
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <p className="text-sm text-gray-500">
                  {quizForm.questionsList.length > 0 && (
                    <>Total: {quizForm.questionsList.length} questions · Passing: {quizForm.passingScore}%</>
                  )}
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowQuizModal(false)}>
                    Cancel
                  </Button>
                  <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleSaveQuiz}>
                    <Save className="w-4 h-4 mr-2" />
                    {editingQuiz ? "Update Quiz" : "Save Quiz"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Task Modal (Add/Edit) */}
      {showTaskModal && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowTaskModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{editingTask ? "Edit Task" : "Add New Task"}</h2>
                  <p className="text-sm text-gray-500">
                    {taskForm.type === "project" ? "Project with submission requirements" : "Coding exercise with instructions"}
                  </p>
                </div>
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-6 overflow-y-auto flex-1">
                {/* Basic Task Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Task Name</label>
                    <input
                      type="text"
                      value={taskForm.name}
                      onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Component Composition Exercise"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Task Slug</label>
                    <input
                      type="text"
                      value={taskForm.slug}
                      onChange={(e) => setTaskForm({ ...taskForm, slug: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., component-composition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                    <select
                      value={taskForm.type}
                      onChange={(e) => setTaskForm({ ...taskForm, type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="exercise">Exercise</option>
                      <option value="project">Project</option>
                    </select>
                  </div>
                </div>

                {/* Instructions Section */}
                <div className="border-t border-gray-200 pt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Task Instructions
                    </div>
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    Provide detailed instructions for students. Use Markdown for formatting (headers, lists, code blocks, etc.)
                  </p>
                  <textarea
                    value={taskForm.instructions}
                    onChange={(e) => setTaskForm({ ...taskForm, instructions: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[200px] font-mono text-sm"
                    placeholder={`# Task Overview\nDescribe what students will build...\n\n## Requirements\n- Requirement 1\n- Requirement 2\n\n## Steps\n1. First step...\n2. Second step...\n\n## Hints\n- Helpful tip 1\n- Helpful tip 2`}
                  />
                </div>

                {/* Code Section - for exercises */}
                {taskForm.type === "exercise" && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <div className="flex items-center gap-2">
                          <Code className="w-4 h-4" />
                          Starter Code (Optional)
                        </div>
                      </label>
                      <p className="text-xs text-gray-500 mb-3">
                        Code template students will start with
                      </p>
                      <textarea
                        value={taskForm.starterCode}
                        onChange={(e) => setTaskForm({ ...taskForm, starterCode: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[150px] font-mono text-sm bg-gray-900 text-green-400"
                        placeholder="// Starter code here..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          Expected Output (Optional)
                        </div>
                      </label>
                      <p className="text-xs text-gray-500 mb-3">
                        Sample output or solution for validation
                      </p>
                      <textarea
                        value={taskForm.expectedOutput}
                        onChange={(e) => setTaskForm({ ...taskForm, expectedOutput: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[150px] font-mono text-sm bg-gray-900 text-green-400"
                        placeholder="// Expected output or solution..."
                      />
                    </div>
                  </div>
                )}

                {/* Project specific guidance */}
                {taskForm.type === "project" && (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <div className="flex items-start gap-3">
                      <Link2 className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">Project Submission</h4>
                        <p className="text-sm text-blue-700 mt-1">
                          Projects require students to submit a link (GitHub repo, deployed site, etc.). 
                          Make sure your instructions clearly specify what should be submitted and any required formats.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <p className="text-sm text-gray-500">
                  {taskForm.type === "exercise" ? "Exercise · Code in browser" : "Project · Link submission"}
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowTaskModal(false)}>
                    Cancel
                  </Button>
                  <Button className="bg-green-600 hover:bg-green-700" onClick={handleSaveTask}>
                    <Save className="w-4 h-4 mr-2" />
                    {editingTask ? "Update Task" : "Save Task"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  )

  // Course List View
  if (!selectedCourse) {
    return (
      <>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Course Management</h2>
              <p className="text-gray-500 text-sm">Manage courses, modules, quizzes, and tasks with canonical paths</p>
            </div>
            <Button 
              className="bg-blue-600 hover:bg-blue-700" 
              onClick={() => {
                resetCourseForm()
                setShowCreateCourseModal(true)
              }}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Create New Course
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Import Course JSON</CardTitle>
              <CardDescription>
                Upload a course JSON file to create or update an entire course hierarchy.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  ref={jsonImportInputRef}
                  type="file"
                  accept=".json,application/json,text/plain,text/json"
                  onChange={handleJsonFileChange}
                  className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
                />
                <Button
                  onClick={handleJsonImport}
                  disabled={!jsonImportFile || importCourseJsonMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {importCourseJsonMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload JSON
                    </>
                  )}
                </Button>
              </div>
              {jsonImportFile && (
                <p className="text-sm text-gray-500">
                  Selected file: {jsonImportFile.name}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Courses Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search courses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <select 
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                    className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Loading State */}
              {isLoadingCourses && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-500">Loading courses...</span>
                </div>
              )}

              {/* Error State */}
              {isCoursesError && (
                <div className="text-center py-12">
                  <div className="text-red-500 mb-2">Failed to load courses</div>
                  <p className="text-sm text-gray-500 mb-4">{getApiErrorMessage(coursesError)}</p>
                  <Button variant="outline" onClick={() => refetchCourses()}>
                    Try Again
                  </Button>
                </div>
              )}

              {/* Empty State */}
              {!isLoadingCourses && !isCoursesError && courses.length === 0 && (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No courses yet</h3>
                  <p className="text-gray-500 text-sm mb-4">Get started by creating your first course</p>
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700" 
                    onClick={() => {
                      resetCourseForm()
                      setShowCreateCourseModal(true)
                    }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Course
                  </Button>
                </div>
              )}

              {/* Courses Table */}
              {!isLoadingCourses && !isCoursesError && courses.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Course</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Canonical Path</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Paths</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Modules</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Hours</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Level</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Assigned Mentor</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map((course) => (
                        <tr key={course.course_id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-sm text-gray-900">{course.title}</p>
                              <p className="text-xs text-gray-500 line-clamp-1">{course.description || "No description"}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <code className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700 font-mono">
                                /courses/{course.slug}
                              </code>
                              <button
                                onClick={() => copyPath(`/courses/${course.slug}`)}
                                className="p-1 hover:bg-gray-200 rounded transition-colors"
                                title="Copy path"
                              >
                                <Link2 className="w-3.5 h-3.5 text-gray-400" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">{course.paths_count}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{course.modules_count}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{course.estimated_hours}h</td>
                          <td className="py-3 px-4">
                            <Badge
                              className={
                                course.difficulty_level === "BEGINNER"
                                  ? "bg-green-100 text-green-700 border-0"
                                  : course.difficulty_level === "INTERMEDIATE"
                                  ? "bg-yellow-100 text-yellow-700 border-0"
                                  : "bg-red-100 text-red-700 border-0"
                              }
                            >
                              {course.difficulty_level.toLowerCase()}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {course.created_by
                              ? mentorNameById[course.created_by] || "Assigned"
                              : "Unassigned"}
                          </td>
                          <td className="py-3 px-4">
                            <Badge
                              className={
                                course.is_active
                                  ? "bg-green-100 text-green-700 border-0"
                                  : "bg-gray-100 text-gray-600 border-0"
                              }
                            >
                              {course.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 bg-transparent"
                                onClick={() => setSelectedCourse(course.course_id)}
                              >
                                <FolderTree className="w-4 h-4 mr-1" />
                                Manage
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 bg-transparent"
                                onClick={() => handleAssignMentor(course)}
                              >
                                <UserCog className="w-4 h-4 mr-1" />
                                Assign
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0"
                                onClick={() => handleEditCourse(course)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeleteCourse(course)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && courseToDelete && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle className="text-red-600">Delete Course</CardTitle>
                <CardDescription>
                  Are you sure you want to delete &quot;{courseToDelete.title}&quot;? This action cannot be undone.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 mb-4">
                  This will also delete all associated learning paths, modules, lessons, and quizzes.
                </p>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setCourseToDelete(null)
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleConfirmDeleteCourse}
                  disabled={deleteCourseMutation.isPending}
                >
                  {deleteCourseMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Course
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {showAssignMentorModal && courseToAssignMentor && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg">
              <CardHeader>
                <CardTitle>Assign Mentor</CardTitle>
                <CardDescription>
                  Select a mentor for "{courseToAssignMentor.title}".
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoadingMentors ? (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading mentors...
                  </div>
                ) : (
                  <select
                    value={selectedMentorId}
                    onChange={(e) => setSelectedMentorId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="">Select mentor</option>
                    {mentors.map((mentor) => (
                      <option key={mentor.id} value={mentor.id}>
                        {mentor.full_name} ({mentor.email})
                      </option>
                    ))}
                  </select>
                )}
                {!isLoadingMentors && mentors.length === 0 && (
                  <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
                    No active mentors found. Promote users to mentors first.
                  </p>
                )}
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAssignMentorModal(false)
                    setCourseToAssignMentor(null)
                    setSelectedMentorId("")
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={handleConfirmAssignMentor}
                  disabled={assignMentorMutation.isPending || isLoadingMentors || mentors.length === 0}
                >
                  {assignMentorMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <UserCog className="w-4 h-4 mr-2" />
                      Assign Mentor
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}

        {renderModals()}
      </>
    )
  }

  // Course Detail View with Modules, Quizzes, Tasks
  return (
    <>
      <div className="space-y-6">
        {/* Header with Breadcrumb */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm">
            <button
              onClick={() => {
                setSelectedCourse(null)
                setSelectedPathId(null)
                setSelectedModuleId(null)
              }}
              className="text-blue-600 hover:underline font-medium"
            >
              Courses
            </button>
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <span className="text-gray-900 font-medium">{selectedCourseData?.title}</span>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{selectedCourseData?.title}</h2>
              <div className="flex items-center gap-2 mt-1">
                <code className="px-2 py-1 bg-blue-50 rounded text-xs text-blue-700 font-mono">
                  /courses/{selectedCourseData?.slug}
                </code>
                <Badge
                  className={
                    selectedCourseData?.is_active
                      ? "bg-green-100 text-green-700 border-0"
                      : "bg-gray-100 text-gray-600 border-0"
                  }
                >
                  {selectedCourseData?.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  if (selectedCourseData) handleEditCourse(selectedCourseData)
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Course
              </Button>
              <Button 
                className="bg-purple-600 hover:bg-purple-700" 
                onClick={() => setShowAddPathModal(true)}
              >
                <FolderTree className="w-4 h-4 mr-2" />
                Add Learning Path
              </Button>
            </div>
          </div>
        </div>

        {/* Learning Paths Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Learning Paths List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FolderTree className="w-5 h-5 text-purple-600" />
                  Learning Paths
                </CardTitle>
                <CardDescription>
                  {learningPaths.length} path(s) in this course
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {isLoadingPaths ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                  </div>
                ) : learningPaths.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <FolderTree className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No learning paths yet</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => setShowAddPathModal(true)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Create First Path
                    </Button>
                  </div>
                ) : (
                  learningPaths.map((path) => (
                    <div
                      key={path.path_id}
                      className={`p-3 rounded-lg border transition-colors ${
                        selectedPathId === path.path_id
                          ? "border-purple-300 bg-purple-50"
                          : "border-gray-200 hover:border-purple-200 hover:bg-gray-50"
                      }`}
                    >
                      <button
                        onClick={() => {
                          setSelectedPathId(path.path_id)
                          setSelectedModuleId(null)
                        }}
                        className="w-full text-left"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 text-sm">{path.title}</span>
                          {path.is_default && (
                            <Badge className="bg-purple-100 text-purple-700 border-0 text-xs">Default</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{path.description}</p>
                      </button>
                      {/* Path Actions */}
                      <div className="flex items-center gap-1 mt-2 pt-2 border-t border-gray-100">
                        {path.is_default ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (selectedCourse) {
                                unsetDefaultPathMutation.mutate({ courseId: selectedCourse, pathId: path.path_id })
                              }
                            }}
                            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
                            title="Unset as default"
                          >
                            Unset Default
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (selectedCourse) {
                                setDefaultPathMutation.mutate({ courseId: selectedCourse, pathId: path.path_id })
                              }
                            }}
                            className="text-xs text-purple-600 hover:text-purple-800 px-2 py-1 rounded hover:bg-purple-50"
                            title="Set as default"
                          >
                            Set Default
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingPath(path)
                            setPathForm({ title: path.title, description: path.description, price: path.price || 0, is_default: path.is_default })
                            setShowEditPathModal(true)
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
                          title="Edit path"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setPathToDelete(path)
                            setShowDeletePathConfirm(true)
                          }}
                          className="text-xs text-red-600 hover:text-red-800 px-2 py-1 rounded hover:bg-red-50"
                          title="Delete path"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Middle: Modules List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Folder className="w-5 h-5 text-blue-600" />
                      Modules
                    </CardTitle>
                    <CardDescription>
                      {selectedPathId ? `${modules.length} module(s)` : "Select a learning path"}
                    </CardDescription>
                  </div>
                  {selectedPathId && (
                    <Button 
                      size="sm" 
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => {
                        setModuleForm({
                          title: "",
                          slug: "",
                          description: "",
                          order: modules.length + 1,
                          unlock_after_days: 0,
                          is_available_by_default: true,
                          first_deadline_days: null,
                          second_deadline_days: null,
                          third_deadline_days: null,
                        })
                        setShowAddModuleModal(true)
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {!selectedPathId ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <Folder className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Select a learning path to view modules</p>
                  </div>
                ) : isLoadingModules ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : modules.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <Folder className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No modules in this path</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3"
                      onClick={() => {
                        setModuleForm({
                          title: "",
                          slug: "",
                          description: "",
                          order: 1,
                          unlock_after_days: 0,
                          is_available_by_default: true,
                          first_deadline_days: null,
                          second_deadline_days: null,
                          third_deadline_days: null,
                        })
                        setShowAddModuleModal(true)
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Module
                    </Button>
                  </div>
                ) : (
                  <div className="max-h-[560px] space-y-2 overflow-y-auto pr-2">
                    {modules.map((module, index) => (
                    <div
                      key={module.module_id}
                      className={`p-3 rounded-lg border transition-colors ${
                        selectedModuleId === module.module_id
                          ? "border-blue-300 bg-blue-50"
                          : "border-gray-200 hover:border-blue-200 hover:bg-gray-50"
                      }`}
                    >
                      <div 
                        className="cursor-pointer"
                        onClick={() => setSelectedModuleId(module.module_id)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-medium">
                            {index + 1}
                          </span>
                          <span className="font-medium text-gray-900 text-sm flex-1">{module.title}</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2 ml-8">{module.description}</p>
                      </div>
                      <div className="flex items-center gap-1 mt-2 ml-8">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingModule(module)
                            setModuleForm({
                              title: module.title,
                              slug: "",
                              description: module.description,
                              order: module.order,
                              unlock_after_days: module.unlock_after_days ?? 0,
                              is_available_by_default: module.is_available_by_default ?? true,
                              first_deadline_days: module.first_deadline_days ?? null,
                              second_deadline_days: module.second_deadline_days ?? null,
                              third_deadline_days: module.third_deadline_days ?? null,
                            })
                            setShowEditModuleModal(true)
                          }}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit module"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setModuleToDelete(module)
                            setShowDeleteModuleConfirm(true)
                          }}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete module"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Module Content (Lessons, Quizzes & Projects) */}
          <div className="lg:col-span-1 space-y-4">
            {/* Lessons */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                      Lessons
                    </CardTitle>
                    <CardDescription>
                      {selectedModuleId ? `${lessons.length} lesson(s)` : "Select a module"}
                    </CardDescription>
                  </div>
                  {selectedModuleId && (
                    <Button 
                      size="sm" 
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => setShowAddLessonModal(true)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!selectedModuleId ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">Select a module to manage lessons</p>
                  </div>
                ) : isLoadingLessons ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  </div>
                ) : lessons.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <BookOpen className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">No lessons yet</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => setShowAddLessonModal(true)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Lesson
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {lessons.map((lesson, index) => (
                      <div key={lesson.lesson_id} className="p-2 bg-gray-50 rounded border border-gray-200 group">
                        <div className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-medium shrink-0">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{lesson.title}</p>
                            <p className="text-xs text-gray-500 line-clamp-1">{lesson.description}</p>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              {lesson.estimated_minutes && (
                                <span className="text-xs text-gray-400">{lesson.estimated_minutes} min</span>
                              )}
                              {lesson.youtube_video_url && (
                                <Badge className="bg-red-50 text-red-600 border-0 text-xs">Video</Badge>
                              )}
                              {lesson.external_resources && lesson.external_resources.length > 0 && (
                                <Badge className="bg-purple-50 text-purple-600 border-0 text-xs">{lesson.external_resources.length} resource(s)</Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingLesson(lesson)
                                setLessonForm({
                                  title: lesson.title,
                                  description: lesson.description,
                                  content: lesson.content || "",
                                  order: lesson.order,
                                  content_type: lesson.content_type || "",
                                  estimated_minutes: lesson.estimated_minutes || 15,
                                  youtube_video_url: lesson.youtube_video_url || "",
                                  external_resources: lesson.external_resources || [],
                                  expected_outcomes: lesson.expected_outcomes || [],
                                })
                                setShowEditLessonModal(true)
                              }}
                              className="p-1 hover:bg-blue-100 rounded transition-colors"
                              title="Edit lesson"
                            >
                              <Edit className="w-3.5 h-3.5 text-blue-600" />
                            </button>
                            <button
                              onClick={() => {
                                setLessonToDelete(lesson)
                                setShowDeleteLessonConfirm(true)
                              }}
                              className="p-1 hover:bg-red-100 rounded transition-colors"
                              title="Delete lesson"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quiz Questions */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <FileQuestion className="w-5 h-5 text-amber-600" />
                      Quiz Questions
                    </CardTitle>
                    <CardDescription>
                      {selectedModuleId ? `${assessments.length} question(s)` : "Select a module"}
                    </CardDescription>
                  </div>
                  {selectedModuleId && (
                    <Button 
                      size="sm" 
                      className="bg-amber-600 hover:bg-amber-700"
                      onClick={() => setShowAddAssessmentModal(true)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!selectedModuleId ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <FileQuestion className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">Select a module to manage quizzes</p>
                  </div>
                ) : isLoadingAssessments ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
                  </div>
                ) : assessments.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <FileQuestion className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">No quiz questions yet</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => setShowAddAssessmentModal(true)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Question
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {assessments.map((q, index) => (
                      <div key={q.question_id} className="p-2 bg-gray-50 rounded border border-gray-200 group">
                        <div className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs flex items-center justify-center font-medium shrink-0">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-900 line-clamp-2">{q.question_text}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className="bg-amber-50 text-amber-700 border-0 text-xs">{q.question_type}</Badge>
                              <span className="text-xs text-gray-500">{q.points} pts</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingAssessment(q)
                                setAssessmentForm({
                                  question_text: q.question_text,
                                  question_type: q.question_type as "multiple_choice" | "debugging" | "coding" | "short_answer",
                                  difficulty_level: q.difficulty_level as DifficultyLevel,
                                  order: q.order,
                                  options: q.options || ["", "", "", ""],
                                  correct_answer: q.correct_answer,
                                  explanation: q.explanation || "",
                                  points: q.points,
                                })
                                setShowEditAssessmentModal(true)
                              }}
                              className="p-1 hover:bg-amber-100 rounded transition-colors"
                              title="Edit question"
                            >
                              <Edit className="w-3.5 h-3.5 text-amber-600" />
                            </button>
                            <button
                              onClick={() => {
                                setAssessmentToDelete(q)
                                setShowDeleteAssessmentConfirm(true)
                              }}
                              className="p-1 hover:bg-red-100 rounded transition-colors"
                              title="Delete question"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Projects/Exercises */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Code className="w-5 h-5 text-green-600" />
                      Projects & Exercises
                    </CardTitle>
                    <CardDescription>
                      {selectedModuleId ? `${projects.length} item(s)` : "Select a module"}
                    </CardDescription>
                  </div>
                  {selectedModuleId && (
                    <Button 
                      size="sm" 
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => setShowAddProjectModal(true)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!selectedModuleId ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <Code className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">Select a module to manage projects</p>
                  </div>
                ) : isLoadingProjects ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-green-600" />
                  </div>
                ) : projects.length === 0 ? (
                  <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <Code className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">No projects/exercises yet</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => setShowAddProjectModal(true)}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Project
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {projects.map((project, index) => (
                      <div key={project.project_id} className="p-2 bg-gray-50 rounded border border-gray-200 hover:border-green-200 transition-colors">
                        <div className="flex items-start gap-2">
                          <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs flex items-center justify-center font-medium shrink-0">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{project.title}</p>
                            <p className="text-xs text-gray-500 line-clamp-1">{project.description}</p>
                            {project.estimated_hours && (
                              <span className="text-xs text-gray-400">{project.estimated_hours}h</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setEditingProject(project)
                                setProjectForm({
                                  title: project.title,
                                  description: project.description,
                                  order: project.order,
                                  estimated_hours: project.estimated_hours || 2,
                                  starter_repo_url: project.starter_repo_url || "",
                                  solution_repo_url: project.solution_repo_url || "",
                                  required_skills: project.required_skills || [],
                                })
                                setShowEditProjectModal(true)
                              }}
                              className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Edit project"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => {
                                setProjectToDelete(project)
                                setShowDeleteProjectConfirm(true)
                              }}
                              className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete project"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Back Button */}
        <div className="flex justify-start">
          <Button 
            variant="outline" 
            onClick={() => {
              setSelectedCourse(null)
              setSelectedPathId(null)
              setSelectedModuleId(null)
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Courses
          </Button>
        </div>
      </div>

      {/* Add Learning Path Modal */}
      {showAddPathModal && selectedCourse && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowAddPathModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Create Learning Path</h2>
                <button
                  onClick={() => setShowAddPathModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Path Title *</label>
                  <input
                    type="text"
                    value={pathForm.title}
                    onChange={(e) => setPathForm({ ...pathForm, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Beginner Track"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                  <textarea
                    value={pathForm.description}
                    onChange={(e) => setPathForm({ ...pathForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[80px]"
                    placeholder="Describe what students will learn in this path..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pathForm.price}
                    onChange={(e) => setPathForm({ ...pathForm, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={pathForm.is_default}
                    onChange={(e) => setPathForm({ ...pathForm, is_default: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="is_default" className="text-sm text-gray-700">Set as default path</label>
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
                <Button variant="outline" onClick={() => setShowAddPathModal(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-purple-600 hover:bg-purple-700" 
                  onClick={() => {
                    if (!pathForm.title || !pathForm.description) {
                      toast.error("Please fill in all required fields")
                      return
                    }
                    createLearningPathMutation.mutate({
                      courseId: selectedCourse,
                      data: {
                        course_id: selectedCourse,
                        title: sanitizeString(pathForm.title),
                        description: sanitizeString(pathForm.description),
                        price: pathForm.price,
                        is_default: pathForm.is_default,
                      }
                    })
                    setShowAddPathModal(false)
                    setPathForm({ title: "", description: "", price: 0, is_default: false })
                  }}
                  disabled={createLearningPathMutation.isPending}
                >
                  {createLearningPathMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Create Path
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Lesson Modal */}
      {showAddLessonModal && selectedModuleId && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowAddLessonModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold text-gray-900">Add New Lesson</h2>
                <button
                  onClick={() => setShowAddLessonModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Lesson Title *</label>
                    <input
                      type="text"
                      value={lessonForm.title}
                      onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Introduction to Variables"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                    <input
                      type="number"
                      value={lessonForm.order}
                      onChange={(e) => setLessonForm({ ...lessonForm, order: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                  <textarea
                    value={lessonForm.description}
                    onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-20"
                    placeholder="Brief overview of the lesson..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lesson Content</label>
                  <textarea
                    value={lessonForm.content}
                    onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-32 font-mono text-sm"
                    placeholder="Write the main lesson content here... (supports markdown)"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Minutes</label>
                    <input
                      type="number"
                      value={lessonForm.estimated_minutes}
                      onChange={(e) => setLessonForm({ ...lessonForm, estimated_minutes: parseInt(e.target.value) || 15 })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Content Type</label>
                    <select
                      value={lessonForm.content_type}
                      onChange={(e) => setLessonForm({ ...lessonForm, content_type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Select type</option>
                      <option value="theory">Theory</option>
                      <option value="coding">Coding</option>
                      <option value="debugging">Debugging</option>
                      <option value="quiz">Quiz</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">YouTube Video URL</label>
                  <input
                    type="url"
                    value={lessonForm.youtube_video_url}
                    onChange={(e) => setLessonForm({ ...lessonForm, youtube_video_url: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">External Resources</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="url"
                      value={newResource}
                      onChange={(e) => setNewResource(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/resource"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (newResource.trim()) {
                          setLessonForm({ ...lessonForm, external_resources: [...lessonForm.external_resources, newResource.trim()] })
                          setNewResource("")
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {lessonForm.external_resources.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {lessonForm.external_resources.map((resource, index) => (
                        <Badge key={index} className="bg-purple-100 text-purple-700 border-0 flex items-center gap-1">
                          <a href={resource} target="_blank" rel="noopener noreferrer" className="truncate max-w-40 text-xs">{resource}</a>
                          <button
                            onClick={() => setLessonForm({ ...lessonForm, external_resources: lessonForm.external_resources.filter((_, i) => i !== index) })}
                            className="hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expected Outcomes (What you'll learn)</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newOutcome}
                      onChange={(e) => setNewOutcome(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Understand how variables work"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (newOutcome.trim()) {
                          setLessonForm({ ...lessonForm, expected_outcomes: [...lessonForm.expected_outcomes, newOutcome.trim()] })
                          setNewOutcome("")
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {lessonForm.expected_outcomes.length > 0 && (
                    <ul className="space-y-1">
                      {lessonForm.expected_outcomes.map((outcome, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-gray-700 bg-green-50 px-3 py-1 rounded">
                          <span className="text-green-600">✓</span>
                          <span className="flex-1">{outcome}</span>
                          <button
                            onClick={() => setLessonForm({ ...lessonForm, expected_outcomes: lessonForm.expected_outcomes.filter((_, i) => i !== index) })}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                <Button variant="outline" onClick={() => setShowAddLessonModal(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700" 
                  onClick={() => {
                    if (!lessonForm.title || !lessonForm.description) {
                      toast.error("Please fill in required fields")
                      return
                    }
                    createLessonMutation.mutate({
                      moduleId: selectedModuleId,
                      data: {
                        module_id: selectedModuleId,
                        title: sanitizeString(lessonForm.title),
                        description: sanitizeString(lessonForm.description),
                        content: lessonForm.content || undefined,
                        order: lessonForm.order,
                        content_type: lessonForm.content_type || undefined,
                        estimated_minutes: lessonForm.estimated_minutes || undefined,
                        youtube_video_url: lessonForm.youtube_video_url || undefined,
                        external_resources: lessonForm.external_resources.length > 0 ? lessonForm.external_resources : undefined,
                        expected_outcomes: lessonForm.expected_outcomes.length > 0 ? lessonForm.expected_outcomes : undefined,
                      }
                    })
                  }}
                  disabled={createLessonMutation.isPending}
                >
                  {createLessonMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Create Lesson
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Lesson Modal */}
      {showEditLessonModal && editingLesson && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowEditLessonModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold text-gray-900">Edit Lesson</h2>
                <button
                  onClick={() => setShowEditLessonModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Lesson Title *</label>
                    <input
                      type="text"
                      value={lessonForm.title}
                      onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                    <input
                      type="number"
                      value={lessonForm.order}
                      onChange={(e) => setLessonForm({ ...lessonForm, order: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                  <textarea
                    value={lessonForm.description}
                    onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lesson Content</label>
                  <textarea
                    value={lessonForm.content}
                    onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-32 font-mono text-sm"
                    placeholder="Write the main lesson content here..."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Minutes</label>
                    <input
                      type="number"
                      value={lessonForm.estimated_minutes}
                      onChange={(e) => setLessonForm({ ...lessonForm, estimated_minutes: parseInt(e.target.value) || 15 })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Content Type</label>
                    <select
                      value={lessonForm.content_type}
                      onChange={(e) => setLessonForm({ ...lessonForm, content_type: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Select type</option>
                      <option value="theory">Theory</option>
                      <option value="coding">Coding</option>
                      <option value="debugging">Debugging</option>
                      <option value="quiz">Quiz</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">YouTube Video URL</label>
                  <input
                    type="url"
                    value={lessonForm.youtube_video_url}
                    onChange={(e) => setLessonForm({ ...lessonForm, youtube_video_url: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">External Resources</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="url"
                      value={newResource}
                      onChange={(e) => setNewResource(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/resource"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (newResource.trim()) {
                          setLessonForm({ ...lessonForm, external_resources: [...lessonForm.external_resources, newResource.trim()] })
                          setNewResource("")
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {lessonForm.external_resources.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {lessonForm.external_resources.map((resource, index) => (
                        <Badge key={index} className="bg-purple-100 text-purple-700 border-0 flex items-center gap-1">
                          <a href={resource} target="_blank" rel="noopener noreferrer" className="truncate max-w-40 text-xs">{resource}</a>
                          <button
                            onClick={() => setLessonForm({ ...lessonForm, external_resources: lessonForm.external_resources.filter((_, i) => i !== index) })}
                            className="hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expected Outcomes (What you'll learn)</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newOutcome}
                      onChange={(e) => setNewOutcome(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Understand how variables work"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        if (newOutcome.trim()) {
                          setLessonForm({ ...lessonForm, expected_outcomes: [...lessonForm.expected_outcomes, newOutcome.trim()] })
                          setNewOutcome("")
                        }
                      }}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {lessonForm.expected_outcomes.length > 0 && (
                    <ul className="space-y-1">
                      {lessonForm.expected_outcomes.map((outcome, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-gray-700 bg-green-50 px-3 py-1 rounded">
                          <span className="text-green-600">✓</span>
                          <span className="flex-1">{outcome}</span>
                          <button
                            onClick={() => setLessonForm({ ...lessonForm, expected_outcomes: lessonForm.expected_outcomes.filter((_, i) => i !== index) })}
                            className="text-gray-400 hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                <Button variant="outline" onClick={() => setShowEditLessonModal(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-blue-600 hover:bg-blue-700" 
                  onClick={() => {
                    if (!lessonForm.title || !lessonForm.description) {
                      toast.error("Please fill in required fields")
                      return
                    }
                    updateLessonMutation.mutate({
                      lessonId: editingLesson.lesson_id,
                      data: {
                        title: sanitizeString(lessonForm.title),
                        description: sanitizeString(lessonForm.description),
                        content: lessonForm.content || undefined,
                        order: lessonForm.order,
                        content_type: lessonForm.content_type || undefined,
                        estimated_minutes: lessonForm.estimated_minutes || undefined,
                        youtube_video_url: lessonForm.youtube_video_url || undefined,
                        external_resources: lessonForm.external_resources,
                        expected_outcomes: lessonForm.expected_outcomes,
                      }
                    })
                  }}
                  disabled={updateLessonMutation.isPending}
                >
                  {updateLessonMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Lesson Confirmation Modal */}
      {showDeleteLessonConfirm && lessonToDelete && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowDeleteLessonConfirm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-red-600">Delete Lesson</h2>
                <button
                  onClick={() => setShowDeleteLessonConfirm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Are you sure you want to delete this lesson?</h3>
                    <p className="text-gray-600 text-sm mb-3">
                      <strong>"{lessonToDelete.title}"</strong>
                    </p>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-700 text-sm font-medium mb-1">⚠️ This action cannot be undone!</p>
                      <p className="text-red-600 text-xs">
                        The lesson content and all associated progress will be permanently deleted.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
                <Button variant="outline" onClick={() => setShowDeleteLessonConfirm(false)} disabled={deleteLessonMutation.isPending}>
                  Cancel
                </Button>
                <Button 
                  className="bg-red-600 hover:bg-red-700" 
                  onClick={() => deleteLessonMutation.mutate(lessonToDelete.lesson_id)}
                  disabled={deleteLessonMutation.isPending}
                >
                  {deleteLessonMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Lesson
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Project/Exercise Modal */}
      {showAddProjectModal && selectedModuleId && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowAddProjectModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold text-gray-900">Add Project / Exercise</h2>
                <button
                  onClick={() => setShowAddProjectModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                    <input
                      type="text"
                      value={projectForm.title}
                      onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="e.g., Build a Todo App"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Hours</label>
                    <input
                      type="number"
                      value={projectForm.estimated_hours}
                      onChange={(e) => setProjectForm({ ...projectForm, estimated_hours: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      min="1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description / Instructions *</label>
                  <p className="text-xs text-gray-500 mb-2">Provide detailed instructions. Use Markdown for formatting.</p>
                  <textarea
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[200px] font-mono text-sm"
                    placeholder={`# Project Overview\nDescribe what students will build...\n\n## Requirements\n- Requirement 1\n- Requirement 2\n\n## Steps\n1. First step...\n2. Second step...`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Starter Repo URL (Optional)</label>
                    <input
                      type="url"
                      value={projectForm.starter_repo_url}
                      onChange={(e) => setProjectForm({ ...projectForm, starter_repo_url: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="https://github.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Solution Repo URL (Optional)</label>
                    <input
                      type="url"
                      value={projectForm.solution_repo_url}
                      onChange={(e) => setProjectForm({ ...projectForm, solution_repo_url: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="https://github.com/..."
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                <Button variant="outline" onClick={() => setShowAddProjectModal(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700" 
                  onClick={() => {
                    if (!projectForm.title || !projectForm.description) {
                      toast.error("Please fill in title and description")
                      return
                    }
                    createProjectMutation.mutate({
                      moduleId: selectedModuleId,
                      data: {
                        module_id: selectedModuleId,
                        title: sanitizeString(projectForm.title),
                        description: projectForm.description,
                        order: projects.length + 1,
                        estimated_hours: projectForm.estimated_hours,
                        starter_repo_url: projectForm.starter_repo_url || undefined,
                        solution_repo_url: projectForm.solution_repo_url || undefined,
                      }
                    })
                  }}
                  disabled={createProjectMutation.isPending}
                >
                  {createProjectMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Create Project
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Project Modal */}
      {showEditProjectModal && editingProject && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowEditProjectModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold text-gray-900">Edit Project</h2>
                <button
                  onClick={() => setShowEditProjectModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Title *</label>
                    <input
                      type="text"
                      value={projectForm.title}
                      onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="e.g., Build a Todo App"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Hours</label>
                    <input
                      type="number"
                      value={projectForm.estimated_hours}
                      onChange={(e) => setProjectForm({ ...projectForm, estimated_hours: parseInt(e.target.value) || 1 })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      min="1"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description / Instructions *</label>
                  <textarea
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[200px] font-mono text-sm"
                    placeholder="Describe what students will build..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Starter Repo URL (Optional)</label>
                    <input
                      type="url"
                      value={projectForm.starter_repo_url}
                      onChange={(e) => setProjectForm({ ...projectForm, starter_repo_url: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="https://github.com/..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Solution Repo URL (Optional)</label>
                    <input
                      type="url"
                      value={projectForm.solution_repo_url}
                      onChange={(e) => setProjectForm({ ...projectForm, solution_repo_url: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      placeholder="https://github.com/..."
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Order</label>
                  <input
                    type="number"
                    value={projectForm.order}
                    onChange={(e) => setProjectForm({ ...projectForm, order: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    min="1"
                  />
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                <Button variant="outline" onClick={() => setShowEditProjectModal(false)} disabled={updateProjectMutation.isPending}>
                  Cancel
                </Button>
                <Button 
                  className="bg-green-600 hover:bg-green-700" 
                  onClick={() => {
                    if (!projectForm.title || !projectForm.description) {
                      toast.error("Please fill in title and description")
                      return
                    }
                    updateProjectMutation.mutate({
                      projectId: editingProject.project_id,
                      data: {
                        title: sanitizeString(projectForm.title),
                        description: projectForm.description,
                        order: projectForm.order,
                        estimated_hours: projectForm.estimated_hours,
                        starter_repo_url: projectForm.starter_repo_url || undefined,
                        solution_repo_url: projectForm.solution_repo_url || undefined,
                      }
                    })
                  }}
                  disabled={updateProjectMutation.isPending}
                >
                  {updateProjectMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Project Confirmation Modal */}
      {showDeleteProjectConfirm && projectToDelete && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowDeleteProjectConfirm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-red-600">Delete Project</h2>
                <button
                  onClick={() => setShowDeleteProjectConfirm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-gray-900 font-medium mb-1">
                      Are you sure you want to delete "{projectToDelete.title}"?
                    </p>
                    <p className="text-sm text-gray-500">
                      This action cannot be undone. All student submissions for this project will also be deleted.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
                <Button variant="outline" onClick={() => setShowDeleteProjectConfirm(false)} disabled={deleteProjectMutation.isPending}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => deleteProjectMutation.mutate(projectToDelete.project_id)}
                  disabled={deleteProjectMutation.isPending}
                >
                  {deleteProjectMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Project
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add Quiz Question Modal */}
      {showAddAssessmentModal && selectedModuleId && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowAddAssessmentModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold text-gray-900">Add Quiz Question</h2>
                <button
                  onClick={() => setShowAddAssessmentModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Question *</label>
                  <textarea
                    value={assessmentForm.question_text}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, question_text: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[80px]"
                    placeholder="Enter your question..."
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Question Type</label>
                    <select
                      value={assessmentForm.question_type}
                      onChange={(e) => {
                        const value = e.target.value as typeof assessmentForm.question_type
                        setAssessmentForm({ ...assessmentForm, question_type: value })
                      }}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="short_answer">Short Answer</option>
                      <option value="coding">Coding</option>
                      <option value="debugging">Debugging</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                    <select
                      value={assessmentForm.difficulty_level}
                      onChange={(e) => {
                        const value = e.target.value as typeof assessmentForm.difficulty_level
                        setAssessmentForm({ ...assessmentForm, difficulty_level: value })
                      }}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="BEGINNER">Beginner</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Points</label>
                    <input
                      type="number"
                      value={assessmentForm.points}
                      onChange={(e) => setAssessmentForm({ ...assessmentForm, points: parseInt(e.target.value) || 10 })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      min="1"
                    />
                  </div>
                </div>

                {assessmentForm.question_type === "multiple_choice" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Answer Options</label>
                    <p className="text-xs text-gray-500 mb-3">Select the radio button next to the correct answer</p>
                    <div className="space-y-2">
                      {assessmentForm.options.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="correct_answer"
                            checked={assessmentForm.correct_answer === String(index)}
                            onChange={() => setAssessmentForm({ ...assessmentForm, correct_answer: String(index) })}
                            className="w-4 h-4 text-green-600 focus:ring-green-500"
                          />
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...assessmentForm.options]
                              newOptions[index] = e.target.value
                              setAssessmentForm({ ...assessmentForm, options: newOptions })
                            }}
                            className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm ${
                              assessmentForm.correct_answer === String(index)
                                ? "border-green-300 bg-green-50 focus:ring-green-500"
                                : "border-gray-200 focus:ring-amber-500"
                            }`}
                            placeholder={`Option ${String.fromCharCode(65 + index)}`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {assessmentForm.question_type !== "multiple_choice" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Expected Answer / Solution</label>
                    <textarea
                      value={assessmentForm.correct_answer}
                      onChange={(e) => setAssessmentForm({ ...assessmentForm, correct_answer: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[80px] font-mono text-sm"
                      placeholder="Enter the expected answer or solution code..."
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Explanation (Optional)</label>
                  <textarea
                    value={assessmentForm.explanation}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, explanation: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[60px]"
                    placeholder="Explain why this is the correct answer..."
                  />
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                <Button variant="outline" onClick={() => setShowAddAssessmentModal(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-amber-600 hover:bg-amber-700" 
                  onClick={() => {
                    if (!assessmentForm.question_text) {
                      toast.error("Please enter a question")
                      return
                    }
                    const data: AssessmentQuestionCreatePayload = {
                      module_id: selectedModuleId,
                      question_text: assessmentForm.question_text,
                      question_type: assessmentForm.question_type,
                      difficulty_level: assessmentForm.difficulty_level,
                      order: assessments.length + 1,
                      points: assessmentForm.points,
                      explanation: assessmentForm.explanation || undefined,
                      correct_answer: assessmentForm.correct_answer,
                    }
                    if (assessmentForm.question_type === "multiple_choice") {
                      data.options = assessmentForm.options.filter(o => o.trim() !== "")
                    }
                    createAssessmentMutation.mutate({ moduleId: selectedModuleId, data })
                  }}
                  disabled={createAssessmentMutation.isPending}
                >
                  {createAssessmentMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Add Question
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Edit Assessment Modal */}
      {showEditAssessmentModal && editingAssessment && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowEditAssessmentModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                <h2 className="text-xl font-bold text-gray-900">Edit Assessment Question</h2>
                <button
                  onClick={() => setShowEditAssessmentModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Question *</label>
                  <textarea
                    value={assessmentForm.question_text}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, question_text: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[80px]"
                    placeholder="Enter your question..."
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Question Type</label>
                    <select
                      value={assessmentForm.question_type}
                      onChange={(e) => setAssessmentForm({ ...assessmentForm, question_type: e.target.value as any })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="coding">Coding</option>
                      <option value="debugging">Debugging</option>
                      <option value="short_answer">Short Answer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                    <select
                      value={assessmentForm.difficulty_level}
                      onChange={(e) => setAssessmentForm({ ...assessmentForm, difficulty_level: e.target.value as DifficultyLevel })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="BEGINNER">Beginner</option>
                      <option value="INTERMEDIATE">Intermediate</option>
                      <option value="ADVANCED">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Points</label>
                    <input
                      type="number"
                      value={assessmentForm.points}
                      onChange={(e) => setAssessmentForm({ ...assessmentForm, points: parseInt(e.target.value) || 10 })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                      min="1"
                      max="100"
                    />
                  </div>
                </div>
                {assessmentForm.question_type === "multiple_choice" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Answer Options</label>
                    <div className="space-y-2">
                      {assessmentForm.options.map((option, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="edit-correct-answer"
                            checked={assessmentForm.correct_answer === String(idx)}
                            onChange={() => setAssessmentForm({ ...assessmentForm, correct_answer: String(idx) })}
                            className="w-4 h-4 text-amber-600"
                          />
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...assessmentForm.options]
                              newOptions[idx] = e.target.value
                              setAssessmentForm({ ...assessmentForm, options: newOptions })
                            }}
                            className={`flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                              assessmentForm.correct_answer === String(idx) 
                                ? "border-green-300 bg-green-50 focus:ring-green-500" 
                                : "border-gray-200 focus:ring-amber-500"
                            }`}
                            placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Select the radio button for the correct answer</p>
                  </div>
                )}
                {assessmentForm.question_type !== "multiple_choice" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Correct Answer</label>
                    <textarea
                      value={assessmentForm.correct_answer}
                      onChange={(e) => setAssessmentForm({ ...assessmentForm, correct_answer: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[80px]"
                      placeholder="Enter the correct answer..."
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Explanation (Optional)</label>
                  <textarea
                    value={assessmentForm.explanation}
                    onChange={(e) => setAssessmentForm({ ...assessmentForm, explanation: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[60px]"
                    placeholder="Explain why this is the correct answer..."
                  />
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3 shrink-0">
                <Button variant="outline" onClick={() => setShowEditAssessmentModal(false)}>
                  Cancel
                </Button>
                <Button 
                  className="bg-amber-600 hover:bg-amber-700" 
                  onClick={() => {
                    if (!assessmentForm.question_text) {
                      toast.error("Please enter a question")
                      return
                    }
                    const data: AssessmentQuestionUpdatePayload = {
                      question_text: assessmentForm.question_text,
                      question_type: assessmentForm.question_type,
                      difficulty_level: assessmentForm.difficulty_level,
                      order: assessmentForm.order,
                      points: assessmentForm.points,
                      explanation: assessmentForm.explanation || undefined,
                      correct_answer: assessmentForm.correct_answer,
                    }
                    if (assessmentForm.question_type === "multiple_choice") {
                      data.options = assessmentForm.options.filter(o => o.trim() !== "")
                    }
                    updateAssessmentMutation.mutate({ questionId: editingAssessment.question_id, data })
                  }}
                  disabled={updateAssessmentMutation.isPending}
                >
                  {updateAssessmentMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Delete Assessment Confirmation Modal */}
      {showDeleteAssessmentConfirm && assessmentToDelete && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowDeleteAssessmentConfirm(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-red-600">Delete Question</h2>
                <button
                  onClick={() => setShowDeleteAssessmentConfirm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                    <Trash2 className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Are you sure you want to delete this question?</h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      "{assessmentToDelete.question_text}"
                    </p>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-700 text-sm font-medium">⚠️ This action cannot be undone!</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
                <Button variant="outline" onClick={() => setShowDeleteAssessmentConfirm(false)} disabled={deleteAssessmentMutation.isPending}>
                  Cancel
                </Button>
                <Button 
                  className="bg-red-600 hover:bg-red-700" 
                  onClick={() => deleteAssessmentMutation.mutate(assessmentToDelete.question_id)}
                  disabled={deleteAssessmentMutation.isPending}
                >
                  {deleteAssessmentMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Question
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {renderModals()}
    </>
  )
}
